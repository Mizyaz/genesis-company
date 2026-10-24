import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { cellPath, emblem, emblemBox } from '../../../src/shared/emblem';

// The landing page's opening, frame by frame: the two sunrise layers of the workbench landing (design-start.css) and
// the lit symbol of the site's Emblem.tsx, which boots from its core outwards one ring of pixels at a time.
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// var(--motion-ease) = cubic-bezier(.2, .8, .2, 1).
const motion = (frame: number, from: number, frames: number) => interpolate(frame, [from, from + frames], [0, 1], { ...clamp, easing: Easing.bezier(.2, .8, .2, 1) });

/** The daybreak (2 s) and the sun above the page (1.8 s) from frame `from`, at strength k. */
export function Sunrise({ from = 0, k = 1 }: { from?: number; k?: number }) {
  const frame = useCurrentFrame(), day = motion(frame, from, 60), sun = motion(frame, from, 54);
  return <AbsoluteFill style={{ pointerEvents: 'none', opacity: k }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1000, transformOrigin: '50% 0', opacity: day,
      transform: `translateY(${(1 - day) * -42}px) scaleX(${.7 + .3 * day})`,
      maskImage: 'linear-gradient(#000 45%, transparent 100%)', WebkitMaskImage: 'linear-gradient(#000 45%, transparent 100%)',
      background: 'radial-gradient(ellipse at 50% -12%, #ffe6a82e, transparent 47%), radial-gradient(ellipse at 50% -30%, #41dce847, transparent 70%), '
        + 'conic-gradient(from 150deg at 50% -10%, transparent 0deg, #ffe5ab08 14deg, transparent 22deg, #e5fbff0d 31deg, transparent 40deg, #ffe5ab08 49deg, transparent 60deg)' }} />
    <div style={{ position: 'absolute', top: -82, left: '10%', width: '80%', height: 168, borderRadius: '50%', opacity: sun,
      transform: `translateY(${(1 - sun) * -84}px) scaleX(${.45 + .55 * sun})`,
      background: 'radial-gradient(ellipse at 50% 40%, #fff9dfb3 0%, #ffe5aa52 16%, #41dce833 38%, transparent 70%)' }} />
  </AbsoluteFill>;
}

const box = emblemBox(emblem), all = cellPath(emblem, [1, 2, 3]);
const metal = cellPath(emblem, [1]), fingers = cellPath(emblem, [2]), ports = cellPath(emblem, [3]);

/** The lit symbol, `width` px wide: the body boots in 11 steps over 1.1 s from `from` + 3, the halo fades in from `from` + 15. */
export function LitEmblem({ width, from = 0 }: { width: number; from?: number }) {
  const frame = useCurrentFrame(), step = Math.min(11, Math.max(0, Math.floor((frame - from - 3) / 3) + 1));
  const halo = interpolate(frame, [from + 15, from + 57], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const boot = `circle(${(step / 11) * 75}% at 50% 58%)`, layer = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
  return <div style={{ position: 'relative', width, aspectRatio: `${box.width} / ${box.height}` }}>
    <svg viewBox={box.viewBox} style={{ ...layer, transform: 'scale(1.08)', opacity: halo, filter: `blur(${width * .08}px) saturate(1.3)` }}>
      <defs><linearGradient id="film-halo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#41dce8" /><stop offset=".6" stopColor="#6fa8ff" /><stop offset="1" stopColor="#b08af4" /></linearGradient></defs>
      <path d={all} fill="url(#film-halo)" />
    </svg>
    <svg viewBox={box.viewBox} style={{ ...layer, opacity: .7, filter: `blur(${width * .01}px)`, clipPath: boot }}><path d={all} fill="#9ff3fa" /></svg>
    <svg viewBox={box.viewBox} shapeRendering="crispEdges" style={{ ...layer, clipPath: boot }}>
      <defs>
        <radialGradient id="film-hot" cx="50%" cy="58%" r="64%">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#f0fdff" /><stop offset=".5" stopColor="#9ff3fa" />
          <stop offset=".72" stopColor="#41dce8" /><stop offset=".9" stopColor="#8f8cf6" /><stop offset="1" stopColor="#c77dff" />
        </radialGradient>
        <pattern id="film-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0V1H0" fill="none" stroke="#03101d" strokeWidth=".1" strokeOpacity=".8" /></pattern>
      </defs>
      <path d={metal} fill="url(#film-hot)" />
      <path d={fingers} fill="#ffe7a8" />
      <path d={ports} fill="#c9a6ff" />
      <path d={all} fill="url(#film-grid)" />
    </svg>
  </div>;
}
