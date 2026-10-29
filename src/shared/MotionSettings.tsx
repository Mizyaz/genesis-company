import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// The reader's own choice from the header button (v2: choices kept before 10-29 start over). Motion plays until the
// reader stops it there; the system's reduced-motion setting does not stop the film's entrance (Islam, 10-29).
const KEY = 'genesis.company.motion.v2';

const MotionContext = createContext<{ enabled: boolean; toggle: () => void } | null>(null);

/** One site-wide preference; individual diagrams still pause outside the viewport. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved === 'playing' ? true : saved === 'paused' ? false : null;
    } catch { return null; }
  });
  const enabled = choice ?? true;
  useEffect(() => { document.documentElement.dataset.motion = enabled ? 'playing' : 'paused'; }, [enabled]);
  function toggle() {
    setChoice(!enabled);
    try { localStorage.setItem(KEY, enabled ? 'paused' : 'playing'); } catch { /* Optional local preference. */ }
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
