import site from '../content/site.json';
import { Brand, Icon } from '../shared/ui';
import { DesignBridge } from '../shared/DesignBridge';
import '../styles/welcome.css';

/** Public gateway. No product state or assistant transport is imported. */
export function Welcome() {
  return <main id="main" className="welcome-page">
    <div className="landing-atmosphere" aria-hidden="true" />
    <section className="welcome-content" aria-labelledby="welcome-heading">
      <p className="eyebrow">CIRCUITS. FIELDS. INTELLIGENCE.</p>
      <h1 id="welcome-heading"><Brand large /></h1>
      <p className="welcome-tagline">From specs to <span className="gradient-text">silicon.</span></p>
      <p className="welcome-intro">Explore what we build. Or start your next design.</p>
      <div className="welcome-choices">
        <a className="welcome-choice" href="#/explore"><Icon name="wave" /><span><strong>Discover</strong><small>Our approach, our circuits, our story.</small></span><Icon name="arrow" /></a>
        <a className="welcome-choice welcome-choice-design" href="#/design"><Icon name="chip" /><span><strong>Design</strong><small>Open your GENESIS design environment.</small></span><Icon name="arrow" /></a>
      </div>
      <DesignBridge compact content={site.story.diagram} brand={<Brand />} />
    </section>
  </main>;
}
