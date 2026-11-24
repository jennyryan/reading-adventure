import { NextResponse, type NextRequest } from "next/server";
import { EDIT_COOKIE, mayEdit } from "@/lib/editAccess";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";

const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** Reached without the passcode: entering it, and the demo's nightly reset (which has its own secret). */
const OPEN = new Set(["/api/unlock", "/api/demo/reset"]);

/**
 * Changes to the shelf need the editing passcode, when the site has one
 * (see lib/editAccess). Reading the shelf and searching for books don't.
 */
export function proxy(req: NextRequest) {
  if (!WRITES.has(req.method) || OPEN.has(req.nextUrl.pathname)) return NextResponse.next();
  if (mayEdit(env().editPasscode, req.cookies.get(EDIT_COOKIE)?.value)) return NextResponse.next();
  return jsonError(401, "locked");
}

export const config = { matcher: "/api/:path*" };
