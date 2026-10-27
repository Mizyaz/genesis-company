import { out } from './motion';
import { C, P } from './palette';

// The specification and the result of one optimizer run, drawn on its own curves (story/objective.mjs writes the
// inputs): your goals as zones on the S-parameter plots, the part of a curve that misses its zone in red, those misses
// gathered into one score, and after the run a few designs of the Pareto front side by side, so the trade-off between
// loss and match shows on their curves.
type Goal = { name: string; state: string; output: string; unit: string; sense: 'at_least' | 'at_most'; target: number; scale: number; weight: number; band: [number, number] | null };
type Evaluation = { iteration: number; error: number; values: number[]; terms: number[]; curves: Record<string, number[]> };
export type Objective = { goals: Goal[]; axis: number[]; evaluations: Evaluation[] };
type Curve = { x: number[]; y: number[] };

const GRID = P.plotGrid, SURFACE = C.card, DIM = P.dim, MISS = P.miss;
const text = { fontFamily: 'Inter', fill: C.text } as const;
const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(v % 1 ? 1 : 0);
export const best = (objective: Objective) => objective.evaluations.reduce((a, e) => e.error < a.error ? e : a);

/** The three plots of the specification: the curve each shows, its goals (band and 110 GHz) and short names. */
export const PLOTS = [
  { curve: 'port2_on/S21_dB', title: 'S21', sub: 'signal through', goals: ['on2_transmission'] },
  { curve: 'port2_on/S31_dB', title: 'S31', sub: 'off port, isolation', goals: ['on2_isolation'] },
  { curve: 'port2_on/S11_dB', title: 'S11', sub: 'antenna match', goals: ['on2_input_match', 'on2_input_match_center'] },
];
export const goalsOf = (objective: Objective, names: string[]) => names.map(n => objective.goals.find(g => g.name === n)!);
/** A curve's value at f (GHz), linear between its points. */
export const at = (c: Curve, f: number) => { const i = Math.max(1, c.x.findIndex(v => v >= f)); const [x0, x1, y0, y1] = [c.x[i - 1], c.x[i], c.y[i - 1], c.y[i]]; return x1 === x0 ? y1 : y0 + (y1 - y0) * (f - x0) / (x1 - x0); };

type PlotProps = { title: string; sub: string; goals: Goal[]; curves: { c: Curve; colour: string; k: number; dashed?: boolean }[]; range: [number, number];
  x: number; y: number; w: number; h: number; zone: number; miss: number; base?: number; tag?: string; fly?: { k: number; to: [number, number] }; legend?: { label: string; colour: string; k: number }[] };

/** One plot in the film's panel style: the goal zones (allowed side shaded, the target dashed), the curves revealed left
 * to right by their k, and for the first curve the part outside its goals in red, shown by `miss`; `fly` carries the
 * red parts to a point, shrinking, as they become the score. */
export function GoalPlot({ title, sub, goals, curves, range: [lo, hi], x, y, w, h, zone, miss, base = 1, tag, fly, legend }: PlotProps) {
  const left = x + 262, right = x + w - 24, top = y + 24, bottom = y + h - 46;
  const sx = (f: number) => left + (f / 110) * (right - left), sy = (v: number) => top + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (bottom - top);
  const band = goals.filter(g => g.band && g.band[0] !== g.band[1]), point = goals.filter(g => g.band && g.band[0] === g.band[1] && !band.some(b => b.target === g.target && b.sense === g.sense));
  const first = curves[0]?.c, f0 = 1, f1 = 110;
  const xs = first ? first.x.filter(f => f >= f0 && f <= f1) : [];
  // The miss: between the curve and the target, only where the curve is on the wrong side.
  const missPath = (g: Goal) => { const worse = (v: number) => g.sense === 'at_least' ? Math.min(v, g.target) : Math.max(v, g.target);
    return `M${sx(xs[0])} ${sy(g.target)}` + xs.map(f => `L${sx(f)} ${sy(worse(at(first, f)))}`).join('') + `L${sx(xs[xs.length - 1])} ${sy(g.target)}Z`; };
  const flyTo = fly && fly.k > 0 ? `translate(${(fly.to[0] - (left + right) / 2) * fly.k} ${(fly.to[1] - (top + bottom) / 2) * fly.k}) translate(${(left + right) / 2} ${(top + bottom) / 2}) scale(${1 - .85 * fly.k}) translate(${-(left + right) / 2} ${-(top + bottom) / 2})` : undefined;
  const ticks = [lo, (lo + hi) / 2, hi].map(v => Math.round(v));
  return <g>
    <g opacity={base}>
    <rect x={x} y={y} width={w} height={h} rx={16} fill={SURFACE} stroke={GRID} />
    {tag && <text x={right} y={y + 40} textAnchor="end" {...text} fill={C.muted} fontSize={20}>{tag}</text>}
    <text x={x + 22} y={y + 44} {...text} fontWeight={700} fontSize={32}>{title}</text>
    <text x={x + 22} y={y + 74} {...text} fill={C.muted} fontSize={21}>{sub}</text>
    {zone > 0 && !legend && <g opacity={zone}>{[...band, ...point].map((g, i) => <text key={g.name} x={x + 22} y={y + 112 + i * 30} {...text} fill={C.cyan} fontWeight={650} fontSize={22}>
      goal {g.sense === 'at_least' ? '≥' : '≤'} {fmt(g.target)} dB{point.includes(g) ? ' at 110' : ''}</text>)}</g>}
    {legend?.map((l, i) => <g key={l.label} opacity={l.k}><circle cx={x + 30} cy={y + 106 + i * 30} r={7} fill={l.colour} />
      <text x={x + 46} y={y + 114 + i * 30} {...text} fontSize={21}>{l.label}</text></g>)}
    {ticks.map(v => <g key={v}><line x1={left} x2={right} y1={sy(v)} y2={sy(v)} stroke={GRID} />
      <text x={left - 10} y={sy(v) + 7} textAnchor="end" {...text} fill={C.muted} fontSize={19}>{v}</text></g>)}
    {[0, 50].map(f => <text key={f} x={sx(f)} y={y + h - 14} textAnchor="middle" {...text} fill={C.muted} fontSize={19}>{f}</text>)}
    <text x={sx(110)} y={y + h - 14} textAnchor="end" {...text} fill={C.muted} fontSize={19}>110 GHz</text>
    {/* Your goals: the allowed side of each target shaded, the target dashed, swept in from the left by `zone`. */}
    <g style={{ clipPath: `inset(0 ${(1 - zone) * 100}% 0 0)` }}>
      {band.map(g => <g key={g.name}>
        <rect x={sx(f0)} y={g.sense === 'at_least' ? sy(hi) : sy(g.target)} width={sx(f1) - sx(f0)} height={g.sense === 'at_least' ? sy(g.target) - sy(hi) : sy(lo) - sy(g.target)} fill={C.cyan} fillOpacity={.09} />
        <line x1={sx(f0)} x2={sx(f1)} y1={sy(g.target)} y2={sy(g.target)} stroke={C.cyan} strokeWidth={2.5} strokeDasharray="10 7" />
      </g>)}
      {point.map(g => <g key={g.name}>
        <line x1={sx(104)} x2={sx(110)} y1={sy(g.target)} y2={sy(g.target)} stroke={C.cyan} strokeWidth={4} />
        <rect x={sx(104)} y={g.sense === 'at_least' ? sy(hi) : sy(g.target)} width={sx(110) - sx(104)} height={g.sense === 'at_least' ? sy(g.target) - sy(hi) : sy(lo) - sy(g.target)} fill={C.cyan} fillOpacity={.16} />
      </g>)}
    </g>
    {curves.map(({ c, colour, k, dashed }, i) => k > 0 && <path key={i} d={c.x.map((f, j) => `${j ? 'L' : 'M'}${sx(f)} ${sy(c.y[j])}`).join('')} fill="none" stroke={colour} strokeWidth={3.5}
      strokeDasharray={dashed ? '9 7' : undefined} strokeLinejoin="round" style={{ clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` }} />)}
    </g>
    {first && miss > 0 && <g opacity={miss * (fly ? 1 - out(fly.k, .7, 1) : 1)} transform={flyTo}>
      {band.map(g => <path key={g.name} d={missPath(g)} fill={MISS} fillOpacity={.6} />)}
      {point.map(g => { const v = at(first, 110), bad = g.sense === 'at_least' ? v < g.target : v > g.target;
        return bad && <rect key={g.name} x={sx(110) - 7} y={Math.min(sy(v), sy(g.target))} width={14} height={Math.abs(sy(v) - sy(g.target))} rx={3} fill={MISS} />; })}
    </g>}
  </g>;
}

/** A shared y range for a plot: its curves and its targets, padded and rounded to 5 dB. */
export function rangeOf(curves: Curve[], goals: Goal[]): [number, number] {
  const ys = [...curves.flatMap(c => c.y.filter((_, i) => c.x[i] >= 1)), ...goals.map(g => g.target)];
  return [Math.floor((Math.min(...ys) - 1) / 5) * 5, Math.min(0, Math.ceil((Math.max(...ys) + 1) / 5) * 5)];
}
export const curveOf = (objective: Objective, e: Evaluation, name: string): Curve => ({ x: objective.axis, y: e.curves[name] });

/** The objective in the place where the optimization's panel will stand: its title and the first design's score,
 * counting up as the misses land. */
export function ScoreBox({ objective, k, count, x, y, w, h }: { objective: Objective; k: number; count: number; x: number; y: number; w: number; h: number }) {
  const score = objective.evaluations[0].error * count;
  return <g opacity={k}>
    <text x={x} y={y} {...text} fontWeight={700} fontSize={38}>Objective</text>
    <text x={x} y={y + 46} {...text} fill={P.soft} fontSize={32}>all your goals together</text>
    <rect x={x} y={y + 54} width={w} height={h} rx={14} fill={SURFACE} stroke={GRID} />
    <text x={x + w / 2} y={y + 54 + h / 2 + 30} textAnchor="middle" {...text} fill={MISS} fontWeight={700} fontSize={96} style={{ fontVariantNumeric: 'tabular-nums' }}>{score.toFixed(3)}</text>
    <text x={x + w / 2} y={y + 54 + h - 22} textAnchor="middle" {...text} fill={C.muted} fontSize={22}>first design · lower is better</text>
  </g>;
}

/** Designs of the Pareto front worth comparing: the lowest loss, the lowest score and the best match, each with its colour. */
export function tradeOffs(objective: Objective) {
  const points = paretoPoints(objective), front = frontOf(points), top = best(objective);
  const pick = (p: typeof points[number], label: string, colour: string) => ({ ...p, label, colour });
  return [pick(front[0], 'lowest loss', P.gold), pick(points.find(p => p.e === top)!, 'lowest score', C.violet), pick(front[front.length - 1], 'best match', P.rose)];
}
/** Every design as a point: insertion loss (band mean) and S11 at 110 GHz, the worse switch state of each. */
function paretoPoints(objective: Objective) {
  const value = (names: string[], worst: (...v: number[]) => number) => (e: Evaluation) => worst(...names.map(n => e.values[objective.goals.findIndex(g => g.name === n)]));
  const loss = value(['on2_transmission', 'on3_transmission'], Math.min), match = value(['on2_input_match_center', 'on3_input_match_center'], Math.max);
  return objective.evaluations.map(e => ({ e, px: -loss(e), py: match(e) }));
}
const frontOf = <P extends { px: number; py: number }>(seen: P[]) => seen.filter(p => !seen.some(q => q.px <= p.px && q.py <= p.py && (q.px < p.px || q.py < p.py))).sort((a, b) => a.px - b.px);

/** Every design of the run on insertion loss against S11 at 110 GHz, swept in by `shown` (0 to 1) in run order, the
 * Pareto front as a bright cyan line through its designs over the dimmed rest, and the picked designs (`picks`, each lit by its k) ringed in their colours with their names. */
export function ParetoPlot({ objective, shown, picks, x, y, w, h, title = 'Many designs, best trade-offs', sub = 'each dot is one design; the cyan line is the Pareto front' }: { objective: Objective; shown: number; picks: (ReturnType<typeof tradeOffs>[number] & { k: number })[]; x: number; y: number; w: number; h: number; title?: string; sub?: string }) {
  const points = paretoPoints(objective);
  const X = [1.4, 3], Y = [-32, 0], left = x + 96, right = x + w - 28, upper = y + 104, lower = y + h - 78;
  const sx = (v: number) => left + (v - X[0]) / (X[1] - X[0]) * (right - left), sy = (v: number) => upper + (v - Y[1]) / (Y[0] - Y[1]) * (lower - upper);
  const n = Math.round(points.length * shown), seen = points.slice(0, n), front = frontOf(seen);
  const inside = (p: { px: number; py: number }) => p.px >= X[0] && p.px <= X[1] && p.py >= Y[0] && p.py <= Y[1];
  const shownFront = front.filter(inside), line = shownFront.map((p, i) => `${i ? 'L' : 'M'}${sx(p.px).toFixed(1)} ${sy(p.py).toFixed(1)}`).join('');
  const isFront = new Set(front.map(p => p.e.iteration));
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={16} fill={SURFACE} stroke={GRID} />
    <text x={x + 26} y={y + 46} {...text} fontWeight={700} fontSize={30}>{title}</text>
    <text x={x + 26} y={y + 76} {...text} fill={C.muted} fontSize={21}>{sub}</text>
    {[-30, -20, -10, 0].map(v => <g key={v}><line x1={left} x2={right} y1={sy(v)} y2={sy(v)} stroke={GRID} />
      <text x={left - 12} y={sy(v) + 7} textAnchor="end" {...text} fill={C.muted} fontSize={19}>{v}</text></g>)}
    {[1.5, 2, 2.5, 3].map(v => <text key={v} x={sx(v)} y={lower + 30} textAnchor="middle" {...text} fill={C.muted} fontSize={19}>{v}</text>)}
    <text x={(left + right) / 2} y={lower + 62} textAnchor="middle" {...text} fill={C.muted} fontSize={21}>Signal loss (dB)</text>
    <text transform={`translate(${x + 30} ${(upper + lower) / 2}) rotate(-90)`} textAnchor="middle" {...text} fill={C.muted} fontSize={21}>S11 at 110 GHz (dB)</text>
    {seen.filter(inside).map(p => { const f = isFront.has(p.e.iteration);
      return !f && <circle key={p.e.iteration} cx={sx(p.px)} cy={sy(p.py)} r={4.5} fill={DIM} fillOpacity={.4} />; })}
    {shownFront.length > 1 && <g fill="none" strokeLinejoin="round" strokeLinecap="round"><path d={line} stroke={C.cyan} strokeWidth={14} strokeOpacity={.16} /><path d={line} stroke={C.cyan} strokeWidth={4} /></g>}
    {shownFront.map(p => <circle key={p.e.iteration} cx={sx(p.px)} cy={sy(p.py)} r={8} fill={C.cyan} stroke={SURFACE} strokeWidth={2.5} />)}
    {picks.map((p, i) => p.k > 0 && <g key={p.label} opacity={p.k}>
      <circle cx={sx(p.px)} cy={sy(p.py)} r={9} fill={p.colour} stroke={SURFACE} strokeWidth={2} />
      <circle cx={sx(p.px)} cy={sy(p.py)} r={26 - 10 * p.k} fill="none" stroke={p.colour} strokeWidth={3} />
      <text x={sx(p.px) + (i === 2 ? 26 : i === 1 ? 22 : 30)} y={sy(p.py) + (i === 0 ? -14 : i === 1 ? -22 : 30)} {...text} fill={p.colour} fontWeight={700} fontSize={23}>{p.label}</text>
    </g>)}
  </g>;
}
