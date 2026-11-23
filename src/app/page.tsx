import { HeroScene } from "@/components/hero/HeroScene";
import { AddBookButton } from "@/components/shelf/AddBookButton";
import { AlignToHeroEdge } from "@/components/shelf/AlignToHeroEdge";
import { BookCard } from "@/components/shelf/BookCard";
import { BookGrid } from "@/components/shelf/BookGrid";
import { BooksReadBadge } from "@/components/shelf/BooksReadBadge";
import { getShelf } from "@/lib/shelf";

export default async function Home() {
  const { books } = await getShelf();

  return (
    <>
      <HeroScene />

      <div className="polka-backdrop pb-2">
        {/* The margins are close fallbacks; AlignToHeroEdge sets the exact one. */}
        <AlignToHeroEdge className="relative z-10 mx-auto -mt-[420px] max-w-7xl px-3 sm:-mt-[396px] sm:px-6">
          {/* The badge sits on the hero picture, above the shelf. */}
          <div className="mb-4 flex justify-center">
            <BooksReadBadge read={books.length} />
          </div>

          <section
            aria-label="Norah's bookshelf"
            className="space-y-8 rounded-[2rem] bg-cream p-5 shadow-[0_20px_50px_-15px_rgba(40,30,60,0.45)] sm:p-8"
          >
            <div className="space-y-6 text-center">
              <h1 className="font-display text-4xl font-bold leading-normal text-[#c2417f] sm:text-5xl">
                Norah&apos;s Reading Adventure
              </h1>
              <div className="flex justify-center">
                <AddBookButton />
              </div>
              {/* Lined up with the hero's pink border, so it reads as one line. */}
              <hr data-hero-edge className="border-0 border-t-2 border-dashed border-pink-soft" />
            </div>

            {books.length > 0 ? (
              <BookGrid items={books.map((book) => ({ book, card: <BookCard book={book} /> }))} />
            ) : (
              <p className="py-12 text-center text-lg text-ink-soft">
                The shelf is waiting for its very first book! 📚
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
