// Fills the database with sample books for local development.
//
//   npm run db:seed            refuses if there are already books
//   npm run db:seed -- --reset wipes ALL data first (dev databases only!)

import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";
import { todayLocalISO } from "../src/lib/dates";

config({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
const db = createDb(url);
const reset = process.argv.includes("--reset");

const cover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

/** A date `days` ago, as "YYYY-MM-DD" in local time. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayLocalISO(d);
}

type SeedBook = {
  title: string;
  author: string;
  workId: string;
  coverId: number;
  series?: { name: string; position: number };
  readings: { rating: number; daysAgo: number }[];
};

const SAMPLE: SeedBook[] = [
  { title: "Charlotte's Web", author: "E. B. White", workId: "OL483391W", coverId: 8461797,
    readings: [{ rating: 5, daysAgo: 2 }] },
  { title: "The Wild Robot", author: "Peter Brown", workId: "OL17365087W", coverId: 7443301,
    readings: [{ rating: 5, daysAgo: 9 }] },
  { title: "Dinosaurs Before Dark", author: "Mary Pope Osborne", workId: "OL81773W", coverId: 14390457,
    series: { name: "Magic Tree House", position: 1 }, readings: [{ rating: 4, daysAgo: 20 }] },
  { title: "The Knight at Dawn", author: "Mary Pope Osborne", workId: "OL81785W", coverId: 10953018,
    series: { name: "Magic Tree House", position: 2 }, readings: [{ rating: 4, daysAgo: 16 }] },
  { title: "Matilda", author: "Roald Dahl", workId: "OL45846W", coverId: 12889769,
    readings: [{ rating: 5, daysAgo: 60 }, { rating: 5, daysAgo: 5 }] },
  { title: "Ramona the Pest", author: "Beverly Cleary", workId: "OL151964W", coverId: 12859373,
    readings: [{ rating: 3, daysAgo: 31 }] },
  { title: "The One and Only Ivan", author: "Katherine Applegate", workId: "OL16465449W", coverId: 12656488,
    readings: [{ rating: 4, daysAgo: 44 }] },
];

async function main() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.books);
  if (count > 0 && !reset) {
    console.error(`There are already ${count} books. Run with --reset to wipe everything first.`);
    process.exit(1);
  }
  if (reset) {
    console.log(`Wiping all data in ${new URL(url!).host} ...`);
    await db.execute(sql`truncate books, readings, series, series_members, up_next_dismissals,
      settings restart identity cascade`);
  }

  await db.insert(schema.settings).values({ id: 1, readingGoal: 20 });

  const seriesIds = new Map<string, number>();
  for (const name of new Set(SAMPLE.flatMap((b) => (b.series ? [b.series.name] : [])))) {
    const [row] = await db.insert(schema.series).values({ name }).returning();
    seriesIds.set(name, row.id);
  }

  for (const b of SAMPLE) {
    const [book] = await db
      .insert(schema.books)
      .values({
        title: b.title,
        author: b.author,
        coverUrl: cover(b.coverId),
        openLibraryWorkId: b.workId,
        seriesId: b.series ? seriesIds.get(b.series.name) : null,
        seriesPosition: b.series?.position ?? null,
      })
      .returning();
    await db
      .insert(schema.readings)
      .values(b.readings.map((r) => ({ bookId: book.id, rating: r.rating, readAt: daysAgo(r.daysAgo) })));
  }

  console.log(`Seeded ${SAMPLE.length} books.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
