import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { dbAttemptStore } from "@/lib/auth/attempt-store";
import { hashKey, safeEqual } from "@/lib/auth/crypto";
import { isSameOrigin } from "@/lib/auth/guard";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { newSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { jsonError, parseBody } from "@/lib/http";

const Body = z.object({ passcode: z.string().min(1).max(200) });

/** Vercel sets these headers itself, overwriting anything the client sent. */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// Public on purpose: this is how a grown-up gets the cookie in the first place.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");

  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;

  const { grownupPasscode, sessionSecret } = env();
  const clientKey = `ip:${hashKey(clientIp(req), sessionSecret)}`;

  // Every attempt counts, checked before the passcode, so a locked-out
  // guesser learns nothing even when they finally guess right.
  const limit = await checkRateLimit(dbAttemptStore, clientKey);
  if (!limit.allowed) {
    return jsonError(429, "Too many tries. Please wait a bit and try again.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  if (!safeEqual(parsed.data.passcode, grownupPasscode)) {
    return jsonError(401, "That passcode isn't right.");
  }

  await dbAttemptStore.clear(clientKey);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, newSessionToken(), sessionCookieOptions());
  return res;
}
