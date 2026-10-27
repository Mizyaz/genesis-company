import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LIT, MarkDrawing, useMarkClock } from './GenesisMark';
import '../styles/intro.css';

const SEEN = 'genesis-intro-seen', HOLD = LIT + 1.3, LEAVE = .7;

/** The site opens as the film does: the mark is drawn by current, GENESIS and its line come up under it, and the page
 * comes in behind. Once a visit; a click, a key or a scroll skips it; readers who ask for less motion never see it. */
export function SiteIntro({ line }: { line: string }) {
  const [show, setShow] = useState(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try { return !sessionStorage.getItem(SEEN); } catch { return true; }
  });
  const t = useMarkClock(HOLD + LEAVE), [skipped, setSkipped] = useState(false);
  const leaving = skipped || (t ?? HOLD + LEAVE) >= HOLD;
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* the intro shows again next visit */ }
    const skip = () => setSkipped(true);
    const events = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
    events.forEach(e => window.addEventListener(e, skip, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, skip));
  }, [show]);
  useEffect(() => {
    if (!show || !leaving) return;
    const timer = window.setTimeout(() => setShow(false), LEAVE * 1000);
    return () => window.clearTimeout(timer);
  }, [show, leaving]);
  if (!show) return null;
  const time = t ?? LIT + 1;
  // Over the whole page, header included, outside the page's own entrance animation.
  return createPortal(<div className={`site-intro${leaving ? ' is-leaving' : ''}`} aria-hidden="true">
    <div className="site-intro-glow" />
    <MarkDrawing t={time} className="site-intro-mark" />
    <p className="site-intro-name gradient-text" style={{ opacity: Math.min(1, Math.max(0, (time - 1.4) / .5)) }}>GENESIS</p>
    <p className="site-intro-line" style={{ opacity: Math.min(1, Math.max(0, (time - 2.1) / .5)) }}>{line}</p>
  </div>, document.body);
}
