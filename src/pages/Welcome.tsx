import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { Brand, Icon } from '../shared/ui';
import { DesignStory } from '../shared/DesignStory';
import { BrandIntro } from '../shared/CircuitIdentity';
import '../styles/welcome.css';

/** Public gateway. No product state or assistant transport is imported. */
export function Welcome() {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="welcome-content" aria-labelledby="welcome-heading">
      <p className="eyebrow">{t("RF DESIGN. SIMULATION. AI.")}</p>
      <BrandIntro headingId="welcome-heading" />
      <p className="welcome-intro">{t("Explore what we build. Or start your next design.")}</p>
      <div className="welcome-choices">
        <a className="welcome-choice" href="#/explore"><Icon name="wave" /><span><strong>{t("Discover")}</strong><small>{t("Our approach, our circuits, our story.")}</small></span><Icon name="arrow" /></a>
        <a className="welcome-choice welcome-choice-design" href="#/design"><Icon name="chip" /><span><strong>{t("Design")}</strong><small>{t("Open your GENESIS design environment.")}</small></span><Icon name="arrow" /></a>
      </div>
      <DesignStory compact content={site.story.loop} brand={<Brand />} />
    </section>
  </main>;
}
