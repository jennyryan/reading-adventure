"use client";

import { useState } from "react";
import { STAR_PATH } from "./Stars";

const WORDS = ["", "It was okay", "Liked it", "Really liked it", "Loved it!", "Best book ever!"];

/**
 * Tap-a-star rating. Built on real radio buttons, so arrow keys and screen
 * readers work as usual; the stars are just how they look.
 */
export function StarPicker({
  value,
  onChange,
  name = "rating",
}: {
  value: number;
  onChange: (rating: number) => void;
  name?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="relative text-center">
      <legend className="mx-auto mb-1 text-lg text-ink-soft">How did you like it?</legend>
      <div className="flex items-center justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              required
              className="peer sr-only"
            />
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}
            </span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-11 rounded-lg transition-transform peer-focus-visible:outline-3 peer-focus-visible:outline-pink hover:scale-110"
            >
              <path
                d={STAR_PATH}
                fill={n <= shown ? "var(--color-star)" : "#ffffff"}
                stroke={n <= shown ? "#d99a00" : "#cdbbd9"}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
            </svg>
          </label>
        ))}
      </div>
      {/* Floats just under the stars, so it takes no room in the form's spacing. */}
      <p className="absolute inset-x-0 top-full text-center text-sm leading-5 font-semibold text-ink-soft" aria-hidden="true">
        {WORDS[shown]}
      </p>
    </fieldset>
  );
}
