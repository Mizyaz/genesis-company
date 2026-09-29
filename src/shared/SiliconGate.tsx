import { useLanguage } from './Language';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useMotion } from './MotionSettings';
import { gateJobs, settleGate, subscribeGate } from './gate';
import '../styles/silicon-gate.css';

// boot, unboot: the first load (the cover the HTML shows, then a fade); closing, sealed, opening: the die panels.
type Phase = 'boot' | 'unboot' | 'closing' | 'sealed' | 'opening';
type Gate = { phase: Phase; title: string; subtitle: string; handoff: boolean };
const pageKey = (hash: string) => hash.split('/')[1] || 'home';
const pageTitle = (hash: string) => ({ explore: 'Discover GENESIS', publications: 'Ideas into possibility', design: 'Your next design' } as Record<string, string>)[pageKey(hash)] || 'A new perspective';
const PAGE_LINE = 'Circuit design. Simulation. Optimization.';
const CLOSE = 420, OPEN = 520, HOLD = 260;

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

/** The one loading screen of the site: every page change (links, code, back and forward), the first load and every
 * wait that asks for it through `gate.ts`. Presentation-only navigation gate. No probes or product imports. */
export function SiliconGate() {
  const { t } = useLanguage();
  const { enabled } = useMotion();
  const still = !enabled || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const jobs = useSyncExternalStore(subscribeGate, gateJobs);
  const [gate, setGate] = useState<Gate | null>(() => still ? null : { phase: 'boot', title: '', subtitle: '', handoff: false });
  const current = useRef(gate);
  const quiet = useRef(still);
  quiet.current = still;
  const sealedAt = useRef(0);
  const whenSealed = useRef<(() => void)[]>([]);
  const timers = useRef<number[]>([]);
  const navTimers = useRef<number[]>([]);
  const active = useRef<{ navigate: () => void; hash: string; committed: boolean } | null>(null);
  const page = useRef(location.hash);

  const pending = () => gateJobs().some(job => job.state === 'pending');
  const show = (next: Gate | null) => {
    current.current = next; setGate(next);
    if (next?.phase === 'sealed') { sealedAt.current = performance.now(); whenSealed.current.splice(0).forEach(run => run()); }
  };
  const later = (run: () => void, delay: number, bucket = timers) => { bucket.current.push(window.setTimeout(run, delay)); };
  const close = (title: string, subtitle: string, handoff = false) => {
    const held = current.current;
    if (held && held.phase !== 'opening' && held.phase !== 'unboot') { show({ ...held, title, subtitle, handoff, phase: held.phase === 'boot' ? 'sealed' : held.phase }); return; }
    if (quiet.current) { show({ phase: 'sealed', title, subtitle, handoff }); return; }
    show({ phase: 'closing', title, subtitle, handoff });
    later(() => { if (current.current?.phase === 'closing') show({ ...current.current, phase: 'sealed' }); }, CLOSE);
  };
  const open = () => {
    const held = current.current;
    if (!held || pending()) return;
    if (quiet.current) { show(null); return; }
    show({ ...held, phase: 'opening' });
    later(() => { if (current.current?.phase === 'opening') show(null); }, OPEN);
  };

  // The first load: the page is drawn under the same cover the HTML showed before the app started, then the cover fades.
  useEffect(() => {
    if (current.current?.phase !== 'boot') return;
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => later(() => {
      if (current.current?.phase !== 'boot') return;
      show({ ...current.current, phase: 'unboot' });
      later(() => { if (current.current?.phase === 'unboot') show(null); }, 480);
    }, 120)); });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Waits: close for the first pending job (after its delay), open once every job is done and the gate has been seen.
  useEffect(() => {
    const waiting = jobs.filter(job => job.state === 'pending'), done = jobs.filter(job => job.state === 'done');
    if (waiting.length) {
      const job = waiting[0], held = current.current;
      const timer = window.setTimeout(() => close(job.title, job.subtitle ?? PAGE_LINE), held && held.phase !== 'opening' && held.phase !== 'unboot' ? 0 : job.delay ?? 0);
      return () => window.clearTimeout(timer);
    }
    if (!done.length) return;
    const finished = () => { settleGate(done); done.forEach(job => job.reveal?.()); open(); };
    const held = current.current;
    if (!held || held.phase === 'opening' || held.phase === 'boot' || held.phase === 'unboot') { settleGate(done); done.forEach(job => job.reveal?.()); return; }
    if (held.phase === 'closing') { whenSealed.current.push(() => later(finished, HOLD)); return; }
    later(finished, Math.max(0, sealedAt.current + HOLD - performance.now()));
  }, [jobs]);

  useEffect(() => {
    const clearNav = () => { navTimers.current.forEach(window.clearTimeout); navTimers.current = []; };
    const finish = () => {
      clearNav(); const next = active.current; active.current = null;
      if (next && !next.committed) next.navigate();
      if (!pending() && current.current?.phase !== 'boot' && current.current?.phase !== 'unboot') show(null);
    };
    const go = (hash: string, href: string, handoff: boolean) => {
      const navigateNow = () => { if (handoff) location.assign(href); else location.hash = hash; };
      if (!enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) { navigateNow(); return; }
      if (active.current) return;
      const title = handoff ? 'Loading your future' : pageTitle(hash);
      active.current = { navigate: navigateNow, hash, committed: false };
      close(title, handoff ? 'Entering your design environment' : PAGE_LINE, handoff);
      window.dispatchEvent(new CustomEvent('genesis:scene-change', { detail: { label: handoff ? 'Workbench handoff: Loading your future' : `Silicon gate: ${pageKey(hash)}` } }));
      later(() => { if (!handoff && active.current) { active.current.committed = true; active.current.navigate(); } }, CLOSE, navTimers);
      later(() => { if (handoff) finish(); else open(); }, handoff ? 1800 : 850, navTimers);
      if (!handoff) later(finish, 1400, navTimers);
    };
    // Links: any internal page change, and the workbench handoff.
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
      event.preventDefault();
      go(target.hash, target.href, handoff);
    };
    // Code: `navigate()` from gate.ts takes the same way as a link.
    const requested = (event: Event) => {
      const hash = (event as CustomEvent<string>).detail;
      event.preventDefault();
      if (hash === location.hash) return;
      if (pageKey(hash) === pageKey(location.hash)) { location.hash = hash; return; }
      go(hash, hash, false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) finish(); };
    // Back, forward or a typed address: the new page is already drawn under the sealed gate, which then opens.
    const changed = () => {
      const previous = page.current; page.current = location.hash;
      if (active.current) {
        if (location.hash !== active.current.hash) { clearNav(); active.current = null; if (!pending()) show(null); }
        return;
      }
      if (pageKey(previous) === pageKey(location.hash) || !enabled || matchMedia('(prefers-reduced-motion: reduce)').matches || current.current) return;
      show({ phase: 'sealed', title: pageTitle(location.hash), subtitle: PAGE_LINE, handoff: false });
      later(open, 220, navTimers);
    };
    if (!enabled) finish();
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    window.addEventListener('hashchange', changed); window.addEventListener('genesis:gate-navigate', requested);
    return () => {
      clearNav(); document.removeEventListener('click', click); document.removeEventListener('keydown', key);
      window.removeEventListener('hashchange', changed); window.removeEventListener('genesis:gate-navigate', requested);
    };
  }, [enabled]);
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);

  if (!gate) return null;
  const boot = gate.phase === 'boot' || gate.phase === 'unboot';
  return <><div className="silicon-gate" data-phase={gate.phase} data-handoff={gate.handoff} data-still={still || undefined} aria-hidden="true">
    {!boot && <><DiePanel side="left" /><DiePanel side="right" /><div className="silicon-gate-seam" /></>}
    <div className="silicon-gate-core">
      <div className="gate-chip"><svg viewBox="0 0 160 160"><path className="chip-leads" d="M0 52H44M0 80H44M0 108H44M116 52H160M116 80H160M116 108H160M52 0V44M80 0V44M108 0V44M52 116V160M80 116V160M108 116V160" /><rect className="chip-body" x="36" y="36" width="88" height="88" rx="12" /><rect className="chip-channel" x="52" y="52" width="56" height="56" rx="5" /><path className="chip-wave" d="M61 83H67L75 65L85 96L94 76H100" /></svg></div>
      <span className="gate-brand">{t("GENESIS")}</span>
      {!boot && <><h2>{t(gate.title)}<span className="gate-loading-dots">.</span></h2><p>{t(gate.subtitle)}</p></>}
      <div className="gate-energy-track"><span /></div>
    </div>
    {!boot && <><div className="gate-coordinate gate-coordinate-top">{t("G / 01")} <span>{t("SILICON INTERFACE")}</span></div>
      <div className="gate-coordinate gate-coordinate-bottom"><span>{t("DESIGN WITHOUT LIMITS")}</span> {t("GENESIS")}</div></>}
  </div>{!boot && <span className="sr-only" role="status">{t(gate.title)}</span>}</>;
}
