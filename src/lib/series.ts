// Working out which series a book is in, when it's added or swapped for a
// different book. Hardcover is asked first; the series tag in the search
// result's title ("(Dog Man #9)") is the fallback when there's no token,
// Hardcover is down, or Hardcover doesn't know the book's series.

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, series, seriesMembers } from "@/db/schema";
import type { SeriesHint } from "./bookTitle";
import { env } from "./env";
import { fetchSeriesMembers, findHardcoverBook, type HardcoverBook } from "./hardcover";

/** What gets saved on the book. */
export type BookSeriesFields = {
  seriesId: number | null;
  seriesPosition: number | null;
  hardcoverBookId: number | null;
};

/** Hardcover is skipped after this long, so adding a book never hangs on it. */
const HARDCOVER_TIMEOUT_MS = 6000;
/** How long a series' saved book list is trusted before it's fetched again. */
const MEMBERS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** The series to save: Hardcover's when it has one, otherwise the title's tag. */
export function chooseSeries(hardcover: HardcoverBook | null, hint: SeriesHint | null | undefined) {
  if (hardcover?.series) return hardcover.series;
  return hint ? { ...hint, hardcoverSeriesId: null } : null;
}

/**
 * The series fields for a book. Never throws: if nothing can be found the
 * book is simply saved without a series.
 */
export async function detectSeries(
  book: { title: string; author?: string | null; isbn?: string | null },
  hint?: SeriesHint | null,
  /** The book being edited, so it doesn't clash with itself. */
  excludeBookId?: number,
): Promise<BookSeriesFields> {
  let hardcover: HardcoverBook | null = null;
  const token = env().hardcoverToken;
  if (token) {
    try {
      hardcover = await findHardcoverBook(token, book, AbortSignal.timeout(HARDCOVER_TIMEOUT_MS));
    } catch (err) {
      console.warn(`Series lookup on Hardcover failed for “${book.title}”:`, err instanceof Error ? err.message : err);
    }
  }

  const chosen = chooseSeries(hardcover, hint);
  let fields: BookSeriesFields;
  try {
    fields = {
      seriesId: chosen ? await saveSeries(chosen) : null,
      seriesPosition: chosen?.position ?? null,
      hardcoverBookId: hardcover ? await unclaimedHardcoverId(hardcover.bookId, excludeBookId) : null,
    };
  } catch (err) {
    console.warn(`Saving the series for “${book.title}” failed:`, err instanceof Error ? err.message : err);
    return { seriesId: null, seriesPosition: null, hardcoverBookId: null };
  }

  // The series' full book list, for the "By series" view's "3 of 12 read".
  if (token && fields.seriesId !== null && chosen?.hardcoverSeriesId) {
    try {
      await refreshSeriesMembers(token, fields.seriesId, chosen.hardcoverSeriesId);
    } catch (err) {
      console.warn(`Fetching the books in “${chosen.name}” failed:`, err instanceof Error ? err.message : err);
    }
  }
  return fields;
}

/** Saves the series' book list from Hardcover, unless it was fetched recently. */
async function refreshSeriesMembers(token: string, seriesId: number, hardcoverSeriesId: number) {
  const row = await db().query.series.findFirst({ where: eq(series.id, seriesId) });
  if (row?.membersFetchedAt && Date.now() - row.membersFetchedAt.getTime() < MEMBERS_MAX_AGE_MS) return;

  const members = await fetchSeriesMembers(token, hardcoverSeriesId, AbortSignal.timeout(HARDCOVER_TIMEOUT_MS));
  // An empty answer is more likely a hiccup than a series with no books:
  // keep what was saved before.
  if (members.length === 0) return;

  await db().batch([
    db().delete(seriesMembers).where(eq(seriesMembers.seriesId, seriesId)),
    db()
      .insert(seriesMembers)
      .values(members.map((m) => ({ ...m, seriesId }))),
    db().update(series).set({ membersFetchedAt: new Date() }).where(eq(series.id, seriesId)),
  ]);
}

/**
 * The id of our row for this series, created if it's new. A series first
 * found by its title tag is matched by name, and gets its Hardcover id
 * once Hardcover confirms it, so it's never listed twice.
 */
async function saveSeries(found: { name: string; hardcoverSeriesId: number | null }): Promise<number> {
  const name = found.name.trim();
  const sameName = sql`lower(${series.name}) = ${name.toLowerCase()}`;

  if (found.hardcoverSeriesId !== null) {
    const known = await db().query.series.findFirst({ where: eq(series.hardcoverSeriesId, found.hardcoverSeriesId) });
    if (known) return known.id;
    const [adopted] = await db()
      .update(series)
      .set({ hardcoverSeriesId: found.hardcoverSeriesId })
      .where(and(sameName, isNull(series.hardcoverSeriesId)))
      .returning({ id: series.id });
    if (adopted) return adopted.id;
  } else {
    const known = await db().query.series.findFirst({ where: sameName });
    if (known) return known.id;
  }

  const [created] = await db()
    .insert(series)
    .values({ name, hardcoverSeriesId: found.hardcoverSeriesId })
    .onConflictDoUpdate({ target: series.hardcoverSeriesId, set: { name } })
    .returning({ id: series.id });
  return created.id;
}

/** Hardcover book ids are unique on the shelf; leave it unset if another book already has it. */
async function unclaimedHardcoverId(hardcoverBookId: number, excludeBookId?: number) {
  const other = await db().query.books.findFirst({
    where: and(
      eq(books.hardcoverBookId, hardcoverBookId),
      excludeBookId === undefined ? undefined : ne(books.id, excludeBookId),
    ),
  });
  return other ? null : hardcoverBookId;
}
