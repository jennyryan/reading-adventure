// Fills the database with sample books for local development. The books
// are in src/lib/sampleShelf.ts, shared with the portfolio demo's nightly reset.
//
//   npm run db:seed            refuses if there are already books
//   npm run db:seed -- --reset wipes ALL data first (dev databases only!)

import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";
import { fillSampleShelf, resetToSampleShelf, SAMPLE } from "../src/lib/sampleShelf";

config({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
const db = createDb(url);
const reset = process.argv.includes("--reset");

async function main() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.books);
  if (count > 0 && !reset) {
    console.error(`There are already ${count} books. Run with --reset to wipe everything first.`);
    process.exit(1);
  }
  if (reset) {
    console.log(`Wiping all data in ${new URL(url!).host} ...`);
    await resetToSampleShelf(db);
  } else {
    await fillSampleShelf(db);
  }
  console.log(`Seeded ${SAMPLE.length} books.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
