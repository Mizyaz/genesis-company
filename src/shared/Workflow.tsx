import { useEffect, useRef } from 'react';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';

type Stage = { title: string; detail: string; icon: string };

export function Workflow({ stages }: { stages: Stage[] }) {
  const { ref, running } = useVisibleMotion<HTMLDivElement>();
  const animations = useRef<Animation[]>([]);
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
  useEffect(() => {
    animations.current.forEach(animation => {
      if (running) { animation.currentTime = 0; animation.play(); }
      else animation.pause();
    });
  }, [running, stages.length]);
  return <div ref={ref} className="workflow-track" data-motion={running ? 'playing' : 'paused'}>
    {stages.map((stage, index) => <article key={stage.title} className="workflow-step">
      <span className="workflow-glow" aria-hidden="true" /><span className="workflow-progress" aria-hidden="true" />
      <span className="step-number">{String(index + 1).padStart(2, '0')}</span><Icon name={stage.icon} /><h3>{stage.title}</h3><p>{stage.detail}</p>
    </article>)}
  </div>;
}
