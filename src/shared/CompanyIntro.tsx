import { useEffect, useState } from 'react';
import siteContent from '../content/site.json';
import { useLanguage, useTranslatedContent } from './Language';
import { useVisibleMotion } from './MotionSettings';
import { EmblemLauncher } from './Emblem';
import { RFDesignScene } from './RFDesignScene';
import { Icon } from './ui';
import { navigate } from './gate';

const FILM = '#/explore/product-film';

/** The GENESIS symbol opens the product film, the one film of the real workbench. */
export function CompanyIntro() {
  const { t } = useLanguage();
  return <EmblemLauncher label={t('Watch the product film')} onLaunch={() => navigate(FILM)} />;
}

/** Explain why physical checks and RF performance must be considered together. Viewport-scoped, like all site motion. */
export function RFPhysics() {
  const { rfPhysics } = useTranslatedContent(siteContent);
  const { t } = useLanguage();
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setBeat(value => (value + 1) % 4), 2000);
    return () => window.clearInterval(timer);
  }, [running]);
  const verified = !enabled || beat >= 2;
  return <section ref={ref} className="content-section rf-physics" aria-labelledby="rf-physics-title" data-running={running} data-motion={enabled ? 'on' : 'off'}>
    <div className="rf-physics-copy"><p className="eyebrow">{rfPhysics.label}</p><h2 id="rf-physics-title">{rfPhysics.title}</h2><p>{rfPhysics.detail}</p><a className="button button-secondary" href={FILM}><Icon name="play" />{t('Watch the product film')}</a></div>
    <figure className="rf-physics-visual"><RFDesignScene stage={3} verified={verified} /><div className="rf-verification"><span><Icon name="check" />{rfPhysics.physical}</span><span data-verified={verified}><Icon name={verified ? 'check' : 'wave'} />{rfPhysics.performance}</span></div><figcaption>{t('Illustrated workflow')}</figcaption></figure>
  </section>;
}
