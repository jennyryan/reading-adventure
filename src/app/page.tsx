import { GrownupUnlock } from "@/components/GrownupUnlock";
import { HeroScene } from "@/components/hero/HeroScene";
import { BookCard } from "@/components/shelf/BookCard";
import { BookGrid } from "@/components/shelf/BookGrid";
import { ProgressHeader } from "@/components/shelf/ProgressHeader";
import { isGrownup } from "@/lib/auth/session";
import { getShelf } from "@/lib/shelf";

export default async function Home() {
  const [{ books, readingGoal }, unlocked] = await Promise.all([getShelf(), isGrownup()]);

  return (
    <>
      <HeroScene />

      <div className="bg-gradient-to-b from-[#4f9a8c] to-[#356f66] pb-2">
        <main className="relative z-10 mx-auto -mt-24 max-w-5xl px-3 sm:-mt-32 sm:px-6">
          <section
            aria-label="Norah's bookshelf"
            className="space-y-8 rounded-[2rem] bg-cream p-5 shadow-[0_20px_50px_-15px_rgba(40,30,60,0.45)] sm:p-8"
          >
            <ProgressHeader read={books.length} goal={readingGoal} />

            {books.length > 0 ? (
              <BookGrid items={books.map((book) => ({ id: book.id, card: <BookCard book={book} /> }))} />
            ) : (
              <p className="py-12 text-center text-lg text-ink-soft">
                The shelf is waiting for its very first book! 📚
              </p>
            )}
          </section>
        </main>

        <footer className="flex flex-col items-center gap-1 px-4 py-10 text-center text-white/85">
          <p className="text-sm">Made with love for Norah ✨</p>
          <GrownupUnlock unlocked={unlocked} />
        </footer>
      </div>
    </>
  );
}
