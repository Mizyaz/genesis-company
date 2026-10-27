import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { cssBrand, mark, type BrandColors } from './markGeometry';
import { gradientMarkup, vectorMarkup } from './markSvg';

/** One timeline for the site and the film: the mark is drawn by current. Nothing shows at the start; the nodes charge,
 * then a bright head of current runs down each branch in turn and leaves the trace behind it, reaches the chip and runs
 * round its frame, shoots out along the pins, and the die lights. With `loop`, pulses of current keep running into
 * the chip. */
export const CHARGE = .35, BRANCH = .3, RUN = .55, CHIP = 1.55, LIT = 2.25, PERIOD = 2.4;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => { const x = clamp(v); return x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; };
const span = (t: number, from: number, length: number) => clamp((t - from) / length);
const flicker = (t: number, k: number) => .75 + .25 * Math.sin(t * 71 + k * 13) * Math.sin(t * 37 + k * 5);

/** A path revealed up to `p` (0 to 1) with a bright head of current at its front. */
function Current({ d, width, p, fill, light, glow, head = true, t, k }: { d: string; width: number; p: number; fill: string; light: string; glow: string; head?: boolean; t: number; k: number }) {
  if (p <= 0) return null;
  const front = Math.min(p, 1) * 100, tail = 9;
  return <>
    <path d={d} pathLength={100} stroke={fill} strokeWidth={width} strokeDasharray={`${front} 200`} />
    {head && p < 1 && <>
      <path d={d} pathLength={100} stroke={light} strokeWidth={width * 2.6} strokeDasharray={`${tail} 300`} strokeDashoffset={tail - front} opacity={.6 * flicker(t, k)} filter={glow} />
      <path d={d} pathLength={100} stroke={light} strokeWidth={width * 1.05} strokeDasharray={`${tail * .45} 300`} strokeDashoffset={tail * .45 - front} />
    </>}
  </>;
}

/** The mark at time `t` in seconds; without `t` it is drawn at rest. */
export function MarkDrawing({ t, loop = false, colors = cssBrand, className, style, title }: { t?: number; loop?: boolean; colors?: BrandColors; className?: string; style?: CSSProperties; title?: string }) {
  const id = `mark-${useId().replace(/:/g, '')}`, gradient = `${id}-g`, fill = `url(#${gradient})`, glow = `url(#${id}-glow)`, light = colors.brand4;
  const svg = (children: ReactNode) => <svg className={className} style={style} viewBox={mark.viewBox} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <defs><g dangerouslySetInnerHTML={{ __html: gradientMarkup(gradient, colors) }} />
      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter></defs>
    {children}{title && <title>{title}</title>}</svg>;
  if (t === undefined || (!loop && t > LIT + .6)) return svg(<g dangerouslySetInnerHTML={{ __html: vectorMarkup(gradient) }} />);
  const { chip } = mark, common = { fill, light, glow, t };
  // The nodes charge: a spark grows into each node.
  const charge = ease(span(t, 0, CHARGE));
  const branch = (order: number) => ease(span(t, CHARGE + order * BRANCH, RUN));
  const frame = ease(span(t, CHIP, .4)), pins = (i: number) => ease(span(t, CHIP + .3 + (i % 4) * .05, .3));
  const lit = span(t, CHIP + .45, LIT - CHIP - .45), flash = Math.max(0, 1 - Math.abs(t - (CHIP + .6)) / .35);
  // After the chip has lit, pulses of current run down the branches and the die answers each arrival.
  const pulses: ReactNode[] = []; let answer = 0;
  if (loop && t > LIT) mark.traces.forEach((trace, i) => {
    const p = ((t - LIT - trace.order * .25) % PERIOD + PERIOD) % PERIOD / .8;
    if (p <= 1.05) pulses.push(<Current key={`pulse-${i}`} d={trace.d} width={trace.width} p={p} k={i + 9} {...common} fill="transparent" />);
    else if (p < 1.5) answer = Math.max(answer, 1 - (p - 1.05) / .45);
  });
  return svg(<g fill="none" strokeLinecap="round" strokeLinejoin="round">
    {mark.nodes.map((n, i) => <g key={`n${i}`}>
      <circle cx={n.x} cy={n.y} r={n.r * charge} fill={fill} stroke="none" />
      {charge < 1 && <circle cx={n.x} cy={n.y} r={n.r * (.4 + .9 * charge)} fill={light} stroke="none" opacity={.7 * (1 - charge) * flicker(t, i)} filter={glow} />}
    </g>)}
    {mark.traces.map((trace, i) => <Current key={`t${i}`} d={trace.d} width={trace.width} p={branch(trace.order)} k={i} {...common} />)}
    <Current d={chip.frame} width={chip.stroke} p={frame} k={7} {...common} />
    {chip.pins.map((d, i) => <Current key={`p${i}`} d={d} width={chip.stroke} p={pins(i)} k={20 + i} {...common} />)}
    <rect x={chip.die.x} y={chip.die.y} width={chip.die.w} height={chip.die.h} rx={chip.die.rx} fill={fill} stroke="none" opacity={.8 * lit} />
    {(flash > 0 || answer > 0) && <rect x={chip.die.x - 10} y={chip.die.y - 10} width={chip.die.w + 20} height={chip.die.h + 20} rx={chip.die.rx + 10} fill={light} stroke="none" opacity={.55 * Math.max(flash, .6 * answer)} filter={glow} />}
    {pulses}
  </g>);
}

/** Seconds since mount, for `seconds` or for ever; undefined when the reader asks for less motion. */
export function useMarkClock(seconds = Infinity) {
  const [t, setT] = useState<number | undefined>(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? undefined : 0);
  useEffect(() => {
    if (t === undefined) return;
    let frame = 0; const start = performance.now();
    const step = (time: number) => { const s = (time - start) / 1000; setT(s >= seconds ? undefined : s); if (s < seconds) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}

/** The mark in the header: drawn once by current as the page opens, then at rest. */
export function SmallMark({ className = 'emblem-mark' }: { className?: string }) {
  const t = useMarkClock(LIT + .7);
  return <MarkDrawing t={t} className={className} />;
}
