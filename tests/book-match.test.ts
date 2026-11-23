import { describe, expect, it } from "vitest";
import { authorKey, isSameBook, titleKey } from "@/lib/bookMatch";

describe("titleKey", () => {
  it("ignores subtitles, leading articles, punctuation and capitals", () => {
    expect(titleKey("Matilda: 30th Anniversary Edition")).toBe("matilda");
    expect(titleKey("The Wild Robot")).toBe("wild robot");
    expect(titleKey("Charlotte's Web")).toBe(titleKey("CHARLOTTES WEB"));
    expect(titleKey("Frog & Toad Are Friends")).toBe(titleKey("Frog and Toad Are Friends"));
    expect(titleKey("Ramona the Pest (Ramona, #2)")).toBe("ramona the pest");
  });
});

describe("authorKey", () => {
  it("is the surname, however the initials are written", () => {
    expect(authorKey("E. B. White")).toBe("white");
    expect(authorKey("E.B. White")).toBe("white");
    expect(authorKey(null)).toBeNull();
  });
});

describe("isSameBook", () => {
  it("matches editions of one book", () => {
    expect(isSameBook({ title: "Matilda", author: "Roald Dahl" }, { title: "Matilda: A Novel", author: "R. Dahl" })).toBe(
      true,
    );
  });

  it("matches when one side has no author", () => {
    expect(isSameBook({ title: "Matilda", author: null }, { title: "Matilda", author: "Roald Dahl" })).toBe(true);
  });

  it("keeps different books apart", () => {
    expect(isSameBook({ title: "Frog and Toad Together" }, { title: "Frog and Toad Are Friends" })).toBe(false);
    expect(isSameBook({ title: "Matilda", author: "Roald Dahl" }, { title: "Matilda", author: "Someone Else" })).toBe(
      false,
    );
  });
});
