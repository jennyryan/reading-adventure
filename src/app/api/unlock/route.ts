import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { EDIT_COOKIE, EDIT_COOKIE_MAX_AGE, editToken, sameSecret } from "@/lib/editAccess";
import { env } from "@/lib/env";
import { jsonError, parseBody } from "@/lib/http";

const Body = z.object({ passcode: z.string().max(200) });

/** Enter the editing passcode; this device is then remembered for a year. */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;

  const passcode = env().editPasscode;
  if (!passcode) return NextResponse.json({ ok: true });
  if (!sameSecret(parsed.data.passcode.trim(), passcode)) return jsonError(403, "That's not the right passcode.");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(EDIT_COOKIE, editToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EDIT_COOKIE_MAX_AGE,
  });
  return res;
}
