import { useLanguage } from '../shared/Language';
import { useState } from 'react';
import site from '../content/site.json';
import { Icon } from '../shared/ui';
import { productLink } from '../shared/productLink';
import '../styles/welcome.css';

const storageKey = 'genesis.company.productPort';

/** Installation choice first; only an explicit click opens the product. */
export function ProductLaunch({ theme }: { theme: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [port, setPort] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const url = productLink(port, theme);
  const invalid = port.length > 0 && !url;
  const remember = () => {
    setHelpOpen(true);
    try {
      localStorage.setItem(storageKey, port.trim());
      localStorage.removeItem('genesis.company.productAddress');
    } catch { /* Navigation still works without storage. */ }
  };
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="product-launch" aria-labelledby="product-heading">
      <a className="welcome-back" href="#/"><Icon name="arrow" /> {t("Back")}</a>
      <p className="eyebrow">{t("YOUR DESIGN ENVIRONMENT")}</p>
      <h1 id="product-heading">{t("Your next design.")}<br /><span className="gradient-text">{t("Starts here.")}</span></h1>
      <fieldset className="installation-choice">
        <legend>{t("Do you have GENESIS installed?")}</legend>
        <div><button type="button" aria-pressed={installed === true} onClick={() => setInstalled(true)}>{t("Yes")}</button><button type="button" aria-pressed={installed === false} onClick={() => setInstalled(false)}>{t("No")}</button></div>
      </fieldset>
      {installed === true && <section className="product-next-step" aria-labelledby="product-port-label">
        <label id="product-port-label" htmlFor="product-port">{t("Which port?")}</label>
        <p className="muted" id="product-port-help">{t("Use the port shown when GENESIS starts.")}</p>
        <div className="product-port-row">
          <input id="product-port" type="text" inputMode="numeric" maxLength={5} placeholder={t("e.g. 4300")} value={port} onChange={event => setPort(event.target.value)} autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby="product-port-help product-port-error" />
          {url ? <a className="button button-primary" href={url} data-genesis-handoff onClick={remember}>{t("Open GENESIS")} <Icon name="diagonal" /></a>
            : <button className="button button-primary" disabled>{t("Open GENESIS")} <Icon name="diagonal" /></button>}
        </div>
        <p id="product-port-error" className="product-port-error" role="status">{invalid && t('Enter a port number between 1 and 65535.')}</p>
        <small>{t("Continues with your selected theme. Cmd/Ctrl-click opens a new tab.")}</small>
        <p className="product-connection-note">{t("Using a remote server? Please connect your SSH tunnel first.")}</p>
        <details className="product-connection-help" open={helpOpen} onToggle={event => setHelpOpen(event.currentTarget.open)}>
          <summary>{t("Can’t open GENESIS?")}</summary>
          <ul>
            <li><strong>{t("Remote server:")}</strong> {t("start GENESIS there, connect your SSH tunnel and keep it open. Enter the local forwarded port above.")}</li>
            <li><strong>{t("On this computer:")}</strong> {t("start GENESIS and check its port. SSH is not required.")}</li>
            <li><strong>{t("Address not found:")}</strong> {t("complete the")} <a href="https://github.com/Mizyaz/genesis-company#one-time-local-name-setup" target="_blank" rel="noopener noreferrer">{t("one-time connection setup")}</a> {t("on the computer running your browser.")}</li>
            <li><strong>{t("404 page:")}</strong> {t("check that the port and page belong to GENESIS. A 404 is not an SSH connection check.")}</li>
          </ul>
          <p>{t("Once ready, select Open GENESIS again.")}</p>
        </details>
      </section>}
      {installed === false && <section className="product-next-step" aria-labelledby="product-contact-heading">
        <h2 id="product-contact-heading">{t("Let’s get you started.")}</h2>
        <p className="muted">{t("Contact us to get GENESIS.")}</p>
        <a className="button button-primary" href={`mailto:${site.brand.email}?subject=Get%20GENESIS`}>{t("Get in touch")} <Icon name="mail" /></a>
      </section>}
      <a className="welcome-discover" href="#/explore">{t("Discover GENESIS instead")} <Icon name="arrow" /></a>
    </section>
  </main>;
}
