import { z } from "zod";

/** Image hosts we allow covers from. next.config.ts uses the same list. */
export const COVER_HOSTS = ["covers.openlibrary.org"] as const;

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
