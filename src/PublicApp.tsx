import { useEffect, useState } from 'react';
import { Explore } from './pages/Explore';
import { SiteShell, useCompanyAppearance } from './shared/SiteShell';
import { MotionProvider } from './shared/MotionSettings';
import './styles/tokens.css';
import './styles/site.css';

// The site is one page: links to the old pages land on their sections.
const legacyRoutes: Readonly<Record<string, string>> = {
  '#/about': '#/explore/about',
  '#/about/story': '#/explore/story',
  '#/explore/team': '#/explore/about',
  '#/publications': '#/explore/research',
  '#/explore/lab': '#/explore/research',
  '#/design': '#/',
};
const canonicalRoute = (hash: string) => legacyRoutes[hash] ?? hash;

/** Public entry point: presentation only, without product or assistant imports. */
export function PublicApp() {
  const [route, setRoute] = useState(() => canonicalRoute(window.location.hash));
  const { theme, setTheme } = useCompanyAppearance();
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
  useEffect(() => { document.title = 'GENESIS | From specs to silicon'; }, []);
  useEffect(() => {
    const section = route.split('/')[2];
    const timer = window.setTimeout(() => {
      const target = section && ['flow', 'claims', 'methods', 'non-intuitive', 'research', 'about', 'membership', 'partnership', 'portfolio', 'faq', 'story', 'contact'].includes(section) ? document.getElementById(section) : null;
      if (target instanceof HTMLDetailsElement) target.open = true; // A link to the questions opens them.
      if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      else window.scrollTo({ top: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [route]);
  return <MotionProvider><SiteShell explore caption="FROM SPECS TO SILICON" theme={theme} onThemeChange={setTheme}><Explore /></SiteShell></MotionProvider>;
}
