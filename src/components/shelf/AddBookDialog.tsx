"use client";

import { useEffect, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import type { BookSearchResult } from "@/app/api/book-search/route";
import { todayLocalISO } from "@/lib/dates";
import {
  BookDialog,
  Cover,
  FormError,
  inputStyle,
  labelTextStyle,
  linkButtonStyle,
  primaryButtonStyle,
} from "./BookDialogParts";
import { StarPicker } from "./StarPicker";

/** A book chosen from search (or typed in: just a title and author). */
export type Picked = Pick<BookSearchResult, "title" | "author"> &
  Partial<Omit<BookSearchResult, "title" | "author">>;

/**
 * The add-book dialog: find the book (or type it in), give it stars and the
 * day Norah finished it, and it goes on the shelf. Open it with
 * `ref.current.showModal()`; `formKey` should change each time it opens so
 * it starts fresh. `initialQuery` starts the search already typed in.
 */
export function AddBookDialog({
  ref,
  formKey,
  initialQuery,
  onAdded,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  formKey: number;
  initialQuery?: string;
  /** Called with the id of the book that was added (or re-read). */
  onAdded: (bookId: number) => void;
}) {
  return (
    <BookDialog ref={ref} titleId="add-book-title" title="Add a Book">
      <AddBookForm
        key={formKey}
        initialQuery={initialQuery}
        onDone={(bookId) => {
          ref.current?.close();
          onAdded(bookId);
        }}
      />
    </BookDialog>
  );
}

function AddBookForm({ initialQuery, onDone }: { initialQuery?: string; onDone: (bookId: number) => void }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [manual, setManual] = useState(false);

  if (!picked && !manual) {
    return (
      <BookSearch
        onPick={setPicked}
        initialQuery={initialQuery}
        footer={
          <button type="button" onClick={() => setManual(true)} className={linkButtonStyle}>
            Can&apos;t find it? Type it in yourself
          </button>
        }
      />
    );
  }
  return (
    <BookDetails
      picked={picked}
      onBack={() => {
        setPicked(null);
        setManual(false);
      }}
      onDone={onDone}
    />
  );
}

/**
 * Results already fetched while the page is open, by normalized query, so
 * going back to an earlier search (or reopening one) shows it instantly.
 */
const searchCache = new Map<string, BookSearchResult[]>();
const cacheKey = (q: string) => q.trim().replace(/\s+/g, " ").toLowerCase();

/** Search Open Library (through our server) and pick a book. */
export function BookSearch({
  onPick,
  footer,
  initialQuery = "",
}: {
  onPick: (book: Picked) => void;
  /** Starts the search with this already typed in (and searched). */
  initialQuery?: string;
  /** Shown under the results, e.g. a way out of searching. */
  footer: ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "done"; results: BookSearchResult[] }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Search a moment after typing stops; a newer search cancels an older one
  // (all the way to Open Library). Searches seen before show at once.
  useEffect(() => {
    const q = cacheKey(query);
    const cached = searchCache.get(q);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setState({ kind: "idle" });
        return;
      }
      if (cached) {
        setState({ kind: "done", results: cached });
        return;
      }
      setState({ kind: "loading" });
      try {
        const res = await fetch(`/api/book-search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { results?: BookSearchResult[]; error?: string };
        if (!res.ok) throw new Error(data.error);
        const results = data.results ?? [];
        searchCache.set(q, results);
        setState({ kind: "done", results });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message: err instanceof Error && err.message ? err.message : "Search isn't working right now.",
        });
      }
    }, cached ? 0 : 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <label className="block space-y-1 text-left">
        <span className={labelTextStyle}>Find the book</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title or author"
          autoFocus
          autoComplete="off"
          className={inputStyle}
        />
      </label>

      <div aria-live="polite" className="min-h-6">
        {state.kind === "loading" && <p className="text-sm text-ink-soft">Looking for books…</p>}
        {state.kind === "error" && <p className="text-sm font-medium text-[#b4235f]">{state.message}</p>}
        {state.kind === "done" && state.results.length === 0 && (
          <p className="text-sm text-ink-soft">No books found. Try different words, or type it in below.</p>
        )}
        {state.kind === "done" && state.results.length > 0 && (
          <ul className="max-h-[45dvh] space-y-2 overflow-y-auto pr-1">
            {state.results.map((book) => (
              <li key={book.googleVolumeId ?? book.openLibraryWorkId ?? `${book.title}-${book.author}`}>
                <button
                  type="button"
                  onClick={() => onPick(book)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-left shadow-sm transition-colors hover:bg-pastel-rose"
                >
                  <Cover url={book.coverUrl} title={book.title} small />
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-semibold">{book.title}</span>
                    {book.author && <span className="block truncate text-sm text-ink-soft">{book.author}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {footer}
    </div>
  );
}

function BookDetails({
  picked,
  onBack,
  onDone,
}: {
  picked: Picked | null;
  onBack: () => void;
  onDone: (bookId: number) => void;
}) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [today] = useState(todayLocalISO);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const book = picked ?? {
      title: String(form.get("title") ?? ""),
      author: String(form.get("author") ?? "").trim() || null,
    };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...book, rating, readAt: form.get("readAt") }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: { id: number } };
      if (!res.ok || !data.book) throw new Error(data.error);
      onDone(data.book.id);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't add the book. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {picked ? (
        <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm">
          <Cover url={picked.coverUrl ?? null} title={picked.title} />
          <div className="min-w-0 flex-1 text-left">
            <p className="line-clamp-2 text-lg font-semibold leading-snug">{picked.title}</p>
            {picked.author && <p className="text-sm text-ink-soft">{picked.author}</p>}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="self-start rounded-full px-3 py-2 text-sm font-medium text-[#b4235f] hover:bg-pastel-rose"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1 text-left">
            <span className={labelTextStyle}>Title</span>
            <input name="title" required maxLength={300} autoFocus className={inputStyle} />
          </label>
          <label className="block space-y-1 text-left">
            <span className={labelTextStyle}>Author (optional)</span>
            <input name="author" maxLength={300} className={inputStyle} />
          </label>
          <button
            type="button"
            onClick={onBack}
            className={linkButtonStyle}
          >
            Back to search
          </button>
        </div>
      )}

      <StarPicker value={rating} onChange={setRating} />

      <label className="block space-y-1 text-left">
        <span className={labelTextStyle}>Finished on</span>
        <input name="readAt" type="date" required defaultValue={today} max={today} className={inputStyle} />
      </label>

      <FormError message={error} />

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={busy}
          className={primaryButtonStyle}
        >
          {busy ? "Adding…" : "Add to Shelf"}
        </button>
      </div>
    </form>
  );
}
