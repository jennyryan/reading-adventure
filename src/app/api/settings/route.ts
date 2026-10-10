import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireGrownup } from "@/lib/auth/guard";
import { parseBody } from "@/lib/http";
import { readingGoal } from "@/lib/validation";

const Body = z.object({ readingGoal });

/** Change the reading goal (the "N" in "X of N books read"). */
export const PUT = requireGrownup(async (req) => {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;

  const [row] = await db()
    .insert(settings)
    .values({ id: 1, readingGoal: parsed.data.readingGoal })
    .onConflictDoUpdate({ target: settings.id, set: { readingGoal: parsed.data.readingGoal } })
    .returning();
  return NextResponse.json({ settings: row });
});
