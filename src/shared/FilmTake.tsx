import { useEffect, useRef, useState } from 'react';
import film from '../content/film-take.json';
import { assetUrl, Icon } from './ui';
import { useMotion } from './MotionSettings';

type Take = { video: string; poster: string };
type Manifest = { takes: Record<'dark' | 'light', Take> | null; width?: number; height?: number };
const { takes, width = 1920, height = 1080 } = film as Manifest;

/** The product film: the recorded take of the theme in use (src/content/film-take.json, written by
 * scripts/export-film-take.mjs only for a take whose on-screen leak check is clean). It fades in once it can play (or
 * after a second at most), plays muted on a loop while on screen, and waits for a tap when the reader asks for less motion. */
export function FilmTake({ theme, label }: { theme: 'dark' | 'light'; label: string }) {
  const video = useRef<HTMLVideoElement>(null), { enabled } = useMotion();
  const [ready, setReady] = useState(false), [playing, setPlaying] = useState(enabled), [onScreen, setOnScreen] = useState(true);
  useEffect(() => setPlaying(enabled), [enabled]);
  useEffect(() => { const timer = setTimeout(() => setReady(true), 1000); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    const el = video.current;
    if (!el || !('IntersectionObserver' in window)) return; // Without it the film just plays.
    const view = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    view.observe(el);
    return () => view.disconnect();
  }, [theme]);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (playing && onScreen) el.play().catch(() => setPlaying(false)); else el.pause();
  }, [playing, onScreen, theme]);
  if (!takes) return null;
  return <figure className={`film-take${ready ? ' is-ready' : ''}`} style={{ aspectRatio: `${width} / ${height}` }}>
    <video key={theme} ref={video} src={assetUrl(takes[theme].video)} poster={assetUrl(takes[theme].poster)} width={width} height={height}
      muted loop playsInline preload="auto" aria-label={label} onCanPlay={() => setReady(true)} />
    <button className="icon-button film-toggle" type="button" onClick={() => setPlaying(on => !on)} aria-label={playing ? 'Pause the film' : 'Play the film'}><Icon name={playing ? 'pause' : 'play'} /></button>
  </figure>;
}
