/**
 * Scrolls to a book's card and gives it a moment's pink glow. The shelf sits
 * below the hero, usually off screen, and a book's place depends on its
 * finished date, so after adding or editing one this shows where it went.
 * Waits (up to 5s) for the refreshed shelf to include the card.
 */
export function showOnShelf(bookId: number) {
  const giveUpAt = performance.now() + 5000;
  const find = () => {
    const card = document.querySelector<HTMLElement>(`[data-book-id="${bookId}"]`);
    if (!card) {
      if (performance.now() < giveUpAt) requestAnimationFrame(find);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    card.classList.remove("just-added");
    void card.offsetWidth; // restart the glow if this book was already glowing
    card.classList.add("just-added");
    card.addEventListener("animationend", () => card.classList.remove("just-added"), { once: true });
  };
  find();
}
