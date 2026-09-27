import { useId, useState } from 'react';
import { Icon } from './ui';
import { CircuitArtwork } from './CircuitArtwork';
import { useVisibleMotion } from './MotionSettings';
import '../styles/subscription-overview.css';

export type SubscriptionContent = {
  label: string; teamLabel: string; term: string; hint: string;
  flow: { label: string; designer: string; genesis: string; toolsLabel: string; tools: string; feedback: string };
  parts: { id: string; icon: string; title: string; status: string; detail: string; items: string[] }[];
  setup: { title: string; steps: { title: string; detail: string }[] };
};

function FlowConnection() {
  return <div className="subscription-connection" aria-hidden="true"><svg viewBox="0 0 100 24" fill="none">
    <path className="subscription-trace" d="M2 12H94m-7-6 7 6-7 6" />
    <path className="subscription-signal" d="M2 12H94" pathLength="100" />
  </svg></div>;
}

/** Explains the offer boundary. This is not an account, licensing or purchasing client. */
export function SubscriptionOverview({ content }: { content: SubscriptionContent }) {
  const [selected, setSelected] = useState(0);
  const { ref, running } = useVisibleMotion<HTMLElement>();
  const detailId = `subscription-${useId().replace(/:/g, '')}`;
  const part = content.parts[selected] ?? content.parts[0];
  return <figure className="subscription-overview" data-active={running} data-part={part.id} aria-label={content.label}>
    <section ref={ref} className="subscription-role" aria-label={content.flow.label}>
      <div className="subscription-heading"><h4>{content.flow.label}</h4><span>{content.term}</span></div>
      <div className="subscription-flow">
        <div className="subscription-actor"><CircuitArtwork kind="designer" running={running} /><div><h5>{content.teamLabel}</h5><p>{content.flow.designer}</p></div></div>
        <FlowConnection />
        <div className="subscription-actor subscription-genesis"><CircuitArtwork kind="engine" running={running} /><div><h5>GENESIS</h5><p>{content.flow.genesis}</p></div></div>
        <FlowConnection />
        <div className="subscription-actor"><CircuitArtwork kind="simulation" running={running} /><div><h5>{content.flow.toolsLabel}</h5><p>{content.flow.tools}</p></div></div>
      </div>
      <div className="subscription-feedback"><svg viewBox="0 0 1000 32" preserveAspectRatio="none" fill="none" aria-hidden="true"><path className="subscription-trace" d="M998 0V24H2V0" /><path className="subscription-signal" d="M998 0V24H2V0" pathLength="100" /></svg><span><Icon name="arrow" />{content.flow.feedback}</span></div>
    </section>
    <div className="subscription-scope-heading"><h4>{content.label}</h4><p>{content.hint}</p></div>
    <div className="subscription-choices" role="group" aria-label={content.label}>
      {content.parts.map((option, i) => <button type="button" className="subscription-choice" aria-pressed={selected === i} aria-controls={detailId} aria-label={option.title} onClick={() => setSelected(i)} key={option.id}>
        <Icon name={option.icon} /><span>{option.title}</span>
      </button>)}
    </div>
    <figcaption id={detailId} className="subscription-detail" aria-live="polite" aria-atomic="true">
      <div><span className="subscription-status">{part.status}</span><h4>{part.title}</h4><p>{part.detail}</p></div>
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
