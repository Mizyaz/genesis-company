/** One illustrative TDD RF front end. Devices belong to circuits; circuits belong to the front end.
 * Coordinates are editorial scene units, not a PDK layout or a simulation result. */
import { pixelLayout } from '../pixelLayout';
import { ease } from './timeline';

export type Point3 = readonly [number, number, number];
export type CircuitId = 'lna' | 'pa' | 'rxMixer' | 'txMixer' | 'switch' | 'interfaces';
export type Part = {
  id: string; circuit: CircuitId; kind: 'pixel' | 'mos' | 'capacitor' | 'choke' | 'pad' | 'mixer' | 'switch';
  x: number; z: number; start: number; seed?: number; power?: boolean;
};
export const llmClickAt = 2.1;
export function requestState(time: number) {
  return time < llmClickAt ? 'request' : time < 2.5 ? 'pressed' : time < 60 ? 'thinking' : 'ready';
}
const amplifier = (circuit: 'lna' | 'pa', z: number, start: number): Part[] => {
  const reverse = circuit === 'pa';
  const xs = reverse ? [4, 1, -2, -5, -8] : [-8, -5, -2, 1, 4];
  return [
    ...xs.map((x, i): Part => ({ id: `${circuit}-${i}`, circuit, kind: i % 2 ? 'mos' : 'pixel',
      x, z, start: start + i * 2, seed: 7 + i * 13 + (reverse ? 9 : 0), power: reverse })),
    ...[1, 3].map((i): Part => ({ id: `${circuit}-decouple-${i}`, circuit, kind: 'capacitor',
      x: xs[i], z: z + (reverse ? 3.5 : -3.5), start: start + 9 + i * .7 })),
    { id: `${circuit}-choke`, circuit, kind: 'choke', x: -2, z: z + (reverse ? 3.5 : -3.5), start: start + 12 },
  ];
};
export const parts: readonly Part[] = [
  { id: 'rf', circuit: 'interfaces', kind: 'pad', x: -18.5, z: 0, start: 3.2 },
  { id: 'tr', circuit: 'switch', kind: 'switch', x: -14, z: 0, start: 4.4 },
  ...amplifier('lna', -5, 6),
  ...amplifier('pa', 5, 22),
  { id: 'rx-mixer', circuit: 'rxMixer', kind: 'mixer', x: 11, z: -5, start: 36 },
  { id: 'tx-mixer', circuit: 'txMixer', kind: 'mixer', x: 11, z: 5, start: 39 },
  { id: 'lo', circuit: 'interfaces', kind: 'pad', x: 15.5, z: 0, start: 43 },
  { id: 'rx', circuit: 'interfaces', kind: 'pad', x: 18.5, z: -5, start: 44.5 },
  { id: 'tx', circuit: 'interfaces', kind: 'pad', x: 18.5, z: 5, start: 46.5 },
  { id: 'bias-rx', circuit: 'interfaces', kind: 'pad', x: -7, z: -11, start: 49 },
  { id: 'bias-tx', circuit: 'interfaces', kind: 'pad', x: -7, z: 11, start: 52 },
  { id: 'control', circuit: 'interfaces', kind: 'pad', x: -18.5, z: 10, start: 55.5 },
];
export const circuits = [
  { id: 'lna', name: 'LNA', role: 'Receive amplifier', x: -2, z: -5, start: 6, label: [-2, 0, -11] },
  { id: 'pa', name: 'PA', role: 'Transmit amplifier', x: -2, z: 5, start: 22, label: [-2, 0, 11] },
  { id: 'rxMixer', name: 'RX', role: 'Downconversion', x: 11, z: -5, start: 36, label: [11, 0, -10] },
  { id: 'txMixer', name: 'TX', role: 'Upconversion', x: 11, z: 5, start: 39, label: [11, 0, 10] },
  { id: 'switch', name: 'T/R', role: 'Antenna switch', x: -14, z: 0, start: 4.4, label: [-15, 0, 3.5] },
] as const;
export const hierarchy = { id: 'front-end', children: circuits.map(circuit => ({ ...circuit,
  children: parts.filter(part => part.circuit === circuit.id).map(part => part.id),
})), interfaces: parts.filter(part => part.circuit === 'interfaces').map(part => part.id) };

// Candidate geometry is cached once. Every scene frame is a deterministic sample of the same design history.
const fills = [.42, .52, .47, .57, .49, .60, .51, .56, .45, .54, .59, .50, .57, .53, .61];
export const designTimes = fills.map((_, i) => 10 + i * 3.5);
export const pixelCandidates = new Map(parts.filter(part => part.kind === 'pixel').map(part => [part.id,
  fills.map(fill => pixelLayout({ columns: 18, rows: 18, seed: part.seed!, fill, mirror: 'across',
    ports: [{ side: 'left', at: 8 }, { side: 'right', at: 8 }] })),
]));
export function designState(time: number) {
  const index = Math.max(0, Math.min(fills.length - 1, Math.floor((time - 10) / 3.5)));
  return { index, before: Math.max(0, index - 1), blend: ease(designTimes[index], Math.min(60, designTimes[index] + 1.15), time) };
}
export function partState(part: Part, time: number) {
  const { index, before, blend } = designState(time);
  const sizing = (step: number) => {
    const n = (step * 3 + (part.seed ?? 1)) % 7;
    return { fingers: (part.power ? 10 : 5) + n, length: 1.4 + n * .15,
      pixelWidth: 2.2 + ((step * 5 + (part.seed ?? 0)) % 7) * .1,
      pixelDepth: 2.5 + ((step * 3 + (part.seed ?? 0)) % 5) * .1 };
  };
  const a = sizing(before), b = sizing(index), lerp = (x: number, y: number) => x + (y - x) * blend;
  const fingers = time < part.start ? a.fingers : b.fingers;
  const appear = ease(part.start, part.start + 1.5, time);
  return { appear, lift: (1 - appear) * 3.5,
    width: part.kind === 'pixel' ? lerp(a.pixelWidth, b.pixelWidth) : part.kind === 'mos' ? .35 + fingers * .105 : part.kind === 'mixer' ? 3.5 : part.kind === 'switch' ? 2.5 : 1.7,
    depth: part.kind === 'pixel' ? lerp(a.pixelDepth, b.pixelDepth) : part.kind === 'mos' ? lerp(a.length, b.length) : part.kind === 'mixer' ? 3.5 : 1.7,
    fingers, fingerLength: lerp(a.length, b.length), index, before, blend,
  };
}
export type Side = 'left' | 'right' | 'top' | 'bottom';
export type Endpoint = { id: string; side: Side };
export type Connection = { id: string; from: Endpoint; to: Endpoint; path?: readonly Point3[]; bias?: boolean; start?: number };
const chain = (circuit: 'lna' | 'pa'): Connection[] => Array.from({ length: 4 }, (_, i) => ({
  id: `${circuit}-wire-${i}`, from: { id: `${circuit}-${i}`, side: circuit === 'lna' ? 'right' : 'left' },
  to: { id: `${circuit}-${i + 1}`, side: circuit === 'lna' ? 'left' : 'right' },
}));
export const connections: readonly Connection[] = [
  ...chain('lna'), ...chain('pa'),
  { id: 'rf-switch', from: { id: 'rf', side: 'right' }, to: { id: 'tr', side: 'left' } },
  { id: 'switch-rx', from: { id: 'tr', side: 'top' }, to: { id: 'lna-0', side: 'left' }, path: [[-14, 1.05, -5]] },
  { id: 'tx-switch', from: { id: 'pa-4', side: 'left' }, to: { id: 'tr', side: 'bottom' }, path: [[-14, 1.05, 5]] },
  { id: 'lna-rx', from: { id: 'lna-4', side: 'right' }, to: { id: 'rx-mixer', side: 'left' } },
  { id: 'tx-pa', from: { id: 'tx-mixer', side: 'left' }, to: { id: 'pa-0', side: 'right' } },
  { id: 'rx-out', from: { id: 'rx-mixer', side: 'right' }, to: { id: 'rx', side: 'left' } },
  { id: 'tx-in', from: { id: 'tx', side: 'left' }, to: { id: 'tx-mixer', side: 'right' } },
  { id: 'lo-rx', from: { id: 'lo', side: 'left' }, to: { id: 'rx-mixer', side: 'bottom' }, path: [[11, 1.05, 0]] },
  { id: 'lo-tx', from: { id: 'lo', side: 'left' }, to: { id: 'tx-mixer', side: 'top' }, path: [[11, 1.05, 0]] },
  ...(['lna', 'pa'] as const).flatMap(circuit => [1, 3].map(i => ({
    id: `${circuit}-bias-${i}`, from: { id: `${circuit}-decouple-${i}`, side: circuit === 'lna' ? 'bottom' as const : 'top' as const },
    to: { id: `${circuit}-${i}`, side: circuit === 'lna' ? 'top' as const : 'bottom' as const }, bias: true,
  }))),
  ...(['lna', 'pa'] as const).flatMap(circuit => [1, 3].map(i => ({
    id: `${circuit}-supply-${i}`, from: { id: `${circuit}-choke`, side: (circuit === 'lna') === (i === 1) ? 'left' as const : 'right' as const },
    to: { id: `${circuit}-decouple-${i}`, side: (circuit === 'lna') === (i === 1) ? 'right' as const : 'left' as const }, bias: true,
  }))),
  { id: 'bias-rx', from: { id: 'bias-rx', side: 'right' }, to: { id: 'lna-choke', side: 'top' }, path: [[-2, 1.05, -11]], bias: true },
  { id: 'bias-tx', from: { id: 'bias-tx', side: 'right' }, to: { id: 'pa-choke', side: 'bottom' }, path: [[-2, 1.05, 11]], bias: true },
  { id: 'control', from: { id: 'control', side: 'top' }, to: { id: 'tr', side: 'bottom' }, path: [[-18.5, 1.35, 2.2], [-15.3, 1.35, 2.2], [-15.3, 1.35, 1.4], [-14, 1.35, 1.4]], bias: true },
];
export const partById = new Map(parts.map(part => [part.id, part]));
export function portPosition(endpoint: Endpoint, time: number): Point3 {
  const part = partById.get(endpoint.id)!;
  const state = partState(part, time), { side } = endpoint;
  return [part.x + (side === 'left' ? -state.width / 2 : side === 'right' ? state.width / 2 : 0),
    1.05 + state.lift, part.z + (side === 'top' ? -state.depth / 2 : side === 'bottom' ? state.depth / 2 : 0)];
}
export function connectionState(edge: Connection, time: number) {
  const a = partById.get(edge.from.id)!, b = partById.get(edge.to.id)!;
  const start = Math.max(a.start, b.start) + 1.15;
  return { progress: ease(start, Math.min(60, start + 2), time), points: [portPosition(edge.from, time), ...(edge.path ?? []), portPosition(edge.to, time)] };
}
export function cameraState(time: number) {
  const input = ease(4.8, 8, time), pa = ease(20, 25, time), whole = ease(30, 35, time), settle = ease(53, 60, time);
  // Frame the arriving input first; widen before mixers arrive, not after they leave the close-up.
  return { x: -14.5 + input * 12.5 + whole * 2, z: -5 * input + pa * 10 - whole * 5,
    width: 12 + input * 7 + whole * 23 + settle * 1, depth: 10 + input * 2 + whole * 14,
    // A slow, small change in viewing angle reveals actual sidewalls, not a skewed image.
    azimuth: -.13 + .12 * ease(6, 20, time) + .12 * whole };
}
export const sceneCopy = ['Receive amplifier', 'Transmit amplifier', 'Downconversion', 'Upconversion', 'Antenna switch', 'RF', 'LO', 'Bias', 'Control'] as const;
