import { C } from '../Brand';

/** A schematic as the app exports it: parts with terminals in part coordinates, a rotation in degrees, and wires
 * between part terminals. */
export type Terminal = { name: string; x: number; y: number };
export type Part = { id: string; kind: string; label: string; x: number; y: number; rotation: number; terminals: Terminal[] };
export type Wire = { from: { partId: string; terminal: string }; to: { partId: string; terminal: string }; net?: string };
export type Drawing = { id: string; title: string; parts: Part[]; wires: Wire[]; colouring: Record<string, { members: string[]; role: string; path: string[] }> };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => 1 - (1 - clamp01(v)) ** 3;

/** Where a terminal is in schematic coordinates (SVG rotation: clockwise, y down). */
export function terminalAt(part: Part, terminal: Terminal) {
  const a = part.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [part.x + terminal.x * c - terminal.y * s, part.y + terminal.x * s + terminal.y * c] as const;
}

/** The drawing's extent, terminals included. */
export function extent(drawing: Drawing) {
  const points = drawing.parts.flatMap(p => [[p.x, p.y] as const, ...p.terminals.map(t => terminalAt(p, t))]);
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
function Symbol({ part }: { part: Part }) {
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
    case 'ground':
      return <g><line x1={0} y1={-20} x2={0} y2={0} /><line x1={-16} y1={0} x2={16} y2={0} /><line x1={-10} y1={7} x2={10} y2={7} /><line x1={-4} y1={14} x2={4} y2={14} /></g>;
    case 'port': case 'vdc':
      return <g>{leads(18)}<circle r={18} fill={C.page} />{part.kind === 'vdc'
        ? <path d="M-11 -4 h8 M-7 -8 v8 M4 -4 h8" fill="none" /> : <path d="M-9 0 q4.5 -9 9 0 t9 0" fill="none" />}</g>;
    default:
      return <g>{leads(20)}<rect x={-20} y={-20} width={40} height={40} rx={6} fill={C.page} /></g>;
  }
}

/** The drawing at progress `t` (0..1): parts pop in left to right, each wire traces once both its ends are there.
 * `tint` (0..1) colours parts by their block; `colours` maps a part label to its block colour. */
export function Schematic({ drawing, width, height, t, tint = 0, colours, labels = true }:
  { drawing: Drawing; width: number; height: number; t: number; tint?: number; colours?: Map<string, string>; labels?: boolean }) {
  const { k, dx, dy } = fit(drawing, width, height), order = appearOrder(drawing);
  const parts = new Map(drawing.parts.map(p => [p.id, p]));
  const shown = (id: string) => ease((t - (order.get(id) ?? 0)) / .1);
  return <svg width={width} height={height} style={{ overflow: 'visible' }}>
    <g transform={`translate(${dx} ${dy}) scale(${k})`} strokeLinecap="round" strokeLinejoin="round">
      {drawing.wires.map((w, i) => {
        const a = parts.get(w.from.partId), b = parts.get(w.to.partId);
        const ta = a?.terminals.find(x => x.name === w.from.terminal), tb = b?.terminals.find(x => x.name === w.to.terminal);
        if (!a || !b || !ta || !tb) return null;
        const [ax, ay] = terminalAt(a, ta), [bx, by] = terminalAt(b, tb);
        const p = ease((t - Math.max(order.get(a.id)!, order.get(b.id)!) - .06) / .14);
        return <path key={i} d={`M${ax} ${ay} H${bx} V${by}`} pathLength={1} strokeDasharray={`${p} 1`} fill="none" stroke={C.cyan} strokeOpacity={.75} strokeWidth={2.4 / Math.min(1, k * 1.2)} />;
      })}
      {drawing.parts.map(p => {
        const s = shown(p.id), colour = colours?.get(p.label);
        const stroke = colour && tint ? mix(C.text, colour, tint) : C.text;
        return <g key={p.id} transform={`translate(${p.x} ${p.y})`} opacity={s}>
          <g transform={`rotate(${p.rotation}) scale(${.6 + .4 * s})`} stroke={stroke} strokeWidth={3 / Math.min(1, k * 1.2)} fill="none"><Symbol part={p} /></g>
          {labels && p.kind !== 'ground' && <text x={0} y={-34} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={20 / Math.min(1, k * 1.1)} fill={colour && tint ? mix(C.muted, colour, tint) : C.muted}>{p.label}</text>}
        </g>;
      })}
    </g>
  </svg>;
}

/** Linear mix of two #rrggbb colours. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
