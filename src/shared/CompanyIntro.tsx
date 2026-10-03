import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import siteContent from '../content/site.json';
import { useLanguage, useTranslatedContent } from './Language';
import { useVisibleMotion } from './MotionSettings';
import { EmblemLauncher } from './Emblem';
import { RFDesignScene } from './RFDesignScene';
import { Icon } from './ui';
import '../styles/company-intro.css';

const secondsPerChapter = 5;

/** The same short overview can be opened from the brand or from the company presentation. */
export function CompanyIntro({ symbol = false }: { symbol?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()); };
  return <>
    {symbol ? <EmblemLauncher ref={launcher} label={t('Watch the GENESIS introduction')} onLaunch={() => setOpen(true)} />
      : <button ref={launcher} type="button" className="button button-secondary" onClick={() => setOpen(true)}><Icon name="play" />{t('Watch the introduction')}<span className="intro-duration">25s</span></button>}
    {open && createPortal(<IntroFilm onClose={close} />, document.body)}
  </>;
}

function IntroFilm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { introduction } = useTranslatedContent(siteContent);
  const { ref, enabled, running } = useVisibleMotion<HTMLDialogElement>();
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const duration = introduction.chapters.length * secondsPerChapter;
  const index = Math.min(introduction.chapters.length - 1, Math.floor(time / secondsPerChapter));
  const chapter = introduction.chapters[index];
  const playing = running && !paused && time < duration;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    closeButton.current?.focus();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { dialog?.close(); document.documentElement.style.overflow = overflow; };
  }, [ref]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTime(value => Math.min(duration, Math.round((value + .1) * 10) / 10)), 100);
    return () => window.clearInterval(timer);
  }, [playing, duration]);
  const keyboard = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Tab') {
      const controls = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.code === 'Space') { event.preventDefault(); setPaused(value => !value); }
  };
  return <dialog ref={ref} className="company-film" aria-labelledby="company-film-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={keyboard} data-running={playing} data-motion={enabled ? 'on' : 'off'}>
    <header className="film-header"><span>GENESIS <span className="film-divider">/</span> {t('A short introduction')}</span><button ref={closeButton} type="button" className="icon-button" onClick={onClose} aria-label={t('Close introduction')}><Icon name="close" /></button></header>
    <div className="film-story">
      <div className="film-copy" aria-live="polite" aria-atomic="true"><p className="eyebrow">{chapter.label}</p><h2 id="company-film-title">{chapter.title}</h2><p>{chapter.detail}</p></div>
      <RFDesignScene stage={index} verified={time >= 18} />
    </div>
    <div className="film-transport">
      <button type="button" className="icon-button" disabled={!enabled} aria-label={t(time >= duration ? 'Replay introduction' : playing ? 'Pause introduction' : 'Play introduction')}
        onClick={() => { if (time >= duration) { setTime(0); setPaused(false); } else setPaused(value => !value); }}><Icon name={playing ? 'pause' : 'play'} /></button>
      <input type="range" min="0" max={duration} step=".1" value={time} aria-label={t('Introduction progress')} aria-valuetext={`${Math.floor(time)} / ${duration} ${t('seconds')}`} onChange={event => setTime(Number(event.target.value))} />
      <span className="film-time">0:{String(Math.floor(time)).padStart(2, '0')} / 0:{duration}</span>
    </div>
    <nav className="film-chapters" aria-label={t('Introduction chapters')}>{introduction.chapters.map((item, i) => <button key={item.label} type="button" aria-current={i === index ? 'step' : undefined} onClick={() => setTime(i * secondsPerChapter)}><span>{String(i + 1).padStart(2, '0')}</span>{item.label}</button>)}</nav>
    <footer className="film-footer"><span>{t(enabled ? 'Illustrated workflow' : 'Animations are off. Choose a chapter to continue.')}</span><button className="film-done" type="button" onClick={onClose}>{t('Continue exploring')}<Icon name="arrow" /></button></footer>
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
