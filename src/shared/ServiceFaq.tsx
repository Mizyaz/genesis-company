import { useId } from 'react';
import { ActionLink, Icon } from './ui';
import '../styles/services.css';

export type FaqContent = { title: string; intro: string; action: string; items: { question: string; answer: string }[] };

/** Offer details as short answers. The whole block is folded until opened, and each answer is closed until asked;
 * native disclosure: expanding one answer collapses the others. */
export function ServiceFaq({ content, contactHref }: { content: FaqContent; contactHref: string }) {
  const group = `faq-${useId().replace(/:/g, '')}`;
  return <details id="faq" className="service-faq">
    <summary className="faq-summary"><span>{content.title}</span><span className="faq-count">{content.items.length}</span><Icon name="chevron" /></summary>
    <div className="faq-body">
      <div className="faq-intro">
        <p>{content.intro}</p>
        <ActionLink variant="secondary" href={contactHref} icon="mail">{content.action}</ActionLink>
      </div>
      <div className="faq-list">{content.items.map(item => <details key={item.question} name={group}>
        <summary><span>{item.question}</span><Icon name="chevron" /></summary>
        <p>{item.answer}</p>
      </details>)}</div>
    </div>
  </details>;
}
