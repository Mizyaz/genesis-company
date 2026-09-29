import { useRef } from 'react';
import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { ActionLink, Brand, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { StoryScene } from '../shared/StoryScene';
import { DesignStory } from '../shared/DesignStory';
import { Workflow } from '../shared/Workflow';
import { Membership } from '../shared/Membership';
import { Services } from '../shared/Services';
import { SwipeDots } from '../shared/SwipeDots';

/** The approach at a glance in the hero, then the membership, the designs, the platform and additional services.
 * Our story is told on the About page. On phones, rows of cards scroll sideways instead of stacking. */
export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  const designs = useRef<HTMLDivElement>(null);
  const modules = useRef<HTMLUListElement>(null);
  return <main id="main" className="explore-page">
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-inner">
        <div className="company-hero-copy"><p className="eyebrow"><span className="short-rule" /> {t("AUTONOMOUS RFIC DESIGN ENGINE")}</p><h1 id="company-heading">{t("From specs")}<br />{t("to")} <span className="gradient-text">{t("silicon.")}</span></h1><p>{t("RF expertise. AI intelligence.")}<br />{t("One connected design loop.")}</p><a className="button button-primary" href="#/explore/membership">{t("View the membership")} <Icon name="down" /></a></div>
        <StoryScene content={site.story.scene} brand={<Brand />} />
      </div>
    </section>
    <Membership content={site.membership} email={site.brand.email} />
    <section id="portfolio" className="content-section portfolio-section">
      <div className="section-intro"><SectionHeading eyebrow={t('RFIC PORTFOLIO')}>{t("From individual blocks")}<br />{t("to")} <span className="gradient-text">{t("complete circuits.")}</span></SectionHeading><p>{t("RF switches, frequency converters and broadband passives for mmWave systems.")}</p></div>
      <div ref={designs} className="portfolio-grid swipe-row">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
      <SwipeDots row={designs} count={site.portfolio.length} />
    </section>
    <section id="workflow" className="content-section workflow-section">
      <div className="section-intro"><SectionHeading eyebrow={t('THE PLATFORM')}>{site.workflow.headline}<br /><span className="gradient-text">{site.workflow.headlineAccent}</span></SectionHeading><p>{site.workflow.intro}</p></div>
      <Workflow stages={site.stages} />
      <figure className="service-visual platform-loop">
        <div className="service-visual-heading"><span className="service-live-dot" /><span>GENESIS</span><span>{site.workflow.visualLabel}</span></div>
        <div className="service-loop"><DesignStory content={site.story.loop} brand={<Brand />} /></div>
      </figure>
      <div className="service-scope platform-modules"><p className="eyebrow">{site.workflow.modulesTitle}</p><ul ref={modules} className="swipe-row">{site.workflow.modules.map(module => <li key={module.title}><Icon name={module.icon} /><div><h4>{module.title}</h4><p>{module.detail}</p></div></li>)}</ul><SwipeDots row={modules} count={site.workflow.modules.length} /></div>
    </section>
    <Services content={site.services} contactHref={`mailto:${site.brand.email}?subject=GENESIS%20services`} />
    <section id="contact" className="content-section contact-section"><p className="eyebrow">{t("LET’S BUILD WHAT COMES NEXT")}</p><h2>{t("From design intent.")}<br /><span className="gradient-text">{t("To silicon demonstration.")}</span></h2><div className="contact-actions"><ActionLink href={`mailto:${site.brand.email}?subject=GENESIS%20demo`} icon="mail">{t("Get in touch")}</ActionLink>{workbenchUrl && <ActionLink variant="secondary" href={workbenchUrl} icon="diagonal" data-genesis-handoff>{t("Open workbench")}</ActionLink>}</div></section>
  </main>;
}
