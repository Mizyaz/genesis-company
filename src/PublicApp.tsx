import { useEffect, useState } from 'react';
import { Explore } from './pages/Explore';
import { SiteShell, useCompanyAppearance } from './shared/SiteShell';
import { MotionProvider } from './shared/MotionSettings';
import './styles/tokens.css';
import './styles/site.css';

/** Public entry point: presentation only, without product or assistant imports. */
export function PublicApp() {
  const [route, setRoute] = useState(window.location.hash);
  const { theme, setTheme } = useCompanyAppearance();
  useEffect(() => {
    const change = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const section = route.split('/')[2];
    const timer = window.setTimeout(() => {
      if (section && ['workflow', 'portfolio', 'team', 'story', 'contact', 'about'].includes(section)) {
        document.getElementById(section)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      } else window.scrollTo({ top: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [route]);
  return <MotionProvider><SiteShell explore homeUrl="#/explore" theme={theme} onThemeChange={setTheme}><Explore /></SiteShell></MotionProvider>;
}
