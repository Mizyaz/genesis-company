import { useId, useState } from 'react';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';
import '../styles/subscription-overview.css';

export type SubscriptionContent = {
  label: string; teamLabel: string; term: string; hint: string;
  parts: { id: string; icon: string; title: string; status: string; detail: string; items: string[] }[];
  setup: { title: string; steps: { title: string; detail: string }[] };
};

/** Explains the offer boundary. This is not an account, licensing or purchasing client. */
export function SubscriptionOverview({ content }: { content: SubscriptionContent }) {
  const [selected, setSelected] = useState(0);
  const { ref, running } = useVisibleMotion<HTMLElement>();
  const detailId = `subscription-${useId().replace(/:/g, '')}`;
  const part = content.parts[selected] ?? content.parts[0];
  return <figure ref={ref} className="subscription-overview" data-active={running} data-part={part.id} aria-label={content.label}>
    <div className="subscription-team"><Icon name="users" /><span>{content.teamLabel}</span><span>{content.term}</span></div>
    <div className="subscription-network" role="group" aria-label={content.label}>
      <svg className="subscription-connections" viewBox="0 0 600 260" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path className="subscription-trace" d="M300 26V144M135 194V144H465V194" />
        <path className="subscription-signal" d="M300 26V144M135 194V144H465V194" pathLength="100" />
        <circle cx="300" cy="144" r="3" />
      </svg>
      {content.parts.map((option, i) => <button type="button" className={`subscription-node subscription-node-${i}`} aria-pressed={selected === i} aria-controls={detailId} aria-label={option.title} onClick={() => setSelected(i)} key={option.id}>
        <Icon name={option.icon} /><strong>{option.title}</strong><span>{option.status}</span>
      </button>)}
    </div>
    <p className="subscription-hint">{content.hint}</p>
    <figcaption id={detailId} className="subscription-detail" aria-live="polite" aria-atomic="true">
      <span className="subscription-status">{part.status}</span><h4>{part.title}</h4><p>{part.detail}</p>
      <ul>{part.items.map(item => <li key={item}>{item}</li>)}</ul>
    </figcaption>
  </figure>;
}

export function SubscriptionStart({ content }: { content: SubscriptionContent['setup'] }) {
  const titleId = `subscription-start-${useId().replace(/:/g, '')}`;
  return <section className="subscription-start" aria-labelledby={titleId}>
    <h4 id={titleId}>{content.title}</h4>
    <ol>{content.steps.map((step, i) => <li key={step.title}><span aria-hidden="true">0{i + 1}</span><div><h5>{step.title}</h5><p>{step.detail}</p></div></li>)}</ol>
  </section>;
}
