import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const MotionContext = createContext<{ enabled: boolean; toggle: () => void } | null>(null);

/** One site-wide preference; individual diagrams still pause outside the viewport. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [choice, setChoice] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('genesis.company.motion');
      return saved === 'playing' ? true : saved === 'paused' ? false : null;
    } catch { return null; }
  });
  const enabled = choice ?? !reduced;
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.documentElement.dataset.motion = enabled ? 'playing' : 'paused'; }, [enabled]);
  function toggle() {
    setChoice(!enabled);
    try { localStorage.setItem('genesis.company.motion', enabled ? 'paused' : 'playing'); } catch { /* Optional local preference. */ }
  }
  return <MotionContext.Provider value={{ enabled, toggle }}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  const motion = useContext(MotionContext);
  if (!motion) throw new Error('MotionProvider is required.');
  return motion;
}

export function useVisibleMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { enabled } = useMotion();
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRect.height > 0));
    const visibility = () => setTabVisible(!document.hidden);
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return { ref, enabled, running: enabled && visible && tabVisible };
}
