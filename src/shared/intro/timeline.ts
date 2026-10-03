/** Shared editorial clock for geometry, captions and the 24-bar soundtrack. */
export const FILM_SECONDS = 60;
export const filmCues = [
  { id: 'prompt', from: 0, to: 5 },
  { id: 'schematic', from: 5, to: 20 },
  { id: 'joint', from: 20, to: 35 },
  { id: 'layout', from: 35, to: 47 },
  { id: 'verify', from: 47, to: 57 },
  { id: 'closing', from: 57, to: FILM_SECONDS },
] as const;
export const ease = (a: number, b: number, time: number) => {
  const x = Math.max(0, Math.min(1, (time - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export function filmCue(time: number) {
  const cue = filmCues.find(cue => time < cue.to) ?? filmCues[filmCues.length - 1];
  const opacity = ease(cue.from, cue.from + .8, time) * (cue.id === 'closing' ? 1 : 1 - ease(cue.to - .7, cue.to, time));
  return { ...cue, opacity };
}
export function filmTime(time: number) { return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
