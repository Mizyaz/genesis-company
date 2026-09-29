import { useEffect, useState, type ReactNode } from 'react';
import { Brand } from './ui';
import { useVisibleMotion } from './MotionSettings';
import '../styles/circuit-identity.css';

const wordmarkTraces = [
  'M0 108H38L64 134H198L210 146H326',
  'M706 70H662L640 48H564L544 28H464',
  'M150 160H230L248 142H452L468 126H594L616 148H706',
  'M16 38H116L132 22H246L262 38H302',
];

/** Keeps the shared wordmark intact; only this optional wrapper animates it. Traces etch in once. */
export function ElectricBrand({ mark = true }: { mark?: boolean }) {
  const { ref, running } = useVisibleMotion<HTMLSpanElement>();
  return <span ref={ref} className="electric-brand" data-running={running}>
    <svg className="electric-brand-traces" viewBox="0 0 706 180" fill="none" aria-hidden="true">
      {wordmarkTraces.map(d => <path key={d} className="identity-rail" d={d} pathLength="100" />)}
      {[[326, 146], [464, 28], [150, 160], [302, 38]].map(([cx, cy]) => <circle className="identity-contact" key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.8" />)}
    </svg>
    <Brand large mark={mark} />
  </span>;
}

/** One entrance sequence for the wordmark and its name. Stopping reveals all text. A `symbol` (the large GENESIS
 * symbol) stands above the name instead of the small one beside it. */
export function BrandIntro({ headingId, symbol }: { headingId: string; symbol?: ReactNode }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLDivElement>();
  const [entered, setEntered] = useState(!enabled);
  useEffect(() => { if (!enabled) setEntered(true); }, [enabled]);
  return <div ref={ref} className="brand-intro" data-entering={enabled && !entered} data-running={running}>
    {symbol}
    <h1 id={headingId}><ElectricBrand mark={!symbol} /></h1>
    <p className="brand-signature" lang="en" aria-label="Generative Evolution of Silicon Intelligent Systems"
      onAnimationEnd={event => { if (event.animationName === 'identity-signature-arrive') setEntered(true); }}>
      <strong>Gen</strong>erative <strong>E</strong>volution of <strong>S</strong>ilicon <strong>I</strong>ntelligent <strong>S</strong>ystems
    </p>
  </div>;
}
