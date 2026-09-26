import { useEffect, useState } from 'react';
import { Explore } from './pages/Explore';
import { Welcome } from './pages/Welcome';
import { ProductLaunch } from './pages/ProductLaunch';
import { Research } from './pages/Research';
import { SiteShell, useCompanyAppearance } from './shared/SiteShell';
import { MotionProvider } from './shared/MotionSettings';
import './styles/tokens.css';
import './styles/site.css';

/** Public entry point: presentation only, without product or assistant imports. */
export function PublicApp() {
  const [route, setRoute] = useState(window.location.hash);
  const { theme, setTheme } = useCompanyAppearance();
  const explore = route.startsWith('#/explore');
  const research = route === '#/publications';
  const design = route === '#/design';
  useEffect(() => {
    const change = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title = research ? 'Research & publications | GENESIS' : design ? 'Design | GENESIS' : explore ? 'Explore GENESIS | From specs to silicon' : 'GENESIS | Discover or design';
    const section = route.split('/')[2];
    const timer = window.setTimeout(() => {
      if (section && ['workflow', 'portfolio', 'team', 'story', 'contact', 'about'].includes(section)) {
        document.getElementById(section)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      } else window.scrollTo({ top: 0 });
    }, 30);
    return () => clearTimeout(timer);
  }, [route, explore, design, research]);
  return <MotionProvider><SiteShell explore={explore || research} caption="FROM SPECS TO SILICON" designUrl={design ? undefined : '#/design'} theme={theme} onThemeChange={setTheme}>
    {research ? <Research /> : explore ? <Explore /> : design ? <ProductLaunch theme={theme} /> : <Welcome />}
  </SiteShell></MotionProvider>;
}
