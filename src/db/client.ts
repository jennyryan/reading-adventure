import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Host used by the optional local Docker database (see docker-compose.yml). */
const LOCAL_HOST = "db.localtest.me";

/**
 * Builds a Drizzle client for a connection string. Shared by the app and
 * the seed script. For the local Docker database, queries go to Neon's
 * local HTTP proxy over plain http on port 4444; every other host (real
 * Neon) is untouched.
 */
export function createDb(databaseUrl: string) {
  if (new URL(databaseUrl).hostname === LOCAL_HOST) {
    neonConfig.fetchEndpoint = (host) =>
      host === LOCAL_HOST ? `http://${host}:4444/sql` : `https://${host}/sql`;
  }
  return drizzle({ client: neon(databaseUrl), schema });
}

export type Db = ReturnType<typeof createDb>;
