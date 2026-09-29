import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from './Language';
import { useMotion } from './MotionSettings';
import { Icon, assetUrl } from './ui';
import { publicationUrl, type Publication } from './citations';
import type { EmpireId } from '../flight/layout';
import type { FlightHandle, FlightTarget, FlightTimeline } from '../flight/world';
import '../styles/research-flight.css';

const STICK = 64; // px of drag for full turn or thrust
const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const sameTarget = (a: FlightTarget, b: FlightTarget | null) => Boolean(b) && (a.kind === 'genesis' ? b!.kind === 'genesis' : b!.kind === 'paper' && b!.paper.id === a.paper.id);

/** Our research as a city to fly through. The page shows a launch card; three.js loads only when the flight starts. */
export function ResearchFlight({ papers, onShowPaper }: { papers: Publication[]; onShowPaper: (id: string) => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const years = papers.map(paper => paper.year);
  const close = () => { setOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()); };
  return <section className="flight-launch" aria-labelledby="flight-launch-title">
    <div className="flight-launch-copy">
      <p className="eyebrow">{t("SIGNAL FLIGHT")}</p>
      <h2 id="flight-launch-title">{t("Fly through our research")}</h2>
      <p>{t("Every building is one of our papers, standing on a timeline from {from} to {to}. Circuits, signals and drones each rule an empire of their own.", { from: Math.min(...years), to: Math.max(...years) })}</p>
      <button ref={launcher} type="button" className="button button-primary" onClick={() => setOpen(true)}>{t("Launch the signal")}<Icon name="signal" /></button>
      <small>{t("Keyboard, mouse or touch. Stay next to a building to visit its paper.")}</small>
    </div>
    <div className="flight-launch-preview" onClick={() => setOpen(true)} aria-hidden="true"><img src={assetUrl('/assets/research-flight.webp')} alt="" loading="lazy" /></div>
    {open && createPortal(<FlightOverlay papers={papers} onClose={close} onShowPaper={id => { setOpen(false); onShowPaper(id); }} />, document.body)}
  </section>;
}

function FlightOverlay({ papers, onClose, onShowPaper }: { papers: Publication[]; onClose: () => void; onShowPaper: (id: string) => void }) {
  const { t } = useLanguage();
  const { enabled: motion } = useMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const handle = useRef<FlightHandle | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [status, setStatus] = useState<'loading' | 'intro' | 'flying' | 'error'>('loading');
  const [impact, setImpact] = useState(false);
  const [moved, setMoved] = useState(false);
  const [place, setPlace] = useState<{ year: number; empire: EmpireId | 'genesis' | null }>({ year: Math.min(...papers.map(paper => paper.year)), empire: null });
  const [nearTarget, setNearTarget] = useState<FlightTarget | null>(null);
  const [prompt, setPrompt] = useState<FlightTarget | null>(null);
  const [timeline, setTimeline] = useState<FlightTimeline | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const empires: Record<EmpireId, string> = { circuit: t("Circuit Empire"), signal: t("Signal Empire"), drone: t("Drone Empire") };
  const coarse = useMemo(() => matchMedia('(pointer: coarse)').matches, []);

  useEffect(() => {
    let cancelled = false;
    import('../flight/world').then(({ createFlight }) => {
      if (cancelled || !canvas.current) return;
      try {
        const flight = createFlight({
          canvas: canvas.current, papers, reducedMotion: !motion,
          labels: { empires, journal: t("Journal"), conference: t("Conference"), genesisLine: t("Autonomous RFIC design engine") },
          events: {
            impact: () => setImpact(true),
            ready: () => setStatus('flying'),
            moved: () => setMoved(true),
            near: target => { setNearTarget(target); setPrompt(current => current && sameTarget(current, target) ? current : null); },
            prompt: target => setPrompt(target),
            place: (year, empire) => setPlace({ year, empire }),
            progress: (at, dwell) => {
              track.current?.style.setProperty('--flight-at', at.toFixed(4));
              near.current?.style.setProperty('--flight-dwell', dwell.toFixed(3));
            },
          },
        });
        handle.current = flight;
        setTimeline(flight.timeline);
        setStatus(current => current === 'loading' ? 'intro' : current);
      } catch { setStatus('error'); }
    }, () => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; handle.current?.dispose(); handle.current = null; };
  }, []); // One flight per opening; the page behind stays as it was.

  useEffect(() => {
    const root = document.getElementById('root'), html = document.documentElement, overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    root?.setAttribute('inert', '');
    dialog.current?.focus();
    return () => { html.style.overflow = overflow; root?.removeAttribute('inert'); };
  }, []);

  const visit = (target: FlightTarget) => {
    if (target.kind === 'genesis') { onClose(); window.location.hash = '#/explore'; return; }
    window.open(publicationUrl(target.paper), '_blank', 'noopener,noreferrer');
    setPrompt(null);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (prompt) setPrompt(null); else onClose(); }
      else if (event.key === 'Enter' && prompt && !(document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLAnchorElement)) { event.preventDefault(); visit(prompt); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const steer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = clamp((event.clientX - start.x) / STICK), dy = clamp((event.clientY - start.y) / STICK);
    handle.current?.setInput({ turn: dx, forward: -dy });
    setStick({ x: start.x, y: start.y, dx, dy });
  };
  const release = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null; setStick(null);
    handle.current?.setInput({ turn: 0, forward: 0 });
  };
  const hold = (lift: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); handle.current?.setInput({ lift }); },
    onPointerUp: () => handle.current?.setInput({ lift: 0 }),
    onPointerCancel: () => handle.current?.setInput({ lift: 0 }),
    onClick: (event: { detail: number }) => { if (event.detail === 0) handle.current?.nudge(0, lift * 8); },
  });
  const at = (z: number) => timeline ? `${(((timeline.start - z) / (timeline.start - timeline.end)) * 100).toFixed(2)}%` : '0%';
  const lastYear = timeline ? timeline.years[timeline.years.length - 1].year : 0;
  const nearName = nearTarget ? nearTarget.kind === 'genesis' ? 'GENESIS' : nearTarget.paper.title : '';

  return <div ref={dialog} className="flight-overlay" role="dialog" aria-modal="true" aria-label={t("Signal flight through our research")} tabIndex={-1} data-status={status} data-motion={motion ? 'on' : 'off'}>
    <canvas ref={canvas} className="flight-canvas" aria-hidden="true"
      onPointerDown={event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        setStick({ x: event.clientX, y: event.clientY, dx: 0, dy: 0 });
      }}
      onPointerMove={steer} onPointerUp={release} onPointerCancel={release}
      onWheel={event => handle.current?.nudge(clamp(-event.deltaY / 60) * 8, 0)} />
    {stick && <span className="flight-stick" aria-hidden="true" style={{ left: stick.x, top: stick.y }}><span style={{ transform: `translate(${stick.dx * STICK * 0.6}px, ${stick.dy * STICK * 0.6}px)` }} /></span>}
    <div className="flight-flash" data-on={impact} aria-hidden="true" />
    <div className="flight-frame" data-locked={impact} aria-hidden="true"><span /><span /><span /><span /></div>
    <button type="button" className="flight-close" onClick={onClose} aria-label={t("Close the flight")}><Icon name="close" /></button>
    {status === 'loading' && <p className="flight-loading" role="status">{t("Loading the city…")}</p>}
    {status === 'error' && <div className="flight-error" role="alert">
      <p>{t("3D graphics could not start in this browser. Every paper is also listed in the library on this page.")}</p>
      <button type="button" className="button button-secondary" onClick={onClose}>{t("Back to the library")}</button>
    </div>}
    <div className="flight-hud">
      <div className="flight-place">
        <p className="flight-kicker">{t("SIGNAL FLIGHT")}</p>
        <p className="flight-year">{place.year}</p>
        <p className="flight-empire" data-empire={place.empire ?? undefined}>{place.empire === 'genesis' ? 'GENESIS' : place.empire ? empires[place.empire] : '\u00a0'}</p>
      </div>
      {status === 'flying' && !moved && <p className="flight-hint">{coarse ? t("Drag to fly. Use ▲ ▼ to rise and sink.") : t("Fly with W A S D or the arrow keys, rise with Space, sink with Shift, or drag.")}</p>}
      {nearTarget && !prompt && <div ref={near} className="flight-near" aria-hidden="true">
        <span className="flight-dwell" /><span><strong>{nearName}</strong><small>{t("Stay here to visit")}</small></span>
      </div>}
      <div className="flight-prompt-region" aria-live="polite">{prompt && <div className="flight-prompt" data-empire={prompt.kind === 'paper' ? prompt.empire : 'genesis'}>
        <p className="flight-prompt-meta">{prompt.kind === 'paper' ? `${prompt.paper.year} · ${t(prompt.paper.type)} · ${empires[prompt.empire]}` : 'GENESIS'}</p>
        <h2>{t("Would you like to visit?")}</h2>
        <p className="flight-prompt-title">{prompt.kind === 'paper' ? prompt.paper.title : t("Autonomous RFIC design engine")}</p>
        {prompt.kind === 'paper' && <p className="flight-prompt-venue">{prompt.paper.venue}</p>}
        <div className="flight-prompt-actions">
          {prompt.kind === 'paper'
            ? <a className="button button-primary" href={publicationUrl(prompt.paper)} target="_blank" rel="noopener noreferrer" onClick={() => setPrompt(null)}>{t("Visit")}<Icon name="diagonal" /></a>
            : <a className="button button-primary" href="#/explore" onClick={event => { event.preventDefault(); visit(prompt); }}>{t("Visit")}<Icon name="arrow" /></a>}
          <button type="button" className="button button-secondary" onClick={() => setPrompt(null)}>{t("Keep flying")}</button>
        </div>
        {prompt.kind === 'paper' && <button type="button" className="flight-prompt-link" onClick={() => onShowPaper(prompt.paper.id)}>{t("Read the summary on this page")}</button>}
      </div>}</div>
      <div className="flight-controls">
        <button type="button" className="flight-step" onClick={() => handle.current?.step(-1)}><Icon name="arrow" className="icon-back" /><span>{t("Earlier paper")}</span></button>
        <button type="button" className="flight-lift" aria-label={t("Rise")} {...hold(1)}><Icon name="chevron" className="icon-up" /></button>
        <button type="button" className="flight-lift" aria-label={t("Sink")} {...hold(-1)}><Icon name="chevron" /></button>
        <button type="button" className="flight-step" onClick={() => handle.current?.step(1)}><span>{t("Later paper")}</span><Icon name="arrow" /></button>
      </div>
      <div className="flight-timeline" aria-label={t("Research timeline")} role="group">
        <div className="flight-track" ref={track}>
          {timeline?.years.filter(({ year }, i) => i === 0 || year === lastYear || (year % 5 === 0 && lastYear - year >= 3)).map(({ year, z }) => <span key={year} className="flight-tick" style={{ left: at(z) }}>{year}</span>)}
          {timeline?.papers.map(paper => <button key={paper.id} type="button" tabIndex={-1} className="flight-dot" data-empire={paper.empire} style={{ left: at(paper.z) }}
            title={`${paper.year} · ${paper.title}`} aria-label={t("Fly to: {title}", { title: paper.title })} onClick={() => handle.current?.flyTo(paper.id)} />)}
          <span className="flight-marker" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>;
}
