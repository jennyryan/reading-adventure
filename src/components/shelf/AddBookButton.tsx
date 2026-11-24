"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AddBookDialog } from "./AddBookDialog";
import { unlockFirst } from "./EditAccess";
import { showOnShelf } from "./showOnShelf";

/**
 * The big pink "Add Book" button under the shelf's title. It opens the
 * add-book dialog. On hover it grows, the plus spins and little
 * sparkles pop out; pressing it squishes it down.
 *
 * The pink is a shade deeper than --color-pink so the white label passes
 * WCAG AA contrast (about 4.9:1).
 */
const SPARKLE_PATH =
  "M12 0 C 13.3 7.2 16.8 10.7 24 12 C 16.8 13.3 13.3 16.8 12 24 C 10.7 16.8 7.2 13.3 0 12 C 7.2 10.7 10.7 7.2 12 0 Z";

/** Where the sparkles pop out around the button: position, size, delay. */
const SPARKLES = [
  { className: "-top-3 -left-2", size: 18, delay: "0ms" },
  { className: "-top-4 right-3", size: 14, delay: "60ms" },
  { className: "-bottom-3 -right-2", size: 16, delay: "120ms" },
];

export function AddBookButton() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  async function open() {
    // On a site with a passcode, ask for it first (once per device).
    if (!(await unlockFirst())) return;
    setFormKey((k) => k + 1); // a fresh, empty form each time
    dialog.current?.showModal();
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={open}
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        className="group relative inline-flex min-h-12 items-center gap-2 rounded-full bg-[#db2777] py-2 pl-3 pr-6 text-lg font-semibold text-white transition-colors hover:bg-[#be185d]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-8 rounded-full bg-white/25 p-1.5 transition-transform duration-300 ease-out motion-safe:group-hover:rotate-90"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
        Add Book
        {SPARKLES.map(({ className, size, delay }) => (
          <svg
            key={className}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            aria-hidden="true"
            style={{ transitionDelay: delay }}
            className={`pointer-events-none absolute ${className} scale-0 opacity-0 transition duration-300 ease-out motion-safe:group-hover:scale-100 motion-safe:group-hover:rotate-45 motion-safe:group-hover:opacity-100`}
          >
            <path d={SPARKLE_PATH} fill="var(--color-star)" />
          </svg>
        ))}
      </motion.button>

      <AddBookDialog
        ref={dialog}
        formKey={formKey}
        onAdded={(bookId) => {
          router.refresh();
          showOnShelf(bookId);
        }}
      />
    </>
  );
}
