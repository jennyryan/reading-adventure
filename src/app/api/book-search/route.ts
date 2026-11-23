import { NextResponse, type NextRequest } from "next/server";
import { isSameBook } from "@/lib/bookMatch";
import { cleanTitle, seriesFromTitle, type SeriesHint } from "@/lib/bookTitle";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { pickIsbn, seriesFromOpenLibrary, type OpenLibrarySeriesFields } from "@/lib/openLibrary";

export type BookSearchResult = {
  title: string;
  author: string | null;
  isbn: string | null;
  coverUrl: string | null;
  /** The Google Books volume, when the result came from Google. */
  googleVolumeId: string | null;
  /** The Open Library work, when the result came from Open Library. */
  openLibraryWorkId: string | null;
  /**
   * The series the service names: Open Library's series field, or the tag
   * in Google's title, e.g. "(Dog Man #9)". A fallback for series detection.
   */
  series: SeriesHint | null;
};

const MAX_RESULTS = 8;
// Each search is remembered for a day, so repeats come straight from
// Next's cache instead of the book service.
const CACHE = { revalidate: 60 * 60 * 24 };

/**
 * Book search for the add-book dialog. It goes through our server so
 * visitors' browsers never contact the book services directly.
 *
 * Google Books answers quickly and knows recent children's books well, so
 * it's used when GOOGLE_BOOKS_API_KEY is set. Without a key (Google's
 * keyless quota is shared and usually used up), or if Google fails, search
 * falls back to Open Library: slower, but free and keyless.
 */
export async function GET(req: NextRequest) {
  // Normalized, so "Frog and Toad" and "frog  and toad" share a cache entry.
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (q.length < 2 || q.length > 200) return NextResponse.json({ results: [] });

  // Give up when the visitor moves on (typed more, closed the dialog), or
  // after 20s.
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(20_000)]);

  const key = env().googleBooksApiKey;
  if (key) {
    try {
      return NextResponse.json({ results: mergeEditions(await searchGoogle(q, key, signal)) });
    } catch {
      if (req.signal.aborted) return jsonError(499, "Search cancelled.");
      // Fall through to Open Library.
    }
  }

  try {
    return NextResponse.json({ results: mergeEditions(await searchOpenLibrary(q, signal)) });
  } catch {
    return jsonError(502, "Book search isn't working right now. You can type the book in instead.");
  }
}

/** Google lists each edition separately; show each book once (the first, best-ranked one). */
function mergeEditions(results: BookSearchResult[]) {
  const kept: BookSearchResult[] = [];
  for (const result of results) {
    const twin = kept.findIndex((k) => isSameBook(k, result));
    if (twin === -1) kept.push(result);
    // Prefer an edition with a cover.
    else if (!kept[twin].coverUrl && result.coverUrl) kept[twin] = result;
  }
  return kept.slice(0, MAX_RESULTS);
}

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string };
  };
};

async function searchGoogle(q: string, key: string, signal: AbortSignal): Promise<BookSearchResult[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("printType", "books");
  url.searchParams.set("langRestrict", "en");
  url.searchParams.set("maxResults", "20"); // extra, since editions get merged
  url.searchParams.set("fields", "items(id,volumeInfo(title,authors,industryIdentifiers,imageLinks/thumbnail))");
  url.searchParams.set("key", key);

  const res = await fetch(url, { next: CACHE, signal });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const items = ((await res.json()) as { items?: GoogleVolume[] }).items ?? [];

  return items.flatMap(({ id, volumeInfo: v }) => {
    if (!id || !v?.title) return [];
    const isbns = v.industryIdentifiers ?? [];
    const isbn =
      isbns.find((i) => i.type === "ISBN_13")?.identifier ?? isbns.find((i) => i.type === "ISBN_10")?.identifier;
    return [
      {
        title: cleanTitle(v.title),
        author: v.authors?.[0] ?? null,
        isbn: isbn ?? null,
        coverUrl: googleCover(v.imageLinks?.thumbnail),
        googleVolumeId: id,
        openLibraryWorkId: null,
        series: seriesFromTitle(v.title),
      },
    ];
  });
}

/**
 * Google's thumbnail link, made https and without the page-curl effect.
 * Only links on books.google.com/books/content are kept (the cover hosts
 * we allow).
 */
function googleCover(thumbnail: string | undefined) {
  if (!thumbnail) return null;
  try {
    const url = new URL(thumbnail.replace(/^http:/, "https:"));
    if (url.hostname !== "books.google.com" || url.pathname !== "/books/content") return null;
    url.searchParams.delete("edge");
    return url.toString();
  } catch {
    return null;
  }
}

type OpenLibraryDoc = OpenLibrarySeriesFields & {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
};

async function searchOpenLibrary(q: string, signal: AbortSignal): Promise<BookSearchResult[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "key,title,author_name,cover_i,isbn,series_name,series_position");
  url.searchParams.set("limit", String(MAX_RESULTS));

  const res = await fetch(url, {
    headers: { "User-Agent": "ReadingAdventure/1.0" },
    next: CACHE,
    signal,
  });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const docs = ((await res.json()) as { docs?: OpenLibraryDoc[] }).docs ?? [];

  return docs.flatMap((doc) => {
    const workId = doc.key?.match(/^\/works\/(OL\d+W)$/)?.[1];
    if (!workId || !doc.title) return [];
    return [
      {
        title: cleanTitle(doc.title),
        author: doc.author_name?.[0] ?? null,
        isbn: pickIsbn(doc.isbn),
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        googleVolumeId: null,
        openLibraryWorkId: workId,
        series: seriesFromOpenLibrary(doc) ?? seriesFromTitle(doc.title),
      },
    ];
  });
}
