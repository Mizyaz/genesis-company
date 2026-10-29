import { useEffect, useState } from 'react';
import { Home } from './pages/OnePage';
import { CollaborationPage, ProcessPage } from './pages/SubPages';
import { SiteShell, useCompanyAppearance } from './shared/SiteShell';
import { MotionProvider } from './shared/MotionSettings';
import './styles/tokens.css';
import './styles/site.css';
import './styles/one-page.css';

// The site is one page and two of its own (#/process, #/collaboration): links to the old pages and sections land on the section that now holds them.
const legacyRoutes: Readonly<Record<string, string>> = {
  '#/about': '#/explore/team',
  '#/about/story': '#/explore/how',
  '#/explore/about': '#/explore/team',
  '#/publications': '#/explore/research',
  '#/explore/lab': '#/explore/research',
  '#/design': '#/',
  ...Object.fromEntries(['flow', 'claims', 'methods', 'chip3d', 'non-intuitive', 'portfolio', 'story'].map(old => [`#/explore/${old}`, '#/explore/how'])),
  ...Object.fromEntries(['partnership', 'faq'].map(old => [`#/explore/${old}`, '#/explore/membership'])),
};
const SECTIONS = ['how', 'membership', 'research', 'team', 'contact'];
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
  useEffect(() => { document.title = 'GENESIS | Automated layout for RF and mmWave front-ends'; }, []);
  useEffect(() => {
    const section = route.split('/')[2];
    const timer = window.setTimeout(() => {
      const target = section && SECTIONS.includes(section) ? document.getElementById(section) : null;
      if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      else window.scrollTo({ top: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [route]);
  // Two pages of their own: every step of the process, and collaboration.
  const page = route === '#/process' ? <ProcessPage /> : route === '#/collaboration' ? <CollaborationPage /> : <Home theme={theme} />;
  return <MotionProvider><SiteShell theme={theme} onThemeChange={setTheme}>{page}</SiteShell></MotionProvider>;
}
