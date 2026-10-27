import { Easing, interpolate } from 'remotion';
import { CoilShape, type CoilSample } from '../../../src/shared/story/coil';

export { CoilShape, type CoilSample };

// Recorded coils from GENESIS's coil runs (story/coils.json, read from each evaluation's GDS): pixelated coils with
// square, hexagon and triangle pixels and drawn turn and spiral coils. The block names the run each shape comes from, as
// these are GENESIS's own coil runs and not runs of this chip. One coil block opens up and its coil turns
// into each recorded shape in place. Each coil fills the block; a micron scale bar under it gives its size.
export type CoilFamily = { run: string; evaluations?: number; samples: CoilSample[] };
export type Coils = Record<string, CoilFamily>;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

/** The families in the order the film shows them, with what to call them and which recorded samples to show. */
export const FAMILIES: { key: string; name: string; group: 'Non-intuitive' | 'Traditional'; note: string; take: number[] }[] = [
  { key: 'pixel_rectangle', name: 'Square pixels', group: 'Non-intuitive', note: 'GENESIS coil run · 140 GHz 176 pH inductor · 12 × 12 grid', take: [0, 1, 2, 3, 5, 12] },
  { key: 'pixel_hexagon', name: 'Hexagon pixels', group: 'Non-intuitive', note: 'GENESIS coil run · 140 GHz inductor search · 8 × 8 grid', take: [0, 1, 2, 3, 9] },
  { key: 'pixel_triangle', name: 'Triangle pixels', group: 'Non-intuitive', note: 'GENESIS coil run · 140 GHz inductor search · 8 × 8 grid', take: [0, 1, 2, 3] },
  { key: 'half_turn', name: 'Turn coils', group: 'Traditional', note: 'GENESIS coil run · 100 GHz spiral coil · turns and width', take: [0, 1, 3, 4, 5] },
  { key: 'spiral', name: 'Spiral coils', group: 'Traditional', note: 'GENESIS coil run · 140 GHz 176 pH spiral · sides and diameter', take: [3, 5, 7, 9] },
];

/** The shown samples in film order, each with its family. */
export function coilSteps(coils: Coils) {
  return FAMILIES.flatMap(f => f.take.filter(i => coils[f.key]?.samples[i]).map(i => ({ family: f, sample: coils[f.key].samples[i] })));
}

/** Layers by drawn area, largest first: the first is the coil's own metal. */
/** px per µm that fits a sample into a w × h box. */
const scaleOf = (s: CoilSample, w: number, h: number) => Math.min(w / (s.bbox[2] - s.bbox[0]), h / (s.bbox[3] - s.bbox[1]));
/** A round length in µm about a fifth of the box at this scale. */
const barOf = (s: number, w: number) => [1, 2, 5, 10, 20, 25, 50, 100, 200].reduce((best, um) => Math.abs(um * s - w / 5) < Math.abs(best * s - w / 5) ? um : best, 1);

/** The opened coil block over [from, to]: each step holds, then cross-fades to the next; a family change also
 * shows the family's name in the block. */
export function CoilLab({ coils, frame, from, to, x, y, w, h, title, colour }: { coils: Coils; frame: number; from: number; to: number; x: number; y: number; w: number; h: number; title: string; colour: string }) {
  const steps = coilSteps(coils), per = (to - from) / steps.length, p = Math.max(0, Math.min(steps.length - 1, (frame - from) / per));
  const j = Math.floor(p), u = out(p - j, .6, 1), now = steps[j], next = steps[Math.min(j + 1, steps.length - 1)];
  const box = { w: w - 80, h: h - 190 }, cx = x + w / 2, cy = y + 96 + box.h / 2;
  const shape = (st: typeof now, opacity: number, grow: number) => <CoilShape sample={st.sample} cx={cx} cy={cy} s={scaleOf(st.sample, box.w, box.h) * grow} colour={colour} opacity={opacity} />;
  const bar = (st: typeof now, opacity: number) => { const s = scaleOf(st.sample, box.w, box.h), um = barOf(s, box.w), bx = x + w - 28 - um * s, by = y + h - 64;
    return <g opacity={opacity}><path d={`M${bx} ${by - 8}v8h${um * s}v-8`} fill="none" stroke="#9aacbf" strokeWidth={3} />
      <text x={bx + um * s / 2} y={by - 14} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={24} fill="#9aacbf">{um} µm</text></g>; };
  const family = u < .5 ? now.family : next.family, swap = now.family !== next.family ? Math.abs(1 - 2 * u) : 1;
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={18} fill="#0b2238" stroke={colour} strokeWidth={3} />
    <text x={x + 28} y={y + 50} fontFamily="Inter" fontWeight={700} fontSize={32} fill="#dce8f4">{title}</text>
    <g opacity={swap}>
      <text x={x + w - 28} y={y + 50} textAnchor="end" fontFamily="Inter" fontWeight={700} fontSize={30} fill={colour}>{family.name}</text>
    </g>
    {shape(now, next === now ? 1 : 1 - u, 1 - .04 * u)}
    {next !== now && shape(next, u, .96 + .04 * u)}
    {bar(now, next === now ? 1 : 1 - u)}{next !== now && bar(next, u)}
    <g opacity={swap}><text x={x + 28} y={y + h - 24} fontFamily="Inter" fontSize={24} fill="#9aacbf">{family.note}</text></g>
  </g>;
}

/** Which family is showing at a frame, for the list beside the block. */
export function familyAt(coils: Coils, frame: number, from: number, to: number) {
  const steps = coilSteps(coils), p = Math.max(0, Math.min(steps.length - 1, (frame - from) / ((to - from) / steps.length)));
  return steps[Math.round(p)]?.family.key;
}
