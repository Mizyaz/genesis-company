import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { SceneId } from './story/StoryPlayer';
import { Icon } from './ui';
import '../styles/journey.css';

const StoryPlayer = lazy(() => import('./story/StoryPlayer'));

export type JourneyContent = { label: string; next: string; done: string; focus?: string; stages: { scene: SceneId; title: string; detail: string; window?: [number, number] }[]; scale: { value: string; label: string }[] };

/** The flow as the reader scrolls it: the section holds still while the film's scenes play in step with the scroll, one
 * stage per screen, the stage on screen lit in the list (one stage at a time on phones) and the next one named at the
 * bottom; a stage can play only the part of its scene that fills the frame (`window`). The reader drives it; nothing
 * scrolls by itself. At its end the scale of what the flow has done. Readers who ask for less motion see the stages as
 * a list beside the last scene at rest. */
export function ScrollJourney({ content }: { content: JourneyContent }) {
  const box = useRef<HTMLDivElement>(null), [near, setNear] = useState(false), [scrub, setScrub] = useState(0);
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const n = content.stages.length;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const approach = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); approach.disconnect(); } }, { rootMargin: '600px 0px' });
    approach.observe(el);
    if (still) return () => approach.disconnect();
    let frame = 0;
    const measure = () => {
      frame = 0;
      const { top, height } = el.getBoundingClientRect(), room = height - window.innerHeight;
      setScrub(room > 0 ? Math.min(n - 1e-3, Math.max(0, -top / room * n)) : 0);
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    measure();
    return () => { approach.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', request); window.removeEventListener('resize', request); };
  }, [n, still]);
  const at = still ? n - 1 : Math.floor(scrub), part = still ? 1 : scrub - at, next = content.stages[at + 1];
  return <div ref={box} className={`journey${still ? ' is-still' : ''}`} style={{ ['--stages' as string]: n }} aria-label={content.label}>
    <div className="journey-sticky">
      <div className="journey-bar" aria-hidden="true"><span style={{ transform: `scaleX(${still ? 1 : scrub / n})` }} /></div>
      <ol className="journey-stages">{content.stages.map((stage, i) => <li key={stage.scene} className={i === at ? 'is-on' : i < at ? 'is-done' : ''}>
        <span className="journey-dot" aria-hidden="true" /><div><strong>{stage.title}</strong><p>{stage.detail}</p></div>
      </li>)}</ol>
      <figure className="story-frame journey-stage" role="img" aria-label={content.stages[at].detail}>
        <div aria-hidden="true">{near && <Suspense fallback={null}><StoryPlayer scenes={content.stages.map(s => s.scene)} focus={content.focus} playing={false} scrub={at + part} windows={content.stages.map(s => s.window)} /></Suspense>}</div>
      </figure>
      <ul className={`journey-scale${at === n - 1 && part > .35 ? ' is-on' : ''}`}>{content.scale.map(item => <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>)}</ul>
      {!still && <p className="journey-next" aria-hidden="true"><Icon name="arrow" />{next ? <>{content.next} <strong>{next.title}</strong></> : content.done}</p>}
    </div>
  </div>;
}
