import type { ReactNode } from 'react';
import { CircuitArtwork } from './CircuitArtwork';
import { EnergyFlow } from './EnergyFlow';
import { useVisibleMotion } from './MotionSettings';

type LoopNode = { title: string; icon: string; items: string[] };
type LoopContent = { left: LoopNode; right: LoopNode; outcome: string; caption: string };

/** Two contributors feeding one outcome. All content and branding are supplied. */
export function DesignLoop({ content, brand }: { content: LoopContent; brand: ReactNode }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  return <figure ref={ref} className="design-loop" aria-label={content.caption}>
    <div className="design-loop-graphic">
      <EnergyFlow paused={!enabled} />
      {[content.left, content.right].map((node, index) => <div key={index} className={`loop-node ${index === 0 ? 'loop-node-left' : 'loop-node-right'}`}>
        <CircuitArtwork kind={index === 0 ? 'schematic' : 'engine'} running={running} />
        <h3>{node.title}</h3>
        <span className="sr-only">{node.items.join('. ')}</span>
      </div>)}
      <div className="loop-outcome">{brand}<p>{content.outcome}</p></div>
    </div>
  </figure>;
}
