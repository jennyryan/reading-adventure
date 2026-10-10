import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { createSessionToken, verifySessionToken } from "./crypto";

export const SESSION_COOKIE = "grownup_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Cookie settings for the unlock cookie:
 * - httpOnly: page JavaScript can't read it, so injected scripts can't steal it.
 * - secure: HTTPS only. Relaxed in local dev because http://localhost isn't HTTPS.
 * - sameSite "strict": never sent on requests that start from another site.
 */
export function sessionCookieOptions(production = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function newSessionToken(nowMs = Date.now()): string {
  return createSessionToken(env().sessionSecret, nowMs, SESSION_TTL_MS);
}

export function isValidSession(token: string | undefined, nowMs = Date.now()): boolean {
  return verifySessionToken(token, env().sessionSecret, nowMs);
}

/** For Server Components: is the current visitor an unlocked grown-up? */
export async function isGrownup(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(SESSION_COOKIE)?.value);
}
