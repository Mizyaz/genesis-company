import { lazy, Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import codesign from '../content/story/codesign.json';
// The published timing record of the chain the layout card draws (scripts/export-chain-timing.mjs): wall seconds per
// stage, launch included, and the DRC and LVS result.
import timing from '../../public/assets/records/layout-timing.json';
import { useMotion } from './MotionSettings';
import { assetUrl } from './ui';

const Visual = lazy(() => import('./ProcessVisuals'));
const band = codesign.goals.find(g => g.band.includes('–'))?.band ?? '';
/** The layout in minutes with one decimal: every stage (the record leaves out the DRC and LVS run, not our tool's time). */
const minutes = timing.stages.reduce((a, s) => a + s.seconds, 0) / 60;
const min = (m: number) => `${m.toFixed(1)} minutes`;
const { drc } = timing, lvs = timing.lvs === 'LVS_CORRECT';
/** The design rule checks the flow supports, as Islam states it (10-28). */
const RULE_TYPES = 'Supports up to 20,000 types of design rule checks';
const TIMING = assetUrl('/assets/records/layout-timing.json');

/** The strip under the film: one value and one line each, every value computed from the records the cards show. */
export const CLAIMS: { value: string; line: string; href?: string }[] = [
  { value: min(minutes), line: 'Automated layout, from schematic to finished layout', href: TIMING },
  { value: `${drc.violations} DRC violations`, line: `LVS ${lvs ? 'correct' : 'not correct'} on the finished layout`, href: TIMING },
  { value: 'Up to 20,000', line: 'Types of design rule checks supported' },
  { value: `${codesign.designs} designs`, line: 'In one co-design run' },
  { value: band.replace(' GHz', '\u202fGHz'), line: 'Every goal scored over the band' },
];

type Card = { id: string; step: string; title: string; line: string; visual: ReactNode };
/** The process, one card per step, each with a number or a picture from its record. */
export const CARDS: Card[] = [
  { id: 'spec', step: 'Specification', title: 'Describe the front-end you need.', line: 'Bands, targets and priorities become the goals every design is scored on.', visual: null },
  { id: 'schematic', step: 'Schematic', title: 'A topology on your PDK.', line: 'The circuit is drawn from your process devices, every block named.', visual: null },
  { id: 'simulation', step: 'Simulation', title: 'Simulated with parasitics.', line: 'The layout is extracted and its S-parameters simulated.', visual: null },
  { id: 'optimization', step: 'Co-optimization', title: 'Transistors and passives, sized together.', line: `${codesign.designs} designs evaluated. The best scores an error of ${codesign.error.toFixed(4)} against the goals.`, visual: null },
  { id: 'layout', step: 'Layout', title: 'Automated layout.', line: `Placement, RF lines and bias lines, ground tiles and density fill. Design A in ${min(minutes)}.`, visual: null },
  { id: 'verification', step: 'Verification', title: `DRC ${drc.violations} violations. LVS ${lvs ? 'correct' : 'not correct'}.`, line: `${RULE_TYPES}. DRC and LVS run on every finished layout.`, visual: null },
  { id: 'delivery', step: 'Delivery', title: 'Open it in your own design kit.', line: 'A design library in your PDK, with the reports that prove it.', visual: null },
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
