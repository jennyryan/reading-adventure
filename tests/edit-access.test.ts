import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { EDIT_COOKIE, editToken, mayEdit, sameSecret } from "@/lib/editAccess";
import { SAMPLE } from "@/lib/sampleShelf";

// Each test picks the site's settings.
const settings = vi.hoisted(() => ({ editPasscode: null as string | null, demoResetSecret: null as string | null }));
vi.mock("@/lib/env", () => ({ env: () => ({ ...settings, readerName: "Norah" }) }));
const reset = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/sampleShelf", async (original) => ({
  ...(await original<typeof import("@/lib/sampleShelf")>()),
  resetToSampleShelf: reset,
}));
vi.mock("@/db", () => ({ db: () => ({}) }));

const { proxy } = await import("@/proxy");
const { POST: unlock } = await import("@/app/api/unlock/route");
const { GET: demoReset } = await import("@/app/api/demo/reset/route");

function request(path: string, init: { method?: string; cookie?: string; auth?: string; body?: unknown } = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", `${EDIT_COOKIE}=${init.cookie}`);
  if (init.auth) headers.set("authorization", init.auth);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
/** Whether the proxy lets the request through to the route. */
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";

beforeEach(() => {
  settings.editPasscode = null;
  settings.demoResetSecret = null;
  reset.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("editing passcode", () => {
  it("signs passcodes so the cookie can't be turned back into one", () => {
    expect(editToken("bookworm")).not.toContain("bookworm");
    expect(editToken("bookworm")).toBe(editToken("bookworm"));
    expect(editToken("bookworm")).not.toBe(editToken("bookworm2"));
    expect(sameSecret("abc", "abc")).toBe(true);
    expect(sameSecret("abc", "abcd")).toBe(false);
  });

  it("lets anyone edit when the site has no passcode", () => {
    expect(mayEdit(null, undefined)).toBe(true);
    expect(passes(proxy(request("/api/books", { method: "POST" })))).toBe(true);
  });

  it("blocks changes without the passcode's cookie, but never blocks reading", async () => {
    settings.editPasscode = "bookworm";
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      const res = proxy(request("/api/books/1", { method }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "locked" });
    }
    expect(proxy(request("/api/books", { method: "POST", cookie: editToken("old passcode") })).status).toBe(401);
    expect(passes(proxy(request("/api/books", { method: "POST", cookie: editToken("bookworm") })))).toBe(true);
    expect(passes(proxy(request("/api/book-search?q=matilda")))).toBe(true);
    expect(passes(proxy(request("/api/unlock", { method: "POST" })))).toBe(true);
  });

  it("gives this device the cookie for the right passcode only", async () => {
    settings.editPasscode = "bookworm";
    const wrong = await unlock(request("/api/unlock", { method: "POST", body: { passcode: "nope" } }));
    expect(wrong.status).toBe(403);
    expect(wrong.headers.get("set-cookie")).toBeNull();

    const right = await unlock(request("/api/unlock", { method: "POST", body: { passcode: " bookworm " } }));
    expect(right.status).toBe(200);
    const cookie = right.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${EDIT_COOKIE}=${editToken("bookworm")}`);
    expect(cookie.toLowerCase()).toContain("httponly");
  });
});

describe("demo reset", () => {
  const secret = "a-long-demo-reset-secret";

  it("doesn't exist on a site that isn't the demo, even with a token", async () => {
    const res = await demoReset(request("/api/demo/reset", { auth: `Bearer ${secret}` }));
    expect(res.status).toBe(404);
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets the demo only with its secret (or Vercel's cron secret)", async () => {
    settings.demoResetSecret = secret;
    expect((await demoReset(request("/api/demo/reset"))).status).toBe(401);
    expect((await demoReset(request("/api/demo/reset", { auth: "Bearer wrong" }))).status).toBe(401);
    expect(reset).not.toHaveBeenCalled();

    expect((await demoReset(request("/api/demo/reset", { auth: `Bearer ${secret}` }))).status).toBe(200);
    vi.stubEnv("CRON_SECRET", "vercels-own-cron-secret");
    expect((await demoReset(request("/api/demo/reset", { auth: "Bearer vercels-own-cron-secret" }))).status).toBe(200);
    expect(reset).toHaveBeenCalledTimes(2);
  });
});

describe("sample shelf", () => {
  it("has at least 10 books, with several series", () => {
    expect(SAMPLE.length).toBeGreaterThanOrEqual(10);
    const series = new Set(SAMPLE.flatMap((b) => (b.series ? [b.series.name] : [])));
    expect(series.size).toBeGreaterThanOrEqual(3);
    expect(new Set(SAMPLE.map((b) => b.workId)).size).toBe(SAMPLE.length);
  });
});
