import type { ReactNode } from 'react';
import { Icon } from './ui';
import { CircuitArt, Response } from './DesignStory';
import { designs, timeline } from './designStory';

type Pillar = { title: string; icon: string; items: string[] };
export type PillarsContent = { caption: string; left: Pillar; right: Pillar; outcome: string };

/** RFIC expertise and AI agents feeding GENESIS. Static: the design loop elsewhere carries the motion. */
export function DesignPillars({ content, brand }: { content: PillarsContent; brand: ReactNode }) {
  const art = [<CircuitArt key="circuit" design={designs.length - 1} />, <Response key="response" frame={timeline[timeline.length - 1]} />];
  return <figure className="design-pillars" aria-label={content.caption}>
    <div className="pillars-row">{[content.left, content.right].map((pillar, i) => <div key={pillar.title} className="pillar">
      <span className="pillar-title"><Icon name={pillar.icon} />{pillar.title}</span>
      {art[i]}
      <ul className="pillar-chips">{pillar.items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>)}</div>
    <span className="pillars-join" aria-hidden="true" />
    <div className="pillars-outcome">{brand}<span>{content.outcome}</span></div>
  </figure>;
}
