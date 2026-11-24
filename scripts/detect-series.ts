// Looks up the series of books already on the shelf. New books get theirs
// when they're added; this catches up the ones added before that.
//
//   npm run db:detect-series           books without a series from Hardcover yet
//   npm run db:detect-series -- --all  every book, refreshing known series
//
// Each series found also gets its full book list saved, for the "By
// series" view's "3 of 12 read".
//
// Sources: Hardcover, when HARDCOVER_TOKEN is in .env.local, then Open
// Library (the book's own work when it was picked from Open Library, or a
// search by title and author).
//
// To fix up the live site's shelf, point it at that database:
//   DATABASE_URL=<the live one> npm run db:detect-series

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }
  const hardcover = Boolean(process.env.HARDCOVER_TOKEN?.trim());
  if (!hardcover) {
    console.log(
      "HARDCOVER_TOKEN is not set, so only Open Library's series are used.\n" +
        "Add a token from hardcover.app/account/api to .env.local for Hardcover's too.",
    );
  }
  // Up to 3 Hardcover requests per book: stay well under its 60 a minute.
  const pauseMs = hardcover ? 3000 : 1000;

  // Imported after .env.local is loaded, since they read the environment.
  const { eq, isNull, or } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { books, series } = await import("../src/db/schema");
  const { detectSeries } = await import("../src/lib/series");
  const { fetchOpenLibrarySeries } = await import("../src/lib/openLibrary");

  const all = process.argv.includes("--all");
  // With Hardcover: books with no series, or one only known from a title tag
  // or Open Library. Without: books with no series.
  const needed = hardcover ? or(isNull(books.seriesId), isNull(series.hardcoverSeriesId)) : isNull(books.seriesId);
  const todo = (
    await db()
      .select({ book: books })
      .from(books)
      .leftJoin(series, eq(books.seriesId, series.id))
      .where(all ? undefined : needed)
      .orderBy(books.id)
  ).map((row) => row.book);
  console.log(`Checking ${todo.length} book${todo.length === 1 ? "" : "s"}…`);

  let found = 0;
  for (const [i, book] of todo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, pauseMs));
    const hint = book.openLibraryWorkId
      ? await fetchOpenLibrarySeries(book.openLibraryWorkId).catch(() => null)
      : null;
    const fields = await detectSeries(book, hint, book.id);

    // Nothing found (or Hardcover didn't answer): leave the book as it was.
    if (fields.seriesId === null && fields.hardcoverBookId === null) {
      console.log(`  ${book.title}: no series found`);
      continue;
    }
    await db()
      .update(books)
      .set({
        hardcoverBookId: fields.hardcoverBookId ?? book.hardcoverBookId,
        ...(fields.seriesId !== null && { seriesId: fields.seriesId, seriesPosition: fields.seriesPosition }),
      })
      .where(eq(books.id, book.id));

    if (fields.seriesId === null) {
      console.log(`  ${book.title}: not in a series`);
      continue;
    }
    found++;
    const [row] = await db().select({ name: series.name }).from(series).where(eq(series.id, fields.seriesId));
    const place = fields.seriesPosition === null ? "" : ` #${fields.seriesPosition}`;
    console.log(`  ${book.title}: ${row?.name ?? "?"}${place}`);
  }
  console.log(`Done: ${found} in a series.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
