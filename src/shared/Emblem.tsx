import { forwardRef, useId, type CSSProperties } from 'react';
import { useVisibleMotion } from './MotionSettings';
import { cellPath, emblem, emblemBox, emblemMark } from './emblem';
import '../styles/emblem.css';

const mark = { box: emblemBox(emblemMark), cells: cellPath(emblemMark, [1, 2, 3]) };
const big = {
  box: emblemBox(emblem), all: cellPath(emblem, [1, 2, 3]),
  metal: cellPath(emblem, [1]), fingers: cellPath(emblem, [2]), ports: cellPath(emblem, [3]),
};
// The shape of the symbol as a mask, so the current that runs up through it stays inside the metal.
const maskImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${big.box.viewBox}"><path d="${big.all}"/></svg>`)}")`;

/** The GENESIS symbol at logo size, in the theme's brand gradient. */
export function EmblemMark() {
  const id = `emblem-mark-${useId().replace(/:/g, '')}`;
  return <svg className="emblem-mark" viewBox={mark.box.viewBox} aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--cyan)' }} /><stop offset="1" style={{ stopColor: 'var(--violet)' }} /></linearGradient></defs>
    <path d={mark.cells} fill={`url(#${id})`} />
  </svg>;
}

/** The shared GENESIS symbol opens its supplied introduction without a flash or a delayed handoff. */
export const EmblemLauncher = forwardRef<HTMLButtonElement, { label: string; onLaunch: () => void }>(function EmblemLauncher({ label, onLaunch }, ref) {
  const { ref: seen, enabled, running } = useVisibleMotion<HTMLSpanElement>();
  const id = `emblem-${useId().replace(/:/g, '')}`;
  return <span ref={seen} className="emblem" data-motion={enabled ? 'on' : 'off'} data-running={running}>
    <button ref={ref} type="button" className="emblem-launch" aria-label={label} onClick={onLaunch}
      style={{ '--emblem-ratio': `${big.box.width} / ${big.box.height}`, '--emblem-mask': maskImage } as CSSProperties}>
      <span className="emblem-mesh" aria-hidden="true" />
      <span className="emblem-art" aria-hidden="true">
        <svg className="emblem-halo" viewBox={big.box.viewBox}>
          <defs><linearGradient id={`${id}-halo`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#41dce8" /><stop offset=".6" stopColor="#6fa8ff" /><stop offset="1" stopColor="#b08af4" /></linearGradient></defs>
          <path d={big.all} fill={`url(#${id}-halo)`} />
        </svg>
        <svg className="emblem-bloom" viewBox={big.box.viewBox}><path d={big.all} /></svg>
        <svg className="emblem-body" viewBox={big.box.viewBox} shapeRendering="crispEdges">
          <defs>
            <radialGradient id={`${id}-hot`} cx="50%" cy="58%" r="64%">
              <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#f0fdff" /><stop offset=".5" stopColor="#9ff3fa" />
              <stop offset=".72" stopColor="#41dce8" /><stop offset=".9" stopColor="#8f8cf6" /><stop offset="1" stopColor="#c77dff" />
            </radialGradient>
            <pattern id={`${id}-grid`} width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0V1H0" /></pattern>
          </defs>
          <path d={big.metal} fill={`url(#${id}-hot)`} />
          <path className="emblem-fingers" d={big.fingers} />
          <path className="emblem-ports" d={big.ports} />
          <path className="emblem-grid" d={big.all} fill={`url(#${id}-grid)`} />
        </svg>
        <span className="emblem-current" />
      </span>
    </button>
  </span>;
});
