import { BlockView, type BlockLinks } from './BlockView';
import { SParamPlots, type SParams } from './analysis';
import { chipColours } from './colours';
import { ease, out } from './motion';
import { goalsOf, GoalPlot, PLOTS, rangeOf, ScoreBox, curveOf, at as valueAt, type Objective } from './objective';
import { alpha, C, B, P } from './palette';
import { BENCH, CIRCUIT, PANEL, push } from './scenes';

// The film's testbench and specification scenes on its 1920 x 1080 stage, as functions of the scene's frame: the film
// (video/src/Story.tsx) plays them on Remotion's clock, the site (StoryPlayer) on the page's clock.
type BlockLayout = Parameters<typeof BlockView>[0]['layout'];
export type Testbench = { name: string; modes: string[]; ports: number; states: string[] };

/** Each scene's length in frames, as the film plays it (7.4 s and 8.5 s). */
export const ANALYSIS_FRAMES = { testbench: 222, spec: 255 } as const;
export const ANALYSIS_CAPTIONS: Record<keyof typeof ANALYSIS_FRAMES, { chapter: string; captions: [number, string][] }> = {
  testbench: { chapter: 'Testbench', captions: [[0, 'GENESIS builds your testbenches and measurements.'], [110, 'GENESIS simulates your circuit, parasitics included.']] },
  spec: { chapter: 'Specification', captions: [[0, 'GENESIS optimizes for your goals.'], [120, 'GENESIS turns your goals into a score.']] },
};
const MODES: Record<string, string> = { dc: 'DC operating point', sp: 'S-parameters', hb: 'Harmonic balance', tran: 'Transient', ac: 'AC', noise: 'Noise', pss: 'Periodic steady state' };
/** The optimization's panel bottom left, where the specification's score stood. */
export const CURVE = { x: 96, y: 528, w: 620, h: 190 };
const pexOnly = (sparams: SParams): SParams => ({ ...sparams, panels: sparams.panels.map(p => ({ ...p, series: p.series.filter(s => /PEX/.test(s.label)) })) });

/** The testbench is built on the blocks: the view pulls back, ports land on the RF pads and sources on the DC pads, the
 * testbenches are listed on the left, then the S-parameter plots replace them. The layout's own curves, parasitics taken
 * into account (PEX); no EM curve. */
export function TestbenchView({ frame, testbenches, layout, links, sparams }: { frame: number; testbenches: Testbench[]; layout: BlockLayout; links: BlockLinks; sparams: SParams }) {
  const plots = 110, gone = ease(frame, plots - 16, plots);
  return <>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: push(1 - ease(frame, 0, 30)) }}>
      <BlockView layout={layout} links={links} colours={chipColours(layout)} frame={frame} start={-200} bench={out(frame, 22, 64)} {...BENCH} />
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 - gone }}>
      {testbenches.map((tb, i) => {
        const k = out(frame, 30 + i * 14, 46 + i * 14);
        return <div key={tb.name} style={{ opacity: k, transform: `translateX(${(1 - k) * -40}px)`, padding: '22px 26px', borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, fontFamily: 'Inter' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 34, color: C.text }}>{tb.modes.map(m => MODES[m] ?? m).join(' + ')}</span>
            <span style={{ fontSize: 26, color: C.muted }}>{tb.ports} ports</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{tb.states.map(s =>
            <span key={s} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 26, color: C.cyan, border: `1px solid ${alpha(B.brand1, 0x55 / 255)}` }}>{s.replace(/_/g, ' ')}</span>)}</div>
        </div>;
      })}
    </div>
    {frame >= plots - 10 && <SParamPlots sparams={pexOnly(sparams)} frame={frame} x={PANEL.left} y={PANEL.top - 10} w={PANEL.width - 40} h={CIRCUIT.height} start={plots} />}
  </>;
}

/** From the testbench's curves to the specification, on the plots themselves: the curves become the optimization's
 * first design, your goals come in as zones (allowed side shaded, target dashed), the parts of the curves outside them
 * light red, and the red parts fly together into the objective's score, where the optimization's panel will stand. The circuit stays. */
export function SpecView({ frame, layout, links, sparams, objective }: { frame: number; layout: BlockLayout; links: BlockLinks; sparams: SParams; objective: Objective }) {
  const last = ANALYSIS_FRAMES.testbench, swap = out(frame, 0, 8), morph = ease(frame, 10, 40);
  // The plots widen to the middle of the frame while the circuit steps back to the right.
  const wide = ease(frame, 0, 30), n = PLOTS.length, gap = 16, x = PANEL.left, y = PANEL.top - 10, w = PANEL.width - 40 + 420 * wide, h = (CIRCUIT.height - gap * (n - 1)) / n;
  const box = { x: CURVE.x, y: CURVE.y, w: CURVE.w, h: CURVE.h + 82 - 54 + 58 }, centre: [number, number] = [box.x + box.w / 2, box.y + 54 + box.h / 2];
  const first = objective.evaluations[0], base = 1 - ease(frame, 136, 166);
  const pex = pexOnly(sparams).panels;
  return <>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '1850px 150px', transform: `scale(${1 - .38 * wide})` }}>
      <BlockView layout={layout} links={links} colours={chipColours(layout)} frame={last + frame} start={-200} bench={1} {...BENCH} />
    </div>
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - swap }}>
      <SParamPlots sparams={{ ...sparams, panels: pex }} frame={last + frame} x={x} y={y} w={w} h={CIRCUIT.height} start={110} />
    </div>
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: swap }}>
      {PLOTS.map((p, i) => {
        const run = curveOf(objective, first, p.curve), chip = pex[i].series[0], goals = goalsOf(objective, p.goals);
        const from = run.x.map(f => valueAt(chip, Math.max(f, chip.x[0]))), curve = { x: run.x, y: run.y.map((v, j) => from[j] + (v - from[j]) * morph) };
        return <GoalPlot key={p.curve} title={p.title} sub={p.sub} goals={goals} curves={[{ c: curve, colour: P.sky, k: 1 }]} range={rangeOf([run, { x: run.x, y: from }], goals)}
          x={x} y={y + i * (h + gap)} w={w} h={h} zone={out(frame, 30 + i * 12, 60 + i * 12)} miss={out(frame, 80 + i * 10, 100 + i * 10)} base={base} tag={morph > .5 ? 'first design' : undefined}
          fly={{ k: ease(frame, 130 + i * 6, 166 + i * 6), to: centre }} />;
      })}
      <ScoreBox objective={objective} k={out(frame, 150, 166)} count={ease(frame, 150, 190)} x={box.x} y={box.y} w={box.w} h={box.h} />
    </svg>
  </>;
}
