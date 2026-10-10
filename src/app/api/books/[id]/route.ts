import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { requireGrownup } from "@/lib/auth/guard";
import { jsonError, parseBody, parseId } from "@/lib/http";
import { coverUrl } from "@/lib/validation";

type Ctx = RouteContext<"/api/books/[id]">;

const Patch = z
  .object({
    title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(300).nullable(),
    coverUrl: coverUrl.nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Edit a book's details, e.g. swap its cover. */
export const PATCH = requireGrownup(async (req, ctx: Ctx) => {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const parsed = await parseBody(req, Patch);
  if ("response" in parsed) return parsed.response;

  const [book] = await db().update(books).set(parsed.data).where(eq(books.id, id)).returning();
  return book ? NextResponse.json({ book }) : jsonError(404, "Book not found.");
});

/** Remove a book from the shelf, along with its readings. */
export const DELETE = requireGrownup(async (_req, ctx: Ctx) => {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const [book] = await db().delete(books).where(eq(books.id, id)).returning({ id: books.id });
  return book ? NextResponse.json({ ok: true }) : jsonError(404, "Book not found.");
});
