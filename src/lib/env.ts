// Reads and validates environment variables in one place, so a missing or
// weak value fails loudly at startup instead of as a confusing error later.
//
// Required: DATABASE_URL.
// Optional: HARDCOVER_TOKEN. Hardcover tokens expire, and an expired token
// should only hide the Up Next shelf, not take the whole site down.
// Optional: GOOGLE_BOOKS_API_KEY. Book search works without it, but Google
// limits keyless requests and shared hosting IPs hit that limit quickly.
// Optional: READER_NAME, whose shelf this is ("Norah" if unset). The
// portfolio demo is the same app with a made-up name.
// Optional: EDIT_PASSCODE. When set, adding, editing and deleting books
// ask for it once per device; viewing stays open. Unset, anyone can edit.
// Optional: DEMO_RESET_SECRET, on the demo only: lets the nightly job put
// the sample shelf back (see /api/demo/reset).

export type Env = {
  databaseUrl: string;
  hardcoverToken: string | null;
  googleBooksApiKey: string | null;
  readerName: string;
  editPasscode: string | null;
  demoResetSecret: string | null;
};

export class EnvError extends Error {
  constructor(problems: string[]) {
    super(
      [
        "The Reading Adventure can't start because of its environment variables:",
        ...problems.map((p) => `  - ${p}`),
        "Copy .env.example to .env.local (or set these in Vercel > Project > Settings > Environment Variables).",
      ].join("\n"),
    );
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const problems: string[] = [];
  const read = (name: string) => source[name]?.trim() || "";

  const databaseUrl = read("DATABASE_URL");
  const hardcoverToken = read("HARDCOVER_TOKEN") || null;
  const googleBooksApiKey = read("GOOGLE_BOOKS_API_KEY") || null;
  const readerName = read("READER_NAME") || "Norah";
  const editPasscode = read("EDIT_PASSCODE") || null;
  const demoResetSecret = read("DEMO_RESET_SECRET") || null;

  if (!databaseUrl) problems.push("DATABASE_URL is missing.");
  else if (!/^postgres(ql)?:\/\//.test(databaseUrl))
    problems.push("DATABASE_URL should start with postgres:// or postgresql://.");

  if (demoResetSecret !== null && demoResetSecret.length < 16)
    problems.push("DEMO_RESET_SECRET should be at least 16 characters (it guards a route that wipes the shelf).");

  if (problems.length > 0) throw new EnvError(problems);
  return { databaseUrl, hardcoverToken, googleBooksApiKey, readerName, editPasscode, demoResetSecret };
}

let cached: Env | null = null;

/** Validated env, parsed once per server instance. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
