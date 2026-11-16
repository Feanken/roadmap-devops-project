// A small burst of sparkles around the dial when the daily goal is reached.
// Pure decoration: each spark is a throw-away <span> (a small CSS-drawn dot or
// diamond, so no font glyphs are needed) animated with transform + opacity, and
// removed as soon as its animation ends. Skipped entirely for people who prefer
// reduced motion.

import { $ } from '../dom.js';

const COUNT = 18;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function celebrate() {
  if (prefersReducedMotion()) return;
  const host = $('sparks');

  for (let i = 0; i < COUNT; i += 1) {
    const angle = (i / COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
    const reach = 0.5 + Math.random() * 0.25; // as a fraction of the dial size

    const spark = document.createElement('span');
    spark.className = `spark spark--${i % 3}`;
    // CSSOM writes (not style="" attributes), so a strict CSP is fine with this.
    spark.style.setProperty('--dx', `calc(var(--dial) * ${(Math.cos(angle) * reach).toFixed(3)})`);
    spark.style.setProperty('--dy', `calc(var(--dial) * ${(Math.sin(angle) * reach).toFixed(3)})`);
    spark.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 240)}deg`);
    spark.style.setProperty('--delay', `${Math.round(Math.random() * 180)}ms`);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
    host.append(spark);
  }
}
