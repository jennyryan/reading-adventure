import { and, eq, ne } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { jsonError, parseBody, parseId } from "@/lib/http";
import { coverUrl } from "@/lib/validation";

type Ctx = RouteContext<"/api/books/[id]">;

const Patch = z
  .object({
    title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(300).nullable(),
    coverUrl: coverUrl.nullable(),
    // Set when a different book is picked from search to replace this one.
    openLibraryWorkId: z.string().regex(/^OL\d+W$/).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Edit a book's details, or swap in a different book picked from search. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const parsed = await parseBody(req, Patch);
  if ("response" in parsed) return parsed.response;

  // Each Open Library book can only be on the shelf once.
  const workId = parsed.data.openLibraryWorkId;
  if (workId) {
    const taken = await db().query.books.findFirst({
      where: and(eq(books.openLibraryWorkId, workId), ne(books.id, id)),
      columns: { title: true },
    });
    if (taken) return jsonError(409, `“${taken.title}” is already on the shelf.`);
  }

  const [book] = await db().update(books).set(parsed.data).where(eq(books.id, id)).returning();
  return book ? NextResponse.json({ book }) : jsonError(404, "Book not found.");
}

/** Remove a book from the shelf, along with its readings. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const [book] = await db().delete(books).where(eq(books.id, id)).returning({ id: books.id });
  return book ? NextResponse.json({ ok: true }) : jsonError(404, "Book not found.");
}
