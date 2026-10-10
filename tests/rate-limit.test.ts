import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  MAX_GLOBAL,
  MAX_PER_CLIENT,
  memoryStore,
  WINDOW_MS,
} from "@/lib/auth/rate-limit";

describe("checkRateLimit", () => {
  it(`allows ${MAX_PER_CLIENT} attempts per client, then blocks with Retry-After`, async () => {
    let now = 0;
    const store = memoryStore(() => now);
    for (let i = 0; i < MAX_PER_CLIENT; i++) {
      expect(await checkRateLimit(store, "a", now)).toEqual({ allowed: true });
    }
    now = 60_000;
    expect(await checkRateLimit(store, "a", now)).toEqual({
      allowed: false,
      retryAfterSeconds: (WINDOW_MS - 60_000) / 1000,
    });
    // A different device is unaffected.
    expect(await checkRateLimit(store, "b", now)).toEqual({ allowed: true });
  });

  it("opens again once the window has passed", async () => {
    let now = 0;
    const store = memoryStore(() => now);
    for (let i = 0; i <= MAX_PER_CLIENT; i++) await checkRateLimit(store, "a", now);
    now = WINDOW_MS;
    expect(await checkRateLimit(store, "a", now)).toEqual({ allowed: true });
  });

  it("caps attempts across all clients", async () => {
    const store = memoryStore(() => 0);
    for (let i = 0; i < MAX_GLOBAL; i++) {
      expect((await checkRateLimit(store, `client-${i}`, 0)).allowed).toBe(true);
    }
    expect((await checkRateLimit(store, "client-new", 0)).allowed).toBe(false);
  });

  it("clear() resets a client after a successful unlock", async () => {
    const store = memoryStore(() => 0);
    for (let i = 0; i < MAX_PER_CLIENT; i++) await checkRateLimit(store, "a", 0);
    await store.clear("a");
    expect((await checkRateLimit(store, "a", 0)).allowed).toBe(true);
  });
});
