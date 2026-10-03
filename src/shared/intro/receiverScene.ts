/** Editorial receiver model. Illustrative geometry, never a netlist or a simulation result. */
import { metalRuns, pixelLayout } from '../pixelLayout';
import { ease } from './timeline';

export type Point = readonly [number, number];
export type ReceiverId = 'rf' | 'input' | 'lna' | 'interstage' | 'mixer' | 'if';
export type Port = 'in' | 'out' | 'lo' | 'bias' | 'ground';
export type ReceiverBlock = {
  id: ReceiverId; kind: 'contact' | 'passive' | 'active' | 'mixer';
  name: string; role: string; ports: readonly Port[];
};
export const receiverBlocks: readonly ReceiverBlock[] = [
  { id: 'rf', kind: 'contact', name: 'RF input', role: 'Receive', ports: ['out'] },
  { id: 'input', kind: 'passive', name: 'Input match', role: 'Pixelated passive', ports: ['in', 'out'] },
  { id: 'lna', kind: 'active', name: 'LNA', role: 'Low-noise amplifier', ports: ['in', 'out', 'bias', 'ground'] },
  { id: 'interstage', kind: 'passive', name: 'Interstage', role: 'Pixelated passive', ports: ['in', 'out'] },
  { id: 'mixer', kind: 'mixer', name: 'Mixer', role: 'Frequency conversion', ports: ['in', 'out', 'lo', 'bias', 'ground'] },
  { id: 'if', kind: 'contact', name: 'IF output', role: 'To baseband', ports: ['in'] },
];
export const receiverConnections = receiverBlocks.slice(1).map((block, i) => ({
  id: `${receiverBlocks[i].id}-${block.id}`,
  from: { block: receiverBlocks[i].id, port: 'out' as Port }, to: { block: block.id, port: 'in' as Port },
}));

// All candidates are computed once. No random generation or pixel morphing during playback.
export const receiverCandidates = [
  { id: 'A', fingers: 4, width: .72, fill: .42 },
  { id: 'B', fingers: 6, width: .86, fill: .49 },
  { id: 'C', fingers: 8, width: 1, fill: .55 },
].map(spec => ({ ...spec, passives: [13, 31].map(seed => {
  const layout = pixelLayout({ columns: 18, rows: 14, seed, fill: spec.fill, mirror: 'across',
    ports: [{ side: 'left', at: 6 }, { side: 'right', at: 6 }] });
  return { layout, runs: metalRuns(layout) };
}) }));
export const candidateTimes = [13.5, 17.5, 21.5] as const;
export const selectedAt = 24.5;
export const placementDuration = .9;

export function receiverState(time: number) {
  const candidate = time < candidateTimes[1] ? 0 : time < candidateTimes[2] ? 1 : 2;
  return {
    candidate, selected: time >= selectedAt,
    focus: ease(12.5, 13.3, time) * (1 - ease(26.7, 27.5, time)),
    physical: ease(27.5, 28.2, time),
    evaluation: ease(42.5, 43.3, time) * (1 - ease(54.3, 55, time)),
    revision: ease(48, 48.8, time),
    change: time >= candidateTimes[0] && time < selectedAt ? 1 - ease(candidateTimes[candidate], candidateTimes[candidate] + .8, time) : 0,
  };
}

export function blockPose(block: ReceiverBlock, portrait: boolean, time: number) {
  const index = receiverBlocks.indexOf(block), state = receiverState(time);
  const focused = ['input', 'lna', 'interstage'].includes(block.id);
  const focusIndex = ['input', 'lna', 'interstage'].indexOf(block.id);
  const base: Point = portrait ? [104, 40 + index * 88] : [65 + index * 214, 194];
  const target: Point = portrait ? [104, 135 + focusIndex * 142] : [265 + focusIndex * 335, 207];
  const start = 28.2 + index * .28;
  const placed = ease(start, start + placementDuration, time);
  const lift = time >= 27.5 ? (1 - placed) * state.physical : 0;
  return {
    x: base[0] + (focused ? (target[0] - base[0]) * state.focus : 0) + (portrait ? 0 : (index % 2 ? 22 : -22) * lift),
    y: base[1] + (focused ? (target[1] - base[1]) * state.focus : 0) - 27 * lift,
    scale: (portrait ? .61 : 1) * (1 + state.focus * (focused ? .24 : 0)),
    opacity: ease(.2 + index * .22, .8 + index * .22, time) * (focused ? 1 : 1 - state.focus),
    placed,
  };
}

export function portPosition(block: ReceiverBlock, port: Port, portrait: boolean, time: number): Point {
  const pose = blockPose(block, portrait, time);
  const radius = block.kind === 'contact' ? 23 : 72;
  let local: Point;
  if (port === 'in' || port === 'out') {
    const direction = port === 'in' ? -1 : 1;
    local = portrait ? [0, direction * (block.kind === 'contact' ? 23 : 55)] : [direction * radius, 0];
  } else if (port === 'lo') local = portrait ? [-72, 0] : [0, -55];
  else if (port === 'bias') local = portrait ? [72, -27] : [block.kind === 'mixer' ? 43 : 0, -55];
  else local = portrait ? [72, 27] : [43, 55];
  return [pose.x + local[0] * pose.scale, pose.y + local[1] * pose.scale];
}

/** Routes always end at the same ports, including during placement and the one local routing revision. */
export function connectionPath(index: number, portrait: boolean, time: number): Point[] {
  const a = portPosition(receiverBlocks[index], 'out', portrait, time);
  const b = portPosition(receiverBlocks[index + 1], 'in', portrait, time);
  const detour = index === 3 && time >= 31.5 ? 16 * (1 - receiverState(time).revision) : 0;
  if (portrait) {
    const middle = (a[1] + b[1]) / 2;
    return [a, [a[0], middle - 5], [a[0] + detour, middle - 5], [b[0] + detour, middle + 5], [b[0], middle + 5], b];
  }
  const middle = (a[0] + b[0]) / 2;
  return [a, [middle - 12, a[1]], [middle - 12, a[1] + detour], [middle + 12, b[1] + detour], [middle + 12, b[1]], b];
}

export const receiverCopy = [
  ...receiverBlocks.flatMap(block => [block.name, block.role]),
  'Receiver architecture', 'Circuit + EM evaluation', 'Selected design', 'Joint design', 'Place components',
  'Connect ports', 'Layout review', 'Refine connection', 'One coordinated design', 'Candidate', 'Selected',
  'Bias', 'LO', 'Schematic', 'Physical layout', 'Illustrative design sequence',
] as const;
