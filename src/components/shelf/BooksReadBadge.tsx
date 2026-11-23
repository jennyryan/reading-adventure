"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, type CSSProperties } from "react";

// The rosette is drawn around this point in a 120x140 box, leaving room
// for the ribbon tails underneath.
const CX = 60;
const CY = 58;
const SCALLOPS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return [CX + Math.cos(a) * 49, CY + Math.sin(a) * 49];
});

/** Little sparkles around the badge: [left %, top %, size px]. */
const SPARKLES: [number, number, number][] = [
  [2, 12, 18],
  [88, 4, 14],
  [94, 50, 18],
  [-4, 56, 12],
];

const SPARKLE_PATH =
  "M12 0 C 13.3 7.2 16.8 10.7 24 12 C 16.8 13.3 13.3 16.8 12 24 C 10.7 16.8 7.2 13.3 0 12 C 7.2 10.7 10.7 7.2 12 0 Z";

/**
 * A prize-ribbon rosette showing how many books Norah has read. The number
 * counts up when the page opens, and the badge wiggles when poked.
 */
export function BooksReadBadge({ read }: { read: number }) {
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      count.set(read);
      return;
    }
    const controls = animate(count, read, { duration: Math.min(1.6, 0.4 + read * 0.08), ease: "easeOut", delay: 0.3 });
    return () => controls.stop();
  }, [count, read, reduce]);

  return (
    <div className="flex justify-center">
      <p className="sr-only">
        Norah has read {read} {read === 1 ? "book" : "books"}.
      </p>
      <motion.div
        aria-hidden="true"
        className="relative w-[150px] cursor-default select-none"
        initial={reduce ? false : { scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
        // The wiggle has several steps, which a spring can't do (motion throws,
        // and that stops every later animation on the page, like new book
        // cards fading in). So it gets its own timed transition.
        whileHover={
          reduce
            ? undefined
            : { rotate: [0, -7, 6, -3, 0], scale: 1.05, transition: { type: "tween", duration: 0.6, ease: "easeInOut" } }
        }
        whileTap={reduce ? undefined : { scale: 0.92 }}
      >
        <svg viewBox="0 0 120 140" className="block w-full drop-shadow-[0_6px_10px_rgba(120,40,90,0.25)]">
          <defs>
            <radialGradient id="badge-gold" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fff6c9" />
              <stop offset="55%" stopColor="#ffdd6b" />
              <stop offset="100%" stopColor="#f5b301" />
            </radialGradient>
          </defs>

          {/* ribbon tails */}
          <path d="M46 84 L60 92 L49 136 L40 124 L29 130 Z" fill="#f472b6" />
          <path d="M74 84 L60 92 L71 136 L80 124 L91 130 Z" fill="#db2777" />

          {/* scalloped pink rosette */}
          <circle cx={CX} cy={CY} r={49} fill="#ec4899" />
          {SCALLOPS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9} fill="#ec4899" />
          ))}

          {/* gold medal in the middle */}
          <circle cx={CX} cy={CY} r={43} fill="#ffffff" />
          <circle cx={CX} cy={CY} r={39} fill="url(#badge-gold)" />
          <circle
            cx={CX}
            cy={CY}
            r={34}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.6}
            strokeDasharray="3 4"
            strokeLinecap="round"
            opacity={0.85}
          />
        </svg>

        {/* the number and label, centered on the medal */}
        <div
          className="absolute inset-x-0 flex -translate-y-1/2 flex-col items-center leading-none text-ink"
          style={{ top: `${(CY / 140) * 100}%` }}
        >
          <motion.span className="font-display text-[3.1rem] font-bold leading-[1.05]">{shown}</motion.span>
          <span className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-wider">
            {read === 1 ? "book read!" : "books read!"}
          </span>
        </div>

        {SPARKLES.map(([left, top, size], i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className="hero-twinkle absolute"
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                "--delay": `${i * 0.7}s`,
                "--duration": `${2.4 + i * 0.5}s`,
              } as CSSProperties
            }
          >
            <path d={SPARKLE_PATH} fill="var(--color-star)" />
          </svg>
        ))}
      </motion.div>
    </div>
  );
}
