import type { ReactNode } from 'react';
import optimization from '../content/story/optimization.json';
import codesign from '../content/story/codesign.json';
import simulation from '../content/story/simulation.json';
// Its own module id, so the geometry stays in this chunk while the cards read the two small fields of the same file.
import motion from '../content/story/motion.json?geometry';
// Drawn by the GENESIS design library (glyphs.py, the one symbol language), its colors as the theme's CSS variables.
import schematic from '../content/story/schematic.svg?raw';
import { assetUrl } from './ui';

/** The process cards' pictures, each drawn from its record (loaded after the page, in their own chunk): the schematic
 * of the switch in the design library's symbols, the simulated S-parameters of its traditional version (simulation.json),
 * the optimizer's designs (optimization.json) and the layout of one physical-flow chain (motion.json). */
const W = 400, H = 160;

const ROLES = [['active', 'Transistor'], ['passive', 'Inductor'], ['text', 'Interconnect line'], ['dc', 'Bias resistor'], ['active', 'Port']] as const;
function Schematic2D() {
  return <figure className="pv-schematic">
    <div className="pv-schematic-drawing" dangerouslySetInnerHTML={{ __html: schematic }} />
    <figcaption>{ROLES.map(([role, name]) => <span key={name}><i className={`pv-swatch pv-swatch-${role}${name === 'Port' ? ' pv-swatch-port' : ''}`} />{name}</span>)}</figcaption>
  </figure>;
}

/** The simulation screen: each figure of merit's band mean against its goal, then the curves over the band with the
 * goal line. Every number links to the record it comes from. */
type Curve = 'S21' | 'S31' | 'S11' | 'S22';
const RECORD = assetUrl('/assets/records/spdt-s-parameters.json');
const BAND = '1–110 GHz', TOP = '110 GHz';
/** A goal of the co-design run's record: its limit in dB and its target as written there (for example "≥ −2 dB"). */
const goal = (name: string, band: string) => {
  const row = codesign.goals.find(g => g.goal === name && g.band === band);
  if (!row) throw new Error(`no goal ${name} over ${band}`);
  return { limit: Number(row.target.replace(/[^\d.-]/g, '')), text: row.target.replace('-', '−') };
};
const FOMS: { name: string; curve: Curve }[] = [{ name: 'Transmission', curve: 'S21' }, { name: 'Isolation', curve: 'S31' }, { name: 'Input match', curve: 'S11' }, { name: 'Output match', curve: 'S22' }];
const curve = (k: Curve) => simulation[k];
const mean = (y: number[]) => y.reduce((a, b) => a + b, 0) / y.length;
const dB = (v: number) => `${v.toFixed(2).replace('-', '−')} dB`;

function Figures() {
  return <div className="pv-foms">{FOMS.map(({ name, curve: k }) => {
    const y = curve(k), m = mean(y), at = y[y.length - 1], { limit: target, text } = goal(name, BAND);
    const range = Math.ceil(Math.max(Math.abs(target), Math.abs(m)) * 1.3);
    return <div key={name} className="pv-fom">
      <span className="pv-fom-name">{name} <small>{k}</small></span>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <rect className="pv-fom-track" width={100} height={10} rx={2} />
        <rect className="pv-fom-bar" width={Math.abs(m) / range * 100} height={10} rx={2} />
        <line className="pv-fom-goal" x1={Math.abs(target) / range * 100} x2={Math.abs(target) / range * 100} y1={-2} y2={12} />
      </svg>
      <a className="pv-fom-value" href={RECORD}>{dB(m)}</a>
      <small className="pv-fom-note">band mean; <a href={RECORD}>{dB(at)}</a> at {TOP}; goal {text}</small>
    </div>;
  })}</div>;
}

const PLOTS: { title: string; curves: Curve[]; floor: number; goal: string }[] = [
  { title: 'Transmission', curves: ['S21'], floor: -4, goal: 'Transmission' },
  { title: 'Match', curves: ['S11', 'S22'], floor: -40, goal: 'Output match' },
  { title: 'Isolation', curves: ['S31'], floor: -70, goal: 'Isolation' },
];
function Curves() {
  const f = simulation.ghz, x = (i: number) => (i / (f.length - 1) * 200).toFixed(1), y = (v: number, floor: number) => (Math.min(1, v / floor) * 100).toFixed(1);
  return <div className="pv-curves">{PLOTS.map(plot => {
    const target = goal(plot.goal, BAND).limit;
    return <figure key={plot.title}>
      <figcaption>{plot.title}{plot.curves.map((k, i) => <span key={k}><i className={`pv-swatch pv-curve-${i}`} />{k}</span>)}</figcaption>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" role="img" aria-label={`${plot.curves.join(' and ')} from ${f[0]} to ${f[f.length - 1]} GHz, 0 to ${plot.floor} dB`}>
        <path className="pv-axis" d="M0.5 0V99.5H200" />
        <line className="pv-goal" x1={0} x2={200} y1={y(target, plot.floor)} y2={y(target, plot.floor)} />
        {plot.curves.map((k, i) => <path key={k} className={`pv-curve pv-curve-${i}`} pathLength={1} d={curve(k).map((v, j) => `${j ? 'L' : 'M'}${x(j)} ${y(v, plot.floor)}`).join('')} />)}
      </svg>
      <p><span>{f[0]} GHz</span><span>0 to {plot.floor.toString().replace('-', '−')} dB</span><span>{f[f.length - 1]} GHz</span></p>
    </figure>;
  })}</div>;
}

function Simulated() {
  return <div className="pv-sim"><Figures /><Curves /></div>;
}

/** One series on a fixed frame: the left and bottom axes, the curve inside. */
function Plot({ label, children, ends }: { label: string; children: ReactNode; ends: [string, string, string] }) {
  return <figure className="pv-plot"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <path className="pv-axis" d={`M0.5 0V${H - .5}H${W}`} />{children}</svg>
    <figcaption><span>{ends[0]}</span><span>{ends[2]}</span><span>{ends[1]}</span></figcaption></figure>;
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

export const VISUALS: Record<string, () => ReactNode> = { schematic: Schematic2D, simulation: Simulated, optimization: Designs, layout: Layout };
export default function ProcessVisual({ id }: { id: string }) { const Visual = VISUALS[id]; return <Visual />; }
