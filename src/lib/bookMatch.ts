// Telling whether two books are "the same book". Google Books lists every
// edition separately, so the same story can arrive with different ids and
// ISBNs; titles and authors are compared loosely instead.

/** Lowercase letters and digits only, single-spaced. */
function simplify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/['\u2019]/g, "") // "Charlotte's" and "Charlottes" match
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * A title reduced to what identifies the book: no subtitle ("Matilda:
 * 30th Anniversary Edition" -> "matilda"), no leading "the/a/an", no
 * punctuation or capitals.
 */
export function titleKey(title: string) {
  const main = title.split(/[:(]/)[0];
  return simplify(main).replace(/^(the|a|an) /, "");
}

/** An author reduced to their surname, which survives "E. B. White" vs "E.B. White". */
export function authorKey(author: string | null | undefined) {
  if (!author) return null;
  const words = simplify(author).split(" ");
  return words[words.length - 1] || null;
}

/** Same title, and the same author when both books have one. */
export function isSameBook(
  a: { title: string; author?: string | null },
  b: { title: string; author?: string | null },
) {
  if (titleKey(a.title) !== titleKey(b.title)) return false;
  const [x, y] = [authorKey(a.author), authorKey(b.author)];
  return x === null || y === null || x === y;
}
