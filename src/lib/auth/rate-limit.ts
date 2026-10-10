// Fixed-window rate limiting for the passcode endpoint.
//
// Vercel runs many short-lived server instances, so counts must live in the
// database rather than in memory. The store is an interface so tests can use
// an in-memory version.

export type AttemptStore = {
  /** Record one attempt and return the count in the current window. */
  hit(key: string, windowMs: number): Promise<{ count: number; windowStart: Date }>;
  clear(key: string): Promise<void>;
};

export const WINDOW_MS = 15 * 60 * 1000;
/** Wrong guesses allowed per device (IP) per window. */
export const MAX_PER_CLIENT = 5;
/** Ceiling across all devices, in case someone guesses from many IPs. */
export const MAX_GLOBAL = 30;
export const GLOBAL_KEY = "global";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  store: AttemptStore,
  clientKey: string,
  nowMs: number = Date.now(),
): Promise<RateLimitResult> {
  const [client, global] = await Promise.all([
    store.hit(clientKey, WINDOW_MS),
    store.hit(GLOBAL_KEY, WINDOW_MS),
  ]);

  const blocked = [
    client.count > MAX_PER_CLIENT ? client : null,
    global.count > MAX_GLOBAL ? global : null,
  ].filter((w) => w !== null);

  if (blocked.length === 0) return { allowed: true };

  const resetAt = Math.max(...blocked.map((w) => w.windowStart.getTime() + WINDOW_MS));
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - nowMs) / 1000)) };
}

/** In-memory store for tests and local experiments. Not for production. */
export function memoryStore(now: () => number = Date.now): AttemptStore {
  const windows = new Map<string, { count: number; windowStart: Date }>();
  return {
    async hit(key, windowMs) {
      const current = windows.get(key);
      const expired = !current || current.windowStart.getTime() + windowMs <= now();
      const next = expired
        ? { count: 1, windowStart: new Date(now()) }
        : { count: current.count + 1, windowStart: current.windowStart };
      windows.set(key, next);
      return next;
    },
    async clear(key) {
      windows.delete(key);
    },
  };
}
