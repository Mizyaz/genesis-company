import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Holds its place (`className` gives it its size) and mounts `children` only once it comes within a screen of view, so
 * a heavy figure further down costs nothing at page load. */
export function Near({ className, children }: { className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); view.disconnect(); } }, { rootMargin: '100% 0px' });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  return <div ref={box} className={near ? undefined : className}>{near && children}</div>;
}
