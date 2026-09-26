import site from '../content/site.json';
import { Brand, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { DesignLoop } from '../shared/DesignLoop';
import { DesignBridge } from '../shared/DesignBridge';
import { Workflow } from '../shared/Workflow';
import { TeamProfiles } from '../shared/TeamProfiles';
import '../styles/publications.css';

export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  return <main id="main" className="explore-page">
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-copy"><p className="eyebrow"><span className="short-rule" /> AUTONOMOUS RFIC DESIGN ENGINE</p><h1 id="company-heading">From specs<br />to <span className="gradient-text">silicon.</span></h1><p>RF expertise. AI intelligence.<br />One connected design loop.</p><a className="button button-primary" href="#/explore/workflow">Discover the platform <Icon name="down" /></a></div>
      <div className="hero-index"><span>AI DESIGN AGENT</span><span>EM REASONING</span><span>DESIGN MEMORY</span></div>
    </section>
    <section id="workflow" className="content-section workflow-section">
      <div className="section-intro"><SectionHeading number="01" eyebrow="THE PLATFORM">{site.workflow.headline}<br /><span className="gradient-text">{site.workflow.headlineAccent}</span></SectionHeading><p>{site.workflow.intro}</p></div>
      <Workflow stages={site.stages} />
      <div className="loop-note"><Icon name="spark" /><span>Reason. Simulate. Learn. Refine.</span><span className="muted">Design knowledge feeds the next iteration.</span></div>
    </section>
    <section id="portfolio" className="content-section portfolio-section">
      <div className="section-intro"><SectionHeading number="02" eyebrow="RFIC PORTFOLIO">From individual blocks<br />to <span className="gradient-text">complete circuits.</span></SectionHeading><p>RF switches, frequency converters and broadband passives for mmWave systems.</p></div>
      <div className="portfolio-grid">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
    </section>
    <section id="team" className="content-section approach-section">
      <SectionHeading number="03" eyebrow="OUR APPROACH">Two worlds.<br /><span className="gradient-text">One loop.</span></SectionHeading>
      <DesignLoop content={site.designLoop} brand={<Brand />} />
    </section>
    <section id="story" className="content-section story-section">
      <div className="section-intro">
        <SectionHeading number="04" eyebrow={site.story.eyebrow}>{site.story.headline}<br /><span className="gradient-text">{site.story.headlineAccent}</span></SectionHeading>
        <div className="story-copy"><p>{site.story.intro}</p></div>
      </div>
      <DesignBridge content={site.story.diagram} brand={<Brand />} />
    </section>
    <section id="contact" className="content-section contact-section"><p className="eyebrow">LET’S BUILD WHAT COMES NEXT</p><h2>From design intent.<br /><span className="gradient-text">To silicon demonstration.</span></h2><div className="contact-actions"><a className="button button-primary" href={`mailto:${site.brand.email}?subject=GENESIS%20demo`}>Get in touch <Icon name="mail" /></a>{workbenchUrl && <a className="button button-secondary" href={workbenchUrl} target="_blank" rel="noopener noreferrer">Open workbench <Icon name="diagonal" /></a>}</div></section>
    <section id="about" className="content-section about-section">
      <div className="section-intro"><SectionHeading number="05" eyebrow={site.about.eyebrow}>{site.about.headline}</SectionHeading><p>{site.about.intro}</p></div>
      <TeamProfiles people={site.about.people} />
      <a className="research-entry" href="#/publications"><span className="research-entry-mark"><Icon name="document" /></span><span><strong>Explore our research</strong><span>Publications, ideas and the work behind GENESIS.</span></span><span className="research-entry-action">Browse publications <Icon name="arrow" /></span></a>
    </section>
  </main>;
}
