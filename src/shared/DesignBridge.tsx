import type { ReactNode } from 'react';
import { useLanguage } from './Language';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';
import { CircuitArtwork } from './CircuitArtwork';
import '../styles/design-bridge.css';

type Actor = { title: string; detail: string; compact: string };
type BridgeContent = {
  designer: Actor; engine: Actor; tools: Actor;
  intent: string; workflow: string; feedback: string;
  environment: string; assets: string; caption: string;
};

function Connection() {
  return <svg className="bridge-connection" viewBox="0 0 120 70" fill="none" aria-hidden="true">
    <path className="bridge-rail" d="M0 24h120M0 46h120" />
    <path className="bridge-stream" d="M0 24h120" pathLength="200" />
    <path className="bridge-stream bridge-return" d="M120 46H0" pathLength="200" />
    <path className="bridge-direction" d="m111 20 5 4-5 4M9 42l-5 4 5 4" />
  </svg>;
}

/** One RF visual, reused in the welcome and story sections. No product dependencies. */
export function DesignBridge({ content, brand, compact = false }: { content: BridgeContent; brand: ReactNode; compact?: boolean }) {
  const { t } = useLanguage();
  const { ref, running } = useVisibleMotion<HTMLElement>();
  return <figure ref={ref} className={`design-bridge ${compact ? 'design-bridge-compact' : ''}`} data-motion={running ? 'playing' : 'paused'} aria-label={content.caption}>
    <div className="bridge-scene">
      <div className="bridge-station bridge-designer"><CircuitArtwork kind="schematic" running={running} /><span className="bridge-caption">{content.designer.title}</span></div>
      <Connection />
      <div className="bridge-station bridge-engine"><CircuitArtwork kind="engine" running={running} /><span className="bridge-brand">{brand}</span></div>
      <Connection />
      <div className="bridge-station bridge-tools"><CircuitArtwork kind="layout" running={running} /><span className="bridge-caption">{content.tools.title}</span></div>
    </div>
    <span className="sr-only">{content.designer.detail} {content.engine.detail} {content.tools.detail} {content.assets}. {content.environment}.</span>
    {compact && <figcaption><a href="#/explore/story">{t('Discover our story')} <Icon name="diagonal" /></a></figcaption>}
  </figure>;
}
