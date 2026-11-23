// Looks up the series of books already on the shelf. New books get theirs
// when they're added; this catches up the ones added before that.
//
//   npm run db:detect-series           books without a series yet
//   npm run db:detect-series -- --all  every book, refreshing known series
//
// Needs HARDCOVER_TOKEN in .env.local: saved titles have already had their
// series tags trimmed, so Hardcover is the only source for these.

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const PAUSE_MS = 3000; // up to 3 Hardcover requests per book; stay well under 60 a minute

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }
  if (!process.env.HARDCOVER_TOKEN?.trim()) {
    console.error("HARDCOVER_TOKEN is not set. Add a token from hardcover.app/account/api to .env.local first.");
    process.exit(1);
  }

  // Imported after .env.local is loaded, since they read the environment.
  const { eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { books, series } = await import("../src/db/schema");
  const { detectSeries } = await import("../src/lib/series");

  const all = process.argv.includes("--all");
  const todo = await db()
    .select()
    .from(books)
    .where(all ? undefined : isNull(books.seriesId))
    .orderBy(books.id);
  console.log(`Checking ${todo.length} book${todo.length === 1 ? "" : "s"}…`);

  let found = 0;
  for (const [i, book] of todo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const fields = await detectSeries(book, null, book.id);

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
