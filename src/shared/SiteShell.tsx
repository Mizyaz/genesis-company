import { useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react';
import { Brand, Icon } from './ui';
import { useMotion } from './MotionSettings';
import { mailto } from '../pages/OnePage';

type Theme = 'light' | 'dark';
export function useCompanyAppearance() {
  // A theme the reader picked (or a ?theme= link) wins; until then the page follows the system's setting.
  const [theme, setChosen] = useState<Theme>(() => {
    const incoming = new URLSearchParams(window.location.search).get('theme');
    if (incoming === 'light' || incoming === 'dark') return incoming;
    try { const kept = localStorage.getItem('genesis.company.theme'); if (kept === 'light' || kept === 'dark') return kept; } catch { /* storage may be blocked */ }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const setTheme = (next: Theme) => { setChosen(next); try { localStorage.setItem('genesis.company.theme', next); } catch { /* Device-local preference is optional. */ } };
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (['light', 'dark'].includes(url.searchParams.get('theme') || '')) {
      try { localStorage.setItem('genesis.company.theme', url.searchParams.get('theme')!); } catch { /* optional */ }
      url.searchParams.delete('theme'); window.history.replaceState(window.history.state, '', url);
    }
  }, []);
  return { theme, setTheme };
}

export function SiteShell({ children, theme, onThemeChange }: { children: ReactNode; theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const motion = useMotion();
  const navId = `site-nav-${useId().replace(/:/g, '')}`;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const close = () => setMenuOpen(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('hashchange', close); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('hashchange', close); window.removeEventListener('keydown', escape); };
  }, []);
  // On small screens the navigation is a panel; following any link in it closes the panel.
  const followLink = (event: MouseEvent<HTMLElement>) => { if ((event.target as HTMLElement).closest('a')) setMenuOpen(false); };
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault(); // The hash belongs to the router, not to this in-page focus target.
    const main = document.getElementById('main');
    if (!main) return;
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  return <div className="site-shell">
    <a className="skip-link" href="#main" onClick={skipToContent}>Skip to content</a>
    <header className="site-header" data-menu={menuOpen ? 'open' : 'closed'}>
      <a className="brand-link" href="#/" aria-label="GENESIS home"><Brand /></a>
      <span className="header-divider" />
      <span className="header-caption">AUTOMATED RF CIRCUIT LAYOUT</span>
      <button className="icon-button menu-toggle" type="button" aria-expanded={menuOpen} aria-controls={navId} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(open => !open)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
      <nav id={navId} aria-label="Main navigation" onClick={followLink}>
        <a href="#/explore/how">How it works</a><a href="#/explore/membership">Membership</a><a href="#/explore/research">Research</a><a href="#/explore/team">Team</a>
        <a className="button button-primary header-cta" href={mailto('GENESIS specification')}>Send us a specification</a>
        <div className="nav-settings">
        <button className="icon-button theme-toggle" type="button" onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        <button className="icon-button motion-toggle" type="button" onClick={motion.toggle} aria-label={motion.enabled ? 'Stop animations' : 'Play animations'} title={motion.enabled ? 'Stop animations' : 'Play animations'}><Icon name={motion.enabled ? 'stop' : 'play'} /></button></div>
      </nav>
    </header>
    {children}
    <footer className="site-footer"><span>GENESIS <span className="footer-separator">/</span> Automated RF circuit layout</span></footer>
  </div>;
}
