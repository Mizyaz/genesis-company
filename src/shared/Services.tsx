import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ActionLink, Icon, SectionHeading } from './ui';
import { CircuitArtwork } from './CircuitArtwork';
import { useVisibleMotion } from './MotionSettings';
import { MembershipValue, type MembershipContent } from './MembershipValue';
import '../styles/services.css';

type ServicesContent = {
  eyebrow: string; title: string; intro: string; action: string;
  scopeLabel: string; membership: MembershipContent;
  items: {
    id: string; icon: string; label: string; title: string; description: string;
    headline: string; note: string; visualLabel: string; scopeLabel?: string;
    features: { icon: string; title: string; detail: string; unit?: string }[];
  }[];
};

/** A conceptual product illustration, not a live CAD session or measured result. */
function ServiceVisual({ item }: { item: ServicesContent['items'][number] }) {
  const { ref, running } = useVisibleMotion<HTMLElement>();
  const clip = `service-wafer-${useId().replace(/:/g, '')}`;
  return <figure ref={ref} className="service-visual" data-active={running} data-kind={item.id}>
    <div className="service-visual-heading"><span className="service-live-dot" /><span>GENESIS</span><span>{item.visualLabel}</span></div>
    <div className="service-artboard" aria-hidden="true">
      <div className="service-aura" />
      {item.id === 'silicon-demonstration' && <svg className="service-wafer" viewBox="0 0 480 320" fill="none">
        <defs><clipPath id={clip}><circle cx="155" cy="140" r="105" /></clipPath></defs>
        <circle className="service-wafer-base" cx="155" cy="140" r="105" />
        <g clipPath={`url(#${clip})`}>
          {Array.from({ length: 49 }, (_, i) => <rect className="service-die" key={i} x={43 + (i % 7) * 33} y={28 + Math.floor(i / 7) * 33} width="27" height="27" rx="2" style={{ animationDelay: `${i * -.16}s` }} />)}
          <path className="service-wafer-scan" d="M40 34H270" />
        </g>
        <circle className="service-wafer-rim" cx="155" cy="140" r="112" />
        <path className="service-signal-base" d="M195 166h63l46 42h26M376 193v-52h56" />
        <path className="service-signal" pathLength="100" d="M195 166h63l46 42h26M376 193v-52h56" />
        <g className="service-prototype">
          <rect x="305" y="174" width="125" height="112" rx="10" />
          <rect x="334" y="199" width="65" height="61" rx="4" />
          <path d="M341 230h10c0-16 10-16 10 0c0-16 10-16 10 0h21M374 230v10m-8 0h16m-16 6h16m-8 0v9" />
          {[0,1,2,3,4].map(i => <path key={i} d={`M${342+i*12} 187v12m0 61v13M322 ${207+i*11}h12m65 0h18`} />)}
        </g>
        <path className="service-probe" d="M419 86v45l-39 60m-15-120v53l-19 69" />
        <circle className="service-probe-tip" cx="380" cy="191" r="5" /><circle className="service-probe-tip" cx="346" cy="193" r="5" />
        <path className="service-measured-wave" d="M285 75h15q10-38 20 0t20 0t20 0t20 0h24" />
      </svg>}
      {item.id === 'specialised-integration' && <>
        <svg className="service-connectors" viewBox="0 0 480 320" fill="none"><path className="service-signal-base" d="M75 70h82l45 63M405 70h-82l-45 63M75 250h82l45-63M405 250h-82l-45-63" /><path className="service-signal" pathLength="100" d="M75 70h82l45 63M405 70h-82l-45 63M75 250h82l45-63M405 250h-82l-45-63" /></svg>
        <div className="service-integration-core"><CircuitArtwork kind="engine" running={running} /></div>
        {['switch', 'wave', 'sliders', 'document'].map((icon, i) => <div className={`service-connector service-connector-${i}`} key={icon}><Icon name={icon} /><span>{['CAD', 'EM', 'CLI', 'JSON'][i]}</span></div>)}
      </>}
    </div>
  </figure>;
}

/** Presentation only. Configured service details share actions, artwork and motion with the site. */
export function Services({ content, contactHref }: { content: ServicesContent; contactHref: string }) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
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
      <SectionHeading number="03" eyebrow={content.eyebrow}><span id="services-title">{content.title}</span></SectionHeading>
      <p>{content.intro}</p>
    </div>
    <div className="service-tabs" role="tablist" aria-label={content.title}>
      {content.items.map((service, i) => <button type="button" role="tab" id={`${prefix}-tab-${i}`} aria-controls={`${prefix}-panel`} aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} ref={node => { tabs.current[i] = node; }} onClick={() => setSelected(i)} onKeyDown={event => navigate(event, i)} key={service.id}>
        <Icon name={service.icon} /><span>{service.label}</span><span className="service-tab-number" aria-hidden="true">0{i + 1}</span>
      </button>)}
    </div>
    <div className="service-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${selected}`} tabIndex={0}>
      <div className="service-overview">
        <div className="service-copy"><p className="eyebrow">{item.title}</p><h3>{item.headline}</h3><p>{item.description}</p><ActionLink href={contactHref} icon="mail">{content.action}</ActionLink></div>
        {item.id === 'platform-membership' ? <MembershipValue content={content.membership} /> : <ServiceVisual key={item.id} item={item} />}
      </div>
      <div className="service-scope"><p className="eyebrow">{item.scopeLabel ?? content.scopeLabel}</p><ul>{item.features.map(feature => <li key={feature.title}><Icon name={feature.icon} /><div><h4>{feature.title}</h4>{feature.unit && <span className="service-billing-unit">{feature.unit}</span>}<p>{feature.detail}</p></div></li>)}</ul></div>
      <p className="service-note"><Icon name="document" />{item.note}</p>
    </div>
  </section>;
}
