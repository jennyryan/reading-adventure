import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { isValidSession, SESSION_COOKIE } from "./session";

/**
 * Blocks cross-site requests. Browsers always send an Origin header on
 * POST/PUT/PATCH/DELETE, so a missing or foreign Origin means the request
 * didn't come from our own pages. This backs up the sameSite cookie.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Wrap every write route handler with this. The UI hiding buttons is only a
 * convenience: this check is what actually protects the data.
 */
export function requireGrownup<Ctx>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    if (!isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");
    if (!isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) {
      return jsonError(401, "Grown-up unlock required.");
    }
    return handler(req, ctx);
  };
}
