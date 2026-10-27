import { BlockView, cardBoxes, Glyph, type BlockLinks } from './BlockView';
import { ErrorCurve } from './analysis';
import { chipColours } from './colours';
import { coilGlyphs, COILS, CoilShape, type CoilSample } from './coil';
import { ease, out } from './motion';
import { ParetoPlot, ScoreBox, tradeOffs, type Objective } from './objective';
import { C, film, P } from './palette';
import { BENCH, push } from './scenes';
import { CURVE } from './scenes-analysis';

// The film's optimization scene on its 1920 x 1080 stage, as a function of the scene's frame: the film
// (video/src/Story.tsx) plays it on Remotion's clock with its caption band, the site (StoryPlayer) on the page's clock.
type OptLayout = Parameters<typeof BlockView>[0]['layout'] & { shapes?: Record<string, Pick<CoilSample, 'layers' | 'bbox'>> };
/** One design of the run: its error and its switch FETs' widths (w_M1 to w_M4, any unit: they are drawn relative). */
export type RunStep = { error: number; fet: Record<string, number> };
/** A coil candidate's picture, at one scale for all: spirals first, then pixel grids. */
export type CoilFrame = { family: string; px: [number, number]; file: string };
/** The best designs of the chip coil's own search, drawn beside the chosen coil. */
export type CoilCandidate = Pick<CoilSample, 'layers' | 'bbox'> & { run: string };

/** The scene's times (frames): the run, the coil candidates beside each coil, the choice, the Pareto front and its
 * picks, the block view going back. */
export const OPT = { run: [30, 470], fan: 470, pick: 540, settle: [560, 590], pareto: [590, 640], picks: 650, choose: 740, back: [770, 800], length: 812, aside: { x: 280, scale: .9 } } as const;
/** The Pareto front's box, in the free room above the optimization panel. */
const PARETO = { y: 92, h: 388 };
// Inductor pictures are drawn for a dark ground: the lift filter brightens them there and inverts them on the light stage.
const LIFT = film('lift');
const COIL_NAMES = ['L1', 'L2', 'L3'];
// The run draws the parametric candidates only (spirals); pixel-filled shapes are left out.
const spirals = (frames: CoilFrame[]) => frames.filter(f => f.family === 'spiral');
const runTimes = (frames: CoilFrame[]) => {
  const steps = Math.floor(frames.length / COIL_NAMES.length), [from, to] = OPT.run, per = (to - from) / steps;
  return { steps, from, to, per, sizeAt: Math.round((from + to) / 2) };
};
/** The scene's caption band: chapter and captions from the frame each starts. */
export const optimizeCaptions = (frames: CoilFrame[]): { chapter: string; captions: [number, string][] } => {
  const { sizeAt } = runTimes(spirals(frames));
  return { chapter: 'Optimization', captions: [[0, 'GENESIS explores passive shapes and metal layers.'], [sizeAt, 'GENESIS sizes your passives and switch FETs together.'],
    [OPT.fan, 'GENESIS brings your best passive designs.'], [OPT.pareto[0], 'Identify your trade-offs from multiple designs.'], [OPT.choose, 'GENESIS updates your circuit.']] };
};

/** The optimizer at work on the block view itself, going on from the specification's picture: the block view comes
 * forward and the score turns into the optimization's panel. The coils inside the cards try the candidates in order
 * (spirals of every turn count and metal stack, all at one scale: a parametric shape is never drawn filled with pixels) and the switch FETs take the run's
 * widths while its error falls. At the end the best coil designs of the layout's coil search fan out beside each coil,
 * the layout's own coil is chosen and settles in, the run's Pareto front opens in the free room above the panel with
 * three designs of it lit, and the block view goes back to the size the layout scene starts from. `src` turns a
 * candidate's file into the picture's address. */
export function OptimizeView({ frame, layout, links, run, frames: all, objective, candidates, src }: { frame: number; layout: OptLayout; links: BlockLinks; run: RunStep[];
  frames: CoilFrame[]; objective: Objective; candidates: CoilCandidate[]; src: (file: string) => string }) {
  const chip = chipColours(layout), chipCoils = (k: number) => coilGlyphs(layout.shapes, k), list = spirals(all);
  const come = ease(frame, 0, 36), back = ease(frame, ...OPT.back), k = come * (1 - back);
  // The run: each coil steps through its share of the candidates, the FETs through the run's widths.
  const coils = COIL_NAMES, { steps, from, to, per } = runTimes(list);
  const step = Math.min(steps - 1, Math.max(0, Math.floor((frame - from) / per))), grow = ease(frame - from - step * per, 0, Math.min(10, per * .6));
  const shot = (i: number, j: number) => list[Math.max(0, j) * coils.length + i];
  const first = 8, at = first + Math.max(0, Math.min(1, (frame - from) / (to - from))) * (run.length - 1 - first);
  const e0 = run[Math.floor(at)], e1 = run[Math.min(run.length - 1, Math.floor(at) + 1)], u = at - Math.floor(at);
  const widths = run.flatMap(r => [1, 2, 3, 4].map(m => r.fet[`w_M${m}`])), wMin = Math.min(...widths), wMax = Math.max(...widths);
  const width = (m: number) => (e0.fet[`w_M${m}`] + (e1.fet[`w_M${m}`] - e0.fet[`w_M${m}`]) * u - wMin) / (wMax - wMin || 1);
  const settle = ease(frame, ...OPT.settle), cards = cardBoxes(layout, BENCH.x, BENCH.y, BENCH.w, BENCH.h, links);
  // The card names shrink to one small line, so each coil takes the card's room: its centre moves to the middle of the
  // card above the name and it grows to fill it, all coils at one scale (the largest candidate fills the room).
  // A name on two lines (over 22 characters) takes one more line of room.
  const roomOf = (member: string) => { const c = cards.find(c => c.glyphs.some(g => g.member === member))!, extra = c.title.length > 22 ? 17 : 0; return { x: c.x + c.w / 2, y: c.y + (c.h - 22 - extra) / 2, w: c.w - 16, h: c.h - 30 - extra }; };
  const turnedOf = (m: string) => cards.find(c => c.glyphs.some(g => g.member === m))!.glyphs.find(g => g.member === m)!.vertical;
  const fitOf = (m: string, f: CoilFrame) => { const r = roomOf(m), t = turnedOf(m); return Math.min((t ? r.h : r.w) / f.px[0], (t ? r.w : r.h) / f.px[1]); };
  const fill = Math.min(...coils.map(m => Math.min(...list.map(f => fitOf(m, f)))));
  // Small early coils still take most of the room: no frame is drawn below 70 % of its own fit.
  const scaleOf = (m: string, f: CoilFrame) => Math.max(fill, .7 * fitOf(m, f));
  const glyph = (member: string, gx: number, gy: number, s: number, vertical: boolean) => {
    const i = coils.indexOf(member);
    if (i >= 0) {
      const r = roomOf(member), x = gx + (r.x - gx) * k, y = gy + (r.y - gy) * k, sz = s + (Math.min(r.w, r.h) * .95 / 1.15 - s) * k;
      if (settle >= 1) return chipCoils(1)(member, x, y, sz);
      const now = shot(i, step), was = shot(i, step - 1), fNow = scaleOf(member, now), f = fNow * (1 + (Math.max(...was.px) * scaleOf(member, was) / (Math.max(...now.px) * fNow) - 1) * (1 - grow)), w = now.px[0] * f, h = now.px[1] * f;
      return <g key={member}>
        <g opacity={1 - settle} transform={vertical ? `rotate(90 ${x} ${y})` : undefined}><image href={src(now.file)} x={x - w / 2} y={y - h / 2} width={w} height={h} style={{ filter: LIFT }} /></g>
        {settle > 0 && chipCoils(settle)(member, x, y, sz)}
      </g>;
    }
    const fet = /^M(\d)$/.exec(member), x = gx, y = gy;
    if (fet) { const kw = width(+fet[1]);
      return <g key={member}><Glyph kind="transistor" x={x} y={y - 4} s={s * (.75 + .5 * kw)} vertical={false} colour={chip.get('switch_fets') ?? P.lilac} />
        <rect x={x - s * .55} y={y + s * .5} width={s * 1.1} height={5} rx={2.5} fill={P.lilac} fillOpacity={.2} /><rect x={x - s * .55} y={y + s * .5} width={s * (.1 + kw)} height={5} rx={2.5} fill={P.lilac} /></g>; }
    return undefined;
  };
  // The candidates: the coil search's best designs fan out beside each coil card, the layout's own among them
  // (second), are lit one by one, the layout's own is chosen, and the others fold back into the card.
  const fan = [candidates[0], null, ...candidates.slice(1, 3)];
  const T = 74, fold = ease(frame, OPT.settle[0] - 6, OPT.settle[1] - 6), chosen = out(frame, OPT.pick, OPT.pick + 14);
  const fanned = <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{coils.map(member => {
    const card = cards.find(c => c.glyphs.some(g => g.member === member)), g = card?.glyphs.find(g => g.member === member);
    if (!card || !g) return null;
    const column = g.vertical, colour = COILS[member];
    return <g key={member}>{fan.map((c, j) => {
      const k = out(frame, OPT.fan + j * 8, OPT.fan + j * 8 + 14) * (1 - fold), mine = c === null;
      if (k <= 0) return null;
      // Two by two, above a card in a row, right of a card in a column.
      const a = (j % 2 - .5) * (T + 10), b = Math.floor(j / 2) * (T + 10);
      const [hx, hy] = column ? [card.x + card.w + 20 + T / 2 + b, card.y + card.h / 2 + a] : [card.x + card.w / 2 + a, card.y - 20 - T / 2 - b];
      const [cx, cy] = [g.x + (hx - g.x) * k, g.y + (hy - g.y) * k], lit = out(frame, OPT.fan + 36 + j * 6, OPT.fan + 44 + j * 6) * (1 - out(frame, OPT.fan + 44 + j * 6, OPT.fan + 56 + j * 6));
      const sample = mine ? { ...layout.shapes![member], source: '', eval: '' } : { ...c!, source: c!.run, eval: '' }, [x0, y0, x1, y1] = sample.bbox;
      const dim = mine ? 1 : 1 - .6 * chosen;
      return <g key={j} opacity={k * dim}>
        <rect x={cx - T / 2} y={cy - T / 2} width={T} height={T} rx={10} fill={C.card} stroke={mine ? colour : C.grid} strokeWidth={mine ? 2 + 2 * chosen : 2} />
        {lit > 0 && <rect x={cx - T / 2} y={cy - T / 2} width={T} height={T} rx={10} fill={P.glow} fillOpacity={.12 * lit} />}
        <g transform={column && !mine ? `rotate(90 ${cx} ${cy})` : undefined}><CoilShape sample={sample} cx={cx} cy={cy} s={(T - 14) / Math.max(x1 - x0, y1 - y0)} colour={colour} /></g>
        {mine && <circle cx={cx + T / 2 - 4} cy={cy - T / 2 + 4} r={11 * chosen} fill={colour} />}
        {mine && chosen > 0 && <path d={`M${cx + T / 2 - 9} ${cy - T / 2 + 4}l4 4l7-8`} stroke={C.die} strokeWidth={3} fill="none" opacity={chosen} strokeLinecap="round" />}
      </g>; })}</g>; })}</svg>;
  // The panel: the score turns into the run; the Pareto front opens above it, where the left side is free.
  const panel = out(frame, 8, 30), pareto = ease(frame, ...OPT.pareto), choose = ease(frame, OPT.choose, OPT.choose + 20);
  const picks = tradeOffs(objective).map((p, i) => ({ ...p, k: out(frame, OPT.picks + i * 26, OPT.picks + 20 + i * 26) * (i === 1 ? 1 : 1 - .65 * choose) }));
  const box = { x: CURVE.x, y: CURVE.y, w: CURVE.w, h: CURVE.h + 82 - 54 + 58 };
  const improvement = Math.round(100 * (1 - Math.min(...run.slice(0, Math.floor(at) + 1).map(r => r.error)) / run[0].error));
  return <div style={{ position: 'absolute', inset: 0 }}>
    {/* While the panel stands at the left, the pushed-in block view moves right of it into the free room. */}
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '1890px 445px', transform: `translateX(${OPT.aside.x * k}px) scale(${1 - (1 - OPT.aside.scale) * k})` }}>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: push(k) }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '1850px 150px', transform: `scale(${1 - .38 * (1 - come)})` }}>
        <BlockView layout={layout} links={links} colours={chip} frame={frame + 400} start={-200} bench={1 - come} {...BENCH} glyph={glyph} compact={k} />
        {fanned}
      </div>
    </div>
    </div>
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: 1 - back }}>
      {panel < 1 && <ScoreBox objective={objective} k={1 - panel} count={1} x={box.x} y={box.y} w={box.w} h={box.h} />}
      <g opacity={panel}>
        <text x={CURVE.x} y={CURVE.y} fontFamily="Inter" fontWeight={700} fontSize={38} fill={C.text}>Optimization</text>
        <text x={CURVE.x} y={CURVE.y + 46} fontFamily="Inter" fontSize={32} fill={P.soft}>improvement over the first design <tspan fill={C.cyan} fontWeight={700}>{improvement}%</tspan></text>
        <ErrorCurve errors={run.map(r => r.error)} upto={at} x={CURVE.x + 24} y={CURVE.y + 112} w={CURVE.w - 48} h={CURVE.h} colour={C.cyan} ghost labels={false} strong />
      </g>
      {pareto > 0 && <g opacity={pareto}>
        <ParetoPlot objective={objective} shown={ease(frame, OPT.pareto[0], OPT.pareto[1] + 10)} picks={picks} x={CURVE.x} y={PARETO.y} w={CURVE.w} h={PARETO.h}
          title="Optimization done: Pareto front ready" sub="each dot is one design; the cyan line is the Pareto front" />
      </g>}
    </svg>
  </div>;
}
