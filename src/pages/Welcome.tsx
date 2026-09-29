import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { Brand, Icon } from '../shared/ui';
import { StoryScene } from '../shared/StoryScene';
import { BrandIntro } from '../shared/CircuitIdentity';
import { FlightSymbol, requestPaper } from '../shared/ResearchFlight';
import { navigate } from '../shared/gate';
import papers from '../content/publications.json';
import '../styles/welcome.css';

/** Public gateway. No product state or assistant transport is imported. */
export function Welcome() {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="welcome-content" aria-labelledby="welcome-heading">
      <p className="eyebrow">{t("RF DESIGN. SIMULATION. AI.")}</p>
      <BrandIntro headingId="welcome-heading" symbol={<FlightSymbol papers={papers} library="research" onShowPaper={id => { requestPaper(id); navigate('#/publications'); }} />} />
      <p className="welcome-intro">{t("Explore what we build. Or start your next design.")}</p>
      <div className="welcome-choices">
        <a className="welcome-choice" href="#/explore"><Icon name="wave" /><span><strong>{t("Discover")}</strong><small>{t("Our approach, our circuits and our platform.")}</small></span><Icon name="arrow" /></a>
        <a className="welcome-choice welcome-choice-design" href="#/design"><Icon name="chip" /><span><strong>{t("Design")}</strong><small>{t("Open your GENESIS design environment.")}</small></span><Icon name="arrow" /></a>
      </div>
      <StoryScene content={site.story.scene} brand={<Brand />} />
    </section>
  </main>;
}
