import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/book-search/route";
import { makeRequest } from "./helpers";

// tests/setup.ts sets GOOGLE_BOOKS_API_KEY, so search tries Google first.

const search = (q: string) => GET(makeRequest(`/api/book-search?q=${encodeURIComponent(q)}`, { method: "GET" }));

/** Answers fetches by host: Google Books and Open Library each get a response (or an error). */
function mockServices(services: { google?: Response | Error; openLibrary?: Response | Error }) {
  const fetchMock = vi.fn(async (input: string | URL) => {
    const host = new URL(String(input)).host;
    const answer = host === "www.googleapis.com" ? services.google : services.openLibrary;
    if (!answer) throw new Error(`unexpected fetch to ${host}`);
    if (answer instanceof Error) throw answer;
    return answer.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const hostsCalled = (fetchMock: ReturnType<typeof mockServices>) =>
  fetchMock.mock.calls.map((call) => new URL(String((call as unknown[])[0])).host);

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/book-search", () => {
  it("skips the book services for queries that are too short", async () => {
    const fetchMock = mockServices({});
    const res = await search(" a ");
    expect(await res.json()).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Google Books results, one per book, with cleaned-up covers", async () => {
    mockServices({
      google: Response.json({
        items: [
          {
            id: "vol1",
            volumeInfo: {
              title: "Matilda",
              authors: ["Roald Dahl", "Quentin Blake"],
              industryIdentifiers: [
                { type: "ISBN_10", identifier: "0142410373" },
                { type: "ISBN_13", identifier: "9780142410370" },
              ],
              imageLinks: {
                thumbnail: "http://books.google.com/books/content?id=vol1&printsec=frontcover&img=1&zoom=1&edge=curl",
              },
            },
          },
          // Another edition of the same book: merged into the first.
          { id: "vol2", volumeInfo: { title: "Matilda: 30th Anniversary Edition", authors: ["Roald Dahl"] } },
          // A cover from somewhere else is dropped, not passed on.
          {
            id: "vol3",
            volumeInfo: { title: "The BFG", authors: ["Roald Dahl"], imageLinks: { thumbnail: "https://evil.example/x.jpg" } },
          },
          { id: "vol4", volumeInfo: {} },
          // A series tag in the title is trimmed off, and kept as a series hint.
          {
            id: "vol5",
            volumeInfo: { title: "Dog Man Unleashed: A Graphic Novel (Dog Man #2)", authors: ["Dav Pilkey"] },
          },
        ],
      }),
    });

    const res = await search("roald dahl");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [
        {
          title: "Matilda",
          author: "Roald Dahl",
          isbn: "9780142410370",
          coverUrl: "https://books.google.com/books/content?id=vol1&printsec=frontcover&img=1&zoom=1",
          googleVolumeId: "vol1",
          openLibraryWorkId: null,
          series: null,
        },
        {
          title: "The BFG",
          author: "Roald Dahl",
          isbn: null,
          coverUrl: null,
          googleVolumeId: "vol3",
          openLibraryWorkId: null,
          series: null,
        },
        {
          title: "Dog Man Unleashed",
          author: "Dav Pilkey",
          isbn: null,
          coverUrl: null,
          googleVolumeId: "vol5",
          openLibraryWorkId: null,
          series: { name: "Dog Man", position: 2 },
        },
      ],
    });
  });

  it("falls back to Open Library when Google fails", async () => {
    const fetchMock = mockServices({
      google: new Response("quota", { status: 429 }),
      openLibrary: Response.json({
        docs: [
          {
            key: "/works/OL45883W",
            title: "Matilda",
            author_name: ["Roald Dahl"],
            cover_i: 12345,
            isbn: ["0142410373", "9780142410370"],
          },
          {
            key: "/works/OL82537W",
            title: "Harry Potter and the Chamber of Secrets",
            author_name: ["J. K. Rowling"],
            // A German edition listed first: the English one is picked.
            isbn: ["9783551559029", "9780439420105"],
            series_name: ["Harry Potter"],
            series_position: ["2"],
          },
          { key: "/books/OL2M", title: "An edition, not a work" },
        ],
      }),
    });

    const res = await search("matilda");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [
        {
          title: "Matilda",
          author: "Roald Dahl",
          isbn: "9780142410370",
          coverUrl: "https://covers.openlibrary.org/b/id/12345-M.jpg",
          googleVolumeId: null,
          openLibraryWorkId: "OL45883W",
          series: null,
        },
        {
          title: "Harry Potter and the Chamber of Secrets",
          author: "J. K. Rowling",
          isbn: "9780439420105",
          coverUrl: null,
          googleVolumeId: null,
          openLibraryWorkId: "OL82537W",
          series: { name: "Harry Potter", position: 2 },
        },
      ],
    });
    expect(hostsCalled(fetchMock)).toEqual(["www.googleapis.com", "openlibrary.org"]);
  });

  it("normalizes the query so the same search shares one cache entry", async () => {
    const fetchMock = mockServices({ google: Response.json({ items: [] }) });
    await search("  Frog   and TOAD ");
    const calledUrl = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(calledUrl.searchParams.get("q")).toBe("frog and toad");
  });

  it("reports a friendly error when both services are down", async () => {
    mockServices({ google: new Error("network down"), openLibrary: new Error("network down") });
    const res = await search("matilda");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/type the book in/);
  });
});
