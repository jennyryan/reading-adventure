"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useRef, useState, type ReactNode } from "react";
import type { ShelfBook } from "@/lib/shelf";
import { AddBookDialog } from "./AddBookDialog";
import { EditBookDialog } from "./EditBookDialog";

type Actions = {
  /** Opens the add-book dialog already searching for a book. */
  add: (query: string) => void;
  /** Opens the edit dialog for a book on the shelf. */
  edit: (bookId: number) => void;
};
const SeriesActions = createContext<Actions>({ add: () => {}, edit: () => {} });

/**
 * Gives the series view one add-book dialog, which its empty slots open
 * already searching for their book, and the same edit dialog the shelf
 * grid uses, which its covers open.
 */
export function SeriesActionsProvider({ books, children }: { books: ShelfBook[]; children: ReactNode }) {
  const router = useRouter();

  const addDialog = useRef<HTMLDialogElement>(null);
  const [addKey, setAddKey] = useState(0);
  const [query, setQuery] = useState("");

  const editDialog = useRef<HTMLDialogElement>(null);
  const [editKey, setEditKey] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Looked up from the latest books, so it's never stale after a refresh.
  const editing = books.find((b) => b.id === editingId) ?? null;

  const actions: Actions = {
    add(q) {
      setQuery(q);
      setAddKey((k) => k + 1); // a fresh form each time
      addDialog.current?.showModal();
    },
    edit(bookId) {
      setEditingId(bookId);
      setEditKey((k) => k + 1); // a fresh form each time: unsaved changes are dropped
      editDialog.current?.showModal();
    },
  };

  return (
    <SeriesActions value={actions}>
      {children}
      {/* The new book fills its slot once the page refreshes. */}
      <AddBookDialog ref={addDialog} formKey={addKey} initialQuery={query} onAdded={() => router.refresh()} />
      <EditBookDialog
        ref={editDialog}
        book={editing}
        formKey={editKey}
        onSaved={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </SeriesActions>
  );
}

/** A book on the shelf, shown as its cover: clicking it opens the edit dialog. */
export function EditableBook({ bookId, title, children }: { bookId: number; title: string; children: ReactNode }) {
  const { edit } = use(SeriesActions);
  return (
    <button
      type="button"
      onClick={() => edit(bookId)}
      aria-label={`Edit ${title}`}
      className="block w-full cursor-pointer rounded-lg transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-offset-4 motion-reduce:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

/**
 * A book in a series Norah hasn't read yet: a dashed, numbered slot. Hovering
 * (or focusing) it shows a pink plus; clicking it opens the add-book dialog
 * searching for that book.
 */
export function EmptySlot({
  position,
  title,
  seriesName,
  author,
}: {
  position: number | null;
  title: string;
  seriesName: string;
  author: string | null;
}) {
  const { add } = use(SeriesActions);
  const number = position === null ? null : `#${position}`;
  // A number the series' book list skipped has no title: search by series and number.
  const query = (title ? [title, author] : [seriesName, position, author]).filter(Boolean).join(" ");
  const label = title ? `Add “${title}” to the shelf` : `Add ${seriesName} book ${position} to the shelf`;

  return (
    <button
      type="button"
      onClick={() => add(query)}
      aria-label={label}
      className="group relative flex aspect-[2/3] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-soft/30 bg-white/40 p-1.5 transition-colors hover:border-[#db2777]/50 hover:bg-white/70 focus-visible:border-[#db2777]/50 focus-visible:bg-white/70 focus-visible:outline-none"
    >
      {/* Faded back on hover so the plus stands out. */}
      <span className="flex flex-col items-center gap-1 transition-opacity duration-200 group-hover:opacity-30 group-focus-visible:opacity-30">
        {number && <span className="font-display text-xl font-bold text-ink-soft/70">{number}</span>}
        {title && <span className="line-clamp-3 text-[11px] leading-tight text-ink-soft">{title}</span>}
      </span>

      {/* The pink plus, like the Add Book button's. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-[#db2777] text-white shadow-md transition-transform duration-300 ease-out motion-safe:group-hover:rotate-90">
          <svg viewBox="0 0 24 24" className="size-6">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </span>
      </span>
    </button>
  );
}
