// Looking books up on Hardcover (hardcover.app), which knows which series a
// book belongs to and where it falls in it. Docs: docs.hardcover.app/api.
//
// Needs HARDCOVER_TOKEN, and only ever runs on our server: the token must
// never reach a browser. Each request costs one call per top-level field
// against Hardcover's limits (60 a minute, 5,000 a day on the free plan).

import { isSameBook } from "./bookMatch";
import type { SeriesHint } from "./bookTitle";

const ENDPOINT = "https://api.hardcover.app/v1/graphql";

/** A book as Hardcover knows it, with its main series (if any). */
export type HardcoverBook = {
  bookId: number;
  series: (SeriesHint & { hardcoverSeriesId: number }) | null;
};

// The book's featured series first (the one Hardcover shows on the book),
// skipping collections that only gather other books in the series.
const BOOK_FIELDS = `
  id
  book_series(
    where: { compilation: { _eq: false } }
    order_by: [{ featured: desc }, { position: asc_nulls_last }]
    limit: 1
  ) {
    position
    series { id name }
  }
`;

type RawBook = {
  id: number;
  book_series?: { position: number | null; series: { id: number; name: string } | null }[];
};

async function query<T>(token: string, gql: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Tokens copied from Hardcover's site sometimes already start with "Bearer".
      authorization: `Bearer ${token.replace(/^bearer\s+/i, "")}`,
      "user-agent": "ReadingAdventure/1.0 (series lookup)",
    },
    body: JSON.stringify({ query: gql, variables }),
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(`Hardcover ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message?: string }[] };
  if (json.errors?.length || !json.data) throw new Error(`Hardcover: ${json.errors?.[0]?.message ?? "no data"}`);
  return json.data;
}

function toBook(raw: RawBook): HardcoverBook {
  const entry = raw.book_series?.[0];
  const series = entry?.series
    ? {
        hardcoverSeriesId: entry.series.id,
        name: entry.series.name,
        position: typeof entry.position === "number" ? entry.position : null,
      }
    : null;
  return { bookId: raw.id, series };
}

/**
 * Finds a book on Hardcover: by ISBN when there is one (exact), otherwise
 * by searching its title and author and keeping only a hit that really is
 * the same book. Returns null when Hardcover doesn't have it. Throws when
 * Hardcover can't be reached or refuses the token.
 */
export async function findHardcoverBook(
  token: string,
  book: { title: string; author?: string | null; isbn?: string | null },
  signal?: AbortSignal,
): Promise<HardcoverBook | null> {
  if (book.isbn) {
    const data = await query<{ editions: { book: RawBook | null }[] }>(
      token,
      `query ($isbn: String!) {
        editions(where: { _or: [{ isbn_13: { _eq: $isbn } }, { isbn_10: { _eq: $isbn } }] }, limit: 1) {
          book { ${BOOK_FIELDS} }
        }
      }`,
      { isbn: book.isbn },
      signal,
    );
    const found = data.editions[0]?.book;
    if (found) return toBook(found);
  }

  const q = [book.title, book.author].filter(Boolean).join(" ");
  const search = await query<{ search: { results: SearchResults | null } }>(
    token,
    `query ($q: String!) { search(query: $q, query_type: "Book", per_page: 5) { results } }`,
    { q },
    signal,
  );
  const hit = (search.search.results?.hits ?? [])
    .map((h) => h.document)
    .find((doc) => doc?.title && isSameBook(book, { title: doc.title, author: doc.author_names?.[0] ?? null }));
  const id = Number(hit?.id);
  if (!hit || !Number.isInteger(id) || id <= 0) return null;

  const data = await query<{ books: RawBook[] }>(
    token,
    `query ($id: Int!) { books(where: { id: { _eq: $id } }, limit: 1) { ${BOOK_FIELDS} } }`,
    { id },
    signal,
  );
  return data.books[0] ? toBook(data.books[0]) : null;
}

/** One numbered book in a series, as Hardcover lists it. */
export type HardcoverSeriesMember = { hardcoverBookId: number; title: string; position: number };

/**
 * Every main book in a series, in order: one per numbered place (the most
 * popular, when Hardcover has duplicates), leaving out collections, partial
 * books, and in-between extras like "1.5". This follows Hardcover's own
 * guide to listing a series as its website does.
 */
export async function fetchSeriesMembers(
  token: string,
  hardcoverSeriesId: number,
  signal?: AbortSignal,
): Promise<HardcoverSeriesMember[]> {
  const data = await query<{
    series: { book_series: { position: number | null; book: { id: number; title: string | null } | null }[] }[];
  }>(
    token,
    `query ($id: Int!) {
      series(where: { id: { _eq: $id } }, limit: 1) {
        book_series(
          distinct_on: position
          order_by: [{ position: asc }, { book: { users_count: desc } }]
          where: {
            position: { _is_null: false }
            compilation: { _eq: false }
            book: { canonical_id: { _is_null: true }, is_partial_book: { _eq: false } }
          }
        ) {
          position
          book { id title }
        }
      }
    }`,
    { id: hardcoverSeriesId },
    signal,
  );
  return (data.series[0]?.book_series ?? []).flatMap(({ position, book }) =>
    typeof position === "number" && Number.isInteger(position) && position > 0 && book?.title
      ? [{ hardcoverBookId: book.id, title: book.title, position }]
      : [],
  );
}

/** Search results are Hardcover's Typesense response, passed through as JSON. */
type SearchResults = {
  hits?: { document?: { id?: string | number; title?: string; author_names?: string[] } }[];
};
