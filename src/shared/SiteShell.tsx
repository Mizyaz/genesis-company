import { useEffect, useState, type ReactNode } from 'react';
import { Brand, Icon } from './ui';
import { useMotion } from './MotionSettings';
import { SiliconGate } from './SiliconGate';

type Theme = 'light' | 'dark';
export function useCompanyAppearance() {
  const [theme, setTheme] = useState<Theme>(() => {
    const incoming = new URLSearchParams(window.location.search).get('theme');
    if (incoming === 'light' || incoming === 'dark') return incoming;
    try { return localStorage.getItem('genesis.company.theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('genesis.company.theme', theme); } catch { /* Device-local preference is optional. */ }
  }, [theme]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (['light', 'dark'].includes(url.searchParams.get('theme') || '')) {
      url.searchParams.delete('theme'); window.history.replaceState(window.history.state, '', url);
    }
  }, []);
  return { theme, setTheme };
}

export function SiteShell({ children, explore, workbenchUrl, homeUrl = '#/', caption, designUrl, theme, onThemeChange }: { children: ReactNode; explore: boolean; workbenchUrl?: string; homeUrl?: string; caption?: string; designUrl?: string; theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const motion = useMotion();
  return <div className={`site-shell ${explore ? 'is-explore' : 'is-landing'}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="brand-link" href={homeUrl} aria-label="GENESIS home"><Brand /></a>
      <span className="header-divider" />
      <span className="header-caption">{caption || (explore ? 'FROM SPECS TO SILICON' : 'RFIC DESIGN ASSISTANT')}</span>
      <nav aria-label="Main navigation">
        {explore && <><a href="#/explore/workflow">Platform</a><a href="#/explore/portfolio">Designs</a><a href="#/publications">Research</a></>}
        <a className="about-link" href="#/explore/about">About us</a>
        {designUrl && <a className="workbench-link" href={designUrl}><span>Design</span><Icon name="diagonal" /></a>}
        {workbenchUrl && <a className="workbench-link" href={workbenchUrl} data-genesis-handoff aria-label="Open workbench"><span>Open workbench</span><Icon name="diagonal" /></a>}
        <button className="icon-button theme-toggle" type="button" onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        <button className="icon-button motion-toggle" type="button" onClick={motion.toggle} aria-label={motion.enabled ? 'Stop animations' : 'Play animations'} title={motion.enabled ? 'Stop animations' : 'Play animations'}><Icon name={motion.enabled ? 'stop' : 'play'} /></button>
      </nav>
    </header>
    {children}
    <SiliconGate />
    <footer className="site-footer"><span>GENESIS <span className="footer-separator">/</span> Autonomous RFIC design</span><span>From specs to silicon.</span></footer>
  </div>;
}
