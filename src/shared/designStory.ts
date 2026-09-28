/** Illustrative design-loop data: three candidate layouts and their |S21| responses. Not measured data. */
export type Frame = { step: number; candidate: number; drawn: number; flow?: 'spec' | 'layout' | 'response'; judged?: boolean; met?: boolean; ms: number };

// '#' is a metal pixel. Ports sit on the left edge (row 4) and the right edge (rows 1 and 7).
export const candidates = [
  ['.#...#...', '#..##..#.', '..#...#.#', '.##.#....', '##..#.##.', '....#..#.', '.#.#..#..', '#...#.##.', '..#......'],
  ['.........', '...#####.', '...#...#.', '...#.....', '#####..#.', '...#.....', '..##.....', '...####.#', '.........'],
  ['.........', '...######', '...#.....', '...#..#..', '#####....', '...#..#..', '...#.....', '...######', '.........'],
];
export const ports = [{ side: 'left', row: 4 }, { side: 'right', row: 1 }, { side: 'right', row: 7 }] as const;

export const band = { start: 0.2, end: 0.85 };
export const limitDb = -3.5;
const rollOff = (f: number) => -2.5 * Math.max(0, (band.start - f) / band.start) ** 2 - 3 * Math.max(0, (f - 0.9) / 0.1) ** 2;
const responses = [
  (f: number) => -3.05 - 2.2 * Math.exp(-(((f - 0.55) / 0.2) ** 2)),
  (f: number) => -3.1 - 1.15 * Math.exp(-(((f - 0.76) / 0.07) ** 2)) + 0.08 * Math.sin(f * 14),
  (f: number) => -3.15 + 0.1 * Math.sin(f * 16),
];

/** Response samples in dB over a normalized frequency axis (0 to 1). */
export function response(candidate: number, samples = 49) {
  return Array.from({ length: samples }, (_, i) => {
    const f = i / (samples - 1);
    return { f, db: responses[candidate](f) + rollOff(f) };
  });
}
export const inBand = (f: number) => f >= band.start && f <= band.end;
export const fails = (point: { f: number; db: number }) => inBand(point.f) && point.db < limitDb;
export const meetsTarget = (candidate: number) => !response(candidate).some(fails);

// Plot boxes in SVG user units: 0 dB at the top edge, -8 dB at the bottom edge.
export type Box = { left: number; right: number; top: number; bottom: number };
export const chart: Box = { left: 26, right: 208, top: 12, bottom: 108 };
export const x = (f: number, box = chart) => box.left + f * (box.right - box.left);
export const y = (db: number, box = chart) => Math.min(box.bottom, box.top - db * ((box.bottom - box.top) / 8));
const line = (points: { f: number; db: number }[], box = chart) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.f, box).toFixed(1)} ${y(p.db, box).toFixed(1)}`).join('');
export const curvePath = (candidate: number, box = chart) => line(response(candidate), box);

/** Only the in-band stretches that fall below the loss limit, as separate path segments. */
export function failingPath(candidate: number) {
  const runs: { f: number; db: number }[][] = [[]];
  for (const point of response(candidate)) {
    if (fails(point)) runs[runs.length - 1].push(point);
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  return runs.filter(run => run.length > 1).map(run => line(run)).join('');
}

/** One pass: target, then propose, simulate and compare until the last candidate meets it. */
export const timeline: Frame[] = [
  { step: 1, candidate: -1, drawn: 0, flow: 'spec', ms: 1800 },
  ...candidates.flatMap((_, i): Frame[] => {
    const last = i === candidates.length - 1;
    return [
      { step: 2, candidate: i, drawn: i, flow: 'layout', ms: 1500 },
      { step: 3, candidate: i, drawn: i + 1, ms: 1500 },
      last ? { step: 5, candidate: i, drawn: i + 1, judged: true, met: true, ms: 3600 }
        : { step: 4, candidate: i, drawn: i + 1, judged: true, flow: 'response', ms: 1800 },
    ];
  }),
];
