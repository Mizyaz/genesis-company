import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { SceneId } from './story/StoryPlayer';

const StoryPlayer = lazy(() => import('./story/StoryPlayer'));

/** The product film's own scenes, drawn live from the film's data (src/content/story/flow.json, written by
 * scripts/export-story-data.mjs): the scenes and the block the camera pushes in on are set per section in site.json.
 * The scenes and their data load when the stage nears the screen and play while it is on screen; readers who ask for
 * less motion see the last frame at rest. `until` ends the run that many frames into its last scene. `label` reads
 * what the scenes show. */
export function StoryStage({ scenes, focus, until, label }: { scenes: SceneId[]; focus?: string; until?: number; label: string }) {
  const stage = useRef<HTMLElement>(null), [near, setNear] = useState(false), [visible, setVisible] = useState(false);
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const approach = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); approach.disconnect(); } }, { rootMargin: '600px 0px' });
    const view = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .35 });
    approach.observe(el); view.observe(el);
    return () => { approach.disconnect(); view.disconnect(); };
  }, []);
  return <figure ref={stage} className="story-frame" role="img" aria-label={label}>
    <div aria-hidden="true">{near && <Suspense fallback={null}><StoryPlayer scenes={scenes} focus={focus} until={until} playing={!still && visible} /></Suspense>}</div>
  </figure>;
}
