"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Height of the pink border along the bottom of the hero (border-b-8). */
const HERO_BORDER_PX = 8;

/**
 * Pulls its content up over the hero so that the element marked
 * `data-hero-edge` (the dashed line under the title) sits centered on the
 * hero's pink border. How far that is depends on how the title wraps, so it's
 * measured and kept up to date as the layout changes. The className should
 * include a CSS margin that gets close, for before this runs.
 */
export function AlignToHeroEdge({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const main = ref.current;
    const target = main?.querySelector<HTMLElement>("[data-hero-edge]");
    if (!main || !target) return;

    const align = () => {
      // Distance from the top of this block to the middle of the target.
      // It doesn't depend on our own margin, so setting it can't loop.
      const offset =
        target.getBoundingClientRect().top + target.offsetHeight / 2 - main.getBoundingClientRect().top;
      main.style.marginTop = `${-Math.round(offset + HERO_BORDER_PX / 2)}px`;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(main);
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
}
