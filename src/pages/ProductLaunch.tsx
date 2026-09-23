import { useState } from 'react';
import site from '../content/site.json';
import { Icon } from '../shared/ui';
import { productLink } from '../shared/productLink';
import '../styles/welcome.css';

const storageKey = 'genesis.company.productPort';

/** Installation choice first; only an explicit click opens the product. */
export function ProductLaunch({ theme }: { theme: 'light' | 'dark' }) {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [port, setPort] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const url = productLink(port, theme);
  const invalid = port.length > 0 && !url;
  const remember = () => {
    try {
      localStorage.setItem(storageKey, port.trim());
      localStorage.removeItem('genesis.company.productAddress');
    } catch { /* Navigation still works without storage. */ }
  };
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="product-launch" aria-labelledby="product-heading">
      <a className="welcome-back" href="#/"><Icon name="arrow" /> Back</a>
      <p className="eyebrow">YOUR DESIGN ENVIRONMENT</p>
      <h1 id="product-heading">Your next design.<br /><span className="gradient-text">Starts here.</span></h1>
      <fieldset className="installation-choice">
        <legend>Do you have GENESIS installed?</legend>
        <div><button type="button" aria-pressed={installed === true} onClick={() => setInstalled(true)}>Yes</button><button type="button" aria-pressed={installed === false} onClick={() => setInstalled(false)}>No</button></div>
      </fieldset>
      {installed === true && <section className="product-next-step" aria-labelledby="product-port-label">
        <label id="product-port-label" htmlFor="product-port">Which port?</label>
        <p className="muted" id="product-port-help">Use the port shown when GENESIS starts.</p>
        <div className="product-port-row">
          <input id="product-port" type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 4300" value={port} onChange={event => setPort(event.target.value)} autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby="product-port-help product-port-error" />
          {url ? <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer" onClick={remember}>Open GENESIS <Icon name="diagonal" /></a>
            : <button className="button button-primary" disabled>Open GENESIS <Icon name="diagonal" /></button>}
        </div>
        <p id="product-port-error" className="product-port-error" role="status">{invalid && 'Enter a port number between 1 and 65535.'}</p>
        <small>Opens in a new tab with your selected theme.</small>
      </section>}
      {installed === false && <section className="product-next-step" aria-labelledby="product-contact-heading">
        <h2 id="product-contact-heading">Let’s get you started.</h2>
        <p className="muted">Contact us to get GENESIS.</p>
        <a className="button button-primary" href={`mailto:${site.brand.email}?subject=Get%20GENESIS`}>Get in touch <Icon name="mail" /></a>
      </section>}
      <a className="welcome-discover" href="#/explore">Discover GENESIS instead <Icon name="arrow" /></a>
    </section>
  </main>;
}
