import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, readings } from "@/db/schema";
import { parseBody } from "@/lib/http";
import { coverUrl, isoDate, rating } from "@/lib/validation";

const Body = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(300).nullish(),
  isbn: z.string().trim().max(20).nullish(),
  coverUrl: coverUrl.nullish(),
  openLibraryWorkId: z.string().regex(/^OL\d+W$/).nullish(),
  rating,
  readAt: isoDate,
});

/** Add a book Norah finished. Adding a book she already has logs a re-read. */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { rating, readAt, ...bookFields } = parsed.data;

  const existing = bookFields.openLibraryWorkId
    ? await db().query.books.findFirst({
        where: eq(books.openLibraryWorkId, bookFields.openLibraryWorkId),
      })
    : undefined;

  const book = existing ?? (await db().insert(books).values(bookFields).returning())[0];
  const [reading] = await db()
    .insert(readings)
    .values({ bookId: book.id, rating, readAt })
    .returning();

  return NextResponse.json({ book, reading }, { status: 201 });
}
