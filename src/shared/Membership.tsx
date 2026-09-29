import { useRef } from 'react';
import { ActionLink, Icon, SectionHeading } from './ui';
import { SwipeDots } from './SwipeDots';
import { ServiceFaq, type FaqContent } from './ServiceFaq';
import '../styles/membership.css';

type Tier = { id: string; icon: string; title: string; label: string; pitch: string; features: string[]; action: string };
export type MembershipContent = {
  eyebrow: string; headline: string; headlineAccent: string; intro: string;
  tiers: Tier[]; note: string; faq: FaqContent;
};

/** The membership first: three tiers side by side (a row to swipe on phones), each with its own symbol, then the
 * questions (folded). */
export function Membership({ content, email }: { content: MembershipContent; email: string }) {
  const tiers = useRef<HTMLUListElement>(null);
  return <section id="membership" className="content-section membership-section" aria-labelledby="membership-title">
    <div className="section-intro">
      <SectionHeading eyebrow={content.eyebrow}><span id="membership-title">{content.headline}<br /><span className="gradient-text">{content.headlineAccent}</span></span></SectionHeading>
      <p>{content.intro}</p>
    </div>
    <ul ref={tiers} className="membership-tiers swipe-row">{content.tiers.map(tier => <li key={tier.id} className="membership-tier" data-tier={tier.id}>
      <div className="tier-heading">
        <span className="tier-symbol" aria-hidden="true"><Icon name={tier.icon} /></span>
        <h3>{tier.title}</h3>
        <span className="tier-label">{tier.label}</span>
      </div>
      <p className="tier-pitch">{tier.pitch}</p>
      <ul className="tier-features">{tier.features.map(feature => <li key={feature}><Icon name="check" />{feature}</li>)}</ul>
      <ActionLink variant={tier.id === 'pro' ? 'primary' : 'secondary'} href={`mailto:${email}?subject=${encodeURIComponent(`GENESIS ${tier.title}`)}`} icon={tier.id === 'demo' ? 'calendar' : 'mail'}>{tier.action}</ActionLink>
    </li>)}</ul>
    <SwipeDots row={tiers} count={content.tiers.length} />
    <p className="membership-note"><Icon name="document" />{content.note}</p>
    <ServiceFaq content={content.faq} contactHref={`mailto:${email}?subject=GENESIS%20question`} />
  </section>;
}
