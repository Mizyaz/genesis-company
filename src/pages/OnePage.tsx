import { useState, type CSSProperties } from 'react';
import site from '../content/site.json';
import papers from '../content/publications.json';
import { publicationUrl, type Publication } from '../shared/citations';
import { assetUrl, Icon } from '../shared/ui';
import { FilmTake } from '../shared/FilmTake';
import { CLAIMS } from '../shared/ProcessCards';
import { Pipeline } from '../shared/Pipeline';

const { home, about, brand } = site;
export const mailto = (subject: string) => `mailto:${brand.email}?subject=${encodeURIComponent(subject)}`;
const newest = (papers as Publication[]).slice().sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
const FEW = 3;

/** The one page: the film first, the results it shows in one strip, then the process in one line (each step on its own page), what membership brings, our research, team and contact. */
export function Home({ theme }: { theme: 'dark' | 'light' }) {
  const [everything, setEverything] = useState(false);
  return <main id="main" className="home">
    <section className="home-lead" aria-labelledby="home-heading">
      <h1 id="home-heading">{home.headline} <span className="accent">{home.accent}</span></h1>
      <p>{home.intro}</p>
    </section>
    <FilmTake theme={theme} label={home.film} />
    <ul className="claims" aria-label="Results">{CLAIMS.map(claim => <li key={claim.line}><strong>{claim.href ? <a href={claim.href}>{claim.value}</a> : claim.value}</strong><span>{claim.line}</span></li>)}</ul>
    <section id="how" className="home-section" aria-labelledby="how-title">
      <h2 id="how-title">{home.process.headline}</h2><p className="home-sub">{home.process.intro}</p>
      <Pipeline more={home.process.more} />
    </section>
    <section id="membership" className="home-section" aria-labelledby="membership-title">
      <h2 id="membership-title">{home.membership.headline}</h2><p className="home-sub">{home.membership.intro}</p>
      <div className="tiers">{home.membership.tiers.map((tier, i) => <article key={tier.id} className={`tier${i ? ' tier-main' : ''}`}>
        <h3>{tier.name}</h3><p className="tier-price">{tier.price}</p><p className="tier-for">{tier.for}</p>
        <ul>{tier.items.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul>
        <a className={`button button-${i ? 'primary' : 'secondary'}`} href={mailto(tier.subject)}>{tier.action}</a>
      </article>)}</div>
    </section>
    <div className="home-section home-pair">
      <section id="research" aria-labelledby="research-title">
        <h2 id="research-title" className="home-label">{home.research.headline}</h2>
        <ul className="papers">{(everything ? newest : newest.slice(0, FEW)).map(paper => <li key={paper.id}>
          <a href={publicationUrl(paper)} target="_blank" rel="noopener noreferrer">{paper.title}</a><small>{paper.venue} · {paper.year}</small></li>)}</ul>
        {!everything && <button type="button" className="papers-more" onClick={() => setEverything(true)}>All {newest.length} publications <Icon name="chevron" /></button>}
      </section>
      <section id="team" aria-labelledby="team-title">
        <h2 id="team-title" className="home-label">{home.team.headline}</h2>
        <ul className="team">{about.people.map(person => <li key={person.id}>
          <img src={assetUrl(person.image)} alt={person.alt} width="64" height="64" loading="lazy" />
          <div><b>{person.name}</b><small>{person.role} · {person.specialty}</small><a href={person.scholar} target="_blank" rel="noopener noreferrer">Google Scholar <Icon name="diagonal" /></a></div></li>)}</ul>
      </section>
    </div>
    <section id="contact" className="home-section contact" aria-labelledby="contact-title">
      <h2 id="contact-title">{home.contact.headline} <span className="accent">{home.contact.accent}</span></h2>
      <ul className="contact-ways">{home.contact.ways.map((way, i) => <li key={way.title} style={{ '--c': `var(--step-${i * 3})` } as CSSProperties}>
        <a href={way.href.startsWith('mail:') ? mailto(way.href.slice(5)) : way.href}><b>{way.title}</b><span>{way.line}</span><em>{way.cta} <span aria-hidden="true">→</span></em></a>
      </li>)}</ul>
      <a className="contact-mail" href={mailto('GENESIS')}>{brand.email}</a>
      <nav className="contact-map" aria-label="Every page">{home.contact.map.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
    </section>
  </main>;
}
