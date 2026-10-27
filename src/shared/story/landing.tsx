import type { ReactNode } from 'react';
import { MarkDrawing } from '../GenesisMark';
import { mark } from '../markGeometry';
import { FPS } from './motion';
import { alpha, B, GRADIENT } from './palette';
import brand from '../../content/brand.json';

// The landing page's opening, frame by frame: the two sunrise layers of the workbench landing (design-start.css) and
// the GENESIS mark of the site's landing in the brand colours, on the same timeline: it switches on pixel by pixel.
// Frame-driven (no Remotion), for the film's scenes and the site's story player.

/** var(--motion-ease) = cubic-bezier(.2, .8, .2, 1), as Remotion's Easing.bezier solves it. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 40; i++) { const v = at(x1, x2, t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return at(y1, y2, t);
  };
}
const curve = bezier(.2, .8, .2, 1);
const motion = (frame: number, from: number, frames: number) => curve(Math.min(1, Math.max(0, (frame - from) / frames)));

/** The word GENESIS in the brand gradient. */
export function Wordmark({ size }: { size: number }): ReactNode {
  return <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: size, letterSpacing: '.08em', background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</div>;
}

/** The daybreak (2 s) and the sun above the page (1.8 s) from frame `from`, at strength k. */
export function SunriseView({ frame, from = 0, k = 1 }: { frame: number; from?: number; k?: number }) {
  const day = motion(frame, from, 60), sun = motion(frame, from, 54);
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1000, transformOrigin: '50% 0', opacity: day,
      transform: `translateY(${(1 - day) * -42}px) scaleX(${.7 + .3 * day})`,
      maskImage: 'linear-gradient(#000 45%, transparent 100%)', WebkitMaskImage: 'linear-gradient(#000 45%, transparent 100%)',
      background: `radial-gradient(ellipse at 50% -12%, #ffe6a82e, transparent 47%), radial-gradient(ellipse at 50% -30%, ${alpha(B.brand1, 0x47 / 255)}, transparent 70%), `
        + 'conic-gradient(from 150deg at 50% -10%, transparent 0deg, #ffe5ab08 14deg, transparent 22deg, #e5fbff0d 31deg, transparent 40deg, #ffe5ab08 49deg, transparent 60deg)' }} />
    <div style={{ position: 'absolute', top: -82, left: '10%', width: '80%', height: 168, borderRadius: '50%', opacity: sun,
      transform: `translateY(${(1 - sun) * -84}px) scaleX(${.45 + .55 * sun})`,
      background: `radial-gradient(ellipse at 50% 40%, #fff9dfb3 0%, #ffe5aa52 16%, ${alpha(B.brand1, 0x33 / 255)} 38%, transparent 70%)` }} />
  </div>;
}

/** The mark, `width` px wide, from frame `from`: a broken screen comes on, the branches and then the chip build pixel by
 * pixel, the pixels settle into the clean mark and current runs into the chip. */
export function LitEmblemView({ frame, width, from = 0 }: { frame: number; width: number; from?: number }) {
  return <div style={{ width, aspectRatio: `${mark.width} / ${mark.height}` }}>
    <MarkDrawing t={Math.max(0, (frame - from) / FPS)} loop colors={brand.dark} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} />
  </div>;
}
