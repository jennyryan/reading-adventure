import Link from "next/link";

export type ShelfView = "books" | "series";

const VIEWS: { view: ShelfView; label: string; href: string }[] = [
  { view: "books", label: "All books", href: "/" },
  { view: "series", label: "By series", href: "/?view=series" },
];

/** Switches the shelf between every book and books grouped by series. */
export function ViewSwitch({ current }: { current: ShelfView }) {
  return (
    <nav aria-label="Shelf view" className="flex justify-center">
      <ul className="inline-flex rounded-full bg-cream-deep p-1">
        {VIEWS.map(({ view, label, href }) => {
          const active = view === current;
          return (
            <li key={view}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-white text-[#c2417f] shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
