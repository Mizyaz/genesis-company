import { useEffect, useRef, useState } from 'react';
import motion from '../content/story/motion.json';
import { Schematic, type Drawing } from './story/Schematic';
import '../styles/flow-motion.css';

type Box = number[];
const [X0, Y0, X1, Y1] = motion.die, W = X1 - X0, H = Y1 - Y0;
/** Layout microns to the drawing: x from the die's left edge, y flipped so the die's top is up. */
const px = (x: number) => +(x - X0).toFixed(1), py = (y: number) => +(Y1 - y).toFixed(1);
const rects = (boxes: Box[]) => boxes.map(([a, b, c, d]) => `M${px(a)} ${py(d)}h${+(c - a).toFixed(1)}v${+(d - b).toFixed(1)}h${-(c - a).toFixed(1)}z`).join('');
const union = (boxes: Box[]) => [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))];

// Blocks: each starts pushed out from the die's middle (the block view) and moves into its placed pose (essentials).
const blocks = motion.blocks.map(block => {
  const box = union(block.members.map(m => m.box)), cx = (box[0] + box[2]) / 2 - (X0 + X1) / 2, cy = (box[1] + box[3]) / 2 - (Y0 + Y1) / 2;
  return { name: block.name, outline: rects([box]), members: rects(block.members.map(m => m.box)), dx: +(cx * .45).toFixed(1), dy: +(-cy * .45).toFixed(1) };
});
const rf = motion.rf.map(line => ({ d: line.path.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x)} ${py(y)}`).join(''), width: line.width }));
const byNet = new Map<number, Box[]>();
for (const box of motion.dc) byNet.set(box[4], [...byNet.get(box[4]) ?? [], box]);
const nets = [...byNet.values()].map(rects);
// Tiles in rings outwards from the die's middle, one path per ring and metal colour.
// Each tile drawn a little inside its pitch, so the tiling reads as tiles.
const RINGS = 8, GAP = 1.2, far = Math.hypot(W, H) / 2;
const tiles = new Map<string, { ring: number; colour: number; boxes: Box[] }>();
for (const [x, y, w, h, metal] of motion.tiles) {
  const ring = Math.min(RINGS - 1, Math.floor(Math.hypot(x + w / 2 - (X0 + X1) / 2, y + h / 2 - (Y0 + Y1) / 2) / far * RINGS)), key = `${ring}-${metal}`;
  if (!tiles.has(key)) tiles.set(key, { ring, colour: metal, boxes: [] });
  tiles.get(key)!.boxes.push([x + GAP, y + GAP, x + w - GAP, y + h - GAP]);
}
const minutes = (s: number) => s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
const sec = motion.seconds as Record<string, number>;
/** The steps under the drawing, each lit while the drawing shows it. */
export const STEPS = [
  { id: 'schematic', title: 'Schematic', note: 'Your circuit' },
  { id: 'blocks', title: 'Blocks', note: `${blocks.length} blocks` },
  { id: 'essentials', title: 'Placement', note: minutes(sec.essentials) },
  { id: 'lines', title: 'Lines', note: minutes(sec.interconnect + (sec.drops ?? 0) + sec.dc_lines) },
  { id: 'tiles', title: 'Ground tiles', note: minutes(sec.gnd_tiling) },
  { id: 'density', title: 'Density', note: minutes(sec.density) },
  { id: 'verify', title: 'DRC + LVS', note: motion.verify.drc_violations === 0 && motion.verify.lvs === 'LVS_CORRECT' ? 'clean' : 'not clean' },
];
const total = Object.values(sec).reduce((a, b) => a + b, 0);
const INK = { wire: 'var(--flow-cyan)', text: 'var(--text)', muted: 'var(--muted)', page: 'var(--surface)' };

/** The physical flow as one motion from its records (src/content/story/motion.json, scripts/export-flow-motion.mjs):
 * the schematic, its blocks moving into their placed poses, the RF and DC lines drawing, the ground tiles forming
 * outwards, the density fill and the DRC and LVS result. CSS keyframes only: it starts when it first comes on screen,
 * pauses off screen, and readers who ask for less motion see the finished layout. */
export default function FlowMotion() {
  const figure = useRef<HTMLElement>(null), [state, setState] = useState<'idle' | 'on' | 'off'>('idle');
  useEffect(() => {
    const el = figure.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => setState(s => entry.isIntersecting ? 'on' : s === 'idle' ? 'idle' : 'off'), { threshold: .3 });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  return <figure ref={figure} className={`flow-motion is-${state}`} aria-label={`The physical flow on a recorded layout: ${STEPS.map(s => s.title).join(', ')}; ${minutes(total)} in all, DRC ${motion.verify.drc_violations} errors, LVS correct.`}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
      <rect className="fm-die" x={0} y={0} width={W} height={H} rx={4} />
      <g className="fm-tiles">{[...tiles.values()].map(t => <path key={`${t.ring}-${t.colour}`} d={rects(t.boxes)} fill={motion.colours[t.colour] ?? 'var(--muted)'} style={{ animationDelay: `${t.ring * .16}s` }} />)}</g>
      <path className="fm-fill" d={rects(motion.fill)} />
      <g className="fm-rf">{rf.map((l, i) => <path key={i} d={l.d} pathLength={1} strokeWidth={l.width} style={{ animationDelay: `${i * .12}s` }} />)}</g>
      <g className="fm-dc">{nets.map((d, i) => <path key={i} d={d} style={{ animationDelay: `${i * .08}s` }} />)}</g>
      <g className="fm-blocks">{blocks.map((b, i) => <g key={b.name} className="fm-block" style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, animationDelay: `${i * .05}s` } as React.CSSProperties}>
        <path className="fm-outline" d={b.outline} /><path className="fm-member" d={b.members} /></g>)}</g>
      <g className="fm-schematic"><Schematic drawing={motion.schematic as Drawing} width={W} height={H} t={1} ink={INK} /></g>
    </svg>
    <p className="fm-verdict"><strong>DRC {motion.verify.drc_violations}</strong> errors <span aria-hidden="true">·</span> <strong>LVS</strong> correct</p>
    <ol className="fm-steps">{STEPS.map((s, i) => <li key={s.id} style={{ '--step': i } as React.CSSProperties}><strong>{s.title}</strong><span>{s.note}</span></li>)}</ol>
  </figure>;
}
