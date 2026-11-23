import { HeroScene } from "@/components/hero/HeroScene";
import { AddBookButton } from "@/components/shelf/AddBookButton";
import { AlignToHeroEdge } from "@/components/shelf/AlignToHeroEdge";
import { BookCard } from "@/components/shelf/BookCard";
import { BookGrid } from "@/components/shelf/BookGrid";
import { BooksReadBadge } from "@/components/shelf/BooksReadBadge";
import { SeriesView } from "@/components/shelf/SeriesView";
import { ViewSwitch } from "@/components/shelf/ViewSwitch";
import { getSeriesShelf } from "@/lib/seriesShelf";
import { getShelf } from "@/lib/shelf";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { books } = await getShelf();
  // ?view=series groups the shelf by series; anything else shows every book.
  const view = (await searchParams).view === "series" ? "series" : "books";

  return (
    <>
      <HeroScene />

      {/* Grows to the bottom of the window, so the dots cover the whole
          page even when the shelf is short. */}
      <div className="polka-backdrop flex-1 pb-2">
        {/* The margins are close fallbacks; AlignToHeroEdge sets the exact one. */}
        <AlignToHeroEdge className="relative z-10 mx-auto -mt-[401px] max-w-7xl px-3 sm:-mt-[365px] sm:px-6">
          <section
            aria-label="Norah's bookshelf"
            className="space-y-8 rounded-[2rem] bg-cream p-5 shadow-[0_20px_50px_-15px_rgba(40,30,60,0.45)] sm:p-8"
          >
            <div className="space-y-3 text-center">
              {/* The badge rises out of the panel's top edge, so it skips
                  the panel's top padding. (Flex keeps this margin and the
                  badge's own from merging into one.) */}
              <div className="-mt-5 flex justify-center sm:-mt-8">
                <BooksReadBadge read={books.length} />
              </div>
              <h1 className="font-display text-[2.3rem] font-bold leading-normal text-[#c2417f] sm:text-6xl">
                Norah&apos;s Reading Adventure
              </h1>
              <div className="flex justify-center">
                <AddBookButton />
              </div>
              {/* Lined up with the hero's pink border, so it reads as one line. */}
              <hr data-hero-edge className="mt-6 border-0 border-t-2 border-dashed border-pink-soft" />
            </div>

            {books.length > 0 ? (
              <div className="space-y-6">
                <ViewSwitch current={view} />
                {view === "series" ? (
                  <SeriesView shelf={await getSeriesShelf(books)} />
                ) : (
                  <BookGrid items={books.map((book) => ({ book, card: <BookCard book={book} /> }))} />
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-lg text-ink-soft">
                The shelf is waiting for its very first book!
              </p>
            )}
          </section>
        </AlignToHeroEdge>

        <footer className="flex flex-col items-center gap-1 px-4 py-10 text-center text-white/85">
          <p className="text-sm">Made with love for Norah ✨</p>
        </footer>
      </div>
    </>
  );
}
