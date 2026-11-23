import { z } from "zod";

/**
 * Image hosts we allow covers from: Open Library's covers, and Google Books'
 * cover thumbnails for books Open Library has no cover for. next.config.ts
 * allows the same two.
 */
export const COVER_HOSTS = ["covers.openlibrary.org", "books.google.com"] as const;

export const rating = z.int().min(1).max(5);

/** A calendar date as "YYYY-MM-DD", rejecting impossible dates like 2026-02-30. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Not a real date");

export const coverUrl = z
  .url({ protocol: /^https$/ })
  .refine((u) => (COVER_HOSTS as readonly string[]).includes(new URL(u).hostname), {
    message: `Covers must come from ${COVER_HOSTS.join(", ")}`,
  });

export const readingGoal = z.int().min(1).max(1000);

/** A series hint from book search: its name, and the book's place in it. */
export const seriesHint = z.object({
  name: z.string().trim().min(1).max(200),
  position: z.number().min(0).max(10000).nullable(),
});
