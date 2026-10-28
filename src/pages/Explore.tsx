import { lazy, Suspense, useRef } from 'react';
import site from '../content/site.json';
import papers from '../content/publications.json';
import { ActionLink, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { Membership } from '../shared/Membership';
import { Partnership } from '../shared/Partnership';
import { SwipeDots } from '../shared/SwipeDots';
import { FilmPlayer } from '../shared/FilmPlayer';
import { Near } from '../shared/Near';
import { CoDesignDiagram, type CoDesignStep } from '../shared/CoDesignDiagram';
import { Chip3D } from '../shared/Chip3D';
import { Publications } from '../shared/Publications';
import { TeamProfiles } from '../shared/TeamProfiles';
import { SiteIntro } from '../shared/SiteIntro';

// The physical-flow motion and its data load only when its section comes near.
const FlowMotion = lazy(() => import('../shared/FlowMotion'));

/** The headline with its key words as links to the sections that show them, each in its brand colour. */
function linked(text: string, links: Record<string, { href: string; tone: string; title: string }>) {
  return text.split(new RegExp(`(${Object.keys(links).join('|')})`)).map((part, i) => links[part]
    ? <a key={i} className={`headline-link tone-${links[part].tone}`} href={links[part].href} title={links[part].title}>{part}</a> : part);
}

/** The whole site on one page, told as the film tells it: the hero, what the records back, the designs, the physical
 * flow as one motion, the co-design loop as a block diagram, the layout in 3D, then what we offer, the team, the
 * publications and the contact. On phones, rows of cards scroll sideways. */
export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  const home = site.home;
  const designs = useRef<HTMLDivElement>(null);
  const research = `mailto:${site.brand.email}?subject=${encodeURIComponent('GENESIS research opportunities')}`;
  const years = papers.map(p => p.year);
  return <main id="main" className="explore-page">
    <SiteIntro line={home.film.line} />
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-inner">
        <div className="company-hero-copy"><h1 id="company-heading">{linked(home.headline, home.links)}<br /><span className="gradient-text">{home.accent.split(/(\S*-\S*)/).map((part, i) => i % 2 ? <span key={i} className="no-break">{part}</span> : part)}</span></h1><p>{home.intro}</p>
          <div className="contact-actions"><a className="button button-primary" href="#/explore/membership">{home.watch} <Icon name="arrow" /></a><FilmPlayer content={home.film} /></div></div>
      </div>
    </section>
    <section id="claims" className="claims-band" aria-label="Results">
      <ul>{home.claims.items.map(item => <li key={item.title}><strong>{item.value}</strong><span>{item.title}</span></li>)}</ul>
    </section>
    <section id="portfolio" className="content-section portfolio-section" aria-labelledby="portfolio-title">
      <SectionHeading><span id="portfolio-title">{home.portfolio.headline}</span></SectionHeading>
      <div ref={designs} className="portfolio-grid swipe-row">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
      <SwipeDots row={designs} count={site.portfolio.length} />
    </section>
    <section id="flow" className="content-section" aria-labelledby="flow-title">
      <SectionHeading><span id="flow-title">{home.flow.headline}</span></SectionHeading>
      <Near className="flow-motion-place"><Suspense fallback={<div className="flow-motion-place" />}><FlowMotion /></Suspense></Near>
    </section>
    <section id="methods" className="content-section" aria-labelledby="methods-title">
      <SectionHeading><span id="methods-title">{home.methods.headline}</span></SectionHeading>
      <CoDesignDiagram steps={home.methods.steps as CoDesignStep[]} repeat={home.methods.repeat} />
    </section>
    <section id="chip3d" className="content-section" aria-labelledby="chip3d-title">
      <SectionHeading><span id="chip3d-title">{home.chip3d.headline}</span></SectionHeading>
      <Chip3D label={home.chip3d.label} open={home.chip3d.open} />
    </section>
    <Membership content={site.membership} email={site.brand.email} />
    <Partnership content={site.partnership} email={site.brand.email} />
    <section id="about" className="content-section about-section" aria-labelledby="about-title">
      <SectionHeading><span id="about-title">{site.about.headline}</span></SectionHeading>
      <TeamProfiles people={site.about.people} />
    </section>
    <section id="research" className="content-section research-section" aria-labelledby="research-title">
      <div className="section-intro"><SectionHeading><span id="research-title">{home.lab.headline}<br /><span className="gradient-text">{home.lab.accent}</span></span></SectionHeading>
        <p className="research-count">{papers.length} {home.lab.count} <span aria-hidden="true">/</span> {Math.min(...years)}–{Math.max(...years)}</p></div>
      <Publications people={site.about.people} papers={papers} />
    </section>
    <section id="contact" className="content-section contact-section"><h2>{home.contact.headline}<br /><span className="gradient-text">{home.contact.accent}</span></h2><div className="contact-actions"><ActionLink href={`mailto:${site.brand.email}?subject=GENESIS`} icon="mail">Get in touch</ActionLink><ActionLink variant="secondary" href={research} icon="users">{home.join}</ActionLink>{workbenchUrl && <ActionLink variant="secondary" href={workbenchUrl} icon="diagonal" data-genesis-handoff>Open workbench</ActionLink>}</div></section>
  </main>;
}
