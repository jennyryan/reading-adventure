import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** A book series, as known to Hardcover. */
export const series = pgTable("series", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  hardcoverSeriesId: integer("hardcover_series_id").unique(),
  // When we last copied this series' book list from Hardcover (see seriesMembers).
  membersFetchedAt: timestamp("members_fetched_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** A book Norah has read. Only books with at least one reading exist here. */
export const books = pgTable("books", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  coverUrl: text("cover_url"),
  seriesId: integer("series_id").references(() => series.id, { onDelete: "set null" }),
  // Decimal because series include in-between entries like "1.5".
  seriesPosition: numeric("series_position", { mode: "number" }),
  // Unique so the same book can't be added twice from search. Set on books
  // added before search moved to Google Books.
  openLibraryWorkId: text("open_library_work_id").unique(),
  // The Google Books volume a book was picked from. Not unique: Google lists
  // each edition separately, so duplicates are caught by ISBN or by title
  // and author instead (see src/lib/books.ts).
  googleVolumeId: text("google_volume_id"),
  hardcoverBookId: integer("hardcover_book_id").unique(),
  createdAt: createdAt(),
});

/** One time Norah finished a book. A re-read is a second row for the same book. */
export const readings = pgTable(
  "readings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    // A plain calendar date with no time zone, so it can never drift a day
    // the way a UTC timestamp did in the prototype.
    readAt: date("read_at", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("readings_rating_range", sql`${t.rating} between 1 and 5`),
    index("readings_book_id_idx").on(t.bookId),
  ],
);

/**
 * Our saved copy of every book in a series, fetched from Hardcover, so the
 * Up Next shelf renders from our own database instead of a live API call.
 */
export const seriesMembers = pgTable(
  "series_members",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    hardcoverBookId: integer("hardcover_book_id").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    coverUrl: text("cover_url"),
    position: numeric("position", { mode: "number" }),
  },
  (t) => [unique("series_members_series_book").on(t.seriesId, t.hardcoverBookId)],
);

/** Series books Norah chose to hide from Up Next. */
export const upNextDismissals = pgTable("up_next_dismissals", {
  hardcoverBookId: integer("hardcover_book_id").primaryKey(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** App settings. Always exactly one row, with id = 1. */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    readingGoal: integer("reading_goal").notNull().default(20),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check("settings_goal_positive", sql`${t.readingGoal} between 1 and 1000`),
  ],
);

export type Book = typeof books.$inferSelect;
export type Reading = typeof readings.$inferSelect;
