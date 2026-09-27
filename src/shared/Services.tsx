import { Icon, SectionHeading } from './ui';
import '../styles/services.css';

type ServicesContent = {
  eyebrow: string; title: string; intro: string; action: string;
  items: { id: string; icon: string; title: string; description: string }[];
};

/** Presentation only. The page supplies translated content and a contact destination. */
export function Services({ content, contactHref }: { content: ServicesContent; contactHref: string }) {
  return <section id="services" className="content-section services-section" aria-labelledby="services-title">
    <div className="section-intro">
      <SectionHeading number="03" eyebrow={content.eyebrow}><span id="services-title">{content.title}</span></SectionHeading>
      <p>{content.intro}</p>
    </div>
    <div className="services-grid">
      {content.items.map(item => <article className="service-card" key={item.id}>
        <div className="service-symbol" aria-hidden="true"><Icon name={item.icon} /><span /></div>
        <h3>{item.title}</h3><p>{item.description}</p>
      </article>)}
    </div>
    <a className="text-link services-contact" href={contactHref}>{content.action}<Icon name="diagonal" /></a>
  </section>;
}
