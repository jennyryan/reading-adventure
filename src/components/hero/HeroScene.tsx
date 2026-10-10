"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { Ribbon } from "./Ribbon";

// The dusk landscape, drawn entirely in code: a CSS gradient sky with
// stacked SVG layers on top. Every layer shares one 1440x720 coordinate
// space and is anchored to the bottom edge, so on narrow screens the sides
// crop instead of squashing.

const VIEWBOX = "0 0 1440 720";

/** Small deterministic random generator, so server and browser draw the same stars. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = seeded(7);
  return Array.from({ length: 34 }, (_, i) => ({
    x: Math.round(rand() * 1440),
    y: Math.round(20 + rand() * 330),
    size: 2 + rand() * 4,
    sparkle: i % 4 === 0, // every 4th star is a four-point sparkle
    delay: (rand() * 4).toFixed(2),
    duration: (2.5 + rand() * 3).toFixed(2),
  }));
})();

function Layer({
  y,
  className = "",
  children,
}: {
  y: MotionValue<number>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div className={`absolute inset-0 will-change-transform ${className}`} style={{ y }}>
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {children}
      </svg>
    </motion.div>
  );
}

/** Soft, slightly wobbly "watercolor" edges and a faint paper grain. */
function WatercolorDefs({ id, scale = 12 }: { id: string; scale?: number }) {
  return (
    <defs>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="3" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale={scale} result="wobbly" />
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="grain" />
        <feColorMatrix
          in="grain"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"
          result="grainAlpha"
        />
        <feComposite in="grainAlpha" in2="wobbly" operator="in" result="grainOnShape" />
        <feMerge>
          <feMergeNode in="wobbly" />
          <feMergeNode in="grainOnShape" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Tree({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  // A storybook "lollipop" tree: rounded canopy on a little trunk.
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-4} y={-46} width={8} height={50} rx={4} fill="#6d5a7e" />
      <path
        d="M0 -150 C 34 -150 48 -112 46 -86 C 44 -58 24 -40 0 -40 C -24 -40 -44 -58 -46 -86 C -48 -112 -34 -150 0 -150 Z"
        fill={color}
      />
      <path d="M-14 -124 C -6 -134 8 -136 16 -128" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Moon() {
  return (
    <svg viewBox="-170 -170 340 340" className="w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="moon-glow-gradient">
          <stop offset="0%" stopColor="#fff9e3" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#ffe9f3" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffe9f3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moon-face" cx="40%" cy="38%">
          <stop offset="0%" stopColor="#fffdf3" />
          <stop offset="100%" stopColor="#fbeec7" />
        </radialGradient>
      </defs>
      <circle className="moon-glow" r={170} fill="url(#moon-glow-gradient)" />
      <circle r={58} fill="url(#moon-face)" />
      <circle cx={-18} cy={-14} r={9} fill="#f3dfb0" opacity={0.6} />
      <circle cx={20} cy={18} r={6} fill="#f3dfb0" opacity={0.5} />
      <circle cx={12} cy={-22} r={4} fill="#f3dfb0" opacity={0.45} />
    </svg>
  );
}

export function HeroScene() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Far layers drift more slowly than near ones, which reads as depth.
  // Factors become 0 when the reader prefers reduced motion.
  const drift = (factor: number) => (v: number) => (reduce ? 0 : v * factor);
  const skyY = useTransform(scrollY, drift(0.45));
  const farY = useTransform(scrollY, drift(0.32));
  const midBackY = useTransform(scrollY, drift(0.22));
  const midY = useTransform(scrollY, drift(0.12));
  const frontY = useTransform(scrollY, drift(0.04));
  const ribbonY = useTransform(scrollY, drift(0.3));

  return (
    <div
      className="relative h-[clamp(440px,72vh,720px)] overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom, var(--color-sky-pink) 0%, #e4a9d6 22%, var(--color-sky-lavender) 46%, #a9c4e2 66%, var(--color-sky-teal) 84%)",
      }}
    >
      {/* Sky: twinkling stars */}
      <Layer y={skyY}>
        {STARS.map((star, i) => (
          <g
            key={i}
            className="star-twinkle"
            style={{
              ["--twinkle-delay" as string]: `${star.delay}s`,
              ["--twinkle-duration" as string]: `${star.duration}s`,
            }}
          >
            {star.sparkle ? (
              <path
                transform={`translate(${star.x} ${star.y}) scale(${star.size / 3})`}
                d="M0 -9 C 1 -2 2 -1 9 0 C 2 1 1 2 0 9 C -1 2 -2 1 -9 0 C -2 -1 -1 -2 0 -9 Z"
                fill="#fffbea"
              />
            ) : (
              <circle cx={star.x} cy={star.y} r={star.size / 2} fill="#fffbea" />
            )}
          </g>
        ))}

      </Layer>

      {/* The moon sits outside the cropped scene, pinned to the corner, so
          it stays visible on phones where the sides of the scene are cut off. */}
      <motion.div
        className="absolute top-[5%] right-[6%] w-[clamp(110px,16vw,220px)] will-change-transform"
        style={{ y: skyY }}
      >
        <Moon />
      </motion.div>

      {/* Distant lavender hills */}
      <Layer y={farY}>
        <WatercolorDefs id="wc-far" scale={16} />
        <path
          filter="url(#wc-far)"
          fill="#b9a6e0"
          opacity={0.9}
          d="M-40 470 C 160 395 360 420 560 452 S 900 378 1100 418 S 1360 398 1480 430 L1480 760 L-40 760 Z"
        />
      </Layer>

      {/* Middle hills with a few far-off trees */}
      <Layer y={midBackY}>
        <WatercolorDefs id="wc-midback" scale={14} />
        <g filter="url(#wc-midback)">
          <Tree x={300} y={500} s={0.55} color="#7fb9b0" />
          <Tree x={340} y={506} s={0.42} color="#e7a3c3" />
          <Tree x={820} y={492} s={0.48} color="#c8a6e8" />
          <Tree x={1110} y={484} s={0.5} color="#7fb9b0" />
          <path
            fill="#9cd3c6"
            d="M-40 522 C 170 470 360 482 520 520 S 820 468 1000 498 S 1300 462 1480 500 L1480 760 L-40 760 Z"
          />
        </g>
      </Layer>

      {/* Nearer hills with bigger trees */}
      <Layer y={midY}>
        <WatercolorDefs id="wc-mid" scale={12} />
        <g filter="url(#wc-mid)">
          <Tree x={170} y={572} s={1} color="#5aa595" />
          <Tree x={236} y={580} s={0.75} color="#f0a7c4" />
          {/* Center cluster: the part of the scene phones always see */}
          <Tree x={640} y={586} s={0.95} color="#5aa595" />
          <Tree x={700} y={590} s={0.7} color="#f0a7c4" />
          <Tree x={985} y={556} s={1.1} color="#5aa595" />
          <Tree x={1050} y={566} s={0.8} color="#c8a6e8" />
          <Tree x={1300} y={560} s={0.9} color="#5aa595" />
          <path
            fill="#6fb8a8"
            d="M-40 582 C 220 520 420 540 640 580 S 1000 528 1200 558 S 1400 544 1480 556 L1480 760 L-40 760 Z"
          />
        </g>
      </Layer>

      {/* Foreground hill; its color matches the page background below */}
      <Layer y={frontY}>
        <WatercolorDefs id="wc-front" scale={10} />
        <path
          filter="url(#wc-front)"
          fill="#4f9a8c"
          d="M-40 650 C 260 598 520 610 760 650 S 1180 606 1480 638 L1480 780 L-40 780 Z"
        />
      </Layer>

      <motion.div
        className="absolute inset-x-0 top-[13%] flex justify-center px-4"
        style={{ y: ribbonY }}
      >
        <Ribbon />
      </motion.div>
    </div>
  );
}
