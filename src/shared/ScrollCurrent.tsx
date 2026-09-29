import { useEffect, useRef } from 'react';
import { useMotion } from './MotionSettings';
import '../styles/scroll-current.css';

// Sparks that crackle off the tip while the page moves, drawn around the tip (0, 0) and falling below the wire.
const arcs = ['M0 0l-3 4 2 .4-3.4 4.6', 'M0 0l3.4 3.2-1.9.7 3.4 3.6', 'M0 0l-5.4 1.8 1.7 1.2-4.9 1.4'];

/** A live wire along the top of every page. The charge reaches as far as the page has been scrolled, a current runs
 * through it and its tip crackles while the page moves. Decorative only; with motion stopped it just follows the scroll. */
export function ScrollCurrent() {
  const { enabled } = useMotion();
  const wire = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = wire.current;
    if (!element) return;
    let frame = 0, rest = 0;
    const measure = () => {
      frame = 0;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      element.style.setProperty('--progress', room > 0 ? String(Math.min(1, Math.max(0, window.scrollY / room))) : '0');
      element.dataset.room = String(room > 8);
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const scrolled = () => {
      request();
      element.dataset.live = 'true';
      window.clearTimeout(rest);
      rest = window.setTimeout(() => { element.dataset.live = 'false'; }, 420);
    };
    // Pages change height as they open, fold and load images: measure again whenever the body does.
    const size = new ResizeObserver(request);
    size.observe(document.body);
    window.addEventListener('scroll', scrolled, { passive: true });
    window.addEventListener('resize', request);
    measure();
    return () => {
      size.disconnect(); cancelAnimationFrame(frame); window.clearTimeout(rest);
      window.removeEventListener('scroll', scrolled); window.removeEventListener('resize', request);
    };
  }, []);
  return <div ref={wire} className="scroll-current" data-motion={enabled ? 'on' : 'off'} aria-hidden="true">
    <span className="scroll-current-charge" />
    <span className="scroll-current-tip"><svg viewBox="-10 -10 20 20">{arcs.map(d => <path key={d} d={d} />)}</svg></span>
  </div>;
}
