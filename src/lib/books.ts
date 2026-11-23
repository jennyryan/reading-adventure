import { and, eq, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { isSameBook } from "./bookMatch";

// Finding a book already on the shelf, and choosing the best cover.

/**
 * Finds a book already on the shelf that is the same book as this one: the
 * same ISBN or Open Library work, or a matching title and author. Pass
 * `excludeId` when checking a book against everything but itself.
 */
export async function findSameBook(
  book: { title: string; author?: string | null; isbn?: string | null; openLibraryWorkId?: string | null },
  excludeId?: number,
) {
  const exact: SQL[] = [];
  if (book.isbn) exact.push(eq(books.isbn, book.isbn));
  if (book.openLibraryWorkId) exact.push(eq(books.openLibraryWorkId, book.openLibraryWorkId));
  const notSelf = excludeId === undefined ? undefined : ne(books.id, excludeId);

  if (exact.length > 0) {
    const match = await db().query.books.findFirst({ where: and(or(...exact), notSelf) });
    if (match) return match;
  }

  // Title match: compare simplified titles in code (the shelf is small).
  const all = await db().select().from(books).where(notSelf);
  return all.find((other) => isSameBook(book, other)) ?? null;
}

/**
 * The cover to keep for a book: Open Library's, found by ISBN, when it has
 * one (usually larger and sharper), otherwise the cover the search gave.
 */
export async function bestCover(isbn: string | null | undefined, fallback: string | null | undefined) {
  if (isbn) {
    const openLibrary = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-M.jpg`;
    try {
      // ?default=false makes a missing cover a 404 instead of a blank image.
      const res = await fetch(`${openLibrary}?default=false`, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return openLibrary;
    } catch {
      // Slow or down: use the fallback.
    }
  }
  return fallback ?? null;
}
