"use client";

import { useEffect, useState } from "react";

/**
 * Purely cosmetic flicker of entry-number-shaped strings during the DRAWING
 * state. This is NOT sourced from real participant data — the backend has
 * already selected the winner by the time this animation plays; showing the
 * real entry list here would needlessly expose participant data on a public
 * screen. Respects prefers-reduced-motion by rendering a single static line.
 */
export function EntryFlicker({ prefix, speedMs = 90 }: { prefix: string; speedMs?: number }) {
  const [value, setValue] = useState(() => randomEntry(prefix));
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setValue(randomEntry(prefix)), speedMs);
    return () => clearInterval(id);
  }, [prefix, speedMs, reducedMotion]);

  return (
    <span className="font-mono text-5xl font-bold tracking-wider text-white sm:text-7xl" aria-live={reducedMotion ? "polite" : "off"}>
      {reducedMotion ? "Drawing…" : value}
    </span>
  );
}

function randomEntry(prefix: string): string {
  const n = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
  return `${prefix}-${n}`;
}
