import { useLanguage } from './Language';
import { useEffect, useId, useRef, useState } from 'react';
import { useMotion } from './MotionSettings';
import '../styles/silicon-gate.css';

type Transition = { phase: 'closing' | 'sealed' | 'opening'; title: string; handoff: boolean };
const pageKey = (hash: string) => hash.split('/')[1] || 'home';

function DiePanel({ side }: { side: 'left' | 'right' }) {
  const id = useId().replace(/:/g, '');
  return <div className={`silicon-gate-panel silicon-gate-${side}`}><svg viewBox="0 0 600 900" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" className="gate-grid" /><circle cx="2" cy="2" r="1" className="gate-via" /></pattern></defs>
    <rect width="600" height="900" className="gate-substrate" /><rect width="600" height="900" fill={`url(#${id})`} />
    <path className="gate-bus" d="M36 0V900M64 0V900M516 0V250L554 288V612L516 650V900M536 0V230L578 272V628L536 670V900" />
    {[0, 1, 2, 3, 4, 5].map(row => <g key={row} className="gate-cell" transform={`translate(102 ${54 + row * 137})`}>
      <rect width="320" height="92" rx="5" /><rect x="14" y="14" width="292" height="64" rx="2" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(finger => <path key={finger} d={`M${35 + finger * 35} 20V72`} />)}
      <path d="M0 46H-38M320 46H360" />
    </g>)}
    {[0, 1, 2, 3, 4, 5, 6, 7].map(row => {
      const y = 85 + row * 104, end = 335 + row * 33;
      const d = `M0 ${y}H55L83 ${y + 28}H455L490 ${end}H600`;
      return <g key={row}><path className="gate-trace" d={d} /><path className="gate-signal" style={{ animationDelay: `${row * -110}ms` }} d={d} /><circle className="gate-contact" cx="490" cy={end} r="4" /></g>;
    })}
    <path className="gate-edge" d="M599 0V900" />
  </svg></div>;
}

/** Presentation-only navigation gate. No probes or product imports. */
export function SiliconGate() {
  const { t } = useLanguage();
  const { enabled } = useMotion();
  const [transition, setTransition] = useState<Transition | null>(null);
  const timers = useRef<number[]>([]);
  const active = useRef<{ navigate: () => void; hash: string; committed: boolean } | null>(null);
  useEffect(() => {
    const clear = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
    const finish = () => {
      clear(); const next = active.current; active.current = null; setTransition(null);
      if (next && !next.committed) next.navigate();
    };
    const later = (callback: () => void, delay: number) => timers.current.push(window.setTimeout(callback, delay));
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
      const target = new URL(link.href, window.location.href);
      const handoff = link.hasAttribute('data-genesis-handoff');
      const internal = target.origin === location.origin && target.pathname === location.pathname && target.search === location.search && target.hash.startsWith('#/');
      if ((!handoff && !internal) || !['http:', 'https:'].includes(target.protocol)) return;
      if (!handoff && (target.hash === location.hash || pageKey(target.hash) === pageKey(location.hash))) return;
      if (!enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault(); if (active.current) return;
      const title = handoff ? 'Loading your future' : ({ explore: 'Discover GENESIS', publications: 'Ideas into possibility', design: 'Your next design' }[pageKey(target.hash)] || 'A new perspective');
      active.current = { navigate: () => { if (handoff) location.assign(target.href); else location.hash = target.hash; }, hash: target.hash, committed: false };
      setTransition({ phase: 'closing', title, handoff });
      window.dispatchEvent(new CustomEvent('genesis:scene-change', { detail: { label: handoff ? 'Workbench handoff: Loading your future' : `Silicon gate: ${pageKey(target.hash)}` } }));
      later(() => {
        setTransition({ phase: 'sealed', title, handoff });
        if (!handoff && active.current) { active.current.committed = true; active.current.navigate(); }
      }, 420);
      later(() => {
        if (handoff) finish(); else setTransition({ phase: 'opening', title, handoff });
      }, handoff ? 1800 : 850);
      if (!handoff) later(finish, 1400);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) finish(); };
    const changed = () => {
      if (active.current && location.hash !== active.current.hash) { clear(); active.current = null; setTransition(null); }
    };
    if (!enabled) finish();
    document.addEventListener('click', click); document.addEventListener('keydown', key); window.addEventListener('hashchange', changed);
    return () => { clear(); document.removeEventListener('click', click); document.removeEventListener('keydown', key); window.removeEventListener('hashchange', changed); };
  }, [enabled]);
  if (!transition) return null;
  return <><div className="silicon-gate" data-phase={transition.phase} data-handoff={transition.handoff} aria-hidden="true">
    <DiePanel side="left" /><DiePanel side="right" /><div className="silicon-gate-seam" />
    <div className="silicon-gate-core">
      <div className="gate-chip"><svg viewBox="0 0 160 160"><path className="chip-leads" d="M0 52H44M0 80H44M0 108H44M116 52H160M116 80H160M116 108H160M52 0V44M80 0V44M108 0V44M52 116V160M80 116V160M108 116V160" /><rect className="chip-body" x="36" y="36" width="88" height="88" rx="12" /><rect className="chip-channel" x="52" y="52" width="56" height="56" rx="5" /><path className="chip-wave" d="M61 83H67L75 65L85 96L94 76H100" /></svg></div>
      <span className="gate-brand">{t("GENESIS")}</span><h2>{t(transition.title)}<span className="gate-loading-dots">.</span></h2>
      <p>{t(transition.handoff ? 'Entering your design environment' : 'Circuits. Fields. Possibility.')}</p><div className="gate-energy-track"><span /></div>
    </div>
    <div className="gate-coordinate gate-coordinate-top">{t("G / 01")} <span>{t("SILICON INTERFACE")}</span></div>
    <div className="gate-coordinate gate-coordinate-bottom"><span>{t("DESIGN WITHOUT LIMITS")}</span> {t("GENESIS")}</div>
  </div><span className="sr-only" role="status">{t(transition.title)}</span></>;
}
