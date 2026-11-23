import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, readings } from "@/db/schema";
import { bestCover, findSameBook } from "@/lib/books";
import { parseBody } from "@/lib/http";
import { detectSeries } from "@/lib/series";
import { coverUrl, isoDate, rating, seriesHint } from "@/lib/validation";

const Body = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(300).nullish(),
  isbn: z.string().trim().max(20).nullish(),
  coverUrl: coverUrl.nullish(),
  openLibraryWorkId: z.string().regex(/^OL\d+W$/).nullish(),
  googleVolumeId: z.string().regex(/^[\w-]{1,40}$/).nullish(),
  series: seriesHint.nullish(),
  rating,
  readAt: isoDate,
});

/**
 * Add a book Norah finished. Adding a book she already has (same ISBN or
 * Open Library work, or the same title and author) logs a re-read instead.
 * A new book's series is looked up before it's saved (see src/lib/series.ts).
 */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { rating, readAt, series, ...bookFields } = parsed.data;

  const existing = await findSameBook(bookFields);
  const book =
    existing ??
    (
      await db()
        .insert(books)
        .values({
          ...bookFields,
          ...(await detectSeries(bookFields, series)),
          coverUrl: await bestCover(bookFields.isbn, bookFields.coverUrl),
        })
        .returning()
    )[0];
  const [reading] = await db()
    .insert(readings)
    .values({ bookId: book.id, rating, readAt })
    .returning();

  return NextResponse.json({ book, reading }, { status: 201 });
}
