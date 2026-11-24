import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { bestCover, findSameBook } from "@/lib/books";
import { jsonError, parseBody, parseId } from "@/lib/http";
import { detectSeries } from "@/lib/series";
import { coverUrl, seriesHint } from "@/lib/validation";

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
    // The search result's series tag, sent along with a replacement book.
    series: seriesHint.nullable(),
    // Look the book's series up again (sent when a book with no series is
    // saved, so books added before a series was found can still get one).
    recheckSeries: z.literal(true),
  })
  .partial()
  .refine((v) => Object.keys(v).some((k) => k !== "series"), "Nothing to update");

/** Edit a book's details, or swap in a different book picked from search. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const parsed = await parseBody(req, Patch);
  if ("response" in parsed) return parsed.response;

  const current = await db().query.books.findFirst({ where: eq(books.id, id) });
  if (!current) return jsonError(404, "Book not found.");
  const { series: hint, recheckSeries, ...fields } = parsed.data;
  const changes = { ...fields };

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

  // A different book, or a corrected title or author, may be in a
  // different series: look it up again.
  let seriesFields: Partial<Awaited<ReturnType<typeof detectSeries>>> = {};
  if (identityChanged) {
    seriesFields = await detectSeries({ ...current, ...changes }, hint, id);
  } else if (recheckSeries && current.seriesId === null) {
    // A book saved before its series could be found: try again, and only
    // change it if a series turns up.
    const found = await detectSeries(current, null, id);
    if (found.seriesId !== null) {
      seriesFields = {
        seriesId: found.seriesId,
        seriesPosition: found.seriesPosition,
        ...(found.hardcoverBookId !== null && { hardcoverBookId: found.hardcoverBookId }),
      };
    }
  }

  if (Object.keys(changes).length === 0 && Object.keys(seriesFields).length === 0) {
    return NextResponse.json({ book: current });
  }

  const [book] = await db().update(books).set({ ...changes, ...seriesFields }).where(eq(books.id, id)).returning();
  return book ? NextResponse.json({ book }) : jsonError(404, "Book not found.");
}

/** Remove a book from the shelf, along with its readings. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError(404, "Book not found.");

  const [book] = await db().delete(books).where(eq(books.id, id)).returning({ id: books.id });
  return book ? NextResponse.json({ ok: true }) : jsonError(404, "Book not found.");
}
