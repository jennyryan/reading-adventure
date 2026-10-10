import Image from "next/image";
import { formatReadDate } from "@/lib/dates";
import type { ShelfBook } from "@/lib/shelf";
import { Stars } from "./Stars";

const PASTELS = [
  "bg-pastel-rose",
  "bg-pastel-mint",
  "bg-pastel-sky",
  "bg-pastel-butter",
  "bg-pastel-lilac",
  "bg-pastel-peach",
];

/** A pastel color that stays the same for a given book. */
export function pastelFor(bookId: number) {
  return PASTELS[bookId % PASTELS.length];
}

export function BookCard({ book }: { book: ShelfBook }) {
  return (
    <article className={`flex h-full flex-col items-center gap-3 rounded-3xl p-4 text-center shadow-sm ${pastelFor(book.id)}`}>
      <div className="relative aspect-[2/3] w-full max-w-40 overflow-hidden rounded-xl bg-white/60 shadow-md ring-4 ring-white">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 28vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-lg font-semibold text-ink-soft" aria-hidden="true">
            {book.title}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold">{book.title}</h3>
        {book.author && <p className="text-sm text-ink-soft">{book.author}</p>}
        <Stars rating={book.rating} />
        <p className="text-sm text-ink-soft">
          Finished {formatReadDate(book.readAt)}
          {book.timesRead > 1 && <> · read {book.timesRead}×</>}
        </p>
      </div>
    </article>
  );
}
