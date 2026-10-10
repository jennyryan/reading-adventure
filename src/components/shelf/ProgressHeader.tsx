"use client";

import { motion, useReducedMotion } from "motion/react";

export function ProgressHeader({ read, goal }: { read: number; goal: number }) {
  const reduce = useReducedMotion();
  const percent = Math.min(100, Math.round((read / goal) * 100));
  const reached = read >= goal;

  return (
    <header className="space-y-3">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">
        <span className="text-pink">{read}</span> of {goal} books read
        {reached && <span className="block text-lg text-ink-soft">Goal reached! 🎉</span>}
      </h2>
      <div
        role="progressbar"
        aria-label="Reading goal progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(read, goal)}
        aria-valuetext={`${read} of ${goal} books`}
        className="h-6 overflow-hidden rounded-full bg-pastel-rose shadow-inner ring-2 ring-white"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-pink-soft via-[#f472b6] to-pink"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.3 }}
        />
      </div>
    </header>
  );
}
