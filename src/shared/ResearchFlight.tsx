import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from './Language';
import { useMotion } from './MotionSettings';
import { Icon, assetUrl } from './ui';
import { publicationUrl, type Publication } from './citations';
import { holdGate, navigate } from './gate';
import { EmblemLauncher } from './Emblem';
import type { EmpireId } from '../flight/layout';
import type { FlightHandle, FlightTarget, FlightTimeline } from '../flight/world';
import '../styles/research-flight.css';

const STICK = 64; // px of drag for a full turn, thrust, rise or sink
const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const sameTarget = (a: FlightTarget, b: FlightTarget | null) => Boolean(b) && (a.kind === 'genesis' ? b!.kind === 'genesis' : b!.kind === 'paper' && b!.paper.id === a.paper.id);
type Paper = FlightTimeline['papers'][number];
/** One pointer on the canvas: the thumb that flies, the thumb that rises and sinks, or a further finger that can only tap. */
type Touch = { role: 'fly' | 'lift' | 'tap'; x: number; y: number; at: number; moved: boolean };

// A paper chosen in a flight started away from the research page: the research page opens it when it loads.
let requested: string | null = null;
export const requestPaper = (id: string) => { requested = id; };
export const takeRequestedPaper = () => { const id = requested; requested = null; return id; };

/** The GENESIS symbol that starts the signal flight through our research; three.js loads only when the flight starts.
 * The flight opens over the page, and closing it gives focus back to the symbol. `library` says whether the paper
 * summaries are on this page (the research page) or on the research page the flight leads to. */
export function FlightSymbol({ papers, onShowPaper, library = 'here' }: { papers: Publication[]; onShowPaper: (id: string) => void; library?: 'here' | 'research' }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()); };
  return <>
    <EmblemLauncher ref={launcher} label={t("Fly through our research")} hint={t("Press the symbol to fly")} onLaunch={() => setOpen(true)} />
    {open && createPortal(<FlightOverlay papers={papers} library={library} onClose={close} onShowPaper={id => { setOpen(false); onShowPaper(id); }} />, document.body)}
  </>;
}

/** Our research as a city to fly through: the card on the research page, with the symbol over a still of the city. */
export function ResearchFlight({ papers, onShowPaper }: { papers: Publication[]; onShowPaper: (id: string) => void }) {
  const { t } = useLanguage();
  const years = papers.map(paper => paper.year);
  return <section className="flight-launch" aria-labelledby="flight-launch-title">
    <div className="flight-launch-copy">
      <p className="eyebrow">{t("SIGNAL FLIGHT")}</p>
      <h2 id="flight-launch-title">{t("Fly through our research")}</h2>
      <p>{t("Every building is one of our papers, standing on a timeline from {from} to {to}. Circuits, signals and drones each rule an empire of their own.", { from: Math.min(...years), to: Math.max(...years) })}</p>
      <small>{t("Keyboard, mouse or two thumbs on a phone. Stay next to a building to visit its paper.")}</small>
    </div>
    <div className="flight-launch-preview">
      <img src={assetUrl('/assets/research-flight.webp')} alt="" loading="lazy" />
      <FlightSymbol papers={papers} onShowPaper={onShowPaper} />
    </div>
  </section>;
}

function FlightOverlay({ papers, library, onClose, onShowPaper }: { papers: Publication[]; library: 'here' | 'research'; onClose: () => void; onShowPaper: (id: string) => void }) {
  const { t } = useLanguage();
  const { enabled: motion } = useMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const handle = useRef<FlightHandle | null>(null);
  const touches = useRef(new Map<number, Touch>());
  const [status, setStatus] = useState<'loading' | 'intro' | 'flying' | 'error'>('loading');
  const [impact, setImpact] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [moved, setMoved] = useState(false);
  const [place, setPlace] = useState<{ year: number; empire: EmpireId | 'genesis' | null }>({ year: Math.min(...papers.map(paper => paper.year)), empire: null });
  const [nearTarget, setNearTarget] = useState<FlightTarget | null>(null);
  const [prompt, setPrompt] = useState<FlightTarget | null>(null);
  const [timeline, setTimeline] = useState<FlightTimeline | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [slider, setSlider] = useState<{ x: number; y: number; dy: number } | null>(null);
  const [tap, setTap] = useState<{ x: number; y: number; key: number } | null>(null);
  const [scrub, setScrub] = useState<Paper | null>(null);
  const [full, setFull] = useState(false);
  const empires: Record<EmpireId, string> = { circuit: t("Circuit Empire"), signal: t("Signal Empire"), drone: t("Drone Empire") };
  const coarse = useMemo(() => matchMedia('(pointer: coarse)').matches, []);
  const canFullScreen = useMemo(() => Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen), []);

  // The site's loading screen covers the wait for three.js and the city; the signal's intro starts as it opens.
  useEffect(() => {
    let cancelled = false;
    const release = holdGate({ title: 'Loading the city', subtitle: 'Every building is one of our papers.' });
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
        release(() => { setRevealed(true); flight.start(); });
      } catch { setStatus('error'); release(); }
    }, () => { if (!cancelled) { setStatus('error'); release(); } });
    return () => { cancelled = true; release(); handle.current?.dispose(); handle.current = null; };
  }, []); // One flight per opening; the page behind stays as it was.

  useEffect(() => {
    const root = document.getElementById('root'), html = document.documentElement, overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    root?.setAttribute('inert', '');
    dialog.current?.focus();
    const fullScreen = () => setFull(Boolean(document.fullscreenElement) && document.fullscreenElement === dialog.current);
    document.addEventListener('fullscreenchange', fullScreen);
    return () => {
      html.style.overflow = overflow; root?.removeAttribute('inert');
      document.removeEventListener('fullscreenchange', fullScreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    if (!tap) return;
    const timer = window.setTimeout(() => setTap(null), 600);
    return () => window.clearTimeout(timer);
  }, [tap]);

  const visit = (target: FlightTarget) => {
    if (target.kind === 'genesis') { onClose(); navigate('#/explore'); return; }
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
  const toggleFullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void dialog.current?.requestFullscreen().catch(() => undefined);
  };

  // Touch screens take two thumbs: the left half flies (a stick appears where the thumb lands), the right half rises and
  // sinks; both work at once. A mouse or pen drag flies from anywhere. A tap or click that does not move flies to the
  // building under it.
  const press = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const wanted = event.pointerType === 'touch' && event.clientX > event.currentTarget.clientWidth / 2 ? 'lift' : 'fly';
    const taken = [...touches.current.values()].some(touch => touch.role === wanted);
    touches.current.set(event.pointerId, { role: taken ? 'tap' : wanted, x: event.clientX, y: event.clientY, at: event.timeStamp, moved: false });
  };
  const drag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const touch = touches.current.get(event.pointerId);
    if (!touch) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    if (!touch.moved && Math.hypot(dx, dy) < 8) return;
    touch.moved = true;
    if (touch.role === 'fly') {
      const x = clamp(dx / STICK), y = clamp(dy / STICK);
      handle.current?.setInput({ turn: x, forward: -y });
      setStick({ x: touch.x, y: touch.y, dx: x, dy: y });
    } else if (touch.role === 'lift') {
      const y = clamp(dy / STICK);
      handle.current?.setInput({ lift: -y });
      setSlider({ x: touch.x, y: touch.y, dy: y });
    }
  };
  const release = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const touch = touches.current.get(event.pointerId);
    if (!touch) return;
    touches.current.delete(event.pointerId);
    if (touch.role === 'fly') { handle.current?.setInput({ turn: 0, forward: 0 }); setStick(null); }
    if (touch.role === 'lift') { handle.current?.setInput({ lift: 0 }); setSlider(null); }
    if (event.type === 'pointerup' && !touch.moved && event.timeStamp - touch.at < 600 && handle.current?.pick(event.clientX, event.clientY)) {
      setTap({ x: event.clientX, y: event.clientY, key: event.timeStamp });
    }
  };
  const hold = (lift: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); handle.current?.setInput({ lift }); },
    onPointerUp: () => handle.current?.setInput({ lift: 0 }),
    onPointerCancel: () => handle.current?.setInput({ lift: 0 }),
    onClick: (event: { detail: number }) => { if (event.detail === 0) handle.current?.nudge(0, lift * 8); },
  });

  // The timeline is a scrubber: press or slide along it to pick a paper, let go to fly there, slide off to cancel.
  const paperAt = (clientX: number): Paper | null => {
    const rect = track.current?.getBoundingClientRect();
    if (!timeline || !rect?.width) return null;
    const z = timeline.start - Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * (timeline.start - timeline.end);
    return timeline.papers.reduce((best, paper) => Math.abs(paper.z - z) < Math.abs(best.z - z) ? paper : best);
  };
  const scrubbing = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); setScrub(paperAt(event.clientX)); },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId) || event.pointerType === 'mouse') setScrub(paperAt(event.clientX));
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect(), paper = paperAt(event.clientX);
      setScrub(null);
      if (paper && event.clientY > rect.top - 28 && event.clientY < rect.bottom + 28) handle.current?.flyTo(paper.id);
    },
    onPointerCancel: () => setScrub(null),
    onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) setScrub(null); },
  };
  const at = (z: number) => timeline ? `${(((timeline.start - z) / (timeline.start - timeline.end)) * 100).toFixed(2)}%` : '0%';
  const lastYear = timeline ? timeline.years[timeline.years.length - 1].year : 0;
  const nearName = nearTarget ? nearTarget.kind === 'genesis' ? 'GENESIS' : nearTarget.paper.title : '';

  return <div ref={dialog} className="flight-overlay" role="dialog" aria-modal="true" aria-label={t("Signal flight through our research")} tabIndex={-1}
    data-status={status} data-motion={motion ? 'on' : 'off'} data-touch={coarse || undefined} data-revealed={revealed || undefined} onContextMenu={event => event.preventDefault()}>
    <canvas ref={canvas} className="flight-canvas" aria-hidden="true" onPointerDown={press} onPointerMove={drag} onPointerUp={release} onPointerCancel={release}
      onWheel={event => handle.current?.nudge(clamp(-event.deltaY / 60) * 8, 0)} />
    {stick && <span className="flight-stick" aria-hidden="true" style={{ left: stick.x, top: stick.y }}><span style={{ transform: `translate(${stick.dx * STICK * 0.6}px, ${stick.dy * STICK * 0.6}px)` }} /></span>}
    {slider && <span className="flight-slider" aria-hidden="true" style={{ left: slider.x, top: slider.y }}><span style={{ transform: `translateY(${slider.dy * STICK * 0.8}px)` }} /></span>}
    {tap && <span key={tap.key} className="flight-tap" aria-hidden="true" style={{ left: tap.x, top: tap.y }} />}
    <div className="flight-flash" data-on={impact} aria-hidden="true" />
    <div className="flight-frame" data-locked={impact} aria-hidden="true"><span /><span /><span /><span /></div>
    {canFullScreen && <button type="button" className="flight-full" onClick={toggleFullScreen} aria-pressed={full} aria-label={full ? t("Leave full screen") : t("Full screen")}><Icon name={full ? 'shrink' : 'expand'} /></button>}
    <button type="button" className="flight-close" onClick={onClose} aria-label={t("Close the flight")}><Icon name="close" /></button>
    {status === 'error' && <div className="flight-error" role="alert">
      <p>{t("3D graphics could not start in this browser. Every paper is also listed in the library on this page.")}</p>
      <button type="button" className="button button-secondary" onClick={onClose}>{t("Back to the library")}</button>
    </div>}
    <div className="flight-hud">
      <div className="flight-place">
        <p className="flight-kicker">{t("SIGNAL FLIGHT")}</p>
        <p className="flight-year">{place.year}</p>
        <p className="flight-empire" data-empire={place.empire ?? undefined}>{place.empire === 'genesis' ? 'GENESIS' : place.empire ? empires[place.empire] : ' '}</p>
      </div>
      {coarse && !stick && <span className="flight-pad flight-pad-fly" aria-hidden="true"><Icon name="chevron" className="pad-up" /><Icon name="chevron" className="pad-right" /><Icon name="chevron" className="pad-down" /><Icon name="chevron" className="pad-left" /></span>}
      {coarse && !slider && <span className="flight-pad flight-pad-lift" aria-hidden="true"><Icon name="chevron" className="pad-up" /><Icon name="chevron" className="pad-down" /></span>}
      {status === 'flying' && !moved && <p className="flight-hint">{coarse ? t("Left thumb: fly. Right thumb: rise and sink. Tap a building to fly there.") : t("Fly with W A S D or the arrow keys, rise with Space, sink with Shift. Drag to steer or click a building to fly there.")}</p>}
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
        {prompt.kind === 'paper' && <button type="button" className="flight-prompt-link" onClick={() => onShowPaper(prompt.paper.id)}>{t(library === 'here' ? "Read the summary on this page" : "Read the summary on the research page")}</button>}
      </div>}</div>
      <div className="flight-controls">
        <button type="button" className="flight-step" onClick={() => handle.current?.step(-1)} aria-label={t("Earlier paper")}><Icon name="arrow" className="icon-back" /><span>{t("Earlier paper")}</span></button>
        {!coarse && <button type="button" className="flight-lift" aria-label={t("Rise")} {...hold(1)}><Icon name="chevron" className="icon-up" /></button>}
        {!coarse && <button type="button" className="flight-lift" aria-label={t("Sink")} {...hold(-1)}><Icon name="chevron" /></button>}
        <button type="button" className="flight-step" onClick={() => handle.current?.step(1)} aria-label={t("Later paper")}><span>{t("Later paper")}</span><Icon name="arrow" /></button>
      </div>
      <div className="flight-timeline" aria-label={t("Research timeline")} role="group" {...scrubbing}>
        <div className="flight-track" ref={track}>
          {timeline?.years.filter(({ year }, i) => i === 0 || year === lastYear || (year % 5 === 0 && lastYear - year >= 3)).map(({ year, z }) => <span key={year} className="flight-tick" style={{ left: at(z) }}>{year}</span>)}
          {timeline?.papers.map(paper => <button key={paper.id} type="button" tabIndex={-1} className="flight-dot" data-empire={paper.empire} data-active={scrub?.id === paper.id || undefined}
            style={{ left: at(paper.z) }} aria-label={t("Fly to: {title}", { title: paper.title })} onClick={() => handle.current?.flyTo(paper.id)} />)}
          <span className="flight-marker" aria-hidden="true" />
        </div>
        {scrub && <span className="flight-scrub" aria-hidden="true" style={{ left: `clamp(min(180px, 36vw), ${at(scrub.z)}, calc(100% - min(180px, 36vw)))` }}><strong>{scrub.year}</strong>{scrub.title}</span>}
      </div>
    </div>
  </div>;
}
