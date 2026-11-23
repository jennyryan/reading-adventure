import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/book-search/route";
import { makeRequest } from "./helpers";

const search = (q: string) => GET(makeRequest(`/api/book-search?q=${encodeURIComponent(q)}`, { method: "GET" }));

function mockOpenLibrary(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/book-search", () => {
  it("skips Open Library for queries that are too short", async () => {
    const fetchMock = mockOpenLibrary(Response.json({ docs: [] }));
    const res = await search(" a ");
    expect(await res.json()).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Open Library results to what the add form needs", async () => {
    const fetchMock = mockOpenLibrary(
      Response.json({
        docs: [
          { key: "/works/OL45883W", title: "Matilda", author_name: ["Roald Dahl", "Quentin Blake"], cover_i: 12345 },
          { key: "/works/OL1W", title: "No Cover Book" },
          { key: "/books/OL2M", title: "An edition, not a work" },
          { key: "/works/OL3W" },
        ],
      }),
    );

    const res = await search("matilda");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [
        {
          title: "Matilda",
          author: "Roald Dahl",
          openLibraryWorkId: "OL45883W",
          coverUrl: "https://covers.openlibrary.org/b/id/12345-M.jpg",
        },
        { title: "No Cover Book", author: null, openLibraryWorkId: "OL1W", coverUrl: null },
      ],
    });
    const calledUrl = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(calledUrl.host).toBe("openlibrary.org");
    expect(calledUrl.searchParams.get("q")).toBe("matilda");
  });

  it("reports a friendly error when Open Library is down", async () => {
    mockOpenLibrary(new Error("network down"));
    const res = await search("matilda");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/type the book in/);
  });
});
