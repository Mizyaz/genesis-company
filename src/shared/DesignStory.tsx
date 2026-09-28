import { useEffect, useId, useState, type ReactNode } from 'react';
import { useLanguage } from './Language';
import { useVisibleMotion } from './MotionSettings';
import { Icon } from './ui';
import { band, candidates, chart, curvePath, failingPath, limitDb, ports, timeline, x, y, type Frame } from './designStory';
import '../styles/design-story.css';

export type StoryContent = {
  caption: string; note: string; candidate: string; best: string; response: string;
  target: { title: string; items: string[] };
  solver: { title: string; running: string; outside: string; met: string };
  steps: { title: string; detail: string }[];
};
const final = timeline.length - 1;

/** Pixelated candidate between three ports; pixels switch as GENESIS proposes the next layout. */
function Layout({ candidate }: { candidate: number }) {
  return <svg className="story-layout" viewBox="0 0 132 132" aria-hidden="true">
    {ports.map(port => {
      const py = 26 + port.row * 10, edge = port.side === 'left' ? 21 : 111, end = port.side === 'left' ? 7 : 125;
      return <g className="story-port" key={`${port.side}-${port.row}`}><path d={`M${edge} ${py}H${end}`} /><circle cx={end} cy={py} r="3.5" /></g>;
    })}
    <rect className="story-layout-frame" x="21" y="21" width="90" height="90" rx="2" />
    <g className="story-pixels">{candidates[Math.max(candidate, 0)].flatMap((row, r) => [...row].map((cell, c) =>
      <rect key={`${r}-${c}`} className="story-pixel" data-on={candidate >= 0 && cell === '#'} style={{ transitionDelay: `${(r + c) * 24}ms` }}
        x={22.1 + c * 10} y={22.1 + r * 10} width="7.8" height="7.8" rx="1" />))}</g>
  </svg>;
}

/** Target mask and every simulated response so far; the newest curve is judged against the mask. */
function Response({ frame }: { frame: Frame }) {
  const left = x(band.start), right = x(band.end), limit = y(limitDb);
  const hatch = `story-hatch-${useId().replace(/:/g, '')}`;
  return <svg className="story-chart" viewBox="0 0 220 120" aria-hidden="true">
    <defs><pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" /></pattern></defs>
    <g className="story-mask"><rect x={left} y={limit} width={right - left} height={chart.bottom - limit} fill={`url(#${hatch})`} /><path d={`M${left} ${limit}H${right}`} /></g>
    <path className="story-axis" d={`M${chart.left} ${chart.top - 4}V${chart.bottom}H${chart.right + 4}`} />
    {candidates.slice(0, frame.drawn).map((_, i) => <path key={i} d={curvePath(i)} pathLength="1"
      className={`story-curve ${i < frame.drawn - 1 ? 'is-earlier' : frame.met ? 'is-met' : 'is-current'}`} />)}
    {frame.judged && !frame.met && <path className="story-fail" d={failingPath(frame.candidate)} />}
  </svg>;
}

/** One design loop told in five steps. Illustrative data; motion pauses offscreen and when stopped. */
export function DesignStory({ content, brand, compact = false }: { content: StoryContent; brand: ReactNode; compact?: boolean }) {
  const { t } = useLanguage();
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (index === final) setCycle(value => value + 1);
      setIndex(index === final ? 0 : index + 1);
    }, timeline[index].ms);
    return () => window.clearTimeout(timer);
  }, [index, running]);
  const frame = enabled ? timeline[index] : timeline[final];
  const status = frame.met ? content.solver.met : frame.judged ? content.solver.outside : frame.step === 3 ? content.solver.running : '';
  return <figure ref={ref} className={`design-story${compact ? ' design-story-compact' : ''}`} aria-label={content.caption}
    data-motion={enabled ? 'on' : 'off'} data-step={frame.step} data-flow={frame.flow} data-met={Boolean(frame.met)}>
    <div className="story-scene" key={cycle}>
      <div className="story-card story-target" data-active={frame.step === 1}>
        <span className="story-card-title"><Icon name="document" />{content.target.title}</span>
        <ul>{content.target.items.map(item => <li key={item}><span className="story-check"><Icon name="check" /></span>{item}</li>)}</ul>
      </div>
      <span className="story-link story-link-spec" aria-hidden="true" />
      <div className="story-card story-engine" data-active={frame.step === 2}>
        <span className="story-card-title">{brand}</span>
        <Layout candidate={frame.candidate} />
        <span className="story-card-status">{frame.candidate < 0 ? '' : frame.met ? content.best : `${content.candidate} ${frame.candidate + 1}`}</span>
      </div>
      <span className="story-link story-link-layout" aria-hidden="true" />
      <div className="story-card story-solver" data-active={frame.step >= 3}>
        <span className="story-card-title"><Icon name="wave" />{content.solver.title}</span>
        <Response frame={frame} />
        <span className="story-card-status">{status}</span>
      </div>
      <span className="story-return" aria-hidden="true"><span>{content.response}</span></span>
    </div>
    {compact ? <figcaption className="story-now">
      <span className="story-now-step"><span>{frame.step} / {content.steps.length}</span> {content.steps[frame.step - 1].title}</span>
      <a href="#/explore/story">{t('Discover our story')} <Icon name="diagonal" /></a>
    </figcaption> : <figcaption>
      <ol className="story-steps">{content.steps.map((step, i) => <li key={step.title} aria-current={enabled && i + 1 === frame.step ? 'step' : undefined}>
        <strong>{step.title}</strong><span>{step.detail}</span></li>)}</ol>
      <p className="story-note">{content.note}</p>
    </figcaption>}
  </figure>;
}
