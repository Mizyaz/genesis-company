import { lazy, Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import codesign from '../content/story/codesign.json';
// Named imports: the build keeps these two fields of the chain's record, not its geometry (ProcessVisuals loads that).
import { seconds, verify } from '../content/story/motion.json';
import { useMotion } from './MotionSettings';

const Visual = lazy(() => import('./ProcessVisuals'));
const band = codesign.goals.find(g => g.band.includes('–'))?.band ?? '';
const goals = codesign.goals.filter(g => !g.band || g.band === band);
const minutes = Math.round(Object.values(seconds as Record<string, number>).reduce((a, b) => a + b, 0) / 60);
const lvs = verify.lvs === 'LVS_CORRECT';

type Card = { id: string; step: string; title: string; line: string; visual: ReactNode };
/** The process, one card per step, each with a number or a picture from its record. */
export const CARDS: Card[] = [
  { id: 'spec', step: 'Spec', title: 'Describe the front-end you need.', line: 'Bands, targets and priorities become the goals every design is scored on.',
    visual: <div className="pc-goals">{goals.map(g => <span key={g.goal}>{g.goal} <b>{g.target.replace('-', '−')}</b></span>)}<em>{band}</em></div> },
  { id: 'schematic', step: 'Schematic', title: 'A topology on your PDK.', line: 'The circuit is drawn from your process devices, every block named.', visual: null },
  { id: 'simulation', step: 'Simulation', title: 'Simulated with parasitics.', line: 'The layout is extracted and its S-parameters simulated.', visual: null },
  { id: 'optimization', step: 'Co-optimization', title: 'Transistors and passives, sized together.', line: `${codesign.designs} designs evaluated. The best scores an error of ${codesign.error.toFixed(4)} against the goals.`, visual: null },
  { id: 'layout', step: 'Layout', title: 'Automated layout.', line: `Placement, RF and DC lines, ground tiles and density fill, in ${minutes} minutes.`, visual: null },
  { id: 'verification', step: 'Verification', title: `DRC ${verify.drc_violations} violations. LVS ${lvs ? 'correct' : 'not correct'}.`, line: `${verify.drc_rule_checks.toLocaleString('en-US')} rule checks run on the final layout.`,
    visual: <div className="pc-verdict"><p><small>DRC</small><b>{verify.drc_violations}</b><span>violations</span></p><p><small>LVS</small><b aria-hidden="true">{lvs ? '✓' : '✗'}</b><span>{lvs ? 'correct' : 'not correct'}</span></p></div> },
  { id: 'delivery', step: 'Delivery', title: 'Open it in your own design kit.', line: 'A design library in your PDK, with the reports that prove it.',
    visual: <ul className="pc-library">{['schematic', 'symbol', 'layout', 'DRC and LVS reports', 'extracted netlist and S-parameters'].map(item => <li key={item}>{item}</li>)}</ul> },
];

/** The cards rise into place one by one as they come on screen. They are visible by default: only a page that can watch
 * them (IntersectionObserver) and plays motion hides them first, so nothing stays hidden without it. A card the reader
 * has scrolled past (a jump to a later section) counts as seen. Set before the first paint, so no card shows and then hides. */
export function ProcessCards() {
  const list = useRef<HTMLOListElement>(null), { enabled } = useMotion();
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || !enabled || !('IntersectionObserver' in window)) return;
    const view = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
      entry.target.classList.add('is-in'); view.unobserve(entry.target);
    }), { rootMargin: '0px 0px -12% 0px' });
    el.dataset.reveal = 'on';
    el.querySelectorAll('.pc-card').forEach(card => view.observe(card));
    return () => { view.disconnect(); delete el.dataset.reveal; el.querySelectorAll('.pc-card').forEach(card => card.classList.remove('is-in')); };
  }, [enabled]);
  return <ol className="pc-cards" ref={list}>{CARDS.map((card, i) => <li key={card.id} className="pc-card">
    <div className="pc-text"><p className="pc-step">{String(i + 1).padStart(2, '0')} · {card.step}</p><h3>{card.title}</h3><p>{card.line}</p></div>
    <div className={`pc-visual pc-visual-${card.id}`}>{card.visual ?? <Suspense fallback={null}><Visual id={card.id} /></Suspense>}</div>
  </li>)}</ol>;
}
