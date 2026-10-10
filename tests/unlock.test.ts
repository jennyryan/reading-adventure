import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifySessionToken } from "@/lib/auth/crypto";
import { MAX_PER_CLIENT, memoryStore, type AttemptStore } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { makeRequest } from "./helpers";

// Swap the Postgres-backed attempt store for an in-memory one.
const store: { current: AttemptStore } = { current: memoryStore() };
vi.mock("@/lib/auth/attempt-store", () => ({
  dbAttemptStore: {
    hit: (key: string, windowMs: number) => store.current.hit(key, windowMs),
    clear: (key: string) => store.current.clear(key),
  },
}));

const { POST: unlock } = await import("@/app/api/auth/unlock/route");
const { POST: lock } = await import("@/app/api/auth/lock/route");

const PASSCODE = process.env.GROWNUP_PASSCODE!;
const SECRET = process.env.SESSION_SECRET!;
const attempt = (passcode: string, opts: { ip?: string; origin?: string | null } = {}) =>
  unlock(makeRequest("/api/auth/unlock", { body: { passcode }, ...opts }));

beforeEach(() => {
  store.current = memoryStore();
});

describe("POST /api/auth/unlock", () => {
  it("rejects a wrong passcode without setting a cookie", async () => {
    const res = await attempt("nope");
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("sets a signed, httpOnly, sameSite=strict cookie for the right passcode", async () => {
    const res = await attempt(PASSCODE);
    expect(res.status).toBe(200);

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60);
    expect(verifySessionToken(cookie?.value, SECRET, Date.now())).toBe(true);
  });

  it("marks the cookie secure in production", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
    expect(sessionCookieOptions(false).secure).toBe(false);
  });

  it(`locks a device out after ${MAX_PER_CLIENT} tries, even for the right passcode`, async () => {
    for (let i = 0; i < MAX_PER_CLIENT; i++) {
      expect((await attempt("wrong")).status).toBe(401);
    }
    const blocked = await attempt(PASSCODE);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(blocked.headers.get("set-cookie")).toBeNull();

    // Another device can still unlock.
    expect((await attempt(PASSCODE, { ip: "198.51.100.1" })).status).toBe(200);
  });

  it("resets the count after a successful unlock", async () => {
    for (let i = 0; i < MAX_PER_CLIENT - 1; i++) await attempt("wrong");
    expect((await attempt(PASSCODE)).status).toBe(200);
    expect((await attempt("wrong")).status).toBe(401); // not 429
  });

  it("rejects cross-site and Origin-less requests", async () => {
    expect((await attempt(PASSCODE, { origin: "https://evil.example" })).status).toBe(403);
    expect((await attempt(PASSCODE, { origin: null })).status).toBe(403);
  });

  it("rejects a malformed body", async () => {
    const res = await unlock(makeRequest("/api/auth/unlock", { body: { pass: 1 } }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/lock", () => {
  it("clears the cookie", async () => {
    const res = await lock(makeRequest("/api/auth/lock"));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });
});
