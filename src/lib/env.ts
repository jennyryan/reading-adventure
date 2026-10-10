// Reads and validates environment variables in one place, so a missing or
// weak value fails loudly at startup instead of as a confusing error later.
//
// Required: DATABASE_URL, GROWNUP_PASSCODE, SESSION_SECRET.
// Optional: HARDCOVER_TOKEN. Hardcover tokens expire, and an expired token
// should only hide the Up Next shelf, not take the whole site down.

export type Env = {
  databaseUrl: string;
  grownupPasscode: string;
  sessionSecret: string;
  hardcoverToken: string | null;
};

const MIN_SECRET_LENGTH = 32;
const MIN_PASSCODE_LENGTH = 6;

export class EnvError extends Error {
  constructor(problems: string[]) {
    super(
      [
        "Norah's Reading Adventure can't start because of its environment variables:",
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
  const grownupPasscode = read("GROWNUP_PASSCODE");
  const sessionSecret = read("SESSION_SECRET");
  const hardcoverToken = read("HARDCOVER_TOKEN") || null;

  if (!databaseUrl) problems.push("DATABASE_URL is missing.");
  else if (!/^postgres(ql)?:\/\//.test(databaseUrl))
    problems.push("DATABASE_URL should start with postgres:// or postgresql://.");

  if (!grownupPasscode) problems.push("GROWNUP_PASSCODE is missing.");
  else if (grownupPasscode.length < MIN_PASSCODE_LENGTH)
    problems.push(`GROWNUP_PASSCODE must be at least ${MIN_PASSCODE_LENGTH} characters.`);

  if (!sessionSecret) problems.push("SESSION_SECRET is missing.");
  else if (sessionSecret.length < MIN_SECRET_LENGTH)
    problems.push(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);

  if (problems.length > 0) throw new EnvError(problems);
  return { databaseUrl, grownupPasscode, sessionSecret, hardcoverToken };
}

let cached: Env | null = null;

/** Validated env, parsed once per server instance. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
