// The shelf grouped by series, for the "By series" view.

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { seriesMembers } from "@/db/schema";
import { fetchOpenLibrarySeriesBooks, findOpenLibrarySeriesKey } from "./openLibrary";
import type { ShelfBook } from "./shelf";

/** One place in a series: a book Norah has read, or one she hasn't yet. */
export type SeriesSlot = {
  position: number | null;
  title: string;
  /** Her copy, when she's read it. */
  book: ShelfBook | null;
};

export type SeriesGroup = {
  id: number;
  name: string;
  /** How many numbered books the series has, when we know its book list. */
  total: number | null;
  /** How many of those she's read (or, without a total, how many she's read at all). */
  read: number;
  slots: SeriesSlot[];
};

export type SeriesShelf = { series: SeriesGroup[]; standalone: ShelfBook[] };

type Member = { seriesId: number; title: string; position: number | null };

const byPosition = (a: { position: number | null }, b: { position: number | null }) =>
  (a.position ?? Infinity) - (b.position ?? Infinity);

/**
 * Groups shelf books (newest read first) by series. A series whose book
 * list we have shows every numbered book, read or not, with a blank slot
 * for any number the list skips. Without a list, every number up to the
 * highest she's read still gets a slot: having read #6 means #1 to #5
 * exist, even if we don't know their titles or how many come after.
 * Series she read from most recently come first.
 */
export function groupBySeries(books: ShelfBook[], members: Member[]): SeriesShelf {
  const groups = new Map<number, { name: string; books: ShelfBook[] }>();
  const standalone: ShelfBook[] = [];
  for (const book of books) {
    if (!book.series) {
      standalone.push(book);
      continue;
    }
    const group = groups.get(book.series.id) ?? { name: book.series.name, books: [] };
    group.books.push(book);
    groups.set(book.series.id, group);
  }

  // Map order follows the books' order, so the most recently read series is first.
  const series = [...groups].map(([id, group]): SeriesGroup => {
    const list = members.filter((m) => m.seriesId === id).sort(byPosition);
    const slotOf = (book: ShelfBook): SeriesSlot => ({ position: book.series?.position ?? null, title: book.title, book });

    // Every number from 1 to the last one known, so "of 7" is always seven slots.
    const highestRead = Math.max(0, ...group.books.map((b) => b.series?.position ?? 0).filter(Number.isInteger));
    const last = list.length > 0 ? Math.max(...list.map((m) => m.position ?? 0)) : highestRead;
    const unplaced = new Set(group.books);
    const slots = Array.from({ length: last }, (_, i): SeriesSlot => {
      const position = i + 1;
      const book = group.books.find((b) => unplaced.has(b) && b.series?.position === position) ?? null;
      if (book) unplaced.delete(book);
      return { position, title: book?.title ?? list.find((m) => m.position === position)?.title ?? "", book };
    });
    const read = slots.filter((slot) => slot.book).length;
    // Books she's read that aren't on the list (an in-between "1.5", say) still show.
    slots.push(...[...unplaced].map(slotOf));
    return list.length > 0
      ? { id, name: group.name, total: last, read, slots: slots.sort(byPosition) }
      : { id, name: group.name, total: null, read: group.books.length, slots: slots.sort(byPosition) };
  });

  return { series, standalone };
}

/**
 * The shelf's books grouped by series. Each series' book list is the one
 * saved from Hardcover, or else Open Library's, fetched now (and cached).
 */
export async function getSeriesShelf(books: ShelfBook[]): Promise<SeriesShelf> {
  const ids = [...new Set(books.flatMap((b) => (b.series ? [b.series.id] : [])))];
  const saved =
    ids.length === 0
      ? []
      : await db()
          .select({ seriesId: seriesMembers.seriesId, title: seriesMembers.title, position: seriesMembers.position })
          .from(seriesMembers)
          .where(inArray(seriesMembers.seriesId, ids));

  const missing = ids.filter((id) => !saved.some((m) => m.seriesId === id));
  const fetched = await Promise.all(missing.map((id) => openLibraryMembers(id, books)));
  return groupBySeries(books, [...saved, ...fetched.flat()]);
}

/** A series' book list from Open Library, or none if it can't be found in time. */
async function openLibraryMembers(seriesId: number, books: ShelfBook[]): Promise<Member[]> {
  const inSeries = books.filter((b) => b.series?.id === seriesId);
  // A book picked from Open Library leads straight to its series.
  const lead = inSeries.find((b) => b.openLibraryWorkId) ?? inSeries[0];
  if (!lead?.series) return [];
  try {
    const signal = AbortSignal.timeout(8000);
    const key = await findOpenLibrarySeriesKey(lead, lead.series.name, signal);
    if (!key) return [];
    const list = await fetchOpenLibrarySeriesBooks(key, signal);
    return list.map((m) => ({ seriesId, ...m }));
  } catch (err) {
    console.warn(`Open Library's list for “${lead.series.name}” wasn't available:`, err instanceof Error ? err.message : err);
    return [];
  }
}
