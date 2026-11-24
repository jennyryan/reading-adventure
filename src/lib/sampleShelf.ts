// The sample shelf: what `npm run db:seed` puts in a dev database, and what
// the portfolio demo goes back to every night (see /api/demo/reset).

import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { todayLocalISO } from "./dates";

export type SampleBook = {
  title: string;
  author: string;
  /** Open Library work, which also finds the series' full book list. */
  workId: string;
  coverId: number;
  series?: { name: string; position: number };
  readings: { rating: number; daysAgo: number }[];
};

const MTH = "Magic Tree House";
const WIMPY = "Diary of a Wimpy Kid";

export const SAMPLE: SampleBook[] = [
  { title: "Charlotte's Web", author: "E. B. White", workId: "OL483391W", coverId: 8461797,
    readings: [{ rating: 5, daysAgo: 2 }] },
  { title: "Rodrick Rules", author: "Jeff Kinney", workId: "OL15110516W", coverId: 8542270,
    series: { name: WIMPY, position: 2 }, readings: [{ rating: 5, daysAgo: 4 }] },
  { title: "Matilda", author: "Roald Dahl", workId: "OL45846W", coverId: 12889769,
    readings: [{ rating: 5, daysAgo: 60 }, { rating: 5, daysAgo: 6 }] },
  { title: "Diary of a Wimpy Kid", author: "Jeff Kinney", workId: "OL8483260W", coverId: 14376136,
    series: { name: WIMPY, position: 1 }, readings: [{ rating: 4, daysAgo: 8 }] },
  { title: "The Wild Robot", author: "Peter Brown", workId: "OL17365087W", coverId: 7443301,
    readings: [{ rating: 5, daysAgo: 11 }] },
  { title: "Mummies in the Morning", author: "Mary Pope Osborne", workId: "OL15131229W", coverId: 7283349,
    series: { name: MTH, position: 3 }, readings: [{ rating: 4, daysAgo: 13 }] },
  { title: "The Knight at Dawn", author: "Mary Pope Osborne", workId: "OL81785W", coverId: 10953018,
    series: { name: MTH, position: 2 }, readings: [{ rating: 4, daysAgo: 16 }] },
  { title: "Dog Man", author: "Dav Pilkey", workId: "OL17610986W", coverId: 7894142,
    series: { name: "Dog Man", position: 1 }, readings: [{ rating: 5, daysAgo: 18 }] },
  { title: "Dinosaurs Before Dark", author: "Mary Pope Osborne", workId: "OL81773W", coverId: 14390457,
    series: { name: MTH, position: 1 }, readings: [{ rating: 3, daysAgo: 20 }] },
  { title: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling", workId: "OL82563W", coverId: 15155833,
    series: { name: "Harry Potter", position: 1 }, readings: [{ rating: 5, daysAgo: 27 }] },
  { title: "Ramona the Pest", author: "Beverly Cleary", workId: "OL151964W", coverId: 12859373,
    readings: [{ rating: 3, daysAgo: 31 }] },
  { title: "The One and Only Ivan", author: "Katherine Applegate", workId: "OL16465449W", coverId: 12656488,
    readings: [{ rating: 4, daysAgo: 44 }] },
];

/** A date `days` ago, as "YYYY-MM-DD" in local time. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayLocalISO(d);
}

const cover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

/** Wipes EVERYTHING in the database and puts the sample shelf in. Dev and demo databases only. */
export async function resetToSampleShelf(db: Db) {
  await db.execute(sql`truncate books, readings, series, series_members, up_next_dismissals,
    settings restart identity cascade`);
  await fillSampleShelf(db);
}

/** Adds the sample shelf to an empty database. */
export async function fillSampleShelf(db: Db) {
  await db.insert(schema.settings).values({ id: 1, readingGoal: 20 });

  const names = [...new Set(SAMPLE.flatMap((b) => (b.series ? [b.series.name] : [])))];
  const seriesRows = await db.insert(schema.series).values(names.map((name) => ({ name }))).returning();
  const seriesId = new Map(seriesRows.map((row) => [row.name, row.id]));

  const bookRows = await db
    .insert(schema.books)
    .values(
      SAMPLE.map((b) => ({
        title: b.title,
        author: b.author,
        coverUrl: cover(b.coverId),
        openLibraryWorkId: b.workId,
        seriesId: b.series ? seriesId.get(b.series.name) : null,
        seriesPosition: b.series?.position ?? null,
      })),
    )
    .returning({ id: schema.books.id, workId: schema.books.openLibraryWorkId });
  const bookId = new Map(bookRows.map((row) => [row.workId, row.id]));

  await db.insert(schema.readings).values(
    SAMPLE.flatMap((b) =>
      b.readings.map((r) => ({ bookId: bookId.get(b.workId)!, rating: r.rating, readAt: daysAgo(r.daysAgo) })),
    ),
  );
}
