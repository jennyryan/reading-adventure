import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local ourselves.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Only `migrate`/`studio` need a real URL; `generate` works offline.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
