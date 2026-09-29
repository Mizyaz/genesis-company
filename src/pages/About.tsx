import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import { TeamProfiles } from '../shared/TeamProfiles';
import { Icon } from '../shared/ui';
import '../styles/publications.css';

/** About us as its own page: the team, how GENESIS started (`#/about/story`), then the research behind it. */
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
    <section id="story" className="about-story" aria-labelledby="story-title">
      <p className="eyebrow">{site.story.eyebrow}</p>
      <h2 id="story-title">{site.story.headline}</h2>
      <div className="story-copy"><p>{site.story.intro}</p>{site.story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </section>
    <a className="research-entry" href="#/publications"><span className="research-entry-mark"><Icon name="document" /></span><span><strong>{t("Research & publications")}</strong><span>{t("RF circuits. Optimization. Autonomous systems.")}</span></span><span className="research-entry-action" aria-hidden="true"><Icon name="arrow" /></span></a>
  </main>;
}
