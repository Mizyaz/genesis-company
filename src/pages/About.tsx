import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { TeamProfiles } from '../shared/TeamProfiles';
import { Icon } from '../shared/ui';
import '../styles/publications.css';

/** About us as its own page: the team, then the research behind GENESIS. */
export function About() {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="about-page">
    <a className="research-return" href="#/explore"><Icon name="arrow" /> {t("Back to Explore")}</a>
    <header className="about-page-heading">
      <p className="eyebrow">{site.about.eyebrow}</p>
      <h1>{site.about.headline}</h1>
      <p>{site.about.intro}</p>
    </header>
    <TeamProfiles people={site.about.people} />
    <a className="research-entry" href="#/publications"><span className="research-entry-mark"><Icon name="document" /></span><span><strong>{t("Research & publications")}</strong><span>{t("RF circuits. Optimization. Autonomous systems.")}</span></span><span className="research-entry-action" aria-hidden="true"><Icon name="arrow" /></span></a>
  </main>;
}
