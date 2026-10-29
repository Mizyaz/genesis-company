import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import codesign from '../content/story/codesign.json';
import { useMotion } from './MotionSettings';

const Visual = lazy(() => import('./ProcessVisuals'));
/** The design rule checks the flow supports, as Islam states it (10-28). */
const RULE_TYPES = 'Supports up to 20,000 types of design rule checks';

/** The strip under the film: one value and one line each, as Islam states them (10-29). */
export const CLAIMS: { value: string; line: string; href?: string }[] = [
  { value: '<\u202f30\u00a0minutes', line: 'Automated layout, from schematic to finished layout' },
  { value: '<\u202f6\u00a0hours', line: 'Full design, with circuit simulations and optimization' },
  { value: 'Up to 20,000', line: 'Types of design rule checks supported' },
  { value: 'DC to 170\u202fGHz', line: 'Designs supported over the whole range' },
];

type Card = { id: string; step: string; title: string; line: string };
/** The process, one step each: what happens, and a picture or numbers from its record. */
export const CARDS: Card[] = [
  { id: 'spec', step: 'Specification', title: 'Tell it what you need.', line: 'Band, targets and priorities. They become the goals every candidate design is scored on.' },
  { id: 'schematic', step: 'Schematic', title: 'A circuit drawn from your process.', line: 'A topology built from the devices of your PDK, every block named.' },
  { id: 'simulation', step: 'Simulation', title: 'Simulated as it will be built.', line: 'The layout is extracted with its parasitics and simulated over the whole band, every goal on the plots.' },
  { id: 'optimization', step: 'Co-optimization', title: 'Transistors and passives, sized together.', line: `Every candidate is scored against the goals and the best is kept: ${codesign.designs} designs, best error ${codesign.error.toFixed(4)}.` },
  { id: 'layout', step: 'Layout', title: 'Automated layout.', line: 'Placement, RF lines, bias lines, ground tiles and density fill, all from the schematic.' },
  { id: 'verification', step: 'Verification', title: 'Checked against the rules of your process.', line: `${RULE_TYPES}. Every finished layout goes through DRC (design rule check) and LVS (layout versus schematic).` },
  { id: 'delivery', step: 'Delivery', title: 'Open it in your own design kit.', line: 'A design library in your PDK: layout, schematic, symbol and the reports that prove it.' },
];

/** Phones (and narrow windows) get the steps one under another. */
const NARROW = '(max-width: 1100px)';
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia?.(NARROW).matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.(NARROW);
    if (!query) return;
    const change = () => setNarrow(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return narrow;
}

const num = (i: number) => String(i + 1).padStart(2, '0');

/** Every step at once, each with its title and line: side by side on a wide screen, with the picture of the step shown
 * under them, and one under another on a phone, each with its own picture. The step shown glows with a bar loading
 * across its top. Wide: while the section is on screen and motion plays, the next step follows when the bar is full;
 * pointing at or focusing the section holds it, a click picks a step. Phone: the step in the middle of the screen is
 * the one shown. With less motion nothing advances on its own. */
export function ProcessCards() {
  const box = useRef<HTMLDivElement>(null), { enabled } = useMotion(), narrow = useNarrow();
  const [active, setActive] = useState(0), [onScreen, setOnScreen] = useState(false), [held, setHeld] = useState(false);
  const go = (i: number) => setActive((i + CARDS.length) % CARDS.length);
  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const view = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: narrow ? 0 : .35 });
    view.observe(el);
    return () => view.disconnect();
  }, [narrow]);
  // On a phone the step crossing the middle of the screen is the step shown.
  useEffect(() => {
    const el = box.current;
    if (!narrow || !el || !('IntersectionObserver' in window)) return;
    const view = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && setActive(Number((entry.target as HTMLElement).dataset.step))),
      { rootMargin: '-45% 0px -45% 0px' });
    el.querySelectorAll('.pc-step').forEach(step => view.observe(step));
    return () => view.disconnect();
  }, [narrow]);
  const visual = (id: string) => <div className={`pc-visual pc-visual-${id}`}><Suspense fallback={null}><Visual id={id} /></Suspense></div>;
  if (narrow) return <div className="pc-stages is-narrow" ref={box} data-run={enabled && onScreen ? 'on' : 'off'} data-motion={enabled ? 'on' : 'off'}>
    <ol className="pc-flow" aria-label="Process steps">
      {CARDS.map((card, i) => <li key={card.id} className={`pc-step${i === active ? ' is-active' : i < active ? ' is-done' : ''}`} data-step={i} aria-current={i === active ? 'step' : undefined}>
        <i className="pc-load" key={i === active ? `on-${active}` : 'off'} />
        <span className="pc-num">{num(i)}</span><span className="pc-name">{card.step}</span>
        <h3>{card.title}</h3><p>{card.line}</p>
        {visual(card.id)}
      </li>)}
    </ol>
  </div>;
  const shown = CARDS[active];
  return <div className="pc-stages" ref={box} data-run={enabled && onScreen && !held ? 'on' : 'off'} data-motion={enabled ? 'on' : 'off'}
    onPointerEnter={e => e.pointerType === 'mouse' && setHeld(true)} onPointerLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}>
    <div className="pc-rail" role="tablist" aria-label="Process steps">
      {CARDS.map((card, i) => <button key={card.id} id={`pc-tab-${card.id}`} type="button" role="tab" aria-selected={i === active} aria-controls="pc-panel"
        tabIndex={i === active ? 0 : -1} className={i < active ? 'is-done' : undefined} onClick={() => go(i)}
        onKeyDown={e => { const next = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (next) { e.preventDefault(); go(i + next); (e.currentTarget.parentElement!.children[(i + next + CARDS.length) % CARDS.length] as HTMLElement).focus(); } }}>
        <i className="pc-load" key={i === active ? `on-${active}` : 'off'} onAnimationEnd={() => go(active + 1)} />
        <span className="pc-num">{num(i)}</span><span className="pc-name">{card.step}</span>
        <strong className="pc-title">{card.title}</strong><span className="pc-line">{card.line}</span>
      </button>)}
    </div>
    <section id="pc-panel" key={shown.id} className="pc-panel" role="tabpanel" aria-labelledby={`pc-tab-${shown.id}`}>{visual(shown.id)}</section>
  </div>;
}
