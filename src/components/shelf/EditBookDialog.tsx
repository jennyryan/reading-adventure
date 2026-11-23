"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { todayLocalISO } from "@/lib/dates";
import type { ShelfBook } from "@/lib/shelf";
import {
  BookDialog,
  Cover,
  errorFrom,
  FormError,
  inputStyle,
  labelTextStyle,
  linkButtonStyle,
  primaryButtonStyle,
} from "./BookDialogParts";
import { BookSearch, type Picked } from "./AddBookDialog";
import { StarPicker } from "./StarPicker";

/**
 * The edit dialog for a book on the shelf: fix its title or author (or, for
 * a book from search, pick a different one), change the stars or the
 * finished date, or take it off the shelf. Open it with
 * `ref.current.showModal()` after choosing `book`.
 */
export function EditBookDialog({
  ref,
  book,
  formKey,
  onSaved,
  onDeleted,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  book: ShelfBook | null;
  /** Changes on every opening; the form resets to the saved book. */
  formKey: number;
  onSaved: (bookId: number) => void;
  onDeleted: () => void;
}) {
  return (
    <BookDialog ref={ref} titleId="edit-book-title" title="Edit Book">
      {book && (
        // A fresh form on every opening: closing without saving (the × or
        // Escape) discards every change.
        <EditBookForm
          key={formKey}
          book={book}
          onSaved={() => {
            ref.current?.close();
            onSaved(book.id);
          }}
          onDeleted={() => {
            ref.current?.close();
            onDeleted();
          }}
        />
      )}
    </BookDialog>
  );
}

function EditBookForm({
  book,
  onSaved,
  onDeleted,
}: {
  book: ShelfBook;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [rating, setRating] = useState(book.rating);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(todayLocalISO);
  // Kept in state so it survives a trip to the search view and back.
  const [readAt, setReadAt] = useState(book.readAt);
  // A book picked from search keeps the title and author that came with it,
  // but tapping its card searches again to swap in a different book.
  const fromSearch = book.fromSearch;
  const [searching, setSearching] = useState(false);
  const [replacement, setReplacement] = useState<Picked | null>(null);
  const shown = replacement ?? book;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const author = String(form.get("author") ?? "").trim() || null;

    // Only send what changed. The book's details and the reading (stars and
    // date) are saved separately.
    const bookChanges = replacement
      ? {
          title: replacement.title,
          author: replacement.author,
          coverUrl: replacement.coverUrl ?? null,
          isbn: replacement.isbn ?? null,
          openLibraryWorkId: replacement.openLibraryWorkId ?? null,
          googleVolumeId: replacement.googleVolumeId ?? null,
          series: replacement.series ?? null,
        }
      : fromSearch
        ? {}
        : {
            ...(title !== book.title && { title }),
            ...(author !== book.author && { author }),
          };
    const readingChanges = {
      ...(rating !== book.rating && { rating }),
      ...(readAt !== book.readAt && { readAt }),
    };

    setBusy("saving");
    setError(null);
    try {
      if (Object.keys(bookChanges).length > 0) {
        const res = await patch(`/api/books/${book.id}`, bookChanges);
        if (!res.ok)
          throw new Error(
            await errorFrom(res, "Couldn't save the book's details."),
          );
      }
      if (Object.keys(readingChanges).length > 0) {
        const res = await patch(
          `/api/readings/${book.readingId}`,
          readingChanges,
        );
        if (!res.ok)
          throw new Error(
            await errorFrom(res, "Couldn't save the stars and date."),
          );
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("deleting");
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error(await errorFrom(res, "Couldn't delete the book."));
      onDeleted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't delete. Please try again.",
      );
      setBusy(null);
    }
  }

  if (searching) {
    return (
      <BookSearch
        // Start with the current book's results, so it's easy to pick a
        // different edition or the right match.
        initialQuery={[shown.title, shown.author].filter(Boolean).join(" ")}
        onPick={(picked) => {
          setReplacement(picked);
          setSearching(false);
        }}
        footer={
          <button
            type="button"
            onClick={() => setSearching(false)}
            className={linkButtonStyle}
          >
            Keep &ldquo;{shown.title}&rdquo;
          </button>
        }
      />
    );
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {fromSearch ? (
        // Same card the Add a Book dialog shows for a picked book. Tapping it
        // searches for a different book to put in its place.
        <button
          type="button"
          onClick={() => setSearching(true)}
          aria-label={`Change book: ${shown.title}. Search for a different book`}
          className="flex w-full items-center gap-4 rounded-2xl bg-white p-3 text-left shadow-sm transition-colors hover:bg-pastel-rose"
        >
          <Cover url={shown.coverUrl ?? null} title={shown.title} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-lg font-semibold leading-snug">
              {shown.title}
            </span>
            {shown.author && (
              <span className="block text-sm text-ink-soft">
                {shown.author}
              </span>
            )}
          </span>
          <span
            className="px-1 text-sm font-medium text-[#b4235f]"
            aria-hidden="true"
          >
            Change
          </span>
        </button>
      ) : (
        <>
          <div className="flex justify-center">
            <Cover url={book.coverUrl} title={book.title} />
          </div>

          <div className="space-y-3">
            <label className="block space-y-1 text-left">
              <span className={labelTextStyle}>Title</span>
              <input
                name="title"
                required
                maxLength={300}
                defaultValue={book.title}
                className={inputStyle}
              />
            </label>
            <label className="block space-y-1 text-left">
              <span className={labelTextStyle}>Author (optional)</span>
              <input
                name="author"
                maxLength={300}
                defaultValue={book.author ?? ""}
                className={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <StarPicker value={rating} onChange={setRating} />

      <label className="block space-y-1 text-left">
        <span className={labelTextStyle}>Finished on</span>
        <input
          name="readAt"
          type="date"
          required
          value={readAt}
          onChange={(e) => setReadAt(e.target.value)}
          max={today}
          className={inputStyle}
        />
        {book.timesRead > 1 && (
          <span className="block text-sm text-ink-soft">
            Read {book.timesRead} times. This changes the most recent one.
          </span>
        )}
      </label>

      <FormError message={error} />

      {confirmingDelete ? (
        <div
          role="group"
          aria-label="Confirm delete"
          className="space-y-3 rounded-2xl bg-pastel-rose p-4"
        >
          <div>
            <p>
              Take &ldquo;{book.title}&rdquo; off the shelf?
              {book.timesRead > 1 &&
                ` All ${book.timesRead} readings go with it.`}
            </p>
            <p className="font-semibold">This can&apos;t be undone.</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              autoFocus
              className="min-h-12 rounded-full bg-[#b4235f] px-6 font-semibold text-white shadow hover:bg-[#9d1d52] disabled:opacity-60"
            >
              {busy === "deleting" ? "Deleting…" : "Delete Book"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy !== null}
              className="min-h-12 rounded-full px-5 font-medium text-ink-soft hover:bg-white/60"
            >
              Keep It
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={busy !== null}
              className={primaryButtonStyle}
            >
              {busy === "saving" ? "Saving…" : "Save Changes"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={linkButtonStyle}
          >
            Delete this book
          </button>
        </div>
      )}
    </form>
  );
}

function patch(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
