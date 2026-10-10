import { describe, expect, it } from "vitest";
import { createSessionToken, safeEqual, verifySessionToken } from "@/lib/auth/crypto";

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("safeEqual", () => {
  it("compares strings, including different lengths, without throwing", () => {
    expect(safeEqual("open-sesame", "open-sesame")).toBe(true);
    expect(safeEqual("open-sesame", "open-sesamf")).toBe(false);
    expect(safeEqual("open", "open-sesame")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});

describe("session tokens", () => {
  const token = createSessionToken(SECRET, NOW, HOUR);

  it("verifies a fresh token", () => {
    expect(verifySessionToken(token, SECRET, NOW + 1)).toBe(true);
  });

  it("rejects an expired token", () => {
    expect(verifySessionToken(token, SECRET, NOW + HOUR)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    expect(verifySessionToken(token, "t".repeat(32), NOW)).toBe(false);
  });

  it("rejects a token whose expiry was edited to extend it", () => {
    const [v, , sig] = token.split(".");
    const extended = `${v}.${NOW + 1000 * HOUR}.${sig}`;
    expect(verifySessionToken(extended, SECRET, NOW + 2 * HOUR)).toBe(false);
  });

  it.each([undefined, "", "garbage", "v1.abc.def", "v2.1.x", `${token}.extra`])(
    "rejects malformed token %j",
    (bad) => {
      expect(verifySessionToken(bad, SECRET, NOW)).toBe(false);
    },
  );
});
