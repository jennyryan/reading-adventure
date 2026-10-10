// Every POST/PUT/PATCH/DELETE route handler must refuse requests that
// aren't from an unlocked grown-up on our own site. Route files are found
// automatically, so a new write route that forgets requireGrownup() fails here.

import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/lib/auth/crypto";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { makeRequest } from "./helpers";

// If a request ever gets past the guard, it reaches the database. Make that
// detectable instead of trying to connect.
vi.mock("@/db", () => ({
  db: () => {
    throw new Error("REACHED_HANDLER");
  },
}));

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

// Routes that are deliberately public, with the reason. Keep this list short.
const PUBLIC_WRITES: Record<string, string> = {
  "POST /api/auth/unlock": "how a grown-up obtains the cookie (rate limited, tested separately)",
  "POST /api/auth/lock": "only clears the caller's own cookie",
};

const appDir = path.resolve(__dirname, "../src/app");
const routeFiles = readdirSync(appDir, { recursive: true, encoding: "utf8" })
  .filter((f) => /(^|[\\/])route\.ts$/.test(f))
  .map((f) => ({
    file: path.join(appDir, f),
    // "api/books/[id]/route.ts" -> "/api/books/1"
    url: "/" + path.dirname(f).split(path.sep).join("/").replace(/\[[^\]]+\]/g, "1"),
    pattern: "/" + path.dirname(f).split(path.sep).join("/"),
  }));

const SECRET = process.env.SESSION_SECRET!;
const validCookie = () =>
  `${SESSION_COOKIE}=${createSessionToken(SECRET, Date.now(), 60_000)}`;
const expiredCookie = () =>
  `${SESSION_COOKIE}=${createSessionToken(SECRET, Date.now() - 120_000, 60_000)}`;
const ctx = { params: Promise.resolve({ id: "1" }) };

type Handler = (req: Request, ctx: unknown) => Promise<Response>;

async function loadWriteHandlers() {
  const handlers: { name: string; url: string; method: string; handler: Handler }[] = [];
  for (const route of routeFiles) {
    const mod = (await import(route.file)) as Record<string, unknown>;
    for (const method of WRITE_METHODS) {
      if (typeof mod[method] === "function") {
        handlers.push({
          name: `${method} ${route.pattern}`,
          url: route.url,
          method,
          handler: mod[method] as Handler,
        });
      }
    }
  }
  return handlers;
}

async function statusOf(handler: Handler, req: Request) {
  try {
    return (await handler(req, ctx)).status;
  } catch (e) {
    if ((e as Error).message === "REACHED_HANDLER") return "reached handler";
    throw e;
  }
}

describe("write route authorization", async () => {
  const all = await loadWriteHandlers();
  const guarded = all.filter((h) => !(h.name in PUBLIC_WRITES));

  it("finds the write routes (sanity check on discovery)", () => {
    expect(guarded.map((h) => h.name).sort()).toEqual(
      [
        "DELETE /api/books/[id]",
        "PATCH /api/books/[id]",
        "PATCH /api/readings/[id]",
        "POST /api/books",
        "POST /api/up-next/dismissals",
        "PUT /api/settings",
      ].sort(),
    );
  });

  it("every public write route is on the allowlist on purpose", () => {
    for (const name of Object.keys(PUBLIC_WRITES)) {
      expect(all.map((h) => h.name)).toContain(name);
    }
  });

  describe.each(guarded)("$name", ({ url, method, handler }) => {
    const body = { anything: true };

    it("rejects a visitor with no cookie (401)", async () => {
      expect(await statusOf(handler, makeRequest(url, { method, body }))).toBe(401);
    });

    it("rejects an expired cookie (401)", async () => {
      const req = makeRequest(url, { method, body, cookie: expiredCookie() });
      expect(await statusOf(handler, req)).toBe(401);
    });

    it("rejects a forged cookie (401)", async () => {
      const forged = createSessionToken("not-the-real-secret-but-long-enough!!", Date.now(), 60_000);
      const req = makeRequest(url, { method, body, cookie: `${SESSION_COOKIE}=${forged}` });
      expect(await statusOf(handler, req)).toBe(401);
    });

    it("rejects a cross-site request even with a valid cookie (403)", async () => {
      const req = makeRequest(url, { method, body, cookie: validCookie(), origin: "https://evil.example" });
      expect(await statusOf(handler, req)).toBe(403);
    });

    it("rejects a request with no Origin header (403)", async () => {
      const req = makeRequest(url, { method, body, cookie: validCookie(), origin: null });
      expect(await statusOf(handler, req)).toBe(403);
    });

    it("lets an unlocked grown-up through", async () => {
      const req = makeRequest(url, { method, body, cookie: validCookie() });
      const status = await statusOf(handler, req);
      // Past the guard, the request is either rejected by validation (400)
      // or reaches the database.
      expect([400, "reached handler"]).toContain(status);
    });
  });
});
