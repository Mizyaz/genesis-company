import { useEffect, useRef } from 'react';
import site from '../content/site.json';
import papers from '../content/publications.json';
import { ActionLink, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { Membership } from '../shared/Membership';
import { Partnership } from '../shared/Partnership';
import { SwipeDots } from '../shared/SwipeDots';
import { StoryStage } from '../shared/StoryStage';
import { CoDesign, type CoDesignContent } from '../shared/CoDesign';
import { FilmPlayer } from '../shared/FilmPlayer';
import { ScrollJourney, type JourneyContent } from '../shared/ScrollJourney';
import { Publications } from '../shared/Publications';
import { TeamProfiles } from '../shared/TeamProfiles';
import { SiteIntro } from '../shared/SiteIntro';
import type { SceneId } from '../shared/story/StoryPlayer';

/** The headline with its key words as links to the sections that show them, each in its brand colour. */
function linked(text: string, links: Record<string, { href: string; tone: string; title: string }>) {
  return text.split(new RegExp(`(${Object.keys(links).join('|')})`)).map((part, i) => links[part]
    ? <a key={i} className={`headline-link tone-${links[part].tone}`} href={links[part].href} title={links[part].title}>{part}</a> : part);
}

/** The whole site on one page, opened as the film opens: the hero with the film, what we offer (the membership and the
 * partnership), the schematic-to-layout flow played as the reader scrolls, transistor sizing and passive synthesis in one
 * co-design board, the claims, the designs, the team and our story, the publications and the contact. On phones, rows of
 * cards scroll sideways. */
export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  const home = site.home;
  const designs = useRef<HTMLDivElement>(null);
  const research = `mailto:${site.brand.email}?subject=${encodeURIComponent('GENESIS research opportunities')}`;
  // Each section rises into place the first time it comes on screen (not with less motion).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sections = [...document.querySelectorAll<HTMLElement>('.explore-page > section:not(.company-hero)')];
    const view = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); view.unobserve(entry.target); } }), { threshold: .08 });
    sections.forEach(section => { if (section.getBoundingClientRect().top > window.innerHeight) { section.classList.add('will-rise'); view.observe(section); } });
    return () => view.disconnect();
  }, []);
  const years = papers.map(p => p.year);
  return <main id="main" className="explore-page">
    <SiteIntro line={home.film.line} />
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-inner">
        <div className="company-hero-copy"><p className="eyebrow"><span className="short-rule" /> {home.eyebrow}</p><h1 id="company-heading">{linked(home.headline, home.links)}<br /><span className="gradient-text">{home.accent.split(/(\S*-\S*)/).map((part, i) => i % 2 ? <span key={i} className="no-break">{part}</span> : part)}</span></h1><p>{home.intro}</p>
          <div className="contact-actions"><a className="button button-primary" href="#/explore/membership">{home.watch} <Icon name="arrow" /></a><FilmPlayer content={home.film} /><ActionLink variant="secondary" href={research} icon="users">{home.join}</ActionLink></div></div>
      </div>
    </section>
    <Membership content={site.membership} email={site.brand.email} />
    <Partnership content={site.partnership} email={site.brand.email} />
    <section id="flow" className="content-section clip-section" aria-labelledby="flow-title">
      <div className="section-intro"><SectionHeading eyebrow={home.flow.eyebrow}><span id="flow-title">{home.flow.headline}<br /><span className="gradient-text">{home.flow.accent}</span></span></SectionHeading><p>{home.flow.intro}</p></div>
      <ScrollJourney content={home.flow.journey as JourneyContent} />
    </section>
    <section id="methods" className="content-section methods-section" aria-labelledby="methods-title">
      <div className="section-intro"><SectionHeading eyebrow={home.methods.eyebrow}><span id="methods-title">{home.methods.headline}<br /><span className="gradient-text">{home.methods.accent}</span></span></SectionHeading><p>{home.methods.intro}</p></div>
      <CoDesign content={home.methods.board as CoDesignContent} />
    </section>
    <section id="claims" className="content-section silicon-section" aria-labelledby="claims-title">
      <div className="section-intro"><SectionHeading eyebrow={home.claims.eyebrow}><span id="claims-title">{home.claims.headline}<br /><span className="gradient-text">{home.claims.accent}</span></span></SectionHeading></div>
      <ol className="silicon-steps">{home.claims.items.map(item => <li key={item.title}><Icon name={item.icon} /><strong className="claim-value">{item.value}</strong><h3>{item.title}</h3><p>{item.detail}</p></li>)}</ol>
      <StoryStage scenes={home.claims.story.scenes as SceneId[]} label={home.claims.story.label} />
    </section>
    <section id="portfolio" className="content-section portfolio-section">
      <div className="section-intro"><SectionHeading eyebrow="RFIC PORTFOLIO">From individual blocks<br />to <span className="gradient-text">complete circuits.</span></SectionHeading></div>
      <StoryStage scenes={home.portfolio.story.scenes as SceneId[]} label={home.portfolio.story.label} />
      <div ref={designs} className="portfolio-grid swipe-row">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
      <SwipeDots row={designs} count={site.portfolio.length} />
    </section>
    <section id="about" className="content-section about-section" aria-labelledby="about-title">
      <div className="section-intro"><SectionHeading eyebrow={site.about.eyebrow}><span id="about-title">{site.about.headline}</span></SectionHeading><p>{site.about.intro}</p></div>
      <TeamProfiles people={site.about.people} />
      <div id="story" className="about-story"><p className="eyebrow">{site.story.eyebrow}</p><h3>{site.story.headline}</h3>
        <div className="story-copy"><p>{site.story.intro}</p>{site.story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></div>
    </section>
    <section id="research" className="content-section research-section" aria-labelledby="research-title">
      <div className="section-intro"><SectionHeading eyebrow={home.lab.eyebrow}><span id="research-title">{home.lab.headline}<br /><span className="gradient-text">{home.lab.accent}</span></span></SectionHeading>
        <p>{home.lab.intro}</p><p className="research-count">{papers.length} {home.lab.count} <span aria-hidden="true">/</span> {Math.min(...years)}–{Math.max(...years)}</p></div>
      <Publications people={site.about.people} papers={papers} />
    </section>
    <section id="contact" className="content-section contact-section"><p className="eyebrow">{home.contact.eyebrow}</p><h2>{home.contact.headline}<br /><span className="gradient-text">{home.contact.accent}</span></h2><div className="contact-actions"><ActionLink href={`mailto:${site.brand.email}?subject=GENESIS`} icon="mail">Get in touch</ActionLink><ActionLink variant="secondary" href={research} icon="users">{home.join}</ActionLink>{workbenchUrl && <ActionLink variant="secondary" href={workbenchUrl} icon="diagonal" data-genesis-handoff>Open workbench</ActionLink>}</div></section>
  </main>;
}
