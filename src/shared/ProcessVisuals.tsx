import type { ReactNode } from 'react';
import analysis from '../content/story/analysis.json';
import optimization from '../content/story/optimization.json';
// Its own module id, so the geometry stays in this chunk while the cards read the two small fields of the same file.
import motion from '../content/story/motion.json?geometry';
import { Schematic, type Drawing } from './story/Schematic';

/** The process cards' pictures, each drawn from its record (loaded after the page, in their own chunk):
 * the schematic and layout of one physical-flow chain (motion.json), the extracted S21 (analysis.json) and the
 * optimizer's designs (optimization.json). */
const INK = { wire: 'var(--flow-cyan)', text: 'var(--text)', muted: 'var(--muted)', page: 'var(--surface)' };
const W = 400, H = 160;

function Schematic2D() {
  return <svg viewBox="0 0 420 220" role="img" aria-label="The switch's schematic">
    <Schematic drawing={motion.schematic as Drawing} width={420} height={220} t={1} labels={false} ink={INK} /></svg>;
}

/** One series on a fixed frame: the left and bottom axes, the curve inside. */
function Plot({ label, children, ends }: { label: string; children: ReactNode; ends: [string, string, string] }) {
  return <figure className="pv-plot"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <path className="pv-axis" d={`M0.5 0V${H - .5}H${W}`} />{children}</svg>
    <figcaption><span>{ends[0]}</span><span>{ends[2]}</span><span>{ends[1]}</span></figcaption></figure>;
}

function Extracted() {
  const pex = analysis.sparams.panels[0].series.find(s => s.label === 'PEX')!, x0 = pex.x[0], x1 = pex.x[pex.x.length - 1];
  const lo = Math.min(...pex.y), hi = Math.max(...pex.y), pad = (hi - lo) * .15;
  const d = pex.x.map((x, i) => `${i ? 'L' : 'M'}${((x - x0) / (x1 - x0) * (W - 8) + 4).toFixed(1)} ${(8 + (hi + pad - pex.y[i]) / (hi - lo + 2 * pad) * (H - 16)).toFixed(1)}`).join('');
  const label = `S21 with parasitics, ${hi.toFixed(2)} to ${lo.toFixed(2)} dB`;
  return <Plot label={`${label}, ${x0} to ${x1} GHz`} ends={[`${x0} GHz`, `${x1} GHz`, label]}><path className="pv-line" d={d} /></Plot>;
}

function Designs() {
  const errors = optimization.run.map(r => r.error), lg = Math.log10, lo = lg(Math.min(...errors)), hi = lg(Math.max(...errors));
  const x = (i: number) => (4 + i / (errors.length - 1) * (W - 8)).toFixed(1), y = (e: number) => (8 + (hi - lg(e)) / (hi - lo) * (H - 16)).toFixed(1);
  let best = Infinity;
  const steps = errors.map((e, i) => `${i ? 'L' : 'M'}${x(i)} ${y(best = Math.min(best, e))}`).join('');
  return <Plot label={`Error of each of the ${errors.length} designs, log scale, with the best so far`} ends={['design 1', `design ${errors.length}`, 'error, log scale; line: best so far']}>
    <g className="pv-dots">{errors.map((e, i) => <circle key={i} cx={x(i)} cy={y(e)} r={2.2} />)}</g><path className="pv-line" d={steps} /></Plot>;
}

type Box = number[];
const [X0, Y0, X1, Y1] = motion.die, DW = X1 - X0, DH = Y1 - Y0;
const px = (x: number) => +(x - X0).toFixed(1), py = (y: number) => +(Y1 - y).toFixed(1);
const rects = (boxes: Box[]) => boxes.map(([a, b, c, d]) => `M${px(a)} ${py(d)}h${+(c - a).toFixed(1)}v${+(d - b).toFixed(1)}h${-(c - a).toFixed(1)}z`).join('');

/** The finished layout of the chain the flow card times: ground tiles, density fill, the blocks, then the RF and DC lines on top. */
function Layout() {
  const tiles = motion.tiles.map(([x, y, w, h]) => [x + 1.2, y + 1.2, x + w - 1.2, y + h - 1.2]);
  const nets = new Map<number, Box[]>();
  for (const box of motion.dc) nets.set(box[4], [...nets.get(box[4]) ?? [], box]);
  return <svg viewBox={`0 0 ${DW} ${DH}`} role="img" aria-label="The switch's verified layout">
    <rect className="pv-die" width={DW} height={DH} rx={4} />
    <path className="pv-tile" d={rects(tiles)} />
    <path className="pv-fill" d={rects(motion.fill)} />
    {motion.blocks.map(block => <path key={block.name} className="pv-block" d={rects(block.members.map(m => m.box))} />)}
    {motion.rf.map((line, i) => <path key={i} className="pv-rf" strokeWidth={line.width} d={line.path.map(([x, y], j) => `${j ? 'L' : 'M'}${px(x)} ${py(y)}`).join('')} />)}
    {[...nets.values()].map((boxes, i) => <path key={i} className="pv-dc" d={rects(boxes)} />)}
  </svg>;
}

export const VISUALS: Record<string, () => ReactNode> = { schematic: Schematic2D, simulation: Extracted, optimization: Designs, layout: Layout };
export default function ProcessVisual({ id }: { id: string }) { const Visual = VISUALS[id]; return <Visual />; }
