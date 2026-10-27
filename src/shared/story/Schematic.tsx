import { out } from './motion';
import { C, mix } from './palette';

/** A schematic as the app exports it: parts with terminals in part coordinates, a rotation in degrees, and wires
 * between part terminals. */
export type Terminal = { name: string; x: number; y: number };
export type Part = { id: string; kind: string; label: string; x: number; y: number; rotation: number; terminals: Terminal[];
  /** Where the label sits, from the part's centre, and its anchor; above the part by default. */
  labelAt?: [number, number, 'start' | 'middle' | 'end'] };
export type Wire = { from: { partId: string; terminal: string }; to: { partId: string; terminal: string }; net?: string };
export type Drawing = { id: string; title: string; parts: Part[]; wires: Wire[]; colouring: Record<string, { members: string[]; role: string; path: string[] }> };


/** Where a terminal is in schematic coordinates (SVG rotation: clockwise, y down). */
export function terminalAt(part: Part, terminal: Terminal) {
  const a = part.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [part.x + terminal.x * c - terminal.y * s, part.y + terminal.x * s + terminal.y * c] as const;
}

/** The drawing's extent, terminals and placed labels included. */
export function extent(drawing: Drawing) {
  const points = drawing.parts.flatMap(p => [[p.x, p.y] as const, ...p.terminals.map(t => terminalAt(p, t)),
    ...p.labelAt ? [[p.x + p.labelAt[0], p.y + p.labelAt[1]] as const] : []]);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return [Math.min(...xs) - 40, Math.min(...ys) - 40, Math.max(...xs) + 40, Math.max(...ys) + 40] as const;
}

/** Scale and offset that fit the drawing into a w × h box, centred. */
export function fit(drawing: Drawing, w: number, h: number) {
  const [x0, y0, x1, y1] = extent(drawing), k = Math.min(w / (x1 - x0), h / (y1 - y0));
  return { k, dx: (w - (x1 - x0) * k) / 2 - x0 * k, dy: (h - (y1 - y0) * k) / 2 - y0 * k };
}

/** Parts appear left to right, as a signal would cross the circuit; this is when part i starts, as a share of the drawing time. */
export function appearOrder(drawing: Drawing) {
  const sorted = [...drawing.parts].sort((a, b) => a.x - b.x || a.y - b.y);
  return new Map(sorted.map((p, i) => [p.id, .62 * i / Math.max(1, sorted.length - 1)]));
}

/** The symbol of one part in part coordinates: leads from the body to every terminal, then the body. */
function Symbol({ part, page }: { part: Part; page: string }) {
  const leads = (r: number) => part.terminals.map(t => { const d = Math.hypot(t.x, t.y) || 1; return <line key={t.name} x1={t.x / d * r} y1={t.y / d * r} x2={t.x} y2={t.y} />; });
  switch (part.kind) {
    case 'inductor': case 'pdk_inductor':
      return <g>{leads(30)}<path d="M-30 0 a7.5 9 0 0 1 15 0 a7.5 9 0 0 1 15 0 a7.5 9 0 0 1 15 0 a7.5 9 0 0 1 15 0" fill="none" /></g>;
    case 'capacitor':
      return <g>{leads(7)}<line x1={-7} y1={-18} x2={-7} y2={18} /><line x1={7} y1={-18} x2={7} y2={18} /></g>;
    case 'resistor':
      return <g>{leads(26)}<path d="M-26 0 l4 -10 l8 20 l8 -20 l8 20 l8 -20 l8 20 l4 -10" fill="none" /></g>;
    case 'nmos':
      return <g><line x1={-40} y1={0} x2={-10} y2={0} /><line x1={-10} y1={-20} x2={-10} y2={20} /><line x1={0} y1={-24} x2={0} y2={24} />
        <path d="M0 -16 H20 V-40 M0 16 H20 V40 M0 0 H40 M28 0 V20 H40" fill="none" /></g>;
    case 'bend':
      return null;
    case 'tag':
      return <path d="M0 0 H12 L20 -9 H46 V9 H20 L12 0" fill={page} />;
    case 'line':
      return <g>{leads(22)}<rect x={-22} y={-7} width={44} height={14} fill={page} /></g>;
    case 'ground':
      return <g><line x1={0} y1={-20} x2={0} y2={0} /><line x1={-16} y1={0} x2={16} y2={0} /><line x1={-10} y1={7} x2={10} y2={7} /><line x1={-4} y1={14} x2={4} y2={14} /></g>;
    case 'port': case 'vdc':
      return <g>{leads(18)}<circle r={18} fill={page} />{part.kind === 'vdc'
        ? <path d="M-11 -4 h8 M-7 -8 v8 M4 -4 h8" fill="none" /> : <path d="M-9 0 q4.5 -9 9 0 t9 0" fill="none" />}</g>;
    default:
      return <g>{leads(20)}<rect x={-20} y={-20} width={40} height={40} rx={6} fill={page} /></g>;
  }
}

/** The colours a schematic is drawn in: the film's by default; a page passes its theme's (CSS colours, tint 0 or 1). */
export type Ink = { wire: string; text: string; muted: string; page: string };
const FILM: Ink = { wire: C.cyan, text: C.text, muted: C.muted, page: C.page };

/** The drawing at progress `t` (0..1): parts pop in left to right, each wire traces once both its ends are there.
 * `tint` (0..1) colours parts by their block; `colours` maps a part label to its block colour. Labels and strokes keep one
 * size on screen; `labelUnits` sets the labels in drawing units instead, and the strokes with them, so a print keeps the
 * symbols a fixed multiple of the text. */
export function Schematic({ drawing, width, height, t, tint = 0, colours, labels = true, ink = FILM, labelUnits }:
  { drawing: Drawing; width: number; height: number; t: number; tint?: number; colours?: Map<string, string>; labels?: boolean; ink?: Ink; labelUnits?: number }) {
  const { k, dx, dy } = fit(drawing, width, height), order = appearOrder(drawing);
  const parts = new Map(drawing.parts.map(p => [p.id, p]));
  const screen = (x: number) => labelUnits ? 1 : 1 / Math.min(1, x);
  const shown = (id: string) => out(t - (order.get(id) ?? 0), 0, .1);
  return <svg width={width} height={height} style={{ overflow: 'visible' }}>
    <g transform={`translate(${dx} ${dy}) scale(${k})`} strokeLinecap="round" strokeLinejoin="round">
      {drawing.wires.map((w, i) => {
        const a = parts.get(w.from.partId), b = parts.get(w.to.partId);
        const ta = a?.terminals.find(x => x.name === w.from.terminal), tb = b?.terminals.find(x => x.name === w.to.terminal);
        if (!a || !b || !ta || !tb) return null;
        const [ax, ay] = terminalAt(a, ta), [bx, by] = terminalAt(b, tb);
        const p = out(t - Math.max(order.get(a.id)!, order.get(b.id)!) - .06, 0, .14);
        return <path key={i} d={`M${ax} ${ay} H${bx} V${by}`} pathLength={1} strokeDasharray={`${p} 1`} fill="none" stroke={ink.wire} strokeOpacity={.75} strokeWidth={2.4 * screen(k * 1.2)} />;
      })}
      {drawing.parts.map(p => {
        const s = shown(p.id), colour = colours?.get(p.label);
        const stroke = colour && tint ? tint >= 1 ? colour : mix(ink.text, colour, tint) : ink.text;
        return <g key={p.id} transform={`translate(${p.x} ${p.y})`} opacity={s}>
          <g transform={`rotate(${p.rotation}) scale(${.6 + .4 * s})`} stroke={stroke} strokeWidth={3 * screen(k * 1.2)} fill="none"><Symbol part={p} page={ink.page} /></g>
          {labels && p.kind !== 'ground' && p.kind !== 'bend' && <text x={p.labelAt?.[0] ?? 0} y={p.labelAt?.[1] ?? -34} textAnchor={p.labelAt?.[2] ?? 'middle'} fontFamily="Inter" fontWeight={600} fontSize={labelUnits ?? 20 / Math.min(1, k * 1.1)} fill={colour && tint ? tint >= 1 ? colour : mix(ink.muted, colour, tint) : ink.muted}>{p.label}</text>}
        </g>;
      })}
    </g>
  </svg>;
}

export { mix };
