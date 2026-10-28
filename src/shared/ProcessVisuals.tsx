import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import optimization from '../content/story/optimization.json';
import codesign from '../content/story/codesign.json';
import simulation from '../content/story/simulation.json';
import verification from '../content/story/verification.json';
// Its own module id, so the geometry stays in this chunk while the cards read the two small fields of the same file.
import motion from '../content/story/motion.json?geometry';
// Drawn by the GENESIS design library (glyphs.py, the one symbol language), its colors as the theme's CSS variables.
import schematic from '../content/story/schematic.svg?raw';
import symbol from '../content/story/symbol.svg?raw';
import { assetUrl } from './ui';

/** The process cards' pictures, each drawn from its record (loaded after the page, in their own chunk): the
 * specification (codesign.json), the schematic and symbol of the switch in the design library's symbols, the simulated
 * S-parameters of its traditional version (simulation.json), the optimizer's designs (optimization.json), the layout of
 * one physical-flow chain (motion.json) and the DRC and LVS reports of that layout (verification.json). */
const W = 400, H = 160;
const BAND = '1–110 GHz', TOP = '110 GHz';
const minus = (s: string) => s.split('-').join('−');

/** A goal of the co-design run's record: its limit in dB, its target as written there and whether it is a floor. */
const goal = (name: string, band: string) => {
  const row = codesign.goals.find(g => g.goal === name && g.band === band);
  if (!row) throw new Error(`no goal ${name} over ${band}`);
  return { limit: Number(row.target.replace(/[^\d.-]/g, '')), text: minus(row.target), floor: row.target.startsWith('≥') };
};

const TESTS: Record<string, string> = { sp: 'S-parameters', dc: 'bias point', hb: 'harmonic balance', tran: 'transient' };
const FIGURES = ['Transmission', 'Isolation', 'Input match', 'Output match'];
/** The specification as the co-design run took it in: the band, every goal over the band and at its top, the
 * compression point and the testbenches each design runs. */
function Specification() {
  const p1 = codesign.goals.find(g => g.goal === 'P1dB');
  return <figure className="pv-spec">
    <div className="pv-sheet">
      <p className="pv-sheet-head"><b>Specification</b><span>Single-pole double-throw switch</span></p>
      <table>
        <thead><tr><th scope="col">Goal</th><th scope="col">{BAND}</th><th scope="col">At {TOP}</th></tr></thead>
        <tbody>
          {FIGURES.map(name => <tr key={name}><th scope="row">{name}</th><td>{goal(name, BAND).text}</td><td>{goal(name, TOP).text}</td></tr>)}
          {p1 && <tr><th scope="row">1 dB compression point</th><td colSpan={2}>{minus(p1.target)}</td></tr>}
        </tbody>
      </table>
      <p className="pv-sheet-tests">Testbenches: {codesign.testbenches.map(t => `${t.modes.map(m => TESTS[m] ?? m).join(' and ')} in ${t.states} switch ${t.states === 1 ? 'state' : 'states'}`).join(' · ')}</p>
    </div>
    <div className="pv-intake" aria-hidden="true">
      <svg viewBox="0 0 60 24"><path className="pv-intake-arrow" d="M2 12H52M44 4l8 8-8 8" /></svg>
      <p><b>{codesign.designs}</b><span>designs scored on these goals</span></p>
    </div>
  </figure>;
}

const ROLES = [['active', 'Transistor'], ['passive', 'Inductor'], ['text', 'Interconnect line'], ['dc', 'Bias resistor'], ['active', 'Port']] as const;
function Schematic2D() {
  return <figure className="pv-schematic">
    <div className="pv-schematic-drawing" dangerouslySetInnerHTML={{ __html: schematic }} />
    <figcaption>{ROLES.map(([role, name]) => <span key={name}><i className={`pv-swatch pv-swatch-${role}${name === 'Port' ? ' pv-swatch-port' : ''}`} />{name}</span>)}</figcaption>
  </figure>;
}

/** The simulation screen: each figure of merit over the band on its own axes, with the goal region shaded, the band
 * mean and the value at the top of the band written on the plot, and a readout under the pointer. Every number links
 * to the record it comes from. */
type Curve = 'S21' | 'S31' | 'S11' | 'S22';
const RECORD = assetUrl('/assets/records/spdt-s-parameters.json');
const NAME: Record<Curve, string> = { S21: 'Transmission', S31: 'Isolation', S11: 'Input match', S22: 'Output match' };
const dB = (v: number) => `${minus(v.toFixed(2))} dB`;
const mean = (y: number[]) => y.reduce((a, b) => a + b, 0) / y.length;
type Chart = { title: string; curves: Curve[]; range: [number, number]; step: number; legend: 'top' | 'bottom' };
const CHARTS: Chart[] = [
  { title: 'Transmission', curves: ['S21'], range: [-4, 0], step: 1, legend: 'bottom' },
  { title: 'Match', curves: ['S11', 'S22'], range: [-30, 0], step: 5, legend: 'top' },
  { title: 'Isolation', curves: ['S31'], range: [-80, 0], step: 10, legend: 'top' },
];
const GHZ = simulation.ghz, F0 = GHZ[0], F1 = GHZ[GHZ.length - 1], X_TICKS = [1, 20, 40, 60, 80, 100];
const M = { l: 40, r: 14, t: 10, b: 38 };

/** The plot's width follows its box, so the ticks and labels keep their size on every screen. */
function useWidth() {
  const box = useRef<HTMLDivElement>(null), [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (!('ResizeObserver' in window)) return;
    const view = new ResizeObserver(measure);
    view.observe(el);
    return () => view.disconnect();
  }, []);
  return [box, width] as const;
}

function SParameterChart({ chart }: { chart: Chart }) {
  const [box, width] = useWidth(), [at, setAt] = useState<number | null>(null);
  const height = 190, pw = Math.max(0, width - M.l - M.r), ph = height - M.t - M.b, [lo, hi] = chart.range;
  const x = (f: number) => M.l + (f - F0) / (F1 - F0) * pw;
  const y = (v: number) => M.t + (hi - Math.min(hi, Math.max(lo, v))) / (hi - lo) * ph;
  const ticks = Array.from({ length: Math.round((hi - lo) / chart.step) + 1 }, (_, i) => hi - i * chart.step);
  const series = chart.curves.map((k, i) => {
    const values = simulation[k], g = goal(NAME[k], BAND);
    return { k, i, values, mean: mean(values), top: values[values.length - 1], goal: g };
  });
  const pick = (clientX: number, rect: DOMRect) => {
    const f = F0 + (clientX - rect.left - M.l) / pw * (F1 - F0);
    let best = 0;
    GHZ.forEach((g, i) => { if (Math.abs(g - f) < Math.abs(GHZ[best] - f)) best = i; });
    setAt(best);
  };
  // A goal's label sits on the side of its line away from the curves, where they pass farthest from it (clear of a legend on top).
  const labelAt = (g: { limit: number; floor: boolean }) => {
    if (chart.legend === 'top' && !g.floor) return .6;
    const text = g.floor ? g.limit - (hi - lo) / 12 : g.limit + (hi - lo) / 12;
    const gap = (at: number) => Math.min(...series.map(o => Math.abs(o.values[Math.round(at * (GHZ.length - 1))] - text)));
    return gap(.3) > gap(.6) ? .3 : .6;
  };
  const label = `${chart.title}: ${series.map(s => `${s.k} from ${F0} to ${F1} GHz, band mean ${dB(s.mean)}, ${dB(s.top)} at ${TOP}, goal ${s.goal.text}`).join('; ')}`;
  return <figure className="pv-chart">
    <figcaption>{chart.title}</figcaption>
    <div className="pv-chart-box" ref={box} style={{ minHeight: height }}>
      <dl className={`pv-legend pv-legend-${chart.legend}`} style={{ left: M.l + 8 }}>
        {series.map(s => <div key={s.k}>
          <dt><i className={`pv-swatch pv-curve-${s.i}`} />{s.k} {NAME[s.k].toLowerCase()}</dt>
          <dd>band mean <a href={RECORD}>{dB(s.mean)}</a></dd>
        </div>)}
      </dl>
      {width > 0 && <svg width={width} height={height} role="img" aria-label={label}
        onPointerMove={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())} onPointerLeave={() => setAt(null)}>
        {series.map(s => s.goal.floor
          ? <rect key={`r${s.k}`} className={`pv-pass pv-pass-${s.i}`} x={M.l} width={pw} y={y(hi)} height={y(s.goal.limit) - y(hi)} />
          : <rect key={`r${s.k}`} className={`pv-pass pv-pass-${s.i}`} x={M.l} width={pw} y={y(s.goal.limit)} height={y(lo) - y(s.goal.limit)} />)}
        <g className="pv-grid">
          {ticks.map(v => <line key={`y${v}`} x1={M.l} x2={M.l + pw} y1={y(v)} y2={y(v)} />)}
          {X_TICKS.map(f => <line key={`x${f}`} x1={x(f)} x2={x(f)} y1={M.t} y2={M.t + ph} />)}
        </g>
        <g className="pv-ticks">
          {ticks.map(v => <text key={`y${v}`} x={M.l - 6} y={y(v) + 4} textAnchor="end">{minus(String(v))}</text>)}
          {X_TICKS.map(f => <text key={`x${f}`} x={x(f)} y={M.t + ph + 15} textAnchor="middle">{f}</text>)}
          <text className="pv-axis-title" x={M.l + pw / 2} y={height - 4} textAnchor="middle">Frequency (GHz)</text>
          <text className="pv-axis-title" x={4} y={M.t + ph / 2} textAnchor="middle" transform={`rotate(-90 4 ${M.t + ph / 2})`} dominantBaseline="hanging">dB</text>
        </g>
        <path className="pv-axis" d={`M${M.l + .5} ${M.t}V${M.t + ph + .5}H${M.l + pw}`} />
        {series.map(s => <g key={`g${s.k}`}>
          <line className={`pv-goal pv-goal-${s.i}`} x1={M.l} x2={M.l + pw} y1={y(s.goal.limit)} y2={y(s.goal.limit)} />
          <text className="pv-goal-text" x={M.l + pw * labelAt(s.goal)} y={y(s.goal.limit) + (s.goal.floor ? 13 : -5)} textAnchor="middle">{chart.curves.length > 1 ? `${s.k} ` : ''}goal {s.goal.text}</text>
          <line className={`pv-mean pv-curve-${s.i}`} x1={M.l} x2={M.l + pw} y1={y(s.mean)} y2={y(s.mean)} />
        </g>)}
        {series.map(s => <path key={`c${s.k}`} className={`pv-curve pv-curve-${s.i}`} pathLength={1}
          d={s.values.map((v, j) => `${j ? 'L' : 'M'}${x(GHZ[j]).toFixed(1)} ${y(v).toFixed(1)}`).join('')} />)}
        {series.map(s => <g key={`m${s.k}`} className={`pv-marker pv-curve-${s.i}`}>
          <circle cx={x(F1)} cy={y(s.top)} r={4} />
          <text x={x(F1) - 8} y={y(s.top) + (s.top < Math.max(...series.map(o => o.top)) ? 15 : -8)} textAnchor="end">{dB(s.top)}</text>
        </g>)}
        {at !== null && <g className="pv-cursor">
          <line x1={x(GHZ[at])} x2={x(GHZ[at])} y1={M.t} y2={M.t + ph} />
          {series.map(s => <circle key={s.k} className={`pv-curve-${s.i}`} cx={x(GHZ[at])} cy={y(s.values[at])} r={3.5} />)}
        </g>}
      </svg>}
      {at !== null && <p className="pv-readout" style={{ left: Math.min(Math.max(x(GHZ[at]) + 10, M.l), width - 150) }}>
        <b>{GHZ[at]} GHz</b>{series.map(s => <span key={s.k}>{s.k} {dB(s.values[at])}</span>)}
      </p>}
    </div>
  </figure>;
}

function Simulated() {
  return <div className="pv-sim">
    {CHARTS.map(chart => <SParameterChart key={chart.title} chart={chart} />)}
    <p className="pv-sim-source">Extracted layout with electromagnetic simulation, output 2 switched on, {simulation.ghz.length} frequency points. <a href={RECORD}>The S-parameter record</a></p>
  </div>;
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
function Layout({ label = "The switch's verified layout" }: { label?: string }) {
  const tiles = motion.tiles.map(([x, y, w, h]) => [x + 1.2, y + 1.2, x + w - 1.2, y + h - 1.2]);
  const nets = new Map<number, Box[]>();
  for (const box of motion.dc) nets.set(box[4], [...nets.get(box[4]) ?? [], box]);
  return <svg viewBox={`0 0 ${DW} ${DH}`} role="img" aria-label={label}>
    <rect className="pv-die" width={DW} height={DH} rx={4} />
    <path className="pv-tile" d={rects(tiles)} />
    <path className="pv-fill" d={rects(motion.fill)} />
    {motion.blocks.map(block => <path key={block.name} className="pv-block" d={rects(block.members.map(m => m.box))} />)}
    {motion.rf.map((line, i) => <path key={i} className="pv-rf" strokeWidth={line.width} d={line.path.map(([x, y], j) => `${j ? 'L' : 'M'}${px(x)} ${py(y)}`).join('')} />)}
    {[...nets.values()].map((boxes, i) => <path key={i} className="pv-dc" d={rects(boxes)} />)}
  </svg>;
}

/** The verified layout with the summary of its DRC and LVS reports: a check sweeps the layout, the report beside it. */
const { drc, lvs } = verification;
const correct = (result: string) => result === 'CORRECT';
function Verified() {
  const rows = [['Ports', lvs.matched.ports], ['Nets', lvs.matched.nets], ['Instances', lvs.matched.instances]] as const;
  return <div className="pv-verify">
    <div className="pv-verify-layout"><Layout label="The layout the reports check" /><span className="pv-scan" aria-hidden="true" /></div>
    <div className="pv-report">
      <section>
        <p className="pv-report-head">Design rule check<b className={drc.results ? 'is-bad' : 'is-good'}>{drc.results} results</b></p>
        <dl><dt>Rule checks run</dt><dd>{drc.rule_checks.toLocaleString('en-US')}</dd><dt>Results generated</dt><dd>{drc.results}</dd></dl>
      </section>
      <section>
        <p className="pv-report-head">Layout versus schematic<b className={correct(lvs.result) ? 'is-good' : 'is-bad'}>{correct(lvs.result) ? 'correct' : 'not correct'}</b></p>
        <table>
          <thead><tr><th scope="col">Objects</th><th scope="col">Layout</th><th scope="col">Schematic</th><th scope="col">Unmatched</th></tr></thead>
          <tbody>{rows.map(([name, row]) => <tr key={name}><th scope="row">{name}</th><td>{row.layout}</td><td>{row.source}</td><td>{row.unmatched}</td></tr>)}</tbody>
        </table>
        <ul>{lvs.cells.map(c => <li key={c.cell} className={correct(c.result) ? 'is-good' : 'is-bad'}>{c.cell}<span>{correct(c.result) ? 'correct' : 'not correct'}</span></li>)}</ul>
      </section>
    </div>
  </div>;
}

/** The delivered design library as a library browser: its cells, the views of the top cell (each one shown on
 * request) and the reports that go with it. */
const VIEWS = [
  { id: 'layout', name: 'layout', show: () => <Layout label="Layout view of the switch" /> },
  { id: 'schematic', name: 'schematic', show: () => <div className="pv-svg" dangerouslySetInnerHTML={{ __html: schematic }} /> },
  { id: 'symbol', name: 'symbol', show: () => <div className="pv-svg pv-symbol" dangerouslySetInnerHTML={{ __html: symbol }} /> },
] as const;
function Delivery() {
  const [view, setView] = useState<string>('layout'), shown = VIEWS.find(v => v.id === view) ?? VIEWS[0];
  const blocks = lvs.cells.filter(c => c.cell !== 'whole layout');
  return <div className="pv-library">
    <nav className="pv-lib-tree" aria-label="Design library">
      <p className="pv-lib-label">Design library</p>
      <ul>
        <li className="pv-lib-cell is-open"><span>switch</span>
          <ul className="pv-lib-views">{VIEWS.map(v => <li key={v.id}><button type="button" aria-pressed={v.id === view} onClick={() => setView(v.id)}>{v.name}</button></li>)}</ul>
        </li>
        {blocks.map(b => <li key={b.cell} className="pv-lib-cell"><span>{b.cell}</span></li>)}
      </ul>
      <p className="pv-lib-label">Reports</p>
      <ul className="pv-lib-reports">
        <li>DRC report<span>{drc.results} results</span></li>
        <li>LVS report<span>{correct(lvs.result) ? 'correct' : 'not correct'}</span></li>
        <li>extracted netlist</li>
        <li><a href={RECORD}>S-parameters</a><span>{simulation.ghz.length} points</span></li>
      </ul>
    </nav>
    <figure className="pv-lib-view">{shown.show()}<figcaption>switch · {shown.name}</figcaption></figure>
  </div>;
}

export const VISUALS: Record<string, () => ReactNode> = { spec: Specification, schematic: Schematic2D, simulation: Simulated, optimization: Designs, layout: () => <Layout />, verification: Verified, delivery: Delivery };
export default function ProcessVisual({ id }: { id: string }) { const Visual = VISUALS[id]; return <Visual />; }
