// Bits of Open Library's search results (openlibrary.org/dev/docs/api/search)
// that need a little interpreting.

import { authorKey, isSameBook, titleKey } from "./bookMatch";
import { cleanTitle, type SeriesHint } from "./bookTitle";

/** The fields of a search result these helpers read. */
export type OpenLibrarySeriesFields = { series_name?: string[]; series_position?: string[] };

/**
 * The series Open Library lists for a book, e.g. Harry Potter, 2. Positions
 * are free text ("2", "Book 2", "2.5"). A box set's range ("1-7") gives no
 * position: it's in the series, but isn't book 1.
 */
export function seriesFromOpenLibrary(doc: OpenLibrarySeriesFields): SeriesHint | null {
  const name = doc.series_name?.[0]?.trim();
  if (!name) return null;
  const number = doc.series_position?.[0]?.trim().match(/^\D*?(\d+(?:\.\d+)?)$/)?.[1];
  return { name, position: number === undefined ? null : Number(number) };
}

/**
 * One ISBN for a book, from Open Library's list of every edition's. English
 * editions are preferred: an ISBN-13 starting 978-0 or 978-1 is from an
 * English-language publisher. Without one, any ISBN-13, then anything.
 */
export function pickIsbn(isbns: string[] | undefined): string | null {
  if (!isbns?.length) return null;
  return (
    isbns.find((i) => /^978[01]\d{9}$/.test(i)) ?? isbns.find((i) => i.length === 13) ?? isbns[0]
  );
}

/** The series Open Library lists for a work (e.g. "OL82537W"), or null. Throws if Open Library can't be reached. */
export async function fetchOpenLibrarySeries(workId: string, signal?: AbortSignal): Promise<SeriesHint | null> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", `key:/works/${workId}`);
  url.searchParams.set("fields", "key,series_name,series_position");
  const res = await fetch(url, { headers: { "User-Agent": "ReadingAdventure/1.0" }, signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const docs = ((await res.json()) as { docs?: OpenLibrarySeriesFields[] }).docs ?? [];
  return docs[0] ? seriesFromOpenLibrary(docs[0]) : null;
}

// Series book lists, for the "By series" view when Hardcover hasn't given
// us one. Fetched as the view renders and cached by Next, so Open Library
// is asked at most about once a day per series.
const WEEK = { revalidate: 60 * 60 * 24 * 7 };
const DAY = { revalidate: 60 * 60 * 24 };

type SeriesDoc = OpenLibrarySeriesFields & {
  key?: string;
  title?: string;
  author_name?: string[];
  series_key?: string[];
  edition_count?: number;
};

async function searchDocs(params: Record<string, string>, cache: { revalidate: number }, signal?: AbortSignal) {
  const url = new URL("https://openlibrary.org/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "User-Agent": "ReadingAdventure/1.0" }, next: cache, signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  return ((await res.json()) as { docs?: SeriesDoc[] }).docs ?? [];
}

/**
 * Open Library's key for the series a book is in (e.g. "OL326110L"), found
 * from the book's Open Library work, or else by its title and author.
 * When the book is in several series, the one named `seriesName` wins.
 */
export async function findOpenLibrarySeriesKey(
  book: { title: string; author?: string | null; openLibraryWorkId?: string | null },
  seriesName: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const fields = "key,title,author_name,series_key,series_name";
  const doc = book.openLibraryWorkId
    ? (await searchDocs({ q: `key:/works/${book.openLibraryWorkId}`, fields }, WEEK, signal))[0]
    : await findSameDoc(book, fields, signal);
  const keys = doc?.series_key ?? [];
  const named = doc?.series_name?.findIndex((n) => n.trim().toLowerCase() === seriesName.trim().toLowerCase()) ?? -1;
  const key = keys[named >= 0 ? named : 0];
  return key && /^OL\d+L$/.test(key) ? key : null;
}

/**
 * The series Open Library lists for a book, found by its title and author,
 * or null. For books picked from Google, whose results don't name series.
 */
export async function findOpenLibrarySeries(
  book: { title: string; author?: string | null },
  signal?: AbortSignal,
): Promise<SeriesHint | null> {
  const doc = await findSameDoc(book, "key,title,author_name,series_name,series_position", signal);
  return doc ? seriesFromOpenLibrary(doc) : null;
}

/**
 * Open Library's entry for a book, by title and author, among those it
 * lists in a series. Google often puts the series in the title ("Diary of
 * a Wimpy Kid: Rodrick Rules") where Open Library has just "Rodrick Rules":
 * that counts too, as long as the author matches.
 */
async function findSameDoc(book: { title: string; author?: string | null }, fields: string, signal?: AbortSignal) {
  const docs = await searchDocs(
    { q: [cleanTitle(book.title), book.author].filter(Boolean).join(" "), fields, limit: "10" },
    WEEK,
    signal,
  );
  const target = titleKey(book.title);
  const author = authorKey(book.author);
  return docs.find((doc) => {
    if (!doc.title || !doc.series_name?.length) return false;
    if (isSameBook(book, { title: doc.title, author: doc.author_name?.[0] ?? null })) return true;
    const sameAuthor = author !== null && doc.author_name?.some((a) => authorKey(a) === author);
    return (
      sameAuthor &&
      doc.series_name.some((name) => [`${name}: ${doc.title}`, `${name} ${doc.title}`].some((t) => titleKey(t) === target))
    );
  });
}

/**
 * The numbered books in an Open Library series, one per number (the one
 * with the most editions, when there are several), leaving out box sets
 * like "1-7" and extras like "1.5".
 */
export async function fetchOpenLibrarySeriesBooks(
  seriesKey: string,
  signal?: AbortSignal,
): Promise<{ title: string; position: number }[]> {
  const docs = await searchDocs(
    { q: `series_key:${seriesKey}`, fields: "key,title,series_key,series_position,edition_count", limit: "200" },
    DAY,
    signal,
  );
  const best = new Map<number, { title: string; editions: number }>();
  for (const doc of docs) {
    const i = doc.series_key?.indexOf(seriesKey) ?? -1;
    const raw = doc.series_position?.[i]?.trim();
    if (!doc.title || !raw || !/^\d+$/.test(raw)) continue;
    const position = Number(raw);
    const editions = doc.edition_count ?? 0;
    if (position > 0 && editions > (best.get(position)?.editions ?? -1)) best.set(position, { title: doc.title, editions });
  }
  return [...best]
    .map(([position, { title }]) => ({ title, position }))
    .sort((a, b) => a.position - b.position);
}
