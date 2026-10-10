"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Lays out book cards and slides them onto the shelf one after another.
 * Cards are rendered on the server and passed in, keyed by book id.
 */
export function BookGrid({ items }: { items: { id: number; card: ReactNode }[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {items.map(({ id, card }, i) => (
        <motion.li
          key={id}
          initial={reduce ? false : { opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.15 + i * 0.06 }}
        >
          {card}
        </motion.li>
      ))}
    </ul>
  );
}
