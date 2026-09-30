import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useVisibleMotion } from './MotionSettings';
import { EmblemMark } from './Emblem';
import { Icon } from './ui';
import { metalRuns, pixelLayout, type PixelLayout } from './pixelLayout';
import '../styles/product-intro.css';

export type IntroContent = {
  label: string; you: string; prompt: string; steps: string[]; parts: string[]; ports: string[]; caption: string; description: string;
};

type Phase = 'type' | 'send' | 'draw' | 'optimize' | 'ready' | 'clear';
type Run = { phase: Phase; typed: number; step: number; cycle: number };

// The circuit, left to right along the signal line: the input pads, the input match, a transistor, the interstage
// match, a transistor, the output match and the output pads. Pixelated passives are 18 x 18 cells in a window of the
// ground plane; transistors are multi-finger devices between them.
const middle = 70, grid = 18, cell = 50 / grid;
const passiveX = [34, 128, 222];
const deviceX = [94, 188];
// Each run is one optimization: the pixels start from a metal density that changes a little per iteration, so
// neighbouring candidates share most of their pixels (local moves, not new random patterns), and each transistor
// changes its finger count and finger width. Illustrative values; none is shown as a number.
const fills = [.45, .5, .47, .53, .49, .51];
const devices = [
  { fingers: [4, 6, 6, 5, 6, 6], width: [.6, .8, .92, .84, .96, .9] },
  { fingers: [6, 8, 10, 9, 8, 8], width: [.7, .9, 1, .9, .84, .88] },
];
const iterations = fills.length - 1;
const chain = (cycle: number) => [3, 11, 19].map(seed => fills.map(fill => pixelLayout({
  columns: grid, rows: grid, seed: seed + cycle * 7, fill, mirror: 'across', ports: [{ side: 'left', at: 8 }, { side: 'right', at: 8 }],
})));

/** One pixelated matching network in its window; cells the latest iteration switched flash as they change. */
function Passive({ layouts, step, x, order, label }: { layouts: PixelLayout[]; step: number; x: number; order: number; label: string }) {
  const layout = layouts[step], before = step > 0 ? layouts[step - 1] : null, top = middle - 25;
  const flips = before ? layout.metal.flatMap((row, r) => row.flatMap((on, c) => on !== before.metal[r][c] ? [{ r, c, on }] : [])) : [];
  return <g className="intro-passive" style={{ '--o': order } as CSSProperties}>
    <rect className="intro-window" x={x - 3} y={top - 3} width="56" height="56" rx="2" />
    <g className="intro-metal">{metalRuns(layout).map(([r, c, n]) => <rect key={`${r}.${c}`} x={x + c * cell} y={top + r * cell} width={n * cell + .2} height={cell + .2} />)}</g>
    <g key={step} className="intro-flips">{flips.map(({ r, c, on }) => <rect key={`${r}.${c}`} data-on={on} x={x + c * cell} y={top + r * cell} width={cell} height={cell} />)}</g>
    <text className="intro-part" x={x + 25} y="118">{label}</text>
  </g>;
}

/** A multi-finger transistor: the fingers run across the active area; optimization changes their number and width. */
function Transistor({ spec, step, x, order }: { spec: typeof devices[number]; step: number; x: number; order: number }) {
  const fingers = spec.fingers[step], height = 36, top = middle - height / 2;
  return <g className="intro-device" style={{ '--o': order } as CSSProperties}>
    <g className="intro-device-body" style={{ transform: `scaleY(${spec.width[step]})` }}>
      <rect className="intro-active" x={x} y={top} width="24" height={height} rx="1.5" />
      <g key={fingers} className="intro-fingers">{Array.from({ length: fingers }, (_, i) => {
        const at = x + 3 + (i + .5) * 18 / fingers;
        return <path key={i} d={`M${at} ${top - 3}V${top + height + 3}`} />;
      })}</g>
    </g>
  </g>;
}

/** The product in one picture: a prompt to the GENESIS assistant becomes a circuit (pixelated matching networks with
 * transistors between them), which is then optimized, the pixels and the transistor sizes changing, until the layout
 * is ready. It runs while it is on screen and motion is allowed; stopped or reduced motion shows the finished layout.
 * An illustration of a session, not a recording, and it shows no figures. */
export function ProductIntro({ content }: { content: IntroContent }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const { prompt } = content;
  const [run, setRun] = useState<Run>({ phase: 'type', typed: 0, step: 0, cycle: 0 });
  const view: Run = enabled ? run : { phase: 'ready', typed: prompt.length, step: iterations, cycle: 0 };
  useEffect(() => {
    if (!running) return;
    const { phase, typed, step, cycle } = run;
    // Typing at a person's pace, a little slower after a comma; then send, draw, optimize, hold and start again.
    const [delay, next]: [number, Run] = phase === 'type' ? typed < prompt.length
      ? [/[,.]/.test(prompt[typed] ?? '') ? 240 : 30 + (typed * 37) % 34, { ...run, typed: typed + 1 }] : [380, { ...run, phase: 'send' }]
      : phase === 'send' ? [520, { ...run, phase: 'draw' }]
      : phase === 'draw' ? [2400, { ...run, phase: 'optimize', step: 1 }]
      : phase === 'optimize' ? [950, step < iterations ? { ...run, step: step + 1 } : { ...run, phase: 'ready' }]
      : phase === 'ready' ? [3600, { ...run, phase: 'clear' }]
      : [650, { phase: 'type', typed: 0, step: 0, cycle: cycle + 1 }];
    const timer = window.setTimeout(() => setRun(next), delay);
    return () => window.clearTimeout(timer);
  }, [running, run, prompt]);
  const layouts = useMemo(() => chain(view.cycle), [view.cycle]);
  const drawn = view.phase !== 'type' && view.phase !== 'send';
  const status = view.phase === 'draw' ? 0 : view.phase === 'optimize' ? 1 : view.phase === 'ready' || view.phase === 'clear' ? 2 : -1;
  return <figure ref={ref} className="product-intro" aria-label={content.description} data-motion={enabled ? 'on' : 'off'} data-running={running} data-phase={view.phase}>
    <div className="intro-panel" aria-hidden="true">
      <div className="intro-heading"><span className="intro-dot" /><span>GENESIS</span><span>{content.label}</span></div>
      <div className="intro-prompt" data-sent={view.phase !== 'type'}>
        <span className="intro-who">{content.you}</span>
        <p className="intro-text"><span>{prompt.slice(0, view.typed)}</span><span className="intro-caret" /><span className="intro-rest">{prompt.slice(view.typed)}</span></p>
        <span className="intro-send"><Icon name="arrow" /></span>
      </div>
      <div className="intro-reply" data-on={status >= 0}>
        <EmblemMark />
        <span className="intro-status">{content.steps.map((step, i) => <span key={step} data-on={i === status}>{step}</span>)}</span>
        <span className="intro-progress">{Array.from({ length: iterations }, (_, i) => <i key={i} data-on={drawn && i < view.step} />)}</span>
      </div>
      <svg className="intro-circuit" viewBox="0 0 310 124">
        {drawn && <g key={view.cycle} className="intro-drawing">
          <path className="intro-rail" pathLength={1} d="M14 50V36H296V50M14 90V104H296V90" />
          <text className="intro-port" x="14" y="28">{content.ports[0]}</text><text className="intro-port" x="296" y="28">{content.ports[1]}</text>
          {[8, 290].map(x => <g key={x} className="intro-pads">{[45, 65, 85].map(y => <rect key={y} data-signal={y === 65 || undefined} x={x} y={y} width="12" height="10" rx="1.5" />)}</g>)}
          {['M20 70H34', 'M84 70H94', 'M118 70H128', 'M178 70H188', 'M212 70H222', 'M272 70H290'].map((d, i) =>
            <path key={d} className="intro-line" pathLength={1} d={d} style={{ '--o': i + .5 } as CSSProperties} />)}
          {passiveX.map((x, i) => <Passive key={x} layouts={layouts[i]} step={view.step} x={x} order={1 + 2 * i} label={content.parts[i]} />)}
          {deviceX.map((x, i) => <Transistor key={x} spec={devices[i]} step={view.step} x={x} order={2 + 2 * i} />)}
        </g>}
      </svg>
    </div>
    <figcaption className="intro-caption">{content.caption}</figcaption>
  </figure>;
}
