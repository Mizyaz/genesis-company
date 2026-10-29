import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react';
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

/** The steps side by side, one panel under them for the step shown. While the section is on screen and motion plays, a
 * bar loads across the step shown and the next step follows when it is full; pointing at or focusing the section holds
 * it. A click (or a swipe on the panel) picks a step. With less motion nothing advances on its own. */
export function ProcessCards() {
  const box = useRef<HTMLDivElement>(null), rail = useRef<HTMLDivElement>(null), { enabled } = useMotion();
  const [active, setActive] = useState(0), [onScreen, setOnScreen] = useState(false), [held, setHeld] = useState(false);
  const swipe = useRef<number | null>(null);
  const go = (i: number) => setActive((i + CARDS.length) % CARDS.length);
  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const view = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: .35 });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  // The step shown stays in view in the rail when the rail scrolls (phone), without moving the page.
  useEffect(() => {
    const strip = rail.current, tab = strip?.children[active] as HTMLElement | undefined;
    if (strip && tab && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: enabled ? 'smooth' : 'instant' });
  }, [active, enabled]);
  const down = (e: PointerEvent) => { swipe.current = e.pointerType === 'mouse' ? null : e.clientX; };
  const up = (e: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = e.clientX - swipe.current; swipe.current = null;
    if (Math.abs(dx) > 60) go(active + (dx < 0 ? 1 : -1));
  };
  return <div className="pc-stages" ref={box} data-run={enabled && onScreen && !held ? 'on' : 'off'} data-motion={enabled ? 'on' : 'off'}
    onPointerEnter={e => e.pointerType === 'mouse' && setHeld(true)} onPointerLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}>
    <div className="pc-rail" role="tablist" aria-label="Process steps" ref={rail}>
      {CARDS.map((card, i) => <button key={card.id} id={`pc-tab-${card.id}`} type="button" role="tab" aria-selected={i === active} aria-controls={`pc-panel-${card.id}`}
        tabIndex={i === active ? 0 : -1} className={i < active ? 'is-done' : undefined} onClick={() => go(i)}
        onKeyDown={e => { const next = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (next) { e.preventDefault(); go(i + next); (e.currentTarget.parentElement!.children[(i + next + CARDS.length) % CARDS.length] as HTMLElement).focus(); } }}>
        <span className="pc-num">{String(i + 1).padStart(2, '0')}</span><span className="pc-name">{card.step}</span>
        <i className="pc-load" key={i === active ? `on-${active}` : 'off'} onAnimationEnd={() => go(active + 1)} />
      </button>)}
    </div>
    {CARDS.map((card, i) => <section key={card.id} id={`pc-panel-${card.id}`} className="pc-panel" role="tabpanel" aria-labelledby={`pc-tab-${card.id}`} hidden={i !== active}
      onPointerDown={down} onPointerUp={up}>
      <div className="pc-text"><h3>{card.title}</h3><p>{card.line}</p></div>
      <div className={`pc-visual pc-visual-${card.id}`}><Suspense fallback={null}><Visual id={card.id} /></Suspense></div>
    </section>)}
  </div>;
}
