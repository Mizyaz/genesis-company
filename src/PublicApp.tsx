import { useEffect, useState } from 'react';
import { Explore } from './pages/Explore';
import { Welcome } from './pages/Welcome';
import { ProductLaunch } from './pages/ProductLaunch';
import { Research } from './pages/Research';
import { About } from './pages/About';
import { SiteShell, useCompanyAppearance } from './shared/SiteShell';
import { MotionProvider } from './shared/MotionSettings';
import { useLanguage } from './shared/Language';
import './styles/tokens.css';
import './styles/site.css';

// Preserve shared links from before About became a separate page.
const legacyRoutes: Readonly<Record<string, string>> = {
  '#/explore/about': '#/about',
  '#/explore/story': '#/about/story',
  '#/explore/team': '#/about',
};
const canonicalRoute = (hash: string) => legacyRoutes[hash] ?? hash;

/** Public entry point: presentation only, without product or assistant imports. */
export function PublicApp() {
  const { t } = useLanguage();
  const [route, setRoute] = useState(() => canonicalRoute(window.location.hash));
  const { theme, setTheme } = useCompanyAppearance();
  const explore = route.startsWith('#/explore');
  const research = route === '#/publications';
  const about = route === '#/about' || route.startsWith('#/about/');
  const design = route === '#/design';
  useEffect(() => {
    const change = () => {
      const next = canonicalRoute(window.location.hash);
      if (next !== window.location.hash) window.history.replaceState(window.history.state, '', next);
      setRoute(next);
    };
    change();
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title = t(research ? 'Research & publications | GENESIS' : about ? 'About us | GENESIS' : design ? 'Design | GENESIS' : explore ? 'Explore GENESIS | From specs to silicon' : 'GENESIS | Discover or design');
  }, [research, about, design, explore, t]);
  useEffect(() => {
    const section = route.split('/')[2];
    const timer = window.setTimeout(() => {
      const target = section && ['membership', 'portfolio', 'workflow', 'silicon', 'services', 'faq', 'story', 'contact'].includes(section) ? document.getElementById(section) : null;
      if (target instanceof HTMLDetailsElement) target.open = true; // A link to the questions opens them.
      if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      else window.scrollTo({ top: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [route, explore, design, research, about]);
  return <MotionProvider><SiteShell explore={explore || research || about} caption="FROM SPECS TO SILICON" designUrl={design ? undefined : '#/design'} theme={theme} onThemeChange={setTheme}>
    {research ? <Research /> : about ? <About /> : explore ? <Explore /> : design ? <ProductLaunch theme={theme} /> : <Welcome />}
  </SiteShell></MotionProvider>;
}
