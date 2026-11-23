import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSeriesMembers } from "@/lib/hardcover";
import { fetchOpenLibrarySeriesBooks, findOpenLibrarySeriesKey } from "@/lib/openLibrary";
import { groupBySeries } from "@/lib/seriesShelf";
import type { ShelfBook } from "@/lib/shelf";

let nextId = 1;
function book(title: string, series?: { id: number; name: string; position: number | null }): ShelfBook {
  return {
    id: nextId++,
    title,
    author: null,
    coverUrl: null,
    series: series ?? null,
    openLibraryWorkId: null,
    fromSearch: true,
    readingId: nextId,
    rating: 5,
    readAt: "2026-11-01",
    timesRead: 1,
  };
}

const mth = (position: number | null) => ({ id: 1, name: "Magic Tree House", position });
const dogMan = (position: number | null) => ({ id: 2, name: "Dog Man", position });

describe("groupBySeries", () => {
  it("lists every book in a known series, read or not, with how many are read", () => {
    const knight = book("The Knight at Dawn", mth(2));
    const dinos = book("Dinosaurs Before Dark", mth(1));
    const members = ["Dinosaurs Before Dark", "The Knight at Dawn", "Mummies in the Morning", "Pirates Past Noon"].map(
      (title, i) => ({ seriesId: 1, title, position: i + 1 }),
    );

    const { series } = groupBySeries([knight, dinos], members);
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ name: "Magic Tree House", total: 4, read: 2 });
    expect(series[0].slots.map((s) => [s.position, s.title, s.book?.id ?? null])).toEqual([
      [1, "Dinosaurs Before Dark", dinos.id],
      [2, "The Knight at Dawn", knight.id],
      [3, "Mummies in the Morning", null],
      [4, "Pirates Past Noon", null],
    ]);
  });

  it("still shows a read book that isn't on the series list, without counting it", () => {
    const extra = book("Magic Tree House: Special Edition", mth(1.5));
    const first = book("Dinosaurs Before Dark", mth(1));
    const members = [
      { seriesId: 1, title: "Dinosaurs Before Dark", position: 1 },
      { seriesId: 1, title: "The Knight at Dawn", position: 2 },
    ];

    const [group] = groupBySeries([extra, first], members).series;
    expect(group).toMatchObject({ total: 2, read: 1 });
    expect(group.slots.map((s) => s.position)).toEqual([1, 1.5, 2]);
  });

  it("fills numbers the series' book list skips with blank slots", () => {
    const fourth = book("Pirates Past Noon", mth(4));
    const members = [
      { seriesId: 1, title: "Dinosaurs Before Dark", position: 1 },
      { seriesId: 1, title: "Pirates Past Noon", position: 4 },
    ];

    const [group] = groupBySeries([fourth], members).series;
    expect(group).toMatchObject({ total: 4, read: 1 });
    expect(group.slots.map((s) => [s.position, s.title, Boolean(s.book)])).toEqual([
      [1, "Dinosaurs Before Dark", false],
      [2, "", false],
      [3, "", false],
      [4, "Pirates Past Noon", true],
    ]);
  });

  it("shows just the read books, in order, when the series' book list isn't known", () => {
    const nine = book("Grime and Punishment", dogMan(9));
    const two = book("Dog Man Unleashed", dogMan(2));
    const unnumbered = book("Dog Man: The Supa Buddies Mega Collection", dogMan(null));

    const [group] = groupBySeries([nine, unnumbered, two], []).series;
    expect(group).toMatchObject({ name: "Dog Man", total: null, read: 3 });
    expect(group.slots.map((s) => s.book?.id)).toEqual([two.id, nine.id, unnumbered.id]);
  });

  it("puts the most recently read series first and gathers books in no series", () => {
    // Shelf books arrive newest read first.
    const recent = book("Dog Man Unleashed", dogMan(2));
    const matilda = book("Matilda");
    const older = book("Dinosaurs Before Dark", mth(1));

    const shelf = groupBySeries([recent, matilda, older], []);
    expect(shelf.series.map((s) => s.name)).toEqual(["Dog Man", "Magic Tree House"]);
    expect(shelf.standalone.map((b) => b.title)).toEqual(["Matilda"]);
  });
});

describe("fetchSeriesMembers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps one book per whole-numbered place", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          series: [
            {
              book_series: [
                { position: 1, book: { id: 10, title: "Dinosaurs Before Dark" } },
                { position: 1.5, book: { id: 11, title: "A Special Extra" } },
                { position: 2, book: { id: 12, title: "The Knight at Dawn" } },
                { position: 3, book: null },
              ],
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchSeriesMembers("secret", 7)).toEqual([
      { hardcoverBookId: 10, title: "Dinosaurs Before Dark", position: 1 },
      { hardcoverBookId: 12, title: "The Knight at Dawn", position: 2 },
    ]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.variables).toEqual({ id: 7 });
  });
});

describe("Open Library series lists", () => {
  afterEach(() => vi.unstubAllGlobals());

  const answer = (docs: unknown[]) => {
    const fetchMock = vi.fn(async () => Response.json({ docs }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const query = (fetchMock: ReturnType<typeof answer>) =>
    new URL(String((fetchMock.mock.calls[0] as unknown as [string])[0])).searchParams.get("q");

  it("finds a series' key from the book's Open Library work", async () => {
    const fetchMock = answer([
      { key: "/works/OL82537W", series_key: ["OL1L", "OL326110L"], series_name: ["Wizarding World", "Harry Potter"] },
    ]);
    const key = await findOpenLibrarySeriesKey(
      { title: "Harry Potter and the Chamber of Secrets", openLibraryWorkId: "OL82537W" },
      "Harry Potter",
    );
    expect(key).toBe("OL326110L");
    expect(query(fetchMock)).toBe("key:/works/OL82537W");
  });

  it("finds a series' key by title and author, only from the same book", async () => {
    answer([
      { title: "Dog Man", author_name: ["Someone Else"], series_key: ["OL9L"] },
      { title: "Dog Man Unleashed", author_name: ["Dav Pilkey"], series_key: ["OL1734L"], series_name: ["Dog Man"] },
    ]);
    expect(await findOpenLibrarySeriesKey({ title: "Dog Man Unleashed", author: "Dav Pilkey" }, "Dog Man")).toBe("OL1734L");
  });

  it("lists one book per whole number, the one with the most editions, skipping box sets", async () => {
    const fetchMock = answer([
      { title: "Chamber of Secrets", series_key: ["OL326110L"], series_position: ["2"], edition_count: 306 },
      { title: "Philosopher's Stone", series_key: ["OL326110L"], series_position: ["1"], edition_count: 401 },
      { title: "Philosopher's Stone (study guide)", series_key: ["OL326110L"], series_position: ["1"], edition_count: 3 },
      { title: "Harry Potter 1-7", series_key: ["OL326110L"], series_position: ["1-7"], edition_count: 16 },
      { title: "Another series' book", series_key: ["OL1L", "OL326110L"], series_position: ["9", "4"], edition_count: 1 },
    ]);
    expect(await fetchOpenLibrarySeriesBooks("OL326110L")).toEqual([
      { title: "Philosopher's Stone", position: 1 },
      { title: "Chamber of Secrets", position: 2 },
      { title: "Another series' book", position: 4 },
    ]);
    expect(query(fetchMock)).toBe("series_key:OL326110L");
  });
});
