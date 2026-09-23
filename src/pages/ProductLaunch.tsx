import { useState } from 'react';
import { Icon } from '../shared/ui';
import { DEFAULT_PRODUCT_URL, productLink } from '../shared/productLink';
import '../styles/welcome.css';

const storageKey = 'genesis.company.productAddress';

/** Explicit link to the user's installation, not a client of its backend. */
export function ProductLaunch({ theme }: { theme: 'light' | 'dark' }) {
  const [address, setAddress] = useState(() => {
    try { return localStorage.getItem(storageKey) || DEFAULT_PRODUCT_URL; } catch { return DEFAULT_PRODUCT_URL; }
  });
  const url = productLink(address, theme);
  const remember = () => {
    try { localStorage.setItem(storageKey, address.trim()); } catch { /* Navigation still works without storage. */ }
  };
  const reset = () => {
    setAddress(DEFAULT_PRODUCT_URL);
    try { localStorage.removeItem(storageKey); } catch { /* Device-local preference is optional. */ }
  };
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="product-launch" aria-labelledby="product-heading">
      <a className="welcome-back" href="#/"><Icon name="arrow" /> Back</a>
      <p className="eyebrow">YOUR DESIGN ENVIRONMENT</p>
      <h1 id="product-heading">Your next design.<br /><span className="gradient-text">Your own workspace.</span></h1>
      <p className="welcome-intro">Open the assistant and workspace in your GENESIS installation.</p>
      <div className="product-launch-action">
        {url ? <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer" onClick={remember}>Open GENESIS <Icon name="diagonal" /></a>
          : <button className="button button-primary" disabled>Open GENESIS <Icon name="diagonal" /></button>}
        <p className="muted">Opens in a new tab. Your theme follows you.</p>
      </div>
      <details className="product-connection">
        <summary>Connection settings <Icon name="sliders" /></summary>
        <label htmlFor="product-address">GENESIS product address</label>
        <input id="product-address" type="url" value={address} onChange={event => setAddress(event.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!url} aria-describedby="product-address-help product-address-error" />
        <p id="product-address-help">Use your local address or SSH-forwarded product URL. Saved in this browser when you open GENESIS.</p>
        <p id="product-address-error" className="product-address-error" role="status">{!url && 'Enter a full HTTP or HTTPS URL without a username or password.'}</p>
        <button className="welcome-text-button" type="button" onClick={reset}>Reset to local default</button>
      </details>
      <aside className="product-start-help"><Icon name="document" /><div><strong>Not running yet?</strong><p>Start your GENESIS installation, then open it above. If you use SSH, forward the product port and update the address in Connection settings.</p><small>This page does not check whether the application is running.</small></div></aside>
      <a className="welcome-discover" href="#/explore">Discover GENESIS instead <Icon name="arrow" /></a>
    </section>
  </main>;
}
