import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { ActionLink, Brand, Icon, SectionHeading } from '../shared/ui';
import { PortfolioCard } from '../shared/PortfolioCard';
import { StoryScene } from '../shared/StoryScene';
import { Workflow } from '../shared/Workflow';
import { Membership } from '../shared/Membership';
import { Services } from '../shared/Services';

/** Membership first, then the designs, how the platform works, additional services and our story. */
export function Explore({ workbenchUrl }: { workbenchUrl?: string }) {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="explore-page">
    <section className="company-hero" aria-labelledby="company-heading">
      <div className="company-hero-image" aria-hidden="true" />
      <div className="company-hero-copy"><p className="eyebrow"><span className="short-rule" /> {t("AUTONOMOUS RFIC DESIGN ENGINE")}</p><h1 id="company-heading">{t("From specs")}<br />{t("to")} <span className="gradient-text">{t("silicon.")}</span></h1><p>{t("RF expertise. AI intelligence.")}<br />{t("One connected design loop.")}</p><a className="button button-primary" href="#/explore/membership">{t("View the membership")} <Icon name="down" /></a></div>
    </section>
    <Membership content={site.membership} loop={site.story.loop} contactHref={`mailto:${site.brand.email}?subject=GENESIS%20membership`} />
    <section id="portfolio" className="content-section portfolio-section">
      <div className="section-intro"><SectionHeading number="02" eyebrow={t('RFIC PORTFOLIO')}>{t("From individual blocks")}<br />{t("to")} <span className="gradient-text">{t("complete circuits.")}</span></SectionHeading><p>{t("RF switches, frequency converters and broadband passives for mmWave systems.")}</p></div>
      <div className="portfolio-grid">{site.portfolio.map(item => <PortfolioCard item={item} key={item.id} />)}</div>
    </section>
    <section id="workflow" className="content-section workflow-section">
      <div className="section-intro"><SectionHeading number="03" eyebrow={t('THE PLATFORM')}>{site.workflow.headline}<br /><span className="gradient-text">{site.workflow.headlineAccent}</span></SectionHeading><p>{site.workflow.intro}</p></div>
      <Workflow stages={site.stages} />
      <div className="loop-note"><Icon name="spark" /><span>{t("Compare each result with your requirements, then use it to guide the next iteration.")}</span></div>
    </section>
    <Services content={site.services} contactHref={`mailto:${site.brand.email}?subject=GENESIS%20services`} />
    <section id="story" className="content-section story-section">
      <div id="team" aria-hidden="true" />
      <div className="story-narrative">
        <div>
          <SectionHeading number="05" eyebrow={site.story.eyebrow}>{site.story.headline}</SectionHeading>
          <div className="story-copy"><p>{site.story.intro}</p>{site.story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        </div>
        <StoryScene content={site.story.scene} brand={<Brand />} />
      </div>
    </section>
    <section id="contact" className="content-section contact-section"><p className="eyebrow">{t("LET’S BUILD WHAT COMES NEXT")}</p><h2>{t("From design intent.")}<br /><span className="gradient-text">{t("To silicon demonstration.")}</span></h2><div className="contact-actions"><ActionLink href={`mailto:${site.brand.email}?subject=GENESIS%20demo`} icon="mail">{t("Get in touch")}</ActionLink>{workbenchUrl && <ActionLink variant="secondary" href={workbenchUrl} icon="diagonal" data-genesis-handoff>{t("Open workbench")}</ActionLink>}</div></section>
  </main>;
}
