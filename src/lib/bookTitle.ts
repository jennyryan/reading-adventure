// Book services, Google Books especially, pad titles with marketing and
// series tags: "Dog Man: Grime and Punishment: A Graphic Novel (Dog Man #9):
// From the Creator of Captain Underpants". This trims them to the title a
// person would say ("Dog Man: Grime and Punishment") before they're shown
// or saved. Real subtitles are kept.

/** Title parts that are a description of the book, not part of its name. */
const MARKETING = [
  /^(a|an)\s+([\w-]+\s+){0,2}(novel|graphic novel|picture book|chapter book|story|tale|book)$/i,
  /\bfrom the (creator|author|bestselling|#1)/i,
  /\b(new york times|bestsell|best-sell|award[- ]winning|#1)\b/i,
  /^(book|volume|vol\.?)\s+\d+$/i,
];

/** A parenthetical worth dropping: a series tag, an edition, or a repeat of the title. */
function isTag(inside: string, mainTitle: string) {
  return (
    /#\s*\d|\b(book|volume|vol\.?|series|edition|paperback|hardcover)\b|\d/i.test(inside) ||
    mainTitle.toLowerCase().includes(inside.toLowerCase().trim())
  );
}

export function cleanTitle(raw: string) {
  let title = raw.replace(/\s+/g, " ").trim();

  // ", 4" that Google appends with the series number.
  title = title.replace(/,\s*\d+$/, "");

  // Drop series/edition parentheticals, e.g. "(Dog Man #9)", "(Frog and Toad)".
  const main = title.split(/[:(]/)[0];
  title = title.replace(/\s*\(([^)]*)\)/g, (match, inside: string) => (isTag(inside, main) ? "" : match));

  // Keep the colon-separated parts that are part of the name.
  const parts = title
    .split(/\s*:\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = [parts[0], ...parts.slice(1).filter((p) => !MARKETING.some((re) => re.test(p)))];
  title = kept.join(": ");

  // "Picture Book Edition", "30th Anniversary Edition" and the like at the end.
  title = title.replace(/[\s:,-]+(([\w']+\s+){0,2}edition)$/i, "");

  // Never trim a title away entirely.
  return title.trim() || raw.trim();
}

/** A series a book belongs to, and where it falls in it (when known). */
export type SeriesHint = { name: string; position: number | null };

/**
 * The series named in a raw title's tag, before cleanTitle drops it:
 * "Dog Man and Cat Kid (Dog Man #4), 4" -> Dog Man, 4;
 * "Ramona the Pest (Ramona, #2)" -> Ramona, 2;
 * "Frog and Toad Together (Frog and Toad)" -> Frog and Toad, no position.
 * A tag without a number only counts when the title itself starts with
 * it, so "(Illustrated)" or "(Paperback)" are never taken for a series.
 */
export function seriesFromTitle(raw: string): SeriesHint | null {
  const title = raw.replace(/\s+/g, " ").trim();
  const main = title.split(/[:(]/)[0].trim();

  for (const [, inside] of title.matchAll(/\(([^)]+)\)/g)) {
    const numbered = inside.match(/^(.+?)[\s,]*(?:#|\bbook\s+|\bvol(?:ume)?\.?\s+)(\d+(?:\.\d+)?)$/i);
    if (numbered) {
      const name = numbered[1].replace(/[\s,]+$/, "").trim();
      if (name) return { name, position: Number(numbered[2]) };
      continue;
    }
    const name = inside.trim();
    if (!/\d/.test(name) && main.toLowerCase().startsWith(name.toLowerCase()) && name.length < main.length) {
      return { name, position: null };
    }
  }
  return null;
}
