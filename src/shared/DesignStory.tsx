import { useEffect, useId, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useVisibleMotion } from './MotionSettings';
import { Icon } from './ui';
import { band, chart, curvePath, designs, failingPath, limitDb, timeline, x, y, type Frame } from './designStory';
import '../styles/design-story.css';

export type StoryContent = {
  caption: string; note: string;
  designer: { title: string; spec: { label: string; value: string }[] };
  engine: { iteration: string; best: string };
  tools: { title: string; chips: string[]; running: string; below: string; met: string };
  steps: { title: string; detail: string }[];
  actions: { designer: string; engine: string; tools: string };
};
const final = timeline.length - 1;
/** The frame where a design (-1 before the first) is at a step. */
const frameAt = (design: number, step: number) => timeline.findIndex(frame => frame.design === design && frame.step === step);

/** A designer at the workstation, seen from behind: the person who sets the target and decides. */
function DesignerArt() {
  return <svg className="story-art" viewBox="0 0 160 100" aria-hidden="true">
    <rect className="art-screen" x="56" y="8" width="96" height="62" rx="6" />
    <g className="art-spec"><path d="M68 24h40M68 36h52M68 48h34M68 60h46" /><circle cx="128" cy="24" r="2.5" /><circle cx="134" cy="36" r="2.5" /><circle cx="116" cy="48" r="2.5" /><circle cx="128" cy="60" r="2.5" /></g>
    <path className="art-wire" d="M104 70v20M88 90h32M4 94h152" />
    <g className="art-person">
      <rect x="32" y="56" width="10" height="12" rx="3" />
      <path d="M12 94c0-17 11-27 25-27s25 10 25 27Z" />
      <circle cx="37" cy="46" r="12" />
      <path className="art-hair" d="M25 45a12 12 0 0 1 24 0c-3-4-7-6-12-6s-9 2-12 6Z" />
    </g>
  </svg>;
}

// Schematic symbols shared by the design loop and the story scene: coils and ground in SVG path syntax.
export const coil = (x: number, y: number, turns: number, span: number) =>
  `M${x} ${y}` + `c0-7 ${span / turns} -7 ${span / turns} 0`.repeat(turns);
export const verticalCoil = (x: number, y: number, turns: number, span: number) =>
  `M${x} ${y}` + `c7 0 7 ${span / turns} 0 ${span / turns}`.repeat(turns);
export const ground = (x: number, y: number) => `M${x - 6} ${y}h12M${x - 3.5} ${y + 3}h7M${x - 1} ${y + 6}h2`;

/** The feel of a click on part of an illustration, shared with the story scene: the part dips and springs back, and a
 * ripple spreads from where it was touched (from its middle for keys). Nothing moves when motion is stopped or reduced. */
export function usePress<Part extends string>(enabled: boolean) {
  const [ripple, setRipple] = useState<{ part: Part; left: number; top: number; size: number; key: number } | null>(null);
  function press(part: Part, event: MouseEvent<HTMLElement>, target: HTMLElement = event.currentTarget) {
    if (!enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = target.getBoundingClientRect(), keys = event.detail === 0;
    const left = keys ? box.width / 2 : event.clientX - box.left, top = keys ? box.height / 2 : event.clientY - box.top;
    setRipple({ part, left, top, size: 2 * Math.hypot(Math.max(left, box.width - left), Math.max(top, box.height - top)), key: event.timeStamp });
    // Wide parts dip less, so every part moves about the same few pixels; the part lights up for a moment as it is hit.
    const dip = Math.max(.97, 1 - 8 / box.width);
    target.animate?.([{ scale: `${dip}`, filter: 'brightness(1.3)' }, { scale: '1.012', offset: .55 }, { scale: '1', filter: 'brightness(1)' }], { duration: 420, easing: 'cubic-bezier(.2, .7, .3, 1)' });
  }
  const wave = (part: Part) => ripple?.part === part && <span className="press-ripple" aria-hidden="true">
    <span key={ripple.key} style={{ left: ripple.left, top: ripple.top, width: ripple.size, height: ripple.size }} onAnimationEnd={() => setRipple(null)} />
  </span>;
  return { press, wave };
}

/** One amplifier stage as a schematic: series inductor and shunt capacitor at the input, the transistor,
 * series capacitor and shunt inductor at the output. The elements change size with every design GENESIS prepares. */
function CircuitArt({ design }: { design: number }) {
  const current = designs[Math.max(design, 0)];
  const c1 = current.c1 / 2, c2 = current.c2 / 2;
  return <svg className="story-art" viewBox="0 0 200 100" aria-hidden="true">
    <path className="art-wire" d={`M14 50H22M46 50H86M60 50v7M60 61v7M92 40H112M116 40H186M140 40v5M140 63v5M92 60H100V70${ground(60, 68)}${ground(140, 68)}${ground(100, 70)}`} />
    <path className="art-device" d="M86 38V62M92 35V65" /><path className="art-wire" d="M97 57l3 3-3 3" />
    <g className="art-sized" key={design} data-on={design >= 0}>
      <path d={coil(22, 50, current.l1, 24)} />
      <path d={`M${60 - c1} 57h${current.c1}M${60 - c1} 61h${current.c1}M112 ${40 - c2}v${current.c2}M116 ${40 - c2}v${current.c2}`} />
      <path d={verticalCoil(140, 45, current.l2, 18)} />
    </g>
    <circle className="art-port" cx="10" cy="50" r="4" /><circle className="art-port" cx="190" cy="40" r="4" />
    {design >= 0 && <text className="art-label" x="100" y="24" textAnchor="middle">W {current.size}</text>}
  </svg>;
}

/** Gain target and every simulated response so far; the newest curve is judged against the target.
 * A design simulated again on request draws its curve again (`rerun`). */
function Response({ frame, rerun }: { frame: Frame; rerun: { design: number; run: number } }) {
  const left = x(band.start), right = x(band.end), limit = y(limitDb);
  const hatch = `story-hatch-${useId().replace(/:/g, '')}`;
  return <svg className="story-art story-chart" viewBox="0 0 220 120" aria-hidden="true">
    <defs><pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" /></pattern></defs>
    <g className="story-mask"><rect x={left} y={limit} width={right - left} height={chart.bottom - limit} fill={`url(#${hatch})`} /><path d={`M${left} ${limit}H${right}`} /></g>
    <path className="story-axis" d={`M${chart.left} ${chart.top - 4}V${chart.bottom}H${chart.right + 4}`} />
    {designs.slice(0, frame.drawn).map((_, i) => <path key={`${i}.${rerun.design === i ? rerun.run : 0}`} d={curvePath(i)} pathLength="1"
      className={`story-curve ${i < frame.drawn - 1 ? 'is-earlier' : frame.met ? 'is-met' : 'is-current'}`} />)}
    {frame.judged && !frame.met && <path className="story-fail" d={failingPath(frame.design)} />}
  </svg>;
}

/** Two rails between stations: the upper carries work forward, the lower brings results back. */
function Link({ forward, back }: { forward: boolean; back: boolean }) {
  return <span className="story-link" aria-hidden="true"><span className="story-rail" data-on={forward} /><span className="story-rail story-rail-back" data-on={back} /></span>;
}

type Station = 'designer' | 'engine' | 'tools';

/** Designer, GENESIS and CAD tools in one loop, told in five steps. Motion pauses offscreen and when stopped.
 * Every station is also a button that does its part now: the team sets the target again, GENESIS prepares the next
 * design, the tools simulate the current one; the loop carries on from there. With motion stopped, a click shows the
 * result of that part, still. */
export function DesignStory({ content, brand }: { content: StoryContent; brand: ReactNode }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [rerun, setRerun] = useState({ design: -1, run: 0 });
  const [touched, setTouched] = useState(false);
  const { press, wave } = usePress<Station>(enabled);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (index === final) setCycle(value => value + 1);
      setIndex(index === final ? 0 : index + 1);
    }, timeline[index].ms);
    return () => window.clearTimeout(timer);
  }, [index, running, clicks]);
  const frame = enabled || touched ? timeline[index] : timeline[final];
  const play = (station: Station) => (event: MouseEvent<HTMLButtonElement>) => {
    press(station, event, event.currentTarget.parentElement ?? undefined);
    const design = Math.max(frame.design, 0);
    if (station === 'designer') { setCycle(value => value + 1); setIndex(0); }
    else if (station === 'engine') setIndex(frameAt((frame.design + 1) % designs.length, 2));
    else { setRerun(value => ({ design, run: value.run + 1 })); setIndex(frameAt(design, enabled ? 3 : 4)); }
    setTouched(true); setClicks(value => value + 1);
  };
  const engine = frame.design < 0 ? '' : frame.met ? content.engine.best : `${content.engine.iteration} ${frame.design + 1}`;
  const tools = frame.met ? content.tools.met : frame.judged ? content.tools.below : frame.step === 3 ? content.tools.running : '';
  return <figure ref={ref} className="design-story" aria-label={content.caption}
    data-motion={enabled ? 'on' : 'off'} data-step={frame.step} data-met={Boolean(frame.met)}>
    <div className="story-scene">
      <div className="story-card story-designer" data-active={frame.step === 1 || frame.step === 5}>
        <button type="button" className="story-press" aria-label={content.actions.designer} onClick={play('designer')} />
        {wave('designer')}
        <span className="story-card-title"><Icon name="users" />{content.designer.title}</span>
        <DesignerArt />
        <dl className="story-spec" key={cycle}>{content.designer.spec.map((row, i) => <div key={row.label} style={{ '--row': i } as CSSProperties}>
          <dt>{row.label}</dt><dd>{row.value}</dd><span className="story-check"><Icon name="check" /></span>
        </div>)}</dl>
      </div>
      <Link key={`target-${clicks}`} forward={frame.flow === 'target'} back={frame.flow === 'review'} />
      <div className="story-card story-engine" data-active={frame.step === 2 || frame.step === 4}>
        <button type="button" className="story-press" aria-label={content.actions.engine} onClick={play('engine')} />
        {wave('engine')}
        <span className="story-card-title">{brand}</span>
        <CircuitArt design={frame.design} />
        <span className="story-card-status">{engine}</span>
      </div>
      <Link key={`jobs-${clicks}`} forward={frame.flow === 'jobs'} back={frame.flow === 'results'} />
      <div className="story-card story-tools" data-active={frame.step === 3}>
        <button type="button" className="story-press" aria-label={content.actions.tools} onClick={play('tools')} />
        {wave('tools')}
        <span className="story-card-title"><Icon name="layers" />{content.tools.title}</span>
        <span className="story-chips">{content.tools.chips.map((chip, i) =>
          <span key={chip} data-on={i < 2 ? frame.step === 3 : Boolean(frame.met)}>{chip}</span>)}</span>
        <Response key={cycle} frame={frame} rerun={rerun} />
        <span className="story-card-status">{tools}</span>
      </div>
    </div>
    <figcaption className="story-now">
      <span className="story-now-step" aria-hidden="true"><span>{frame.step} / {content.steps.length}</span> {content.steps[frame.step - 1].title}</span>
      <span className="story-now-note">{content.note}</span>
    </figcaption>
    <ol className="sr-only">{content.steps.map(step => <li key={step.title}>{step.title}: {step.detail}</li>)}</ol>
  </figure>;
}
