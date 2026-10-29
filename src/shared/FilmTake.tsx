import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import film from '../content/film-take.json';
// Named imports: the build keeps the lines and pads of the chain's record, not its tiles (those load with the cards).
import { die, rf, dc, blocks } from '../content/story/motion.json';
import { assetUrl, Icon } from './ui';
import { useMotion } from './MotionSettings';

type Take = { video: string; poster: string };
type Manifest = { takes: Record<'dark' | 'light', Take> | null; width?: number; height?: number };
const { takes, width = 1920, height = 1080 } = film as Manifest;

/* The chip behind the film: the pads, RF lines and DC nets of the physical-flow chain the cards show (motion.json), in its
 * own coordinates with y up. Every line runs from its pad inward, so a pulse along it reads as current flowing in. */
const [X0, , , Y1] = die, DW = die[2] - X0, DH = Y1 - die[1];
const px = (x: number) => +(x - X0).toFixed(1), py = (y: number) => +(Y1 - y).toFixed(1);
const line = (points: number[][]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x)} ${py(y)}`).join('');
const PADS = blocks.filter(block => /pad/.test(block.name)).flatMap(block => block.members.map(member => member.box));
const NETS = new Map<number, string>();
for (const [x0, y0, x1, y1, net] of dc) NETS.set(net, (NETS.get(net) ?? '') + line([[x0, y0], [x1, y1]]));
const TRACES = [...rf.map(r => line([...r.path].reverse())), ...NETS.values()];
// Where the lines meet: the middle of the RF lines' inner ends. The film's centre sits on it.
const inner = rf.map(r => r.path[0]);
const MEET = [px(inner.reduce((s, p) => s + p[0], 0) / inner.length) / DW, py(inner.reduce((s, p) => s + p[1], 0) / inner.length) / DH];

/** The film frame's edge, drawn from the middle of its left and right sides towards the middle of the top and bottom,
 * as a coplanar line: the signal in the accent colour between two thin grounds. In a 1000-wide box of the film's ratio. */
const FW = 1000, FH = FW * height / width;
// The chip ends a little below the film (in its own height): it never runs under the first section below.
const CUT = (FH / FW / 2 + .06) / (2.6 * DH / DW);
function quarters(inset: number, r: number) {
  const [l, t, rt, b] = [inset, inset, FW - inset, FH - inset], my = FH / 2, mx = FW / 2;
  return [`M${l} ${my}V${t + r}Q${l} ${t} ${l + r} ${t}H${mx}`, `M${l} ${my}V${b - r}Q${l} ${b} ${l + r} ${b}H${mx}`,
    `M${rt} ${my}V${t + r}Q${rt} ${t} ${rt - r} ${t}H${mx}`, `M${rt} ${my}V${b - r}Q${rt} ${b} ${rt - r} ${b}H${mx}`];
}
const EDGES = [{ kind: 'pf-ground', d: quarters(-5, 17) }, { kind: 'pf-signal', d: quarters(.5, 12) }, { kind: 'pf-ground', d: quarters(6, 7) }];

// The film comes in square pixels, coarse to sharp, in milliseconds from the first paint (the CSS times the rest).
const MOSAIC_START = 900, MOSAIC_END = 1500, COARSE = 24;

/** Draws the playing film (or its poster until it can play) in square pixels shrinking from COARSE to one, then stops. */
function useMosaic(canvas: RefObject<HTMLCanvasElement | null>, video: RefObject<HTMLVideoElement | null>, poster: string, on: boolean) {
  const [done, setDone] = useState(!on);
  useEffect(() => {
    const out = canvas.current, src = video.current;
    if (!on || !out || !src) { setDone(true); return; }
    const still = new Image(); still.src = poster;
    const small = document.createElement('canvas'), ctx = out.getContext('2d')!, sctx = small.getContext('2d')!;
    const t0 = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0 - MOSAIC_START) / (MOSAIC_END - MOSAIC_START)));
      if (k >= 1) { setDone(true); return; }
      const w = out.clientWidth, h = out.clientHeight, size = Math.max(1, Math.round(COARSE * (1 - k) ** 2));
      if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
      small.width = Math.ceil(w / size); small.height = Math.ceil(h / size);
      const source = src.readyState >= 2 ? src : still.complete && still.naturalWidth ? still : null;
      if (source) {
        sctx.drawImage(source, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, small.width * size, small.height * size);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [on, poster]);
  return done;
}

/** After the entrance, every few seconds at random, one line of the chip carries a slow pulse. */
function useIdlePulses(group: RefObject<SVGGElement | null>, on: boolean) {
  useEffect(() => {
    const el = group.current;
    if (!on || !el) return;
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        const paths = el.querySelectorAll('path'), path = paths[Math.floor(Math.random() * paths.length)];
        if (!document.hidden && path) { path.classList.remove('is-idle'); void path.getBoundingClientRect(); path.classList.add('is-idle'); }
        next();
      }, 2500 + Math.random() * 3500);
    };
    timer = window.setTimeout(next, 1600);
    return () => clearTimeout(timer);
  }, [on]);
}

/** The product film: the recorded take of the theme in use (src/content/film-take.json, written by
 * scripts/export-film-take.mjs only for a take whose on-screen leak check is clean). It powers on with the page: pulses
 * run in along the chip's lines behind it, the page blurs and brightens where they meet, the lines draw the film's frame
 * and the film resolves from square pixels to sharp, about 1.6 s in all; the film plays from the first moment under it.
 * With less motion the film is simply there. Off screen it pauses; without IntersectionObserver it just plays. */
export function FilmTake({ theme, label }: { theme: 'dark' | 'light'; label: string }) {
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), pulses = useRef<SVGGElement>(null);
  const { enabled } = useMotion();
  const [powering] = useState(enabled); // The entrance plays once, at the first paint, when motion is on then.
  const [playing, setPlaying] = useState(enabled), [onScreen, setOnScreen] = useState(true);
  const poster = takes ? assetUrl(takes[theme].poster) : '';
  const settled = useMosaic(canvas, video, poster, powering && !!takes);
  useIdlePulses(pulses, enabled);
  useEffect(() => setPlaying(enabled), [enabled]);
  useEffect(() => {
    const el = video.current;
    if (!el || !('IntersectionObserver' in window)) return;
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
  return <div className={`power${powering ? ' is-powering' : ''}`} style={{ '--film-ratio': `${width} / ${height}`, '--meet-x': `${-MEET[0] * 100}%`, '--meet-y': `${-MEET[1] * 100}%`, '--chip-cut': `${(MEET[1] + CUT) * 100}%`, '--chip-ratio': `${DW} / ${DH}` } as CSSProperties}>
    {/* Two layers: the still chip (drawn once) and the pulses (the only one repainted while they run). */}
    <svg className="power-chip" viewBox={`0 0 ${DW} ${DH}`} aria-hidden="true">
      <path className="chip-pads" d={PADS.map(([a, b, c, d]) => `M${px(a)} ${py(d)}H${px(c)}V${py(b)}H${px(a)}z`).join('')} />
      <g className="chip-lines">{TRACES.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
    <svg className="power-chip chip-pulses" viewBox={`0 0 ${DW} ${DH}`} aria-hidden="true">
      <g ref={pulses}>{TRACES.map((d, i) => <path key={i} d={d} pathLength={1} style={{ '--delay': `${(i * 37) % 260}ms` } as CSSProperties} />)}</g>
    </svg>
    <div className="power-condense" aria-hidden="true" />
    <figure className="film-take">
      <video key={theme} ref={video} src={assetUrl(takes[theme].video)} poster={poster} width={width} height={height}
        muted loop playsInline autoPlay={enabled} preload="auto" aria-label={label} />
      {!settled && <canvas ref={canvas} className="film-mosaic" aria-hidden="true" />}
      <button className="icon-button film-toggle" type="button" onClick={() => setPlaying(on => !on)} aria-label={playing ? 'Pause the film' : 'Play the film'}><Icon name={playing ? 'pause' : 'play'} /></button>
    </figure>
    <svg className="power-frame" viewBox={`-8 -8 ${FW + 16} ${FH + 16}`} preserveAspectRatio="none" aria-hidden="true">
      {EDGES.map(edge => edge.d.map((d, i) => <path key={`${edge.kind}${i}`} className={edge.kind} d={d} pathLength={1} />))}
    </svg>
  </div>;
}
