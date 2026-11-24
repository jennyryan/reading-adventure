import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

const good = { DATABASE_URL: "postgresql://u:p@host/db" };

describe("parseEnv", () => {
  it("accepts a complete config and treats HARDCOVER_TOKEN as optional", () => {
    expect(parseEnv(good)).toMatchObject({ hardcoverToken: null, googleBooksApiKey: null });
    expect(parseEnv({ ...good, HARDCOVER_TOKEN: "tok" }).hardcoverToken).toBe("tok");
  });

  it("defaults to Norah's shelf, open for editing, with no demo reset", () => {
    expect(parseEnv(good)).toMatchObject({ readerName: "Norah", editPasscode: null, demoResetSecret: null });
    expect(parseEnv({ ...good, READER_NAME: " Maya ", EDIT_PASSCODE: "  " })).toMatchObject({
      readerName: "Maya",
      editPasscode: null,
    });
  });

  it("refuses a short demo reset secret", () => {
    expect(() => parseEnv({ ...good, DEMO_RESET_SECRET: "short" })).toThrow(/DEMO_RESET_SECRET/);
    expect(parseEnv({ ...good, DEMO_RESET_SECRET: "a-long-enough-secret" }).demoResetSecret).toBe("a-long-enough-secret");
  });

  it("explains a missing or malformed DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrowError(EnvError);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL is missing/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/should start with postgres/);
  });
});
