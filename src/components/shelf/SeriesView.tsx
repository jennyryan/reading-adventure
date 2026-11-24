import Image from "next/image";
import type { SeriesGroup, SeriesShelf, SeriesSlot } from "@/lib/seriesShelf";
import type { ShelfBook } from "@/lib/shelf";
import { EditableBook, EmptySlot, SeriesActionsProvider } from "./SeriesActions";
import { pastelFor } from "./BookCard";

/**
 * The shelf organized by series: each series in order, with how many of
 * its books Norah has read. Books she hasn't read yet are empty, numbered
 * slots; clicking one adds it. Clicking a cover edits that book, as on the
 * shelf grid. Books in no series are gathered at the end.
 */
export function SeriesView({ shelf }: { shelf: SeriesShelf }) {
  const books = [
    ...shelf.series.flatMap((group) => group.slots.flatMap((slot) => (slot.book ? [slot.book] : []))),
    ...shelf.standalone,
  ];
  return (
    <SeriesActionsProvider books={books}>
      <div className="space-y-6">
        {shelf.series.length === 0 && (
          <p className="py-6 text-center text-lg text-ink-soft">
            None of these books are in a series yet. When a series is found, it will show up here.
          </p>
        )}
        {shelf.series.map((group) => (
          <SeriesRow key={group.id} group={group} />
        ))}
        {shelf.standalone.length > 0 && <Standalone books={shelf.standalone} />}
      </div>
    </SeriesActionsProvider>
  );
}

function SeriesRow({ group }: { group: SeriesGroup }) {
  const complete = group.total !== null && group.read >= group.total;
  const progress = group.total === null ? null : Math.min(1, group.read / group.total);
  // For searching: series books usually share an author.
  const author = group.slots.find((slot) => slot.book?.author)?.book?.author ?? null;

  return (
    <section aria-labelledby={`series-${group.id}`} className={`rounded-3xl p-4 shadow-sm sm:p-5 ${pastelFor(group.id)}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`series-${group.id}`} className="font-display text-2xl font-bold text-[#c2417f]">
          {group.name}
        </h2>
        <p className="text-sm font-semibold text-ink-soft">
          {group.total === null ? (
            <>{group.read} read</>
          ) : complete ? (
            <>All {group.total} read!</>
          ) : (
            <>
              {group.read} of {group.total} read
            </>
          )}
        </p>
      </div>

      {progress !== null && (
        <div
          role="progressbar"
          aria-label={`${group.name}: books read`}
          aria-valuemin={0}
          aria-valuemax={group.total ?? 0}
          aria-valuenow={group.read}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70"
        >
          <div className="h-full rounded-full bg-[#c93d76]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {/* Long series scroll sideways rather than taking over the page.
          (relative keeps the hidden screen-reader labels inside the row,
          so they can't stretch the page sideways.) */}
      <ol className="relative -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {group.slots.map((slot, i) => (
          <li key={slot.book?.id ?? `${slot.position}-${i}`} className="w-[84px] shrink-0">
            <Slot slot={slot} seriesName={group.name} author={author} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Slot({ slot, seriesName, author }: { slot: SeriesSlot; seriesName: string; author: string | null }) {
  const number = slot.position === null ? null : `#${slot.position}`;
  if (slot.book) {
    return (
      <figure className="flex flex-col items-center gap-1 text-center">
        <EditableBook bookId={slot.book.id} title={slot.book.title}>
          <Cover book={slot.book} />
        </EditableBook>
        <figcaption className="text-xs font-semibold text-ink">
          <span className="sr-only">{slot.title}, read. </span>
          {number}
        </figcaption>
      </figure>
    );
  }
  return <EmptySlot position={slot.position} title={slot.title} seriesName={seriesName} author={author} />;
}

function Cover({ book }: { book: ShelfBook }) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-white/60 shadow-md ring-2 ring-white">
      {book.coverUrl ? (
        <Image src={book.coverUrl} alt="" fill sizes="84px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center p-1.5 text-[11px] leading-tight font-semibold text-ink-soft">
          {book.title}
        </div>
      )}
    </div>
  );
}

function Standalone({ books }: { books: ShelfBook[] }) {
  return (
    <section aria-labelledby="series-none" className="rounded-3xl bg-white/50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="series-none" className="font-display text-2xl font-bold text-[#c2417f]">
          Not in a series
        </h2>
        <p className="text-sm font-semibold text-ink-soft">
          {books.length} {books.length === 1 ? "book" : "books"}
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-3 pt-1">
        {books.map((book) => (
          <li key={book.id} className="w-[84px]">
            <EditableBook bookId={book.id} title={book.title}>
              <Cover book={book} />
            </EditableBook>
          </li>
        ))}
      </ul>
    </section>
  );
}
