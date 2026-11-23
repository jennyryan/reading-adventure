import { describe, expect, it } from "vitest";
import { cleanTitle } from "@/lib/bookTitle";

describe("cleanTitle", () => {
  it.each([
    // Titles as Google Books returns them.
    [
      "Dog Man: Grime and Punishment: A Graphic Novel (Dog Man #9): From the Creator of Captain Underpants",
      "Dog Man: Grime and Punishment",
    ],
    ["Dog Man and Cat Kid: From the Creator of Captain Underpants (Dog Man #4), 4", "Dog Man and Cat Kid"],
    ["Dog Man Unleashed: A Graphic Novel (Dog Man #2): From the Creator of Captain Underpants", "Dog Man Unleashed"],
    ["Frog and Toad Together (Frog and Toad)", "Frog and Toad Together"],
    ["Frog and Toad All Year Picture Book Edition", "Frog and Toad All Year"],
    ["Matilda: 30th Anniversary Edition", "Matilda"],
    ["Ramona the Pest (Ramona, #2)", "Ramona the Pest"],
    ["The Wild Robot: A Novel", "The Wild Robot"],
    ["Wonder: A #1 New York Times Bestseller", "Wonder"],
  ])("%s", (raw, clean) => {
    expect(cleanTitle(raw)).toBe(clean);
  });

  it("keeps real subtitles and plain titles", () => {
    expect(cleanTitle("Harry Potter and the Philosopher's Stone")).toBe("Harry Potter and the Philosopher's Stone");
    expect(cleanTitle("Diary of a Wimpy Kid: Rodrick Rules")).toBe("Diary of a Wimpy Kid: Rodrick Rules");
    expect(cleanTitle("Charlotte's Web")).toBe("Charlotte's Web");
    expect(cleanTitle("The One and Only Ivan")).toBe("The One and Only Ivan");
  });

  it("keeps parentheticals that are part of the name", () => {
    expect(cleanTitle("Alexander and the Terrible, Horrible, No Good, Very Bad Day")).toBe(
      "Alexander and the Terrible, Horrible, No Good, Very Bad Day",
    );
    expect(cleanTitle("Junie B. Jones (and a Little Monkey Business)")).toBe(
      "Junie B. Jones (and a Little Monkey Business)",
    );
  });

  it("never trims a title away entirely", () => {
    expect(cleanTitle("Volume 1")).toBe("Volume 1");
  });
});
