import { useId } from 'react';
import { ActionLink, Icon } from './ui';

export type FaqContent = { title: string; intro: string; action: string; items: { question: string; answer: string }[] };

/** Offer details as short answers, closed until asked. Native disclosure: expanding one answer collapses the others. */
export function ServiceFaq({ content, contactHref }: { content: FaqContent; contactHref: string }) {
  const titleId = `faq-${useId().replace(/:/g, '')}`;
  return <section id="faq" className="service-faq" aria-labelledby={titleId}>
    <div className="faq-intro">
      <h3 id={titleId}>{content.title}</h3>
      <p>{content.intro}</p>
      <ActionLink variant="secondary" href={contactHref} icon="mail">{content.action}</ActionLink>
    </div>
    <div className="faq-list">{content.items.map(item => <details key={item.question} name={titleId}>
      <summary><span>{item.question}</span><Icon name="chevron" /></summary>
      <p>{item.answer}</p>
    </details>)}</div>
  </section>;
}
