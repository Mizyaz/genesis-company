import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import siteContent from '../content/site.json';
import { useLanguage, useTranslatedContent } from './Language';
import { useVisibleMotion } from './MotionSettings';
import { EmblemLauncher, EmblemMark } from './Emblem';
import { RFDesignScene } from './RFDesignScene';
import { DiePanel } from './SiliconGate';
import { Icon, assetUrl } from './ui';
import { renderCircuitFilm } from './intro/circuitFilm';
import { readFilmPalette } from './intro/filmPalette';
import { RequestSequence } from './intro/RequestSequence';
import { ease, filmCue, filmTime } from './intro/timeline';
import { IntroSound, FILM_SECONDS, type AudioStatus } from './intro/score';
import '../styles/company-intro.css';

/** The same short overview can be opened from the brand or from the company presentation. */
export function CompanyIntro({ symbol = false }: { symbol?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const origin = useRef<DOMRect>();
  const sound = useRef<IntroSound>();
  const launch = () => { origin.current = launcher.current?.getBoundingClientRect(); sound.current = new IntroSound(assetUrl('/assets/genesis-intro-score.mp3')); setOpen(true); };
  const close = () => { sound.current?.dispose(); sound.current = undefined; setOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()); };
  useEffect(() => () => sound.current?.dispose(), []);
  return <>
    {symbol ? <EmblemLauncher ref={launcher} label={t('Watch the GENESIS introduction')} onLaunch={launch} />
      : <button ref={launcher} type="button" className="button button-secondary" onClick={launch}><Icon name="play" />{t('Watch the introduction')}<span className="intro-duration">1:00</span></button>}
    {open && sound.current && createPortal(<IntroFilm onClose={close} sound={sound.current} origin={origin.current} />, document.body)}
  </>;
}

function IntroFilm({ onClose, sound, origin }: { onClose: () => void; sound: IntroSound; origin?: DOMRect }) {
  const { t } = useLanguage();
  const { introduction } = useTranslatedContent(siteContent);
  const { ref, enabled, running } = useVisibleMotion<HTMLDialogElement>();
  const [entering, setEntering] = useState(enabled);
  const entered = useRef(false);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>(sound.status);
  const [revision, setRevision] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const clock = useRef(0);
  const size = useRef({ width: 1, height: 1, ratio: 1, contentTop: 0 });
  const duration = FILM_SECONDS;
  const playing = running && !entering && !paused && time < duration;
  useEffect(() => {
    let active = true;
    void sound.ready.then(() => { if (active) setAudioStatus(sound.status); });
    return () => { active = false; sound.pause(); };
  }, [sound]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    closeButton.current?.focus();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { dialog?.close(); document.documentElement.style.overflow = overflow; };
  }, [ref]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || entered.current) return;
    if (!enabled) { entered.current = true; setEntering(false); return; }
    const bounds = dialog.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width - 2, (origin?.left ?? bounds.left + bounds.width / 2) - bounds.left));
    const y = Math.max(0, Math.min(bounds.height - 2, (origin?.top ?? bounds.top + bounds.height / 2) - bounds.top));
    const w = Math.min(origin?.width ?? 40, bounds.width - x), h = Math.min(origin?.height ?? 40, bounds.height - y);
    const expansion = dialog.animate([
      { clipPath: `inset(${y}px ${bounds.width - x - w}px ${bounds.height - y - h}px ${x}px round 20px)` },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
    ], { duration: 620, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'both' });
    expansion.id = 'film-expand';
    const animations = [expansion, ...Array.from(dialog.querySelectorAll<HTMLElement>('.film-opening .silicon-gate-panel')).map((panel, i) => {
      const animation = panel.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${i ? 102 : -102}%)` }],
        { duration: 520, delay: 270, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'both' });
      animation.id = `film-shutter-${i}`; return animation;
    })];
    let active = true;
    const finish = () => { if (active) { entered.current = true; setEntering(false); animations.forEach(animation => animation.cancel()); } };
    void Promise.all(animations.map(animation => animation.finished)).then(finish, () => {});
    const fallback = window.setTimeout(finish, 950);
    return () => { active = false; window.clearTimeout(fallback); animations.forEach(animation => animation.cancel()); };
  }, [enabled, origin, ref]);
  useEffect(() => {
    const surface = canvas.current, context = surface?.getContext('2d', { alpha: false });
    if (!surface || !context) return;
    let palette = readFilmPalette(surface);
    const draw = () => {
      const { width, height, ratio, contentTop } = size.current;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderCircuitFilm(context, width, height, clock.current, t, palette, contentTop);
      surface.dataset.time = clock.current.toFixed(2);
    };
    const resize = new ResizeObserver(() => {
      const width = surface.clientWidth, height = surface.clientHeight;
      if (!width || !height) return;
      // Bounded backing store, including high-DPI phones. No offscreen scene textures.
      const ratio = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(2_000_000 / (width * height)));
      const contentTop = (story.current?.getBoundingClientRect().bottom ?? 0) - surface.getBoundingClientRect().top + 24;
      size.current = { width, height, ratio, contentTop };
      surface.dataset.font = getComputedStyle(surface).getPropertyValue('--font-sans').trim() || 'sans-serif';
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio); draw();
    });
    resize.observe(surface);
    if (story.current) resize.observe(story.current);
    // The shared theme can change while paused. Repaint without changing the film's clock.
    const theme = new MutationObserver(() => { palette = readFilmPalette(surface); draw(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    let frame = 0, lastPaint = 0, lastLabel = 0;
    const offset = clock.current, started = performance.now();
    if (playing) sound.play(offset); else sound.pause();
    const tick = (now: number) => {
      clock.current = Math.min(duration, sound.position ?? offset + (now - started) / 1000);
      // 30 fps is intentional: this film stays light on mobile and on shared machines.
      if (now - lastPaint >= 1000 / 30 || clock.current === duration) { draw(); lastPaint = now; }
      if (now - lastLabel >= 100 || clock.current === duration) { setTime(clock.current); lastLabel = now; }
      if (clock.current < duration) frame = requestAnimationFrame(tick);
    };
    draw();
    if (playing) frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); theme.disconnect(); sound.pause(); };
  }, [playing, revision, sound, duration, audioStatus, t]);
  const seek = (value: number) => { clock.current = value; setTime(value); setRevision(value => value + 1); };
  const togglePlay = () => {
    void sound.unlock().then(() => setAudioStatus(sound.status));
    if (time >= duration) { seek(0); setPaused(false); } else setPaused(value => !value);
  };
  const toggleSound = async () => {
    if (audioStatus === 'blocked') { await sound.unlock(); setAudioStatus(sound.status); setRevision(value => value + 1); return; }
    sound.setMuted(!muted); setMuted(value => !value);
  };
  const keyboard = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Tab') {
      const controls = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
  };
  const cue = filmCue(time), caption = introduction.scenes[cue.id];
  const ending = ease(55, 58, time);
  return <dialog ref={ref} className="company-film" aria-labelledby="company-film-title" aria-describedby="company-film-description" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={keyboard} data-running={playing} data-entering={entering} data-motion={enabled ? 'on' : 'off'} data-audio={audioStatus} data-muted={muted} data-cue={cue.id}>
    <h2 id="company-film-title" className="film-sr-only">{introduction.title}</h2>
    <p id="company-film-description" className="film-sr-only">{introduction.description}</p>
    <canvas ref={canvas} className="film-canvas" aria-hidden="true" />
    {entering && <div className="film-opening" aria-hidden="true"><DiePanel side="left" /><DiePanel side="right" /></div>}
    <header className="film-header"><span><EmblemMark />GENESIS <span className="film-divider">/</span> {t('A short introduction')}</span><button ref={closeButton} type="button" className="icon-button" onClick={onClose} aria-label={t('Close introduction')}><Icon name="close" /></button></header>
    <div ref={story} className="film-story">
    {cue.id !== 'closing' && <div className="film-caption" key={cue.id} style={{ opacity: enabled ? cue.opacity : 1 }}>
      <p className="film-cue-label">{caption.label}</p>
      <h3 aria-label={caption.title}>{caption.title.split(' ').map((word, i) => {
        const progress = enabled ? ease(cue.from + i * .055, cue.from + .7 + i * .055, time) : 1;
        return <span key={i} aria-hidden="true" style={{ opacity: progress, transform: `translateY(${(1 - progress) * 13}px)` }}>{word}{' '}</span>;
      })}</h3>
      <p className="film-caption-detail">{caption.detail}</p>
    </div>}
    {time < 12.5 && <RequestSequence time={time} prompt={introduction.prompt} />}
    {cue.id === 'closing' && <div className="film-ending" aria-hidden={ending < .5} style={{ opacity: ending, transform: `translateY(${(1 - ending) * 14}px)` }}>
      <EmblemMark /><strong>GENESIS</strong><p className="film-signature" lang="en" style={{ opacity: ease(56, 57.6, time) }}>Generative Evolution of Silicon Intelligent Systems</p><p>{introduction.closing}</p>
    </div>}
    </div>
    <div className="film-controls"><div className="film-transport">
      <button type="button" className="icon-button" disabled={!enabled || entering} aria-label={t(time >= duration ? 'Replay introduction' : playing ? 'Pause introduction' : 'Play introduction')} onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} /></button>
      <input type="range" min="0" max={duration} step=".1" value={time} aria-label={t('Introduction progress')} aria-valuetext={`${Math.floor(time)} / ${duration} ${t('seconds')}`} onChange={event => seek(Number(event.target.value))} />
      <span className="film-time">{filmTime(time)} / {filmTime(duration)}</span>
      <button type="button" className="icon-button" disabled={audioStatus === 'unavailable' || audioStatus === 'loading'} aria-label={t(audioStatus === 'unavailable' ? 'Sound unavailable' : audioStatus === 'blocked' ? 'Enable sound' : muted ? 'Unmute music' : 'Mute music')} onClick={() => void toggleSound()}><Icon name={muted || audioStatus !== 'ready' ? 'muted' : 'volume'} /></button>
    </div><footer className="film-footer"><span>{audioStatus === 'loading' ? t('Preparing the soundtrack') : !enabled ? t('Animations are off. Scrub to explore the circuit.') : t('Original music · GENESIS')}</span><button className="film-done" type="button" onClick={onClose}>{t('Continue exploring')}<Icon name="arrow" /></button></footer></div>
  </dialog>;
}

/** Explain why physical checks and RF performance must be considered together. Viewport-scoped, like all site motion. */
export function RFPhysics() {
  const { rfPhysics } = useTranslatedContent(siteContent);
  const { t } = useLanguage();
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setBeat(value => (value + 1) % 4), 2000);
    return () => window.clearInterval(timer);
  }, [running]);
  const verified = !enabled || beat >= 2;
  return <section ref={ref} className="content-section rf-physics" aria-labelledby="rf-physics-title" data-running={running} data-motion={enabled ? 'on' : 'off'}>
    <div className="rf-physics-copy"><p className="eyebrow">{rfPhysics.label}</p><h2 id="rf-physics-title">{rfPhysics.title}</h2><p>{rfPhysics.detail}</p><CompanyIntro /></div>
    <figure className="rf-physics-visual"><RFDesignScene stage={3} verified={verified} /><div className="rf-verification"><span><Icon name="check" />{rfPhysics.physical}</span><span data-verified={verified}><Icon name={verified ? 'check' : 'wave'} />{rfPhysics.performance}</span></div><figcaption>{t('Illustrated workflow')}</figcaption></figure>
  </section>;
}
