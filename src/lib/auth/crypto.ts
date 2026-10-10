import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison. Both sides are hashed first so the
 * comparison takes the same time whatever their lengths, and
 * timingSafeEqual (which requires equal lengths) never throws.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Session token format: "v1.<expiresAtMs>.<signature>". The signature is an
// HMAC of the first two parts, so nobody can forge or extend a token without
// SESSION_SECRET. There is no session table: the token is the proof.
const VERSION = "v1";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(secret: string, nowMs: number, ttlMs: number): string {
  const payload = `${VERSION}.${nowMs + ttlMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs: number,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [version, expiresAt, signature] = parts;
  if (version !== VERSION || !/^\d+$/.test(expiresAt)) return false;

  const expected = Buffer.from(sign(`${version}.${expiresAt}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  return Number(expiresAt) > nowMs;
}

/** Keyed hash used for rate-limit keys, so raw IP addresses are never stored. */
export function hashKey(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
