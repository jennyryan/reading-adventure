import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import type { AttemptStore } from "./rate-limit";

/**
 * Postgres-backed attempt store. A single atomic upsert either starts a new
 * window or increments the current one, so concurrent requests can't race.
 */
export const dbAttemptStore: AttemptStore = {
  async hit(key, windowMs) {
    const expired = sql`${authAttempts.windowStart} <= now() - make_interval(secs => ${windowMs / 1000})`;
    const [row] = await db()
      .insert(authAttempts)
      .values({ key, count: 1, windowStart: sql`now()` })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: {
          count: sql`case when ${expired} then 1 else ${authAttempts.count} + 1 end`,
          windowStart: sql`case when ${expired} then now() else ${authAttempts.windowStart} end`,
        },
      })
      .returning({ count: authAttempts.count, windowStart: authAttempts.windowStart });
    return row;
  },
  async clear(key) {
    await db().delete(authAttempts).where(eq(authAttempts.key, key));
  },
};
