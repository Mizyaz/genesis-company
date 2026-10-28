import { useState, type ReactNode } from 'react';
import record from '../content/story/codesign.json';
import '../styles/codesign-diagram.css';

export type CoDesignStep = { id: Step; title: string; detail: string };
type Step = 'spec' | 'sizing' | 'passives' | 'simulate' | 'objective' | 'layout';
const num = (v: number) => (Math.round(v * 10) / 10).toString().replace('-', '−');
const MODES: Record<string, string> = { dc: 'DC', sp: 'S-parameters', hb: 'harmonic balance', tran: 'transient' };

/** What each block opens: the recorded run's own numbers (src/content/story/codesign.json, scripts/export-codesign-summary.mjs). */
const INFO: Record<Step, () => ReactNode> = {
  spec: () => <table><tbody>{record.goals.map(g => <tr key={g.goal + g.band}><th>{g.goal}</th><td>{g.band}</td><td>{g.target.replace('-', '−')}</td></tr>)}</tbody></table>,
  sizing: () => <>
    <p>Widths in the best design (no. {record.best} of {record.designs}).</p>
    <dl className="cdd-values">{Object.entries(record.fets).map(([fet, w]) => <div key={fet}><dt>{fet}</dt><dd>{w} µm</dd></div>)}</dl>
  </>,
  passives: () => <dl className="cdd-values">
    <div><dt>Drawn candidates</dt><dd>{record.passives.candidates}, in {record.passives.shapes} shapes</dd></div>
    <div><dt>Pixelated</dt><dd>square {record.passives.pixel_um} µm pixels on a random grid, simulated with EM</dd></div>
  </dl>,
  simulate: () => <dl className="cdd-values">{record.testbenches.map((t, i) => <div key={i}><dt>{t.modes.map(m => MODES[m] ?? m).join(' + ')}</dt><dd>{t.states} {t.states === 1 ? 'state' : 'states'}</dd></div>)}</dl>,
  objective: () => <>
    <p>{record.designs} designs; the best, no. {record.best}, has error {record.error.toFixed(4)}.</p>
    <table><thead><tr><th>Goal</th><th>Band</th><th>Target</th><th>Best</th></tr></thead><tbody>
      {record.goals.map(g => <tr key={g.goal + g.band}><th>{g.goal}</th><td>{g.band}</td><td>{g.target.replace('-', '−')}</td><td>{num(g.value)} {g.unit}</td></tr>)}
    </tbody></table>
  </>,
  layout: () => <dl className="cdd-values">
    <div><dt>DRC</dt><dd>{record.layout.drc_violations} errors</dd></div>
    <div><dt>LVS</dt><dd>{record.layout.lvs ? 'correct' : 'mismatch'}</dd></div>
  </dl>,
};

/** The co-design loop as a block diagram: the specification, then sizing, passive synthesis, simulation and the objective
 * repeated for every design, then the best design's validated layout. Pointing at, focusing or tapping a block opens its
 * numbers from the recorded run. */
export function CoDesignDiagram({ steps, repeat }: { steps: CoDesignStep[]; repeat: string }) {
  const [open, setOpen] = useState<Step>('objective');
  const shown = steps.find(s => s.id === open) ?? steps[0];
  const block = (s: CoDesignStep, i: number) => <li key={s.id}>
    <button type="button" className="cdd-block" aria-pressed={open === s.id} aria-controls="cdd-info"
      onPointerEnter={e => e.pointerType === 'mouse' && setOpen(s.id)} onFocus={() => setOpen(s.id)} onClick={() => setOpen(s.id)}>
      <span className="cdd-index">{i + 1}</span><strong>{s.title}</strong><span>{s.detail}</span>
    </button>
  </li>;
  return <div className="cdd">
    <ol className="cdd-chain">
      {block(steps[0], 0)}
      <li className="cdd-loop"><span className="cdd-loop-label">{repeat.replace('{designs}', String(record.designs))}</span><ol>{steps.slice(1, 5).map((s, i) => block(s, i + 1))}</ol></li>
      {block(steps[5], 5)}
    </ol>
    <section id="cdd-info" className="cdd-info" aria-live="polite"><h3>{shown.title}</h3>{INFO[shown.id]()}</section>
  </div>;
}
