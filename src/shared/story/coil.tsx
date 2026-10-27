import { B, P } from './palette';

/** A recorded coil: its polygons by layer, in microns, and its box. */
export type CoilSample = { source: string; eval: number | string; layers: Record<string, number[][][]>; bbox: [number, number, number, number] };
/** The chip's coils by member, each in its block's colour. */
export const COILS: Record<string, string> = { L1: P.green, L2: P.pink, L3: B.brand2 };

function layerOrder(sample: CoilSample) {
  const area = (p: number[][]) => Math.abs(p.reduce((s, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * y; }, 0) / 2);
  return Object.entries(sample.layers).map(([l, ps]) => [l, ps.reduce((s, p) => s + area(p), 0)] as const).sort((a, b) => b[1] - a[1]).map(([l]) => l);
}

/** One recorded coil centred on (cx, cy) at s px per µm: its own metal in `colour`, the other layers (vias, underpass) dimmer. */
export function CoilShape({ sample, cx, cy, s, colour, opacity = 1 }: { sample: CoilSample; cx: number; cy: number; s: number; colour: string; opacity?: number }) {
  const [x0, y0, x1, y1] = sample.bbox, ox = cx - (x0 + x1) / 2 * s, oy = cy + (y0 + y1) / 2 * s;
  const order = layerOrder(sample);
  return <g opacity={opacity}>{[...order].reverse().map(layer => <g key={layer} fill={layer === order[0] ? colour : B.brand3} fillOpacity={layer === order[0] ? 1 : .75}>
    {sample.layers[layer].map((p, i) => <path key={i} d={p.map(([x, y], k) => `${k ? 'L' : 'M'}${(ox + x * s).toFixed(1)} ${(oy - y * s).toFixed(1)}`).join('') + 'Z'} />)}
  </g>)}</g>;
}

/** Draws each member that has a recorded shape (`shapes`, by member) as that shape in the block view's cards, at opacity `k`. */
export function coilGlyphs(shapes: Record<string, Pick<CoilSample, 'layers' | 'bbox'>> | undefined, k: number) {
  return (member: string, x: number, y: number, s: number) => {
    const shape = shapes?.[member];
    if (!shape || k <= 0) return undefined;
    const [x0, y0, x1, y1] = shape.bbox;
    return <CoilShape key={`c${member}`} sample={{ ...shape, source: '', eval: '' }} cx={x} cy={y} s={s * 1.15 / Math.max(x1 - x0, y1 - y0)} colour={COILS[member]} opacity={k} />;
  };
}
