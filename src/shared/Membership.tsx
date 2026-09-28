import { useId } from 'react';
import { ActionLink, Brand, Icon, SectionHeading } from './ui';
import { DesignStory, type StoryContent } from './DesignStory';
import { ServiceFaq, type FaqContent } from './ServiceFaq';
import '../styles/services.css';
import '../styles/membership.css';

type List = { title: string; items: string[] };
export type MembershipContent = {
  eyebrow: string; headline: string; headlineAccent: string; intro: string;
  plan: { title: string; terms: { label: string; value: string }[]; included: List; provided: List; steps: List; action: string; note: string };
  visualLabel: string; modulesTitle: string;
  modules: { icon: string; title: string; detail: string }[];
  faq: FaqContent;
};

/** The membership first: its terms at a glance, where GENESIS fits, what it does, then the questions (folded). */
export function Membership({ content, loop, contactHref }: { content: MembershipContent; loop: StoryContent; contactHref: string }) {
  const planId = `membership-plan-${useId().replace(/:/g, '')}`;
  const { plan } = content;
  return <section id="membership" className="content-section membership-section" aria-labelledby="membership-title">
    <div className="section-intro">
      <SectionHeading number="01" eyebrow={content.eyebrow}><span id="membership-title">{content.headline}<br /><span className="gradient-text">{content.headlineAccent}</span></span></SectionHeading>
      <p>{content.intro}</p>
    </div>
    <div className="membership-overview">
      <article className="membership-plan" aria-labelledby={planId}>
        <h3 id={planId}>{plan.title}</h3>
        <dl className="plan-terms">{plan.terms.map(term => <div key={term.label}><dt>{term.label}</dt><dd>{term.value}</dd></div>)}</dl>
        <div className="plan-lists">
          <div><h4>{plan.included.title}</h4><ul className="plan-included">{plan.included.items.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul></div>
          <div><h4>{plan.provided.title}</h4><ul className="plan-provided">{plan.provided.items.map(item => <li key={item}><Icon name="server" />{item}</li>)}</ul></div>
        </div>
        <div className="plan-steps"><h4>{plan.steps.title}</h4><ol>{plan.steps.items.map((item, i) => <li key={item}><span aria-hidden="true">{i + 1}</span>{item}</li>)}</ol></div>
        <ActionLink href={contactHref} icon="mail">{plan.action}</ActionLink>
        <p className="plan-note">{plan.note}</p>
      </article>
      <figure className="service-visual membership-visual">
        <div className="service-visual-heading"><span className="service-live-dot" /><span>GENESIS</span><span>{content.visualLabel}</span></div>
        <div className="service-loop"><DesignStory content={loop} brand={<Brand />} /></div>
      </figure>
    </div>
    <div className="service-scope membership-modules"><p className="eyebrow">{content.modulesTitle}</p><ul>{content.modules.map(module => <li key={module.title}><Icon name={module.icon} /><div><h4>{module.title}</h4><p>{module.detail}</p></div></li>)}</ul></div>
    <ServiceFaq content={content.faq} contactHref={contactHref} />
  </section>;
}
