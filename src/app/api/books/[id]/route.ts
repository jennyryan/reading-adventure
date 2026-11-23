import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { bestCover, findSameBook } from "@/lib/books";
import { jsonError, parseBody, parseId } from "@/lib/http";
import { coverUrl } from "@/lib/validation";

type Ctx = RouteContext<"/api/books/[id]">;

const Patch = z
  .object({
    title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(300).nullable(),
    coverUrl: coverUrl.nullable(),
    // Set when a different book is picked from search to replace this one.
    isbn: z.string().trim().max(20).nullable(),
    openLibraryWorkId: z.string().regex(/^OL\d+W$/).nullable(),
    googleVolumeId: z.string().regex(/^[\w-]{1,40}$/).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Edit a book's details, or swap in a different book picked from search. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const parsed = await parseBody(req, Patch);
  if ("response" in parsed) return parsed.response;

  const current = await db().query.books.findFirst({ where: eq(books.id, id) });
  if (!current) return jsonError(404, "Book not found.");
  const changes = { ...parsed.data };

  // A book can only be on the shelf once: check the edited book against
  // every other one (same ISBN or work, or same title and author).
  const identityChanged = (["title", "author", "isbn", "openLibraryWorkId"] as const).some((k) => k in changes);
  if (identityChanged) {
    const taken = await findSameBook({ ...current, ...changes }, id);
    if (taken) return jsonError(409, `“${taken.title}” is already on the shelf.`);
  }

  // A different book from search: keep Open Library's sharper cover when
  // it has one for this ISBN.
  if ("isbn" in changes) changes.coverUrl = await bestCover(changes.isbn, changes.coverUrl);

  const [book] = await db().update(books).set(changes).where(eq(books.id, id)).returning();
  return book ? NextResponse.json({ book }) : jsonError(404, "Book not found.");
}

/** Remove a book from the shelf, along with its readings. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const [book] = await db().delete(books).where(eq(books.id, id)).returning({ id: books.id });
  return book ? NextResponse.json({ ok: true }) : jsonError(404, "Book not found.");
}
