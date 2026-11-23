"use client";

import Image from "next/image";
import type { ReactNode, RefObject } from "react";

// Pieces shared by the Add a Book and Edit Book dialogs, so they look alike.

export const inputStyle =
  "w-full rounded-xl border-2 border-cream-deep bg-white px-4 py-3 text-lg outline-none";

export const labelTextStyle = "text-lg text-ink-soft";

export const primaryButtonStyle =
  "min-h-12 rounded-full bg-[#db2777] px-7 text-lg font-semibold text-white shadow hover:bg-[#be185d] disabled:opacity-60";

export const linkButtonStyle =
  "text-sm font-medium text-[#b4235f] underline underline-offset-4 hover:no-underline";

/**
 * The modal itself: a native <dialog> (focus trap and Escape for free) with
 * the big title and a close button. Open it with `ref.current.showModal()`.
 */
export function BookDialog({
  ref,
  titleId,
  title,
  children,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  titleId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto max-h-[92dvh] w-[min(94vw,32rem)] rounded-3xl bg-cream p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    >
      <div className="relative space-y-5 p-6 text-center">
        <h2 id={titleId} className="px-14 font-display text-4xl font-bold leading-normal text-[#c2417f]">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full text-ink-soft hover:bg-cream-deep"
        >
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-[#b4235f]">
      {message}
    </p>
  );
}

export function Cover({ url, title, small = false }: { url: string | null; title: string; small?: boolean }) {
  const size = small ? "h-15 w-10" : "h-24 w-16";
  if (!url) {
    return (
      <span
        aria-hidden="true"
        className={`${size} flex shrink-0 items-center justify-center rounded-md bg-pastel-lilac text-xs font-semibold text-ink-soft`}
      >
        {title.slice(0, 1)}
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={small ? 40 : 64}
      height={small ? 60 : 96}
      className={`${size} shrink-0 rounded-md bg-pastel-lilac object-cover shadow`}
    />
  );
}

/** Reads an error message from a JSON response, with a fallback. */
export async function errorFrom(res: Response, fallback: string) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}
