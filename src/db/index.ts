import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

// The neon-http driver sends each query as one HTTPS request, which suits
// serverless functions (no connection pool to manage). The tradeoff is no
// interactive transactions; we use single statements or db.batch() instead.

export type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | null = null;

/** Created on first use, so importing this file never needs DATABASE_URL. */
export function db(): Db {
  instance ??= drizzle({ client: neon(env().databaseUrl), schema });
  return instance;
}

export { schema };
