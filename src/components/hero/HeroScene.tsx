"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { CSSProperties } from "react";
import balloon from "./balloon.png";
import storybookLand from "./storybook-land.jpg";

// The hero is one illustrated landscape (generated with Gemini) brought to
// life in code: glowing lanterns and windows, twinkles in the big tree,
// drifting fireflies, glints on the pond, and the balloon (cut out of the
// picture) floating on its own. Everything lives on a "stage" that keeps the
// picture's exact aspect ratio, so the effects stay on their spots however
// the picture is cropped (see .hero-stage in globals.css).
//
// All positions are pixels in the 1376x768 source image.

const W = 1376;
const H = 768;

/** Small deterministic random generator, so server and browser agree. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = [x: number, y: number];

const LANTERNS: Point[] = [
  [257, 168], [299, 211], [156, 214], [136, 271], [427, 239],
  [152, 366], [388, 371], [389, 468], [162, 471], [723, 550],
];

const WINDOWS: Point[] = [
  [214, 218], [354, 200], [341, 293], [214, 386], [341, 389], [314, 507],
  [1225, 248], [1277, 257], [1192, 273], [1108, 337], [1312, 383], [1314, 440], [1318, 530],
];

const GLOW_FLOWERS: Point[] = [
  [111, 661], [71, 691], [171, 682], [129, 711], [50, 607], [107, 541], [1131, 692],
];

const POND_GLINTS: Point[] = [
  [790, 632], [826, 668], [905, 655], [942, 642], [872, 682], [955, 670],
];

const rand = seeded(11);

/**
 * The lights painted into the big tree on the left: star-shaped sparkles
 * ("star") and small glowing dots ("dot"), in the canopy and in the fairy
 * lights hanging left of the trunk. Each one twinkles on its own rhythm.
 */
const TREE_LIGHTS = (
  [
    // canopy
    [120, 35, "star"], [245, 20, "star"], [272, 43, "star"], [313, 67, "star"],
    [369, 43, "star"], [136, 98, "star"], [197, 92, "star"], [394, 98, "star"],
    [476, 110, "star"], [69, 147, "star"], [363, 145, "star"], [392, 150, "star"],
    [497, 145, "star"], [92, 65, "dot"], [153, 58, "dot"], [100, 156, "dot"],
    [118, 205, "dot"], [143, 107, "dot"], [119, 127, "dot"], [247, 125, "dot"],
    [204, 167, "dot"], [305, 115, "dot"], [515, 133, "dot"], [348, 33, "dot"],
    // fairy lights left of the trunk
    [41, 348, "star"], [112, 360, "star"], [59, 385, "star"], [118, 318, "star"],
    [137, 392, "star"], [16, 370, "dot"], [74, 356, "dot"], [87, 385, "dot"],
    [6, 358, "dot"], [64, 370, "dot"], [122, 390, "dot"], [61, 414, "dot"],
    [148, 506, "dot"],
  ] as [number, number, "star" | "dot"][]
).map(([x, y, kind]) => ({
  x,
  y,
  kind,
  delay: rand() * 4,
  duration: 1.8 + rand() * 2.6,
}));

/** Fireflies drifting near the willow, the garden and the pond. */
const FIREFLIES = [
  ...Array.from({ length: 8 }, () => [960 + rand() * 220, 400 + rand() * 180] as Point),
  ...Array.from({ length: 9 }, () => [30 + rand() * 520, 480 + rand() * 250] as Point),
  ...Array.from({ length: 5 }, () => [700 + rand() * 320, 560 + rand() * 150] as Point),
].map(([x, y]) => ({
  x: Math.round(x),
  y: Math.round(y),
  dx: Math.round((rand() - 0.5) * 50),
  dy: Math.round(-10 - rand() * 30),
  delay: rand() * 8,
  duration: 6 + rand() * 6,
}));

/** Spreads a seeded delay/duration onto CSS custom properties. */
function timing(delay: number, duration: number, extra: Record<string, string> = {}) {
  return {
    "--delay": `${delay.toFixed(2)}s`,
    "--duration": `${duration.toFixed(2)}s`,
    ...extra,
  } as CSSProperties;
}

/** Percent of the stage, for absolutely placed HTML layers. */
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

function Glows() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full mix-blend-screen"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="glow-warm">
          <stop offset="0%" stopColor="#fff2b8" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#ffc96b" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-sun">
          <stop offset="0%" stopColor="#fff7d1" stopOpacity="0.8" />
          <stop offset="55%" stopColor="#ffe9a8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-fairy">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#fdf6b2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#c8f7d8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-bloom">
          <stop offset="0%" stopColor="#fff0f6" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#ffd0a8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff9ec7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="hero-sun" cx={966} cy={87} r={78} fill="url(#glow-sun)" />

      {WINDOWS.map(([x, y], i) => (
        <circle
          key={`w${i}`}
          className="hero-breathe"
          style={timing((i * 0.7) % 4, 4 + (i % 3))}
          cx={x}
          cy={y}
          r={20}
          fill="url(#glow-warm)"
        />
      ))}

      {LANTERNS.map(([x, y], i) => (
        <circle
          key={`l${i}`}
          className="hero-flicker"
          style={timing((i * 0.37) % 2, 2.4 + (i % 4) * 0.45)}
          cx={x}
          cy={y}
          r={17}
          fill="url(#glow-warm)"
        />
      ))}

      {GLOW_FLOWERS.map(([x, y], i) => (
        <circle
          key={`f${i}`}
          className="hero-breathe"
          style={timing((i * 0.9) % 5, 5 + (i % 3))}
          cx={x}
          cy={y}
          r={26}
          fill="url(#glow-bloom)"
        />
      ))}

      {TREE_LIGHTS.map((light, i) => (
        // Position on the outer group: the CSS animation's transform would
        // replace a transform attribute on the animated element itself.
        <g key={`t${i}`} transform={`translate(${light.x} ${light.y})`}>
          <g className="hero-twinkle" style={timing(light.delay, light.duration)}>
            <circle r={light.kind === "star" ? 13 : 8} fill="url(#glow-warm)" />
            {light.kind === "star" && (
              <path
                d="M0 -7.5 C 0.8 -1.7 1.7 -0.8 7.5 0 C 1.7 0.8 0.8 1.7 0 7.5 C -0.8 1.7 -1.7 0.8 -7.5 0 C -1.7 -0.8 -0.8 -1.7 0 -7.5 Z"
                fill="#fffbe0"
              />
            )}
          </g>
        </g>
      ))}

      {POND_GLINTS.map(([x, y], i) => (
        <ellipse
          key={`p${i}`}
          className="hero-glint"
          style={timing(i * 0.8, 3.5 + (i % 3) * 0.8)}
          cx={x}
          cy={y}
          rx={9}
          ry={2.2}
          fill="#ffffff"
        />
      ))}

      {FIREFLIES.map((f, i) => (
        <circle
          key={`ff${i}`}
          className="hero-firefly"
          style={timing(f.delay, f.duration, { "--dx": `${f.dx}px`, "--dy": `${f.dy}px` })}
          cx={f.x}
          cy={f.y}
          r={7}
          fill="url(#glow-fairy)"
        />
      ))}
    </svg>
  );
}

export function HeroScene() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // The scene drifts slower than the page as you scroll, which reads as depth.
  const drift = (factor: number) => (v: number) => (reduce ? 0 : v * factor);
  const sceneY = useTransform(scrollY, drift(0.3));

  return (
    <div className="hero-frame relative h-[clamp(440px,72vh,720px)] overflow-hidden border-b-8 border-pink bg-[#bfe3e6]">
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: sceneY }}>
        <div className="hero-stage">
          <Image
            src={storybookLand}
            alt=""
            fill
            sizes="1376px"
            placeholder="blur"
            loading="eager"
            fetchPriority="high"
            className="object-cover"
          />
          <Glows />
          <Image
            src={balloon}
            alt=""
            className="hero-balloon absolute h-auto"
            sizes="160px"
            style={{
              left: pct(581, W),
              top: pct(106, H),
              width: pct(balloon.width, W),
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
