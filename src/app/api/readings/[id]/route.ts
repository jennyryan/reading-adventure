import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { requireGrownup } from "@/lib/auth/guard";
import { jsonError, parseBody, parseId } from "@/lib/http";
import { isoDate, rating } from "@/lib/validation";

const Patch = z
  .object({ rating, readAt: isoDate })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Change the stars or finished date on one reading. */
export const PATCH = requireGrownup(async (req, ctx: RouteContext<"/api/readings/[id]">) => {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Reading not found.");

  const parsed = await parseBody(req, Patch);
  if ("response" in parsed) return parsed.response;

  const [reading] = await db()
    .update(readings)
    .set(parsed.data)
    .where(eq(readings.id, id))
    .returning();
  return reading ? NextResponse.json({ reading }) : jsonError(404, "Reading not found.");
});
