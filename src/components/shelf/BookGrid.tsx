"use client";

import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { ShelfBook } from "@/lib/shelf";
import { EditBookDialog } from "./EditBookDialog";
import { showOnShelf } from "./showOnShelf";

const SPRING = { type: "spring", stiffness: 140, damping: 16 } as const;

/**
 * Lays out book cards and slides them onto the shelf one after another.
 * Cards are rendered on the server and passed in with their book. Clicking
 * a card opens the Edit Book dialog.
 */
export function BookGrid({
  items,
}: {
  items: { book: ShelfBook; card: ReactNode }[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  // After an edit the card may move (its date sets its place), so show it
  // only once the refreshed shelf has rendered.
  const showAfterRefresh = useRef<number | null>(null);
  useEffect(() => {
    if (refreshing || showAfterRefresh.current === null) return;
    showOnShelf(showAfterRefresh.current);
    showAfterRefresh.current = null;
  }, [refreshing]);
  const editDialog = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Looked up from the latest items, so it's never stale after a refresh.
  const editing = items.find(({ book }) => book.id === editingId)?.book ?? null;

  // Bumped on every opening, so the form starts again from the saved book
  // and anything left unsaved last time is thrown away.
  const [openCount, setOpenCount] = useState(0);

  function edit(bookId: number) {
    setEditingId(bookId);
    setOpenCount((n) => n + 1);
    editDialog.current?.showModal();
  }

  // The one-after-another stagger is for the first page load. A book added
  // later slides in straight away, wherever it lands on the shelf.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {items.map(({ book, card }, i) => (
          <BookItem
            key={book.id}
            id={book.id}
            title={book.title}
            tilt={i % 2 ? 2 : -2}
            delay={settled ? 0 : 0.15 + i * 0.06}
            onOpen={() => edit(book.id)}
          >
            {card}
          </BookItem>
        ))}
      </ul>
      <EditBookDialog
        ref={editDialog}
        book={editing}
        formKey={openCount}
        onSaved={(bookId) => {
          showAfterRefresh.current = bookId;
          startRefresh(() => router.refresh());
        }}
        onDeleted={() => router.refresh()}
      />
    </>
  );
}

/**
 * One card. It slides up onto the shelf with a little tilt when it first
 * appears, and a gentler version of the same slide when hovered (no fade).
 * A button laid over the whole card opens it for editing.
 */
function BookItem({
  id,
  title,
  tilt,
  delay,
  onOpen,
  children,
}: {
  id: number;
  title: string;
  tilt: number;
  delay: number;
  onOpen: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const [entered, setEntered] = useState(false);

  // Entrance: runs once, with this card's stagger delay at that moment.
  const [entranceDelay] = useState(delay);
  useEffect(() => {
    if (reduce) {
      controls.set({ opacity: 1, y: 0, rotate: 0 });
      return;
    }
    controls
      .start({
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: { ...SPRING, delay: entranceDelay },
      })
      .then(() => setEntered(true));
  }, [controls, reduce, tilt, entranceDelay]);

  function replay() {
    if (reduce || !entered) return;
    // A gentle echo of the entrance: glides down a touch with the faintest
    // tilt and back up, all in one smooth motion (no jump, no bounce).
    controls.start({
      y: [0, 4, 0],
      rotate: [0, tilt / 6, 0],
      transition: { type: "tween", duration: 0.6, ease: "easeInOut" },
    });
  }

  return (
    <motion.li
      data-book-id={id}
      className="relative"
      initial={reduce ? false : { opacity: 0, y: 24, rotate: tilt }}
      animate={controls}
      onHoverStart={replay}
    >
      {children}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Edit ${title}`}
        className="absolute inset-0 rounded-3xl focus-visible:outline-offset-4"
      />
    </motion.li>
  );
}
