import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { books, readings, settings } from "@/db/schema";

export const DEFAULT_READING_GOAL = 20;

export type ShelfBook = {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  /** Picked from search (Google Books or, earlier, Open Library): its title and author come from there. */
  fromSearch: boolean;
  /** The most recent reading: what the shelf shows. */
  readingId: number;
  rating: number;
  readAt: string;
  timesRead: number;
};

export type Shelf = { books: ShelfBook[]; readingGoal: number };

/** Everything the home page needs, newest finished book first. */
export async function getShelf(): Promise<Shelf> {
  // The shelf changes whenever a book is added, edited or deleted, so read it
  // on every request rather than once at build time.
  await connection();
  const [rows, settingsRows] = await db().batch([
    db()
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        coverUrl: books.coverUrl,
        openLibraryWorkId: books.openLibraryWorkId,
        googleVolumeId: books.googleVolumeId,
        readingId: readings.id,
        rating: readings.rating,
        readAt: readings.readAt,
      })
      .from(readings)
      .innerJoin(books, eq(readings.bookId, books.id))
      .orderBy(desc(readings.readAt), desc(readings.id)),
    db().select().from(settings).limit(1),
  ]);

  // Rows are newest first, so the first row per book is its latest reading.
  const byBook = new Map<number, ShelfBook>();
  for (const row of rows) {
    const seen = byBook.get(row.id);
    if (seen) {
      seen.timesRead++;
      continue;
    }
    const { openLibraryWorkId, googleVolumeId, ...book } = row;
    byBook.set(row.id, { ...book, fromSearch: Boolean(openLibraryWorkId || googleVolumeId), timesRead: 1 });
  }

  return {
    books: [...byBook.values()],
    readingGoal: settingsRows[0]?.readingGoal ?? DEFAULT_READING_GOAL,
  };
}
