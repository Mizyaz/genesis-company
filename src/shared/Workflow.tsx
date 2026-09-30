import { useEffect, useId, useRef, useState, type AnimationEvent, type CSSProperties, type MouseEvent } from 'react';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';
import { SwipeDots } from './SwipeDots';
import { usePress } from './DesignStory';
import { TubePanel, useScreenDismissal, type Offer } from './StageScreens';
import '../styles/workflow-detail.css';

type Stage = { id: string; title: string; detail: string; icon: string; software: Offer[] };

// Glides the page by `by` pixels in a fixed time (the page's own smooth scrolling has no set duration), then calls `done`.
// Scrolling by hand takes over at once.
function glide(by: number, done: () => void) {
  const from = window.scrollY, start = performance.now();
  let frame = 0;
  const stop = () => { cancelAnimationFrame(frame); window.removeEventListener('wheel', finish); window.removeEventListener('touchstart', finish); };
  const finish = () => { stop(); done(); };
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 420), ease = t < .5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2;
    window.scrollTo({ top: from + by * ease, behavior: 'instant' });
    if (t < 1) frame = requestAnimationFrame(step); else finish();
  };
  window.addEventListener('wheel', finish, { passive: true }); window.addEventListener('touchstart', finish, { passive: true });
  frame = requestAnimationFrame(step);
  return stop;
}

/** The stages of RF design. Each card opens what GENESIS offers at that stage: a tube grows out of the card and powers on
 * a screen below it like a cathode-ray tube: a bright line where the tube lands, then the box opens downwards under it
 * with the stage's animated picture and its software. Another card switches the screen; the same card, the close button
 * or Escape closes the box back into the line and the tube. */
export function Workflow({ stages, label }: { stages: Stage[]; label: string }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLDivElement>();
  const animations = useRef<Animation[]>([]);
  const detail = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [off, setOff] = useState(false); // The screen is powering off; it unmounts when that ends.
  const [run, setRun] = useState(0); // A new key powers the screen (and the tube) on again.
  // How the screen comes on: after the page has made room for it (wait), as a line that opens into the box (open),
  // or straight away in place of the screen that was on (switch).
  const [phase, setPhase] = useState<'wait' | 'open' | 'switch'>('open');
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
  const finish = () => { setOpen(null); setOff(false); };
  useScreenDismissal(open !== null && off, still, finish);
  const close = () => { if (still) finish(); else setOff(true); };
  useEffect(() => {
    if (open === null || off) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, off, run, still]);
  // Before the screen comes on, the page glides up (the card with it) if the open box would reach below the fold, so the
  // line and the box opening under it stay in view and nothing moves while it opens.
  useEffect(() => {
    if (phase !== 'wait' || open === null) return;
    const box = detail.current, card = ref.current?.children[open], content = box?.querySelector<HTMLElement>('.stage-screen-content');
    if (!box || !(card instanceof HTMLElement) || !content) { setPhase('open'); return; }
    const room = parseFloat(getComputedStyle(box).getPropertyValue('--room')) || 36;
    const bottom = box.getBoundingClientRect().top + room + content.offsetHeight + 24;
    const header = Math.max(0, document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0);
    const by = Math.min(bottom - window.innerHeight, card.getBoundingClientRect().top - header - 12);
    if (by < 24) { setPhase('open'); return; }
    return glide(by, () => setPhase('open'));
  }, [phase, open, run]);
  // With motion stopped, or when the box is taller than the view, the open screen is brought into view afterwards.
  const reveal = () => detail.current?.querySelector('.stage-screen')?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
  useEffect(() => { if (still && open !== null) reveal(); }, [open, run]);
  const toggle = (index: number) => (event: MouseEvent<HTMLButtonElement>) => {
    press(index, event, event.currentTarget.closest('article') ?? undefined);
    if (open === index && !off) { close(); return; }
    setPhase(still ? 'open' : open !== null && !off ? 'switch' : 'wait');
    setOff(false); setOpen(index); setRun(value => value + 1);
  };
  const ended = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (off && event.animationName === 'stage-screen-off') finish();
    if (!off && (event.animationName === 'stage-screen-on' || event.animationName === 'stage-screen-switch')) reveal();
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
      {stage && <section key={run} id={panel} className="stage-screen" data-phase={phase} data-off={off} aria-label={`${label}: ${stage.title}`} onAnimationEnd={ended}>
        <div className="stage-screen-frame"><div className="stage-screen-content">
          <TubePanel label={label} content={{ title: stage.title, image: stage.id, software: stage.software }} onClose={close} />
        </div></div>
      </section>}
    </div>
  </>;
}
