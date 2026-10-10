import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

const good = {
  DATABASE_URL: "postgresql://u:p@host/db",
  GROWNUP_PASSCODE: "open-sesame",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("accepts a complete config and treats HARDCOVER_TOKEN as optional", () => {
    expect(parseEnv(good)).toMatchObject({ hardcoverToken: null });
    expect(parseEnv({ ...good, HARDCOVER_TOKEN: "tok" }).hardcoverToken).toBe("tok");
  });

  it("lists every missing required variable in one error", () => {
    expect(() => parseEnv({})).toThrowError(EnvError);
    try {
      parseEnv({});
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("DATABASE_URL is missing");
      expect(message).toContain("GROWNUP_PASSCODE is missing");
      expect(message).toContain("SESSION_SECRET is missing");
    }
  });

  it("rejects a short session secret and a whitespace-only passcode", () => {
    expect(() => parseEnv({ ...good, SESSION_SECRET: "short" })).toThrow(/at least 32/);
    expect(() => parseEnv({ ...good, GROWNUP_PASSCODE: "   " })).toThrow(/GROWNUP_PASSCODE is missing/);
  });
});
