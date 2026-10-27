import design from '../../content/design.json';

/** The film's motion (design.json): frames a second, the scene transition and the two curves, as functions of the
 * frame for the film and the site's story animations, and as CSS for the site. */
export const { fps: FPS, transition: TRANSITION, stagger: STAGGER, enter: ENTER } = design.motion;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (frame: number, from: number, to: number) => clamp01((frame - from) / (to - from || 1));
/** Cubic ease-out from 0 at `from` to 1 at `to`: things arriving. */
export const out = (frame: number, from: number, to: number) => 1 - (1 - span(frame, from, to)) ** 3;
/** Cubic ease-in-out from 0 at `from` to 1 at `to`: things moving from one place to another. */
export const ease = (frame: number, from: number, to: number) => { const x = span(frame, from, to); return x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; };
export const cssCurve = (k: readonly number[]) => `cubic-bezier(${k.join(', ')})`;
