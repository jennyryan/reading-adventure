import { env } from "@/lib/env";
import { createDb, type Db } from "./client";

// The neon-http driver sends each query as one HTTPS request, which suits
// serverless functions (no connection pool to manage). The tradeoff is no
// interactive transactions; we use single statements or db.batch() instead.

let instance: Db | null = null;

/** Created on first use, so importing this file never needs DATABASE_URL. */
export function db(): Db {
  instance ??= createDb(env().databaseUrl);
  return instance;
}
