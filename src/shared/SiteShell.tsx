import { useLanguage } from './Language';
import { useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react';
import { Brand, Icon } from './ui';
import { useMotion } from './MotionSettings';
import { SiliconGate } from './SiliconGate';
import { ScrollCurrent } from './ScrollCurrent';

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
  const { t, language, setLanguage } = useLanguage();
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
  return <div className={`site-shell ${explore ? 'is-explore' : 'is-landing'}`}>
    <a className="skip-link" href="#main" onClick={skipToContent}>{t("Skip to content")}</a>
    <ScrollCurrent />
    <header className="site-header" data-menu={menuOpen ? 'open' : 'closed'}>
      <a className="brand-link" href={homeUrl} aria-label={t("GENESIS home")}><Brand /></a>
      <span className="header-divider" />
      <span className="header-caption">{t(caption || (explore ? 'FROM SPECS TO SILICON' : 'RFIC DESIGN ASSISTANT'))}</span>
      <button className="icon-button menu-toggle" type="button" aria-expanded={menuOpen} aria-controls={navId} aria-label={t(menuOpen ? 'Close menu' : 'Open menu')} onClick={() => setMenuOpen(open => !open)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
      <nav id={navId} aria-label={t("Main navigation")} onClick={followLink}>
        {explore && <><a href="#/explore/membership">{t("Membership")}</a><a href="#/explore/portfolio">{t("Designs")}</a><a href="#/explore/workflow">{t("Platform")}</a><a href="#/publications">{t("Research")}</a></>}
        <a className="about-link" href="#/about">{t("About us")}</a>
        {designUrl && <a className="workbench-link" href={designUrl}><span>{t("Design")}</span><Icon name="diagonal" /></a>}
        {workbenchUrl && <a className="workbench-link" href={workbenchUrl} data-genesis-handoff aria-label={t("Open workbench")}><span>{t("Open workbench")}</span><Icon name="diagonal" /></a>}
        <div className="nav-settings"><div className="language-switch" role="group" aria-label={t('Site language')}>
          <button type="button" lang="tr" aria-label="Türkçe" aria-pressed={language === 'tr'} onClick={() => setLanguage('tr')}>TR</button><span aria-hidden="true">/</span>
          <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>ENG</button>
        </div>
        <button className="icon-button theme-toggle" type="button" onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} title={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        <button className="icon-button motion-toggle" type="button" onClick={motion.toggle} aria-label={t(motion.enabled ? 'Stop animations' : 'Play animations')} title={t(motion.enabled ? 'Stop animations' : 'Play animations')}><Icon name={motion.enabled ? 'stop' : 'play'} /></button></div>
      </nav>
    </header>
    {children}
    <SiliconGate />
    <footer className="site-footer"><span>{t("GENESIS")} <span className="footer-separator">/</span> {t("Autonomous RFIC design")}</span><span>{t("From specs to silicon.")}</span></footer>
  </div>;
}
