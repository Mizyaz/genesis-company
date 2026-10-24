import { interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { cellPath, emblem, emblemBox } from '../../src/shared/emblem';

// Same pinned geometry as the site's Emblem.tsx; frame-driven here instead of CSS keyframes.
const box = emblemBox(emblem);
const all = cellPath(emblem, [1, 2, 3]), metal = cellPath(emblem, [1]), fingers = cellPath(emblem, [2]), ports = cellPath(emblem, [3]);
export const C = { page: '#041325', surface: '#091d32', text: '#f1f6fc', muted: '#9aacbf', border: '#20364b', cyan: '#41dce8', violet: '#b08af4' };
export const GRADIENT = 'linear-gradient(105deg, #41dce8 10%, #6fb9ed 47%, #b08af4 92%)';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Page colour, a faint 5 px circuit grid and two soft brand glows. */
export function Backdrop() {
  return <div style={{ position: 'absolute', inset: 0, background: C.page }}>
    <div style={{ position: 'absolute', inset: 0, opacity: .5, backgroundImage: `linear-gradient(90deg, ${C.cyan}10 1px, transparent 1px), linear-gradient(${C.cyan}10 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 60% at 18% 70%, ${C.cyan}1c, transparent 70%), radial-gradient(ellipse 45% 55% at 85% 25%, ${C.violet}18, transparent 70%)` }} />
  </div>;
}

/** The emblem boots in 11 pixel steps (as emblem-boot in the site CSS), its halo fades in, a current runs up once. */
export function Emblem({ size, bootAt = 0, steady = false }: { size: number; bootAt?: number; steady?: boolean }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = steady ? 99 : (frame - bootAt) / fps;
  const step = Math.floor(interpolate(t, [0, 1.1], [0, 11], clamp));
  const reveal = (step / 11) * 75;
  const halo = interpolate(t, [.2, 1.6], [0, 1], clamp);
  const current = interpolate(t, [1.6, 2.6], [110, -40], clamp);
  const height = size * box.height / box.width;
  return <div style={{ position: 'relative', width: size, height }}>
    <svg viewBox={box.viewBox} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: halo, transform: 'scale(1.08)', filter: `blur(${size * .08}px) saturate(1.3)` }}>
      <defs><linearGradient id="halo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#41dce8" /><stop offset=".6" stopColor="#6fa8ff" /><stop offset="1" stopColor="#b08af4" /></linearGradient></defs>
      <path d={all} fill="url(#halo)" />
    </svg>
    <svg viewBox={box.viewBox} shapeRendering="crispEdges" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', clipPath: `circle(${reveal}% at 50% 58%)` }}>
      <defs>
        <radialGradient id="hot" cx="50%" cy="58%" r="64%">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#f0fdff" /><stop offset=".5" stopColor="#9ff3fa" />
          <stop offset=".72" stopColor="#41dce8" /><stop offset=".9" stopColor="#8f8cf6" /><stop offset="1" stopColor="#c77dff" />
        </radialGradient>
        <linearGradient id="current" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="body"><path d={all} /></clipPath>
      </defs>
      <path d={metal} fill="url(#hot)" /><path d={fingers} fill="#ffe7a8" /><path d={ports} fill="#c9a6ff" />
      <g clipPath="url(#body)"><rect x="0" width={box.width} y={box.height * current / 100} height={box.height * .36} fill="url(#current)" /></g>
    </svg>
  </div>;
}

/** GENESIS in the brand gradient; arrives from a 7 px blur (identity-logo-arrive) and carries one light sweep. */
export function Wordmark({ size, arriveAt = 0, sweepAt }: { size: number; arriveAt?: number; sweepAt?: number }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = (frame - arriveAt) / fps;
  const k = interpolate(t, [0, .9], [0, 1], { ...clamp, easing: Easing.bezier(.16, 1, .3, 1) });
  const sweep = sweepAt === undefined ? 100 : interpolate((frame - sweepAt) / fps, [0, 1.2], [100, 0], clamp);
  return <div style={{
    fontFamily: 'Inter', fontWeight: 650, fontSize: size, letterSpacing: '.055em', lineHeight: 1, opacity: k,
    filter: `blur(${(1 - k) * 7}px)`, transform: `translateY(${(1 - k) * 3}px)`,
    backgroundImage: `linear-gradient(110deg, transparent 43%, rgba(214,252,255,.55) 50%, transparent 57%), ${GRADIENT}`,
    backgroundSize: '300% 100%, 100% 100%', backgroundPosition: `${sweep}% 0, 0 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  }}>GENESIS</div>;
}

export function Opening() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const grid = interpolate(frame / fps, [0, 1.2], [0, 1], clamp);
  return <div style={{ position: 'absolute', inset: 0, background: C.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
    <div style={{ position: 'absolute', inset: 0, opacity: grid * .7, backgroundImage: `linear-gradient(90deg, ${C.cyan}14 1px, transparent 1px), linear-gradient(${C.cyan}14 1px, transparent 1px)`, backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(closest-side, #000 30%, transparent)', maskImage: 'radial-gradient(closest-side, #000 30%, transparent)' }} />
    <Emblem size={360} bootAt={Math.round(.3 * fps)} />
    <Wordmark size={150} arriveAt={Math.round(1.4 * fps)} sweepAt={Math.round(2.2 * fps)} />
  </div>;
}

export function EndCard() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const tag = interpolate(frame / fps, [.6, 1.3], [0, 1], clamp);
  return <div style={{ position: 'absolute', inset: 0, background: C.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
    <Emblem size={300} steady />
    <Wordmark size={140} arriveAt={-99} sweepAt={Math.round(.4 * fps)} />
    <div style={{ fontFamily: 'Inter', fontSize: 44, color: C.muted, opacity: tag }}>Whatever you want to design.</div>
  </div>;
}
