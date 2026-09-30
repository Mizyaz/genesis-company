import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ActionLink, Brand, Icon, SectionHeading } from './ui';
import { useVisibleMotion } from './MotionSettings';
import { SiliconStory } from './SiliconStory';
import { SwipeDots } from './SwipeDots';
import '../styles/services.css';

type ServicesContent = {
  eyebrow: string; title: string; intro: string; action: string;
  scopeLabel: string;
  items: {
    id: string; icon: string; label: string; title: string; description: string;
    headline: string; note?: string; visualLabel: string; scopeLabel?: string; action?: string;
    legend?: string[];
    connections?: { icon: string; label: string; action: string }[];
    features: { icon: string; title: string; detail: string; unit?: string }[];
  }[];
};

/** GENESIS sends one job at a time to a connected tool; the hub names the job. */
function IntegrationStory({ connections }: { connections: NonNullable<ServicesContent['items'][number]['connections']> }) {
  const paths = ['M144 64H162V146H180', 'M336 64H318V146H300', 'M144 256H162V174H180', 'M336 256H318V174H300'];
  return <div className="integration-story">
    <svg viewBox="0 0 480 320" aria-hidden="true">{paths.map((d, i) => <path key={d} className="integration-link" style={{ '--order': i } as CSSProperties} d={d} />)}</svg>
    {connections.map((connection, i) => <div key={connection.label} className={`integration-tool integration-tool-${i}`} style={{ '--order': i } as CSSProperties}>
      <Icon name={connection.icon} /><span>{connection.label}</span>
    </div>)}
    <div className="integration-hub"><Brand /><span className="integration-actions">{connections.map((connection, i) =>
      <span key={connection.action} style={{ '--order': i } as CSSProperties}>{connection.action}</span>)}</span></div>
  </div>;
}

/** A conceptual product illustration, not a live CAD session or measured result. */
function ServiceVisual({ item }: { item: ServicesContent['items'][number] }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  return <figure ref={ref} className="service-visual" data-active={running} data-motion={enabled ? 'on' : 'off'} data-kind={item.id}>
    <div className="service-visual-heading"><span className="service-live-dot" /><span>GENESIS</span><span>{item.visualLabel}</span></div>
    <div className="service-artboard">
      {item.id === 'silicon-demonstration' && <SiliconStory legend={item.legend ?? []} active={running} motion={enabled} />}
      {item.id === 'specialised-integration' && item.connections && <IntegrationStory connections={item.connections} />}
    </div>
  </figure>;
}

/** Presentation only. Configured service details share actions, artwork and motion with the site. */
export function Services({ content, contactHref }: { content: ServicesContent; contactHref: string }) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const scope = useRef<HTMLUListElement>(null);
  const prefix = `services-${useId().replace(/:/g, '')}`;
  const item = content.items[selected] ?? content.items[0];
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = content.items.length;
    const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index + count - 1) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
    if (next === null) return;
    event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
  }
  return <section id="services" className="content-section services-section" aria-labelledby="services-title">
    <div className="section-intro">
      <SectionHeading eyebrow={content.eyebrow}><span id="services-title">{content.title}</span></SectionHeading>
      <p>{content.intro}</p>
    </div>
    <div className="service-tabs" role="tablist" aria-label={content.title}>
      {content.items.map((service, i) => <button type="button" role="tab" id={`${prefix}-tab-${i}`} aria-controls={`${prefix}-panel`} aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} ref={node => { tabs.current[i] = node; }} onClick={() => setSelected(i)} onKeyDown={event => navigate(event, i)} key={service.id}>
        <Icon name={service.icon} /><span>{service.label}</span><span className="service-tab-number" aria-hidden="true">0{i + 1}</span>
      </button>)}
    </div>
    <div className="service-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${selected}`} tabIndex={0}>
      <div className="service-overview" data-kind={item.id}>
        <div className="service-copy"><p className="eyebrow">{item.title}</p><h3>{item.headline}</h3><p>{item.description}</p><ActionLink href={contactHref} icon="mail">{item.action ?? content.action}</ActionLink></div>
        <ServiceVisual key={item.id} item={item} />
      </div>
      <div className="service-scope"><p className="eyebrow">{item.scopeLabel ?? content.scopeLabel}</p><ul ref={scope} key={`${item.id}-scope`} className="swipe-row">{item.features.map(feature => <li key={feature.title}><Icon name={feature.icon} /><div><h4>{feature.title}</h4>{feature.unit && <span className="service-billing-unit">{feature.unit}</span>}<p>{feature.detail}</p></div></li>)}</ul><SwipeDots key={`${item.id}-dots`} row={scope} count={item.features.length} /></div>
      {item.note && <p className="service-note"><Icon name="document" />{item.note}</p>}
    </div>
  </section>;
}
