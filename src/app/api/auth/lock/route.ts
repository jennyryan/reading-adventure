import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/auth/guard";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

// Public on purpose: locking only removes your own cookie.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
