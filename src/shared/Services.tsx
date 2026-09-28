import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ActionLink, Brand, Icon, SectionHeading } from './ui';
import { useVisibleMotion } from './MotionSettings';
import { curvePath, designs, response, x, y } from './designStory';
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

// Illustrative measured points, slightly below the simulated curve as bench losses usually are.
const measured = response(designs.length - 1, 13).slice(1, -1).map((point, i) => ({ f: point.f, db: point.db - 0.5 - 0.3 * Math.sin(i * 1.7) }));

// A square spiral inductor that starts on the outer edge (toward its pad) and ends inside, where an underpass leaves it.
const spiral = (cx: number, cy: number, half: number, pitch: number, turns: number, side: 1 | -1) => {
  let d = `M${cx - side * half} ${cy}`;
  for (let i = 0; i < turns; i++) {
    const h = half - i * pitch;
    d += `V${cy - h}H${cx + side * h}V${cy + h}H${cx - side * (h - pitch)}`;
  }
  return `${d}V${cy}`;
};

/** From wafer to measurement: the loop's final amplifier, probed on its pads and compared with its simulation. */
function SiliconStory({ legend }: { legend: string[] }) {
  const clip = `service-wafer-${useId().replace(/:/g, '')}`;
  const plot = { left: 250, right: 452, top: 196, bottom: 292 };
  return <svg className="silicon-story" viewBox="0 0 480 320" aria-hidden="true">
    <defs><clipPath id={clip}><circle cx="112" cy="168" r="86" /></clipPath></defs>
    <circle className="silicon-wafer" cx="112" cy="168" r="88" />
    <g clipPath={`url(#${clip})`}>{Array.from({ length: 49 }, (_, i) =>
      <rect key={i} className="silicon-die" x={28 + (i % 7) * 24} y={84 + Math.floor(i / 7) * 24} width="20" height="20" rx="2" />)}</g>
    <rect className="silicon-die silicon-die-picked" x="124" y="132" width="20" height="20" rx="2" />
    <path className="silicon-zoom" d="M144 132L232 36M144 152L232 156" />
    <rect className="silicon-closeup" x="232" y="36" width="120" height="120" rx="6" />
    <path className="silicon-metal" d={`${spiral(262, 96, 13, 4, 2, 1)}${spiral(320, 96, 13, 4, 2, -1)}M244 96h5M333 96h5`} />
    <path className="silicon-underpass" d="M257 96H283M299 96H325" />
    <g className="silicon-via">{[257, 325].map(cx => <rect key={cx} x={cx - 2} y="94" width="4" height="4" />)}</g>
    <rect className="silicon-device" x="283" y="86" width="16" height="20" rx="1" /><path className="silicon-fingers" d="M287 86v20M291 86v20M295 86v20" />
    {[236, 338].map(px => <rect key={px} className="silicon-pad" x={px} y="92" width="8" height="8" rx="1" />)}
    <g className="silicon-probes"><path d="M200 12H222L240 90" /><path d="M392 12H362L342 90" /><circle cx="240" cy="94" r="3" /><circle cx="342" cy="94" r="3" /></g>
    <path className="silicon-flow" d="M292 156V182m-5-6 5 6 5-6" />
    <path className="silicon-axis" d="M250 186V292H452" />
    <path className="silicon-sweep" d="M250 190V292" />
    <path className="silicon-simulated" d={curvePath(designs.length - 1, plot)} />
    {measured.map(point => <circle key={point.f} className="silicon-measured" style={{ '--delay': (0.6 + 3 * point.f).toFixed(2) } as CSSProperties} cx={x(point.f, plot)} cy={y(point.db, plot)} r="3" />)}
    <g className="silicon-legend"><path d="M250 308h16" /><text x="272" y="311">{legend[0]}</text><circle cx="358" cy="308" r="3" /><text x="368" y="311">{legend[1]}</text></g>
  </svg>;
}

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
      {item.id === 'silicon-demonstration' && <SiliconStory legend={item.legend ?? []} />}
      {item.id === 'specialised-integration' && item.connections && <IntegrationStory connections={item.connections} />}
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
      <SectionHeading number="04" eyebrow={content.eyebrow}><span id="services-title">{content.title}</span></SectionHeading>
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
      <div className="service-scope"><p className="eyebrow">{item.scopeLabel ?? content.scopeLabel}</p><ul>{item.features.map(feature => <li key={feature.title}><Icon name={feature.icon} /><div><h4>{feature.title}</h4>{feature.unit && <span className="service-billing-unit">{feature.unit}</span>}<p>{feature.detail}</p></div></li>)}</ul></div>
      {item.note && <p className="service-note"><Icon name="document" />{item.note}</p>}
    </div>
  </section>;
}
