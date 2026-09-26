import { useLanguage, useTranslatedContent } from '../shared/Language';
import siteContent from '../content/site.json';
import papers from '../content/publications.json';
import { Publications } from '../shared/Publications';
import { Icon } from '../shared/ui';

/** Company presentation page. The library itself only receives supplied data. */
export function Research() {
  const { t } = useLanguage();
  const site = useTranslatedContent(siteContent);
  return <main id="main" className="research-page">
    <a className="research-return" href="#/explore/about"><Icon name="arrow" /> {t("Back to About us")}</a>
    <header className="research-page-heading">
      <div><p className="eyebrow">{t("THE RESEARCH BEHIND GENESIS")}</p><h1>{t("Ideas, tested.")}<br /><span className="gradient-text">{t("Knowledge, shared.")}</span></h1></div>
      <div className="research-page-description"><p>{t("Explore our work in RF circuits, optimization and autonomous systems.")}</p><span>{papers.length} {t("publications")} <span aria-hidden="true">/</span> {Math.min(...papers.map(p => p.year))}–{Math.max(...papers.map(p => p.year))}</span></div>
    </header>
    <Publications people={site.about.people} papers={papers} />
  </main>;
}
