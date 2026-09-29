import { useEffect, useId, useRef, useState, type AnimationEvent, type CSSProperties, type MouseEvent } from 'react';
import { Icon } from './ui';
import { useLanguage } from './Language';
import { useVisibleMotion } from './MotionSettings';
import { SwipeDots } from './SwipeDots';
import { usePress } from './DesignStory';
import { StageScreen } from './StageScreens';
import '../styles/workflow-detail.css';

type Offering = { icon: string; title: string; detail: string };
type Stage = { id: string; title: string; detail: string; icon: string; software: Offering[] };

/** The stages of RF design. Each card opens what GENESIS offers at that stage: a tube grows out of the card and powers on
 * a screen below it like a cathode-ray tube (a bright line, then the picture), with the stage's animated picture and its
 * software. Another card switches the screen; the same card, the close button or Escape draws it back into the tube. */
export function Workflow({ stages, label }: { stages: Stage[]; label: string }) {
  const { t } = useLanguage();
  const { ref, enabled, running } = useVisibleMotion<HTMLDivElement>();
  const animations = useRef<Animation[]>([]);
  const detail = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [off, setOff] = useState(false); // The screen is powering off; it unmounts when that ends.
  const [run, setRun] = useState(0); // A new key powers the screen (and the tube) on again.
  const [tube, setTube] = useState({ x: 0, reach: 0 });
  const { press, wave } = usePress<number>(enabled);
  const panel = `stage-screen-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const tracks: Animation[] = [];
    const cycle = Math.max(stages.length, 1) * 1500;
    const slice = 1 / Math.max(stages.length, 1);
    ref.current?.querySelectorAll('.workflow-step').forEach((step, index) => {
      const options = { duration: cycle, delay: index * 1500, iterations: Infinity, fill: 'both' as const };
      const glow = step.querySelector('.workflow-glow');
      const progress = step.querySelector('.workflow-progress');
      if (glow) tracks.push(glow.animate([
        { opacity: 0, offset: 0 }, { opacity: 1, offset: slice * .3 },
        { opacity: 0, offset: slice }, { opacity: 0, offset: 1 },
      ], options));
      if (progress) tracks.push(progress.animate([
        { transform: 'scaleX(0)', opacity: 1, offset: 0 },
        { transform: 'scaleX(1)', opacity: 1, offset: slice * .85 },
        { transform: 'scaleX(1)', opacity: 0, offset: slice },
        { transform: 'scaleX(1)', opacity: 0, offset: 1 },
      ], options));
    });
    tracks.forEach(animation => animation.pause()); animations.current = tracks;
    return () => tracks.forEach(animation => animation.cancel());
  }, [stages.length, ref]);
  // The sweep runs through the stages while none is open; an open stage keeps the light on its own card.
  useEffect(() => {
    animations.current.forEach(animation => {
      if (running && open === null) { animation.currentTime = 0; animation.play(); }
      else { animation.pause(); if (open !== null) animation.currentTime = 0; }
    });
  }, [running, stages.length, open]);
  // The tube leaves from the middle of the open card, straight down to the screen (across the dots on phones).
  useEffect(() => {
    if (open === null) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const card = ref.current?.children[open], box = detail.current?.getBoundingClientRect();
      if (!(card instanceof HTMLElement) || !box) return;
      const rect = card.getBoundingClientRect(), gap = box.top - rect.bottom;
      setTube({ x: Math.min(box.width - 18, Math.max(18, rect.left + rect.width / 2 - box.left)), reach: gap > 0 && gap < 64 ? gap : 0 });
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const row = ref.current;
    row?.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => { row?.removeEventListener('scroll', request); window.removeEventListener('resize', request); cancelAnimationFrame(frame); };
  }, [open, ref]);
  const still = !enabled || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const close = () => { if (still) setOpen(null); else setOff(true); };
  useEffect(() => {
    if (open === null || off) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    // On a phone the screen can open below the fold: bring it into view once it has room.
    const timer = window.setTimeout(() => detail.current?.querySelector('.stage-screen')?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' }), still ? 0 : 520);
    return () => { document.removeEventListener('keydown', key); window.clearTimeout(timer); };
  }, [open, off, run]);
  const toggle = (index: number) => (event: MouseEvent<HTMLButtonElement>) => {
    press(index, event, event.currentTarget.closest('article') ?? undefined);
    if (open === index && !off) { close(); return; }
    setOff(false); setOpen(index); setRun(value => value + 1);
  };
  const ended = (event: AnimationEvent<HTMLElement>) => {
    if (off && event.target === event.currentTarget && event.animationName === 'stage-screen-off') { setOpen(null); setOff(false); }
  };
  const stage = open === null ? null : stages[open];
  return <>
    <div ref={ref} className="workflow-track swipe-row" data-motion={running ? 'playing' : 'paused'} data-open={open !== null}>
      {stages.map((item, index) => <article key={item.id} className="workflow-step" data-open={open === index && !off}>
        {wave(index)}
        <span className="workflow-glow" aria-hidden="true" /><span className="workflow-progress" aria-hidden="true" />
        <span className="step-number">{String(index + 1).padStart(2, '0')}</span><Icon name={item.icon} />
        <h3><button type="button" className="workflow-open" aria-expanded={open === index && !off} aria-controls={open === index ? panel : undefined} onClick={toggle(index)}>{item.title}</button></h3>
        <p>{item.detail}</p>
      </article>)}
    </div>
    <SwipeDots row={ref} count={stages.length} />
    <div ref={detail} className="workflow-detail" data-open={open !== null && !off} data-motion={still ? 'off' : 'on'} style={{ '--tube-x': `${tube.x}px`, '--reach': `${tube.reach}px` } as CSSProperties}>
      {stage && <span key={`tube-${run}`} className="stage-tube" data-off={off} aria-hidden="true" />}
      <div className="workflow-detail-inner">
        {stage && <section key={run} id={panel} className="stage-screen" data-off={off} aria-label={`${label}: ${stage.title}`} onAnimationEnd={ended}>
          <span className="stage-screen-scan" aria-hidden="true" />
          <header className="stage-screen-head"><span>{label}</span><strong>{stage.title}</strong>
            <button type="button" className="stage-screen-close" aria-label={t("Close")} onClick={close}><Icon name="close" /></button></header>
          <div className="stage-screen-body">
            <StageScreen id={stage.id} />
            <ul className="stage-offers">{stage.software.map((offer, i) => <li key={offer.title} style={{ '--o': i } as CSSProperties}>
              <Icon name={offer.icon} /><span><strong>{offer.title}</strong>{offer.detail}</span>
            </li>)}</ul>
          </div>
        </section>}
      </div>
    </div>
  </>;
}
