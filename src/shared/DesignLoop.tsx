import type { ReactNode } from 'react';
import { Icon } from './ui';
import { EnergyFlow } from './EnergyFlow';
import { useMotion } from './MotionSettings';

type LoopNode = { title: string; icon: string; items: string[] };
type LoopContent = { left: LoopNode; right: LoopNode; outcome: string; caption: string };

/** Two contributors feeding one outcome. All content and branding are supplied. */
export function DesignLoop({ content, brand }: { content: LoopContent; brand: ReactNode }) {
  const { enabled } = useMotion();
  return <figure className="design-loop" aria-label={content.caption}>
    <div className="design-loop-graphic">
      <EnergyFlow paused={!enabled} />
      {[content.left, content.right].map((node, index) => <div key={node.title} className={`loop-node ${index === 0 ? 'loop-node-left' : 'loop-node-right'}`}>
        <span className="loop-node-icon"><Icon name={node.icon} /></span><h3>{node.title}</h3>
        <ul>{node.items.map(item => <li key={item}>{item}</li>)}</ul>
      </div>)}
      <div className="loop-outcome">{brand}<p>{content.outcome}</p></div>
    </div>
  </figure>;
}
