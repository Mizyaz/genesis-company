import type { CSSProperties } from 'react';
import { CARDS } from './ProcessCards';
import { useMotion } from './MotionSettings';

/** The process in one line: every step with a few words, a pulse running through them in turn. The whole line opens
 * the page that shows each step on real designs. */
export function Pipeline({ more }: { more: string }) {
  const { enabled } = useMotion();
  return <a className="pipeline" href="#/process" data-motion={enabled ? 'on' : 'off'}>
    <ol>{CARDS.map((card, i) => <li key={card.id} style={{ '--i': i, '--c': `var(--step-${i})` } as CSSProperties}>
      <span className="pl-dot">{String(i + 1).padStart(2, '0')}</span><strong>{card.step}</strong><span className="pl-short">{card.short}</span>
    </li>)}</ol>
    <span className="pl-more">{more} <span aria-hidden="true">→</span></span>
  </a>;
}
