import { useId, useState } from 'react';
import { Icon } from './ui';
import '../styles/subscription-overview.css';

export type SubscriptionContent = {
  label: string; hint: string;
  modules: { title: string; intro: string; items: { icon: string; title: string; detail: string }[] };
  parts: { id: string; icon: string; title: string; status: string; detail: string; items: string[] }[];
  setup: { title: string; steps: { title: string; detail: string }[] };
};

/** What the software does, then the offer boundary. This is not an account, licensing or purchasing client. */
export function SubscriptionOverview({ content }: { content: SubscriptionContent }) {
  const [selected, setSelected] = useState(0);
  const modulesId = `subscription-modules-${useId().replace(/:/g, '')}`;
  const detailId = `subscription-${useId().replace(/:/g, '')}`;
  const part = content.parts[selected] ?? content.parts[0];
  return <div className="subscription-overview" data-part={part.id}>
    <section className="subscription-modules" aria-labelledby={modulesId}>
      <div className="subscription-modules-heading"><h4 id={modulesId}>{content.modules.title}</h4><p>{content.modules.intro}</p></div>
      <ul>{content.modules.items.map(module => <li key={module.title}>
        <span className="subscription-module-icon"><Icon name={module.icon} /></span>
        <div><h5>{module.title}</h5><p>{module.detail}</p></div>
      </li>)}</ul>
    </section>
    <div className="subscription-scope-heading"><h4>{content.label}</h4><p>{content.hint}</p></div>
    <div className="subscription-choices" role="group" aria-label={content.label}>
      {content.parts.map((option, i) => <button type="button" className="subscription-choice" aria-pressed={selected === i} aria-controls={detailId} aria-label={option.title} onClick={() => setSelected(i)} key={option.id}>
        <Icon name={option.icon} /><span>{option.title}</span>
      </button>)}
    </div>
    <div id={detailId} className="subscription-detail" aria-live="polite" aria-atomic="true">
      <div><span className="subscription-status">{part.status}</span><h4>{part.title}</h4><p>{part.detail}</p></div>
      <ul>{part.items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  </div>;
}

export function SubscriptionStart({ content }: { content: SubscriptionContent['setup'] }) {
  const titleId = `subscription-start-${useId().replace(/:/g, '')}`;
  return <section className="subscription-start" aria-labelledby={titleId}>
    <h4 id={titleId}>{content.title}</h4>
    <ol>{content.steps.map((step, i) => <li key={step.title}><span aria-hidden="true">0{i + 1}</span><div><h5>{step.title}</h5><p>{step.detail}</p></div></li>)}</ol>
  </section>;
}
