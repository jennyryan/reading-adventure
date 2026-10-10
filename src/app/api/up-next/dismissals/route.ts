import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { upNextDismissals } from "@/db/schema";
import { requireGrownup } from "@/lib/auth/guard";
import { parseBody } from "@/lib/http";

const Body = z.object({ hardcoverBookId: z.int().positive() });

/** Hide a series book from the Up Next shelf for good. */
export const POST = requireGrownup(async (req) => {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;

  await db().insert(upNextDismissals).values(parsed.data).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
});
