import { useLanguage } from './Language';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';
import '../styles/design-bridge.css';

type Actor = { title: string; detail: string; compact: string };
type BridgeContent = {
  designer: Actor; engine: Actor; tools: Actor;
  intent: string; workflow: string; feedback: string;
  environment: string; assets: string; caption: string;
};

function Connection({ label, feedback, phase }: { label: string; feedback: string; phase: number }) {
  const paths = ['M0 32C52 32 108 32 160 32', 'M160 68C108 68 52 68 0 68'];
  return <div className="bridge-connection">
    <span className="bridge-link-label">{label}</span>
    <svg viewBox="0 0 160 100" fill="none" aria-hidden="true">
      {paths.map((d, index) => <g key={d} className={index ? 'bridge-return' : 'bridge-forward'}>
        <path className="bridge-rail" d={d} />
        <path className="bridge-stream bridge-stream-glow" d={d} pathLength="240" data-phase={index ? 3 - phase : phase} />
        <path className="bridge-stream" d={d} pathLength="240" data-phase={index ? 3 - phase : phase} />
      </g>)}
      <path className="bridge-direction" d="m149 27 6 5-6 5M11 63l-6 5 6 5" />
    </svg>
    <span className="bridge-link-label bridge-feedback-label">{feedback}</span>
  </div>;
}

function ActorGlyph({ designer = false }: { designer?: boolean }) {
  return <svg className="bridge-actor-glyph" viewBox="0 0 72 58" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    {designer ? <><circle cx="25" cy="17" r="8" /><path d="M9 45v-8c0-11 32-11 32 0v8M45 12h17v34H45M49 21h9m-9 7h9m-9 7h5" /><path className="bridge-glyph-accent" d="m16 45 7-9 7 8 7-4h18" /></>
      : <><rect x="7" y="7" width="58" height="39" rx="4" /><path d="M7 17h58M25 7v39M23 53h26m-13-7v7" /><path className="bridge-glyph-accent" d="M34 25h11v13H34Zm11 6h11m-2-6v13" /></>}
  </svg>;
}

function LockGlyph() {
  return <svg className="bridge-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>;
}

/** Presentation only: the same actor/flow diagram is used in compact and full form. */
export function DesignBridge({ content, brand, compact = false }: { content: BridgeContent; brand: ReactNode; compact?: boolean }) {
  const { t } = useLanguage();
  const { ref: root, enabled, running } = useVisibleMotion<HTMLElement>();
  const animations = useRef<Animation[]>([]);

  useEffect(() => {
    if (!root.current) return;
    const streams = Array.from(root.current.querySelectorAll<SVGPathElement>('.bridge-stream'));
    const tracks = streams.map(stream => stream.animate([
      { strokeDashoffset: '24', opacity: 0, offset: 0 },
      { strokeDashoffset: '24', opacity: 1, offset: .02 },
      { strokeDashoffset: '-240', opacity: 1, offset: .24 },
      { strokeDashoffset: '-260', opacity: 0, offset: .26 },
      { strokeDashoffset: '-260', opacity: 0, offset: 1 },
    ], { duration: 6400, delay: Number(stream.dataset.phase) * 1600, iterations: Infinity, easing: 'linear', fill: 'both' }));
    const halo = root.current.querySelector('.bridge-halo');
    if (halo) tracks.push(halo.animate([{ opacity: .35, transform: 'scale(.96)' }, { opacity: .85, transform: 'scale(1.04)' }, { opacity: .35, transform: 'scale(.96)' }], { duration: 3200, iterations: Infinity, easing: 'ease-in-out' }));
    tracks.forEach(animation => animation.pause()); animations.current = tracks;
    return () => { tracks.forEach(animation => animation.cancel()); animations.current = []; };
  }, [compact]);

  useEffect(() => {
    animations.current.forEach(animation => {
      if (running) { animation.currentTime = 0; animation.play(); }
      else animation.pause();
    });
  }, [running, compact]);

  return <figure ref={root} className={`design-bridge ${compact ? 'design-bridge-compact' : ''}`} data-motion={running ? 'playing' : enabled ? 'offscreen' : 'paused'} aria-label={content.caption}>
    <div className="bridge-scene">
      <article className="bridge-actor bridge-designer">
        {!compact && <><span className="bridge-actor-index">{t("01 / HUMAN INTENT")}</span><ActorGlyph designer /></>}
        <h3>{compact ? content.designer.compact : content.designer.title}</h3>
        {!compact && <p>{content.designer.detail}</p>}
      </article>
      <Connection label={content.intent} feedback={content.feedback} phase={0} />
      <article className="bridge-actor bridge-engine">
        <span className="bridge-halo" aria-hidden="true" />
        {!compact && <span className="bridge-actor-index">{t("02 / CONNECTED INTELLIGENCE")}</span>}
        {compact ? <h3>{content.engine.compact}</h3> : <><h3>{brand}</h3><p className="bridge-engine-role"><Icon name="spark" />{content.engine.title}</p><p>{content.engine.detail}</p></>}
      </article>
      <Connection label={content.workflow} feedback={content.feedback} phase={1} />
      <article className="bridge-actor bridge-tools">
        {!compact && <><span className="bridge-actor-index">{t("03 / ENGINEERING EXECUTION")}</span><ActorGlyph /></>}
        <h3>{compact ? content.tools.compact : content.tools.title}</h3>
        {!compact && <><p>{content.tools.detail}</p><div className="bridge-private"><LockGlyph /><span><strong>{content.assets}</strong><small>{content.environment}</small></span></div></>}
      </article>
    </div>
    {compact && <figcaption><a href="#/explore/story">{t("Discover our story")} <Icon name="diagonal" /></a></figcaption>}
  </figure>;
}
