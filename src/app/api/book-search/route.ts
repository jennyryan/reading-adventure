import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/http";

export type BookSearchResult = {
  title: string;
  author: string | null;
  openLibraryWorkId: string;
  coverUrl: string | null;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

/**
 * Book search for the add-book dialog. The search goes through our server
 * so visitors' browsers never contact Open Library directly (the same idea
 * as the cover images in next.config.ts).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 200) return NextResponse.json({ results: [] });

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "key,title,author_name,cover_i");
  url.searchParams.set("limit", "8");

  let docs: OpenLibraryDoc[];
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ReadingAdventure/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Open Library ${res.status}`);
    docs = ((await res.json()) as { docs?: OpenLibraryDoc[] }).docs ?? [];
  } catch {
    return jsonError(502, "Book search isn't working right now. You can type the book in instead.");
  }

  const results: BookSearchResult[] = docs.flatMap((doc) => {
    const workId = doc.key?.match(/^\/works\/(OL\d+W)$/)?.[1];
    if (!workId || !doc.title) return [];
    return [
      {
        title: doc.title,
        author: doc.author_name?.[0] ?? null,
        openLibraryWorkId: workId,
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      },
    ];
  });

  return NextResponse.json({ results });
}
