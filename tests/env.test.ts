import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

const good = { DATABASE_URL: "postgresql://u:p@host/db" };

describe("parseEnv", () => {
  it("accepts a complete config and treats HARDCOVER_TOKEN as optional", () => {
    expect(parseEnv(good)).toMatchObject({ hardcoverToken: null });
    expect(parseEnv({ ...good, HARDCOVER_TOKEN: "tok" }).hardcoverToken).toBe("tok");
  });

  it("explains a missing or malformed DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrowError(EnvError);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL is missing/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/should start with postgres/);
  });
});
