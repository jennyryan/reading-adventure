import { afterEach, describe, expect, it, vi } from "vitest";
import { seriesFromTitle } from "@/lib/bookTitle";
import { findHardcoverBook } from "@/lib/hardcover";
import { chooseSeries } from "@/lib/series";

describe("seriesFromTitle", () => {
  it.each([
    ["Dog Man: Grime and Punishment: A Graphic Novel (Dog Man #9): From the Creator of Captain Underpants", "Dog Man", 9],
    ["Dog Man and Cat Kid: From the Creator of Captain Underpants (Dog Man #4), 4", "Dog Man", 4],
    ["Ramona the Pest (Ramona, #2)", "Ramona", 2],
    ["The Bad Guys in Intergalactic Gas (The Bad Guys, Book 5)", "The Bad Guys", 5],
    ["Ivy + Bean Take the Case (Ivy and Bean, Vol. 10)", "Ivy and Bean", 10],
    ["Midnight for Charlie Bone (The Children of the Red King #1.5)", "The Children of the Red King", 1.5],
  ])("%s", (raw, name, position) => {
    expect(seriesFromTitle(raw)).toEqual({ name, position });
  });

  it("takes an unnumbered tag as the series only when the title starts with it", () => {
    expect(seriesFromTitle("Frog and Toad Together (Frog and Toad)")).toEqual({ name: "Frog and Toad", position: null });
    expect(seriesFromTitle("Matilda (Illustrated)")).toBeNull();
    expect(seriesFromTitle("Charlotte's Web (Paperback)")).toBeNull();
  });

  it("finds nothing in plain titles", () => {
    expect(seriesFromTitle("The Wild Robot")).toBeNull();
    expect(seriesFromTitle("Diary of a Wimpy Kid: Rodrick Rules")).toBeNull();
  });
});

describe("chooseSeries", () => {
  const hint = { name: "Dog Man", position: 9 };

  it("prefers Hardcover's series", () => {
    const hardcover = { bookId: 1, series: { hardcoverSeriesId: 7, name: "Dog Man (Graphic Novels)", position: 9 } };
    expect(chooseSeries(hardcover, hint)).toEqual(hardcover.series);
  });

  it("falls back to the title's tag when Hardcover has no series or no answer", () => {
    expect(chooseSeries({ bookId: 1, series: null }, hint)).toEqual({ ...hint, hardcoverSeriesId: null });
    expect(chooseSeries(null, hint)).toEqual({ ...hint, hardcoverSeriesId: null });
    expect(chooseSeries(null, null)).toBeNull();
  });
});

describe("findHardcoverBook", () => {
  type Call = { query: string; variables: Record<string, unknown>; headers: Headers };

  /** Answers each Hardcover request in turn with the next of `answers`, recording what was asked. */
  function mockHardcover(...answers: (Response | Error)[]) {
    const calls: Call[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init: RequestInit) => {
        expect(String(input)).toBe("https://api.hardcover.app/v1/graphql");
        const { query, variables } = JSON.parse(String(init.body));
        calls.push({ query, variables, headers: new Headers(init.headers) });
        const answer = answers.shift();
        if (!answer) throw new Error("unexpected Hardcover request");
        if (answer instanceof Error) throw answer;
        return answer;
      }),
    );
    return calls;
  }

  const dogMan = {
    id: 42,
    book_series: [{ position: 9, series: { id: 7, name: "Dog Man" } }],
  };

  afterEach(() => vi.unstubAllGlobals());

  it("finds a book by ISBN, with its series and place", async () => {
    const calls = mockHardcover(Response.json({ data: { editions: [{ book: dogMan }] } }));
    const found = await findHardcoverBook("Bearer secret", { title: "Dog Man", isbn: "9781338535624" });

    expect(found).toEqual({ bookId: 42, series: { hardcoverSeriesId: 7, name: "Dog Man", position: 9 } });
    expect(calls).toHaveLength(1);
    expect(calls[0].variables).toEqual({ isbn: "9781338535624" });
    // A token pasted with "Bearer" already on it isn't doubled up.
    expect(calls[0].headers.get("authorization")).toBe("Bearer secret");
  });

  it("searches by title and author when the ISBN isn't known, keeping only the same book", async () => {
    const calls = mockHardcover(
      Response.json({ data: { editions: [] } }),
      Response.json({
        data: {
          search: {
            results: {
              hits: [
                { document: { id: "5", title: "Dog Man Unleashed", author_names: ["Dav Pilkey"] } },
                { document: { id: "42", title: "Dog Man: Grime and Punishment", author_names: ["Dav Pilkey"] } },
              ],
            },
          },
        },
      }),
      Response.json({ data: { books: [dogMan] } }),
    );
    const found = await findHardcoverBook("secret", {
      title: "Dog Man: Grime and Punishment",
      author: "Dav Pilkey",
      isbn: "9781338535624",
    });

    expect(found?.bookId).toBe(42);
    expect(calls.map((c) => c.variables)).toEqual([
      { isbn: "9781338535624" },
      { q: "Dog Man: Grime and Punishment Dav Pilkey" },
      { id: 42 },
    ]);
    expect(calls[0].headers.get("authorization")).toBe("Bearer secret");
  });

  it("returns null when no search hit is the same book", async () => {
    mockHardcover(
      Response.json({
        data: { search: { results: { hits: [{ document: { id: "9", title: "Dog Man", author_names: ["Someone Else"] } }] } } },
      }),
    );
    expect(await findHardcoverBook("secret", { title: "Dog Man", author: "Dav Pilkey" })).toBeNull();
  });

  it("reports a book that isn't in any series", async () => {
    mockHardcover(Response.json({ data: { editions: [{ book: { id: 3, book_series: [] } }] } }));
    expect(await findHardcoverBook("secret", { title: "Matilda", isbn: "9780142410370" })).toEqual({
      bookId: 3,
      series: null,
    });
  });

  it("throws when Hardcover refuses the token or returns errors", async () => {
    mockHardcover(new Response("expired", { status: 401 }));
    await expect(findHardcoverBook("old", { title: "Matilda" })).rejects.toThrow("Hardcover 401");

    mockHardcover(Response.json({ errors: [{ message: "field not found" }] }));
    await expect(findHardcoverBook("secret", { title: "Matilda" })).rejects.toThrow("field not found");
  });
});
