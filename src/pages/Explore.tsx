import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { Brand, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { DesignLoop } from '../shared/DesignLoop';
import { DesignBridge } from '../shared/DesignBridge';
import { Workflow } from '../shared/Workflow';
import { TeamProfiles } from '../shared/TeamProfiles';
import '../styles/publications.css';

export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="explore-page">
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-copy"><p className="eyebrow"><span className="short-rule" /> {t("AUTONOMOUS RFIC DESIGN ENGINE")}</p><h1 id="company-heading">{t("From specs")}<br />{t("to")} <span className="gradient-text">{t("silicon.")}</span></h1><p>{t("RF expertise. AI intelligence.")}<br />{t("One connected design loop.")}</p><a className="button button-primary" href="#/explore/workflow">{t("Discover the platform")} <Icon name="down" /></a></div>
      <div className="hero-index"><span>{t("AI DESIGN AGENT")}</span><span>{t("EM REASONING")}</span><span>{t("DESIGN MEMORY")}</span></div>
    </section>
    <section id="workflow" className="content-section workflow-section">
      <div className="section-intro"><SectionHeading number="01" eyebrow={t('THE PLATFORM')}>{site.workflow.headline}<br /><span className="gradient-text">{site.workflow.headlineAccent}</span></SectionHeading><p>{site.workflow.intro}</p></div>
      <Workflow stages={site.stages} />
      <div className="loop-note"><Icon name="spark" /><span>{t("Reason. Simulate. Learn. Refine.")}</span><span className="muted">{t("Design knowledge feeds the next iteration.")}</span></div>
    </section>
    <section id="portfolio" className="content-section portfolio-section">
      <div className="section-intro"><SectionHeading number="02" eyebrow={t('RFIC PORTFOLIO')}>{t("From individual blocks")}<br />{t("to")} <span className="gradient-text">{t("complete circuits.")}</span></SectionHeading><p>{t("RF switches, frequency converters and broadband passives for mmWave systems.")}</p></div>
      <div className="portfolio-grid">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
    </section>
    <section id="team" className="content-section approach-section">
      <SectionHeading number="03" eyebrow={t('OUR APPROACH')}>{t("Two worlds.")}<br /><span className="gradient-text">{t("One loop.")}</span></SectionHeading>
      <DesignLoop content={site.designLoop} brand={<Brand />} />
    </section>
    <section id="story" className="content-section story-section">
      <div className="section-intro">
        <SectionHeading number="04" eyebrow={site.story.eyebrow}>{site.story.headline}<br /><span className="gradient-text">{site.story.headlineAccent}</span></SectionHeading>
        <div className="story-copy"><p>{site.story.intro}</p></div>
      </div>
      <DesignBridge content={site.story.diagram} brand={<Brand />} />
    </section>
    <section id="contact" className="content-section contact-section"><p className="eyebrow">{t("LET’S BUILD WHAT COMES NEXT")}</p><h2>{t("From design intent.")}<br /><span className="gradient-text">{t("To silicon demonstration.")}</span></h2><div className="contact-actions"><a className="button button-primary" href={`mailto:${site.brand.email}?subject=GENESIS%20demo`}>{t("Get in touch")} <Icon name="mail" /></a>{workbenchUrl && <a className="button button-secondary" href={workbenchUrl} data-genesis-handoff>{t("Open workbench")} <Icon name="diagonal" /></a>}</div></section>
    <section id="about" className="content-section about-section">
      <div className="section-intro"><SectionHeading number="05" eyebrow={site.about.eyebrow}>{site.about.headline}</SectionHeading><p>{site.about.intro}</p></div>
      <TeamProfiles people={site.about.people} />
      <a className="research-entry" href="#/publications"><span className="research-entry-mark"><Icon name="document" /></span><span><strong>{t("Research & publications")}</strong><span>{t("RF circuits. Optimization. Autonomous systems.")}</span></span><span className="research-entry-action" aria-hidden="true"><Icon name="arrow" /></span></a>
    </section>
  </main>;
}
