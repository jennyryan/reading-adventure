"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, type CSSProperties } from "react";

// A gold medal with a stitched edge, sitting in a bump that rises out of
// the top of the cream shelf panel, so it looks set into the panel.
const MEDAL = 144;
const C = MEDAL / 2;
const STITCH_R = 63;
/** Cream showing around the medal. */
const PAD = 20;

// The bump: a circle around the medal, joined to the panel's flat top edge
// by small curves instead of sharp corners.
const BUMP_R = C + PAD;
/** How far the panel's top edge is below the top of the bump. */
const EDGE_Y = 122;
const FILLET_R = 24;
// Each corner curve is a circle resting on the edge and touching the bump.
const FILLET_DY = EDGE_Y - FILLET_R - BUMP_R;
const FILLET_X = Math.sqrt((BUMP_R + FILLET_R) ** 2 - FILLET_DY ** 2);
const TOUCH_X = (FILLET_X * BUMP_R) / (BUMP_R + FILLET_R);
const TOUCH_Y = BUMP_R + (FILLET_DY * BUMP_R) / (BUMP_R + FILLET_R);
const BUMP_W = Math.ceil(FILLET_X * 2) + 2;
const BX = BUMP_W / 2;
const BUMP_PATH = [
  `M ${BX - FILLET_X} ${EDGE_Y}`,
  `A ${FILLET_R} ${FILLET_R} 0 0 0 ${BX - TOUCH_X} ${TOUCH_Y}`,
  `A ${BUMP_R} ${BUMP_R} 0 1 1 ${BX + TOUCH_X} ${TOUCH_Y}`,
  `A ${FILLET_R} ${FILLET_R} 0 0 0 ${BX + FILLET_X} ${EDGE_Y}`,
  // run a little past the edge so no hairline shows where they meet
  `L ${BX + FILLET_X} ${EDGE_Y + 2} L ${BX - FILLET_X} ${EDGE_Y + 2} Z`,
].join(" ");

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
 * A round gold medal showing how many books Norah has read, set into the top
 * edge of the shelf panel. Put it first in the panel with no padding above
 * it; it lifts itself up so the bump rises out of the panel's edge. The
 * number counts up when the page opens, and the medal wiggles when poked.
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
    <div className="relative mx-auto" style={{ marginTop: -EDGE_Y, width: BUMP_R * 2, height: PAD + MEDAL }}>
      {/* The bump is the panel's colour and casts a shadow like the panel's
          top edge. The shadow is cut off at the edge so it doesn't fall on
          the panel itself. */}
      <svg
        aria-hidden="true"
        width={BUMP_W}
        height={EDGE_Y + 2}
        viewBox={`0 0 ${BUMP_W} ${EDGE_Y + 2}`}
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 drop-shadow-[0_5px_50px_rgba(40,30,60,0.4)] [clip-path:inset(-100px_-100px_2px_-100px)]"
      >
        <path d={BUMP_PATH} fill="var(--color-cream)" />
      </svg>

      <p className="sr-only">
        Norah has read {read} {read === 1 ? "book" : "books"}.
      </p>
      <motion.div
        aria-hidden="true"
        // same shadow as the book cards
        className="absolute cursor-default select-none rounded-full shadow-sm"
        style={{ left: PAD, top: PAD, width: MEDAL }}
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
        <svg viewBox={`0 0 ${MEDAL} ${MEDAL}`} className="block w-full">
          <defs>
            <radialGradient id="badge-gold" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fff6c9" />
              <stop offset="55%" stopColor="#ffdd6b" />
              <stop offset="100%" stopColor="#f5b301" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={C} fill="url(#badge-gold)" />
          {/* stitching around the gold */}
          <circle
            cx={C}
            cy={C}
            r={STITCH_R}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.2}
            strokeDasharray="4.5 6"
            strokeLinecap="round"
            opacity={0.85}
          />
        </svg>

        {/* the number and label, centered on the medal */}
        <div
          className="absolute inset-0 flex -translate-y-2 flex-col items-center justify-center leading-none text-ink"
        >
          <motion.span className="font-display text-[3.5rem] font-bold leading-[1.05]">{shown}</motion.span>
          <span className="mt-0.5 text-[16px] font-semibold tracking-wider">
            {read === 1 ? "Book Read!" : "Books Read!"}
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
