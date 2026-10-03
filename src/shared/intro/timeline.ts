/** One 16:9 editorial master. Geometry, typography and the 16-bar score share this clock. */
export const FILM_SECONDS = 30;
export const filmCues = [
  { id: 'prompt', from: 0, to: 3 },
  { id: 'schematic', from: 3, to: 8 },
  { id: 'joint', from: 8, to: 18 },
  { id: 'layout', from: 18, to: 22 },
  { id: 'verify', from: 22, to: 26 },
  { id: 'closing', from: 26, to: FILM_SECONDS },
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
