import { describe, expect, it } from "vitest";
import { formatReadDate, todayLocalISO } from "@/lib/dates";

describe("todayLocalISO", () => {
  it("uses the local calendar day, not UTC (the prototype's bug)", () => {
    // 9pm local on Oct 9. In any time zone west of UTC, toISOString()
    // would already say Oct 10.
    const evening = new Date(2026, 9, 9, 21, 0, 0);
    expect(todayLocalISO(evening)).toBe("2026-10-09");
  });

  it("zero-pads months and days", () => {
    expect(todayLocalISO(new Date(2026, 0, 5, 0, 0, 1))).toBe("2026-01-05");
  });
});

describe("formatReadDate", () => {
  it("shows the stored day exactly", () => {
    expect(formatReadDate("2026-10-09")).toBe("Oct 9, 2026");
    expect(formatReadDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatReadDate("2025-12-31")).toBe("Dec 31, 2025");
  });
});
