/** Editorial geometry, not a PDK layout. One candidate changes all four components. */
import { pixelLayout } from '../pixelLayout';
import { ease } from './timeline';

export type Point = readonly [number, number];
const candidates = [
  { fingers: 6, length: 108, diameter: 152, trace: 7, spacing: 11, cap: 68, fill: .42 },
  { fingers: 10, length: 160, diameter: 204, trace: 11, spacing: 16, cap: 98, fill: .51 },
  { fingers: 8, length: 128, diameter: 168, trace: 8, spacing: 12, cap: 76, fill: .45 },
  { fingers: 12, length: 180, diameter: 216, trace: 12, spacing: 17, cap: 112, fill: .57 },
  { fingers: 7, length: 132, diameter: 176, trace: 8, spacing: 14, cap: 82, fill: .48 },
  { fingers: 11, length: 160, diameter: 198, trace: 10, spacing: 16, cap: 104, fill: .54 },
  { fingers: 9, length: 142, diameter: 182, trace: 9, spacing: 14, cap: 90, fill: .46 },
  { fingers: 13, length: 172, diameter: 210, trace: 11, spacing: 17, cap: 108, fill: .59 },
  { fingers: 10, length: 150, diameter: 190, trace: 9, spacing: 15, cap: 92, fill: .50 },
];
export const illustrationPixels = candidates.map(({ fill }) => pixelLayout({
  columns: 22, rows: 22, seed: 83, fill, mirror: 'across',
  ports: [{ side: 'left', at: 10 }, { side: 'right', at: 10 }],
}));
export function illustrationState(time: number) {
  const index = Math.max(0, Math.min(candidates.length - 1, Math.floor((time - 9) / 1.8)));
  const before = Math.max(0, index - 1), blend = ease(9 + index * 1.8, 10.15 + index * 1.8, time);
  const a = candidates[before], b = candidates[index];
  const mix = (key: keyof typeof a) => a[key] + (b[key] - a[key]) * blend;
  const physical = ease(7.1, 9, time), packing = ease(19, 23, time);
  const pixel = { x: 252 + 32 * packing, y: 326, width: 170 + (mix('fill') - .42) * 240, height: 172 + (mix('fill') - .42) * 180 };
  const mos = { x: 572, y: 326, width: 64 + mix('fingers') * 8, height: mix('length'), fingers: b.fingers, previousFingers: a.fingers };
  const coil = { x: 874 - 15 * packing, y: 294, size: mix('diameter'), width: mix('trace'), spacing: mix('spacing') };
  const cap = { x: 1082 - 36 * packing, y: 441, width: mix('cap'), height: mix('cap') * .68 };
  const lerp = (from: number, to: number) => from + (to - from) * physical;
  const pins = {
    input: [96, 326] as Point,
    pixelIn: [pixel.x - lerp(46, pixel.width / 2), 326] as Point,
    pixelOut: [pixel.x + lerp(46, pixel.width / 2), 326] as Point,
    gate: [mos.x - lerp(35, mos.width / 2 + 24), 326] as Point,
    drain: [mos.x + lerp(20, mos.width / 2 + 20), 294] as Point,
    source: [mos.x + lerp(20, 0), lerp(381, mos.y + mos.height / 2 + 27)] as Point,
    coilIn: [coil.x - lerp(55, coil.size / 2 + 16), 294] as Point,
    coilOut: [coil.x + lerp(55, coil.size / 2 + 16), 294] as Point,
    output: [1184, 294] as Point,
    capIn: [cap.x, cap.y - lerp(26, cap.height / 2 + 14)] as Point,
    capOut: [cap.x, cap.y + lerp(26, cap.height / 2 + 14)] as Point,
  };
  const wires: { id: string; points: Point[]; start: number; signal?: boolean }[] = [
    { id: 'input', points: [pins.input, pins.pixelIn], start: 3.1, signal: true },
    { id: 'gate', points: [pins.pixelOut, pins.gate], start: 3.8, signal: true },
    { id: 'drain', points: [pins.drain, pins.coilIn], start: 4.6, signal: true },
    { id: 'output', points: [pins.coilOut, pins.output], start: 5.1, signal: true },
    { id: 'capacitor', points: [[cap.x, 294], pins.capIn], start: 5.2 },
    { id: 'cap-ground', points: [pins.capOut, [cap.x, 530]], start: 5.5 },
    { id: 'source-ground', points: [pins.source, [pins.source[0], 530]], start: 4.8 },
    { id: 'gate-bias', points: [[410, 326], [410, 217]], start: 5.8 },
    { id: 'drain-bias', points: [[722, 294], [722, 217]], start: 5.8 },
  ];
  return { index, before, blend, physical, pixel, mos, coil, cap, pins, wires,
    zoom: 1 + .08 * ease(10.5, 12.5, time) * (1 - ease(17, 19, time)),
    focusX: 640,
    guides: ease(9, 10, time) * (1 - ease(24, 25.5, time)),
  };
}
export const illustrationCopy = ['Schematic', 'Physical geometry', 'Pixelated matching network', 'Transistor array', 'Spiral inductor'] as const;
