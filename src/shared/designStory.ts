/** Illustrative design loop for one amplifier stage: matching networks, device size and gain. Not measured data. */
export type Flow = 'target' | 'jobs' | 'results' | 'review';
export type Frame = { step: number; design: number; drawn: number; flow?: Flow; judged?: boolean; met?: boolean; ms: number };

// Each design: pixelated input and output matching networks ('#' is metal) and the transistor size.
export const designs = [
  { input: ['#..#.', '.##..', '#.#.#', '..##.'], output: ['.#..#', '#.##.', '..#.#', '.#...'], size: '6 × 1 µm' },
  { input: ['##...', '.###.', '..#..', '.##..'], output: ['..##.', '.###.', '##...', '.#...'], size: '12 × 1 µm' },
  { input: ['###..', '..##.', '..##.', '###..'], output: ['..###', '.##..', '.##..', '..###'], size: '8 × 1 µm' },
];

export const band = { start: 0.2, end: 0.85 };
export const limitDb = 15; // Minimum gain inside the band.
const range = { min: 0, max: 25 };
const rollOff = (f: number) => -9 * Math.max(0, (band.start - f) / band.start) ** 2 - 9 * Math.max(0, (f - 0.9) / 0.1) ** 2;
const gains = [
  (f: number) => 12.5 + 3 * Math.exp(-(((f - 0.45) / 0.15) ** 2)),
  (f: number) => 16.5 - 4.5 * Math.exp(-(((f - 0.82) / 0.08) ** 2)) + 0.3 * Math.sin(f * 9),
  (f: number) => 17.2 + 0.4 * Math.sin(f * 11),
];

/** Gain samples in dB over a normalized frequency axis (0 to 1). */
export function response(design: number, samples = 49) {
  return Array.from({ length: samples }, (_, i) => {
    const f = i / (samples - 1);
    return { f, db: gains[design](f) + rollOff(f) };
  });
}
export const inBand = (f: number) => f >= band.start && f <= band.end;
export const fails = (point: { f: number; db: number }) => inBand(point.f) && point.db < limitDb;
export const meetsTarget = (design: number) => !response(design).some(fails);

// Plot boxes in SVG user units: 25 dB at the top edge, 0 dB at the bottom edge.
export type Box = { left: number; right: number; top: number; bottom: number };
export const chart: Box = { left: 26, right: 208, top: 10, bottom: 108 };
export const x = (f: number, box = chart) => box.left + f * (box.right - box.left);
export const y = (db: number, box = chart) => box.top + (range.max - Math.min(range.max, Math.max(range.min, db))) * ((box.bottom - box.top) / (range.max - range.min));
const line = (points: { f: number; db: number }[], box = chart) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.f, box).toFixed(1)} ${y(p.db, box).toFixed(1)}`).join('');
export const curvePath = (design: number, box = chart) => line(response(design), box);

/** Only the in-band stretches that fall below the gain limit, as separate path segments. */
export function failingPath(design: number) {
  const runs: { f: number; db: number }[][] = [[]];
  for (const point of response(design)) {
    if (fails(point)) runs[runs.length - 1].push(point);
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  return runs.filter(run => run.length > 1).map(run => line(run)).join('');
}

/** One pass: the team's target, then prepare, simulate and compare until a design meets it and goes back to the team. */
export const timeline: Frame[] = [
  { step: 1, design: -1, drawn: 0, flow: 'target', ms: 1900 },
  ...designs.flatMap((_, i): Frame[] => [
    { step: 2, design: i, drawn: i, flow: 'jobs', ms: 1600 },
    { step: 3, design: i, drawn: i + 1, ms: 1600 },
    { step: 4, design: i, drawn: i + 1, judged: true, met: meetsTarget(i), flow: 'results', ms: 1800 },
  ]),
  { step: 5, design: designs.length - 1, drawn: designs.length, judged: true, met: true, flow: 'review', ms: 3800 },
];
