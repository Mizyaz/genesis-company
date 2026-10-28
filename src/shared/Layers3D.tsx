import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { assetUrl } from './ui';

const LAYERS = Array.from({ length: 13 }, (_, i) => `/assets/layers3d/metal_${String(i + 1).padStart(2, '0')}.webp`);

/** The layout's 13 metal layers (bottom to top) as a CSS 3D stack: it turns slowly while on screen and a drag tilts and
 * turns it. Loaded only after the reader taps the poster (Chip3D.tsx). */
export default function Layers3D() {
  const box = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; rx: number; rz: number } | null>(null);
  const [on, setOn] = useState(true), [turning, setTurning] = useState(true), [pose, setPose] = useState({ rx: 56, rz: -28 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => setOn(entry.isIntersecting));
    view.observe(el);
    return () => view.disconnect();
  }, []);
  const down = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, ...pose }; setTurning(false); (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: PointerEvent) => { const d = drag.current; if (d) setPose({ rx: Math.max(0, Math.min(75, d.rx - (e.clientY - d.y) * .3)), rz: d.rz + (e.clientX - d.x) * .4 }); };
  return <div ref={box} className={`layers3d${on ? ' is-on' : ''}${turning ? ' is-turning' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
    <div className="layers3d-stack" style={{ '--rx': `${pose.rx}deg`, '--rz': `${pose.rz}deg` } as React.CSSProperties}>
      <div className="layers3d-turn">{LAYERS.map((src, i) => <img key={src} src={assetUrl(src)} alt="" draggable={false} style={{ '--i': i } as React.CSSProperties} />)}</div>
    </div>
    <span className="chip3d-hint">Drag to turn</span>
  </div>;
}
