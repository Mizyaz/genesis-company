import type { ReactNode } from 'react';
import { ease as inOut, out } from './motion';
import { B, C, mix, P } from './palette';
import { COILS } from './coil';

// The analysis and optimization views of the 2D story film, drawn from records (story/analysis.mjs writes the inputs):
// the chip's S-parameter curves, PEX and EM, and three optimizer runs, one after another: random 12 x 12 pixel coils,
// half-turn coils picked from the drawn table cells, and 1.5-turn coils, each with its goal error and FET sizes. A run
// steps through a sample of its evaluations; each step holds, then glides to the next.
type Series = { label: string; x: number[]; y: number[] };
export type SParams = { title: string; panels: { title: string; series: Series[] }[] };
type Evaluation = { iteration: number; error: number; fet: Record<string, number> };
type Sizes = Evaluation & { [coil: string]: number | Record<string, number> } & Record<`${string}_L${number}`, number>;
export type Optimize = {
  pixels: { algorithm: string; coils: Record<string, { rows: number; columns: number }>; evaluations: (Evaluation & { grids: Record<string, string> })[] };
  halfturn: { algorithm: string; outlines: Record<string, number[][][]>; evaluations: Sizes[] };
  turns: { algorithm: string; evaluations: Sizes[] };
};

const EM = B.brand1, PEX = B.brand3, INK = P.ink, MUTED = P.faint, GRID = P.plotGrid, SURFACE = C.card;
const text = { fontFamily: 'Inter', fill: INK } as const;

/** Round ticks covering [lo, hi]. */
function ticks(lo: number, hi: number, n = 4) {
  const step = [1, 2, 5, 10, 20, 25, 50].map(s => s * 10 ** Math.floor(Math.log10((hi - lo) / n))).find(s => (hi - lo) / s <= n) ?? (hi - lo) / n;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

/** One S-parameter panel as a strip: its title on the left, dB against GHz on the right, drawn left to right by k. With
 * an EM curve beside the PEX one, EM is solid and PEX dashed; a PEX curve alone is solid and named "with parasitics". */
function Panel({ title, series, x, y, w, h, k }: { title: string; series: Series[]; x: number; y: number; w: number; h: number; k: number }) {
  const all = series.flatMap(s => s.y), lo = Math.floor(Math.min(...all) / 5) * 5, hi = Math.ceil(Math.max(...all) / 5) * 5;
  const left = x + 262, sx = (f: number) => left + (f / 110) * (x + w - 24 - left), sy = (v: number) => y + 24 + (1 - (v - lo) / (hi - lo)) * (h - 70);
  // The figure's labels end in "<band mean> / <110 GHz> dB".
  const stats = (s: Series) => /(-?[\d.]+) \/ (-?[\d.]+) dB$/.exec(s.label);
  const em = series.find(s => /EM/.test(s.label)), pex = series.find(s => /PEX/.test(s.label));
  const clip = `inset(0 ${(1 - k) * 100}% 0 0)`;
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={16} fill={SURFACE} stroke={GRID} />
    <text x={x + 22} y={y + 44} {...text} fontWeight={700} fontSize={32}>{title.replace(/ \(dB\)$/, '').replace(/\s*\((ON|ISO)\)/, '')}</text>
    {em ? <>
      <text x={x + 22} y={y + 80} {...text} fill={MUTED} fontSize={20} opacity={out(k, .6, 1)}>at 110 GHz</text>
      {[em, pex].map((s, i) => { const m = s && stats(s); return m && <text key={i} x={x + 22} y={y + 114 + i * 32} {...text} fontSize={24} opacity={out(k, .6, 1)}>
        <tspan fill={i ? PEX : EM} fontWeight={700}>{i ? 'PEX' : 'EM'}</tspan>  {m[2]} dB</text>; })}
    </> : pex && <text x={x + 22} y={y + 84} {...text} fill={PEX} fontWeight={650} fontSize={24} opacity={out(k, .6, 1)}>with parasitics</text>}
    {ticks(lo, hi, 3).map(v => <g key={v}><line x1={sx(0)} x2={sx(110)} y1={sy(v)} y2={sy(v)} stroke={GRID} strokeWidth={1} />
      <text x={sx(0) - 10} y={sy(v) + 7} textAnchor="end" {...text} fill={MUTED} fontSize={19}>{v}</text></g>)}
    {[0, 50].map(f => <text key={f} x={sx(f)} y={y + h - 14} textAnchor="middle" {...text} fill={MUTED} fontSize={19}>{f}</text>)}
    <text x={sx(110)} y={y + h - 14} textAnchor="end" {...text} fill={MUTED} fontSize={19}>110 GHz</text>
    <g style={{ clipPath: clip }}>
      {[pex, em].map(s => s && <path key={s.label} d={s.x.map((f, i) => `${i ? 'L' : 'M'}${sx(f)} ${sy(s.y[i])}`).join('')} fill="none"
        stroke={s === em ? EM : PEX} strokeWidth={s === em || !em ? 3.5 : 3} strokeDasharray={s === em || !em ? undefined : '9 7'} strokeLinejoin="round" />)}
    </g>
  </g>;
}


/** The S-parameter panels stacked in a column. Each panel of `zooms` ([from, to] frames, one per panel) is pushed in to
 * the middle of the frame over a dimmed backdrop, held, and put back, one after another. */
export function SParamPlots({ sparams, frame, x, y, w, h, start, zooms = [] }: { sparams: SParams; frame: number; x: number; y: number; w: number; h: number; start: number; zooms?: [number, number][] }) {
  const n = sparams.panels.length, gap = 16, ph = (h - gap * (n - 1)) / n, MOVE = 9;
  const zoomOf = (i: number) => { const z = zooms[i]; return z ? inOut(frame, z[0], z[0] + MOVE) * (1 - inOut(frame, z[1] - MOVE, z[1])) : 0; };
  const focus = sparams.panels.map((_, i) => zoomOf(i)), on = focus.findIndex(k => k > 0), backdrop = on < 0 ? 0 : focus[on];
  const panel = (p: SParams['panels'][number], i: number) => {
    const at = start + i * 14, k = out(frame, at, at + 70), py = y + i * (ph + gap), z = focus[i];
    // Pushed in: scaled about the panel's centre to fill the frame above the caption band.
    const s = 1 + (Math.min(1728 / w, 700 / ph, 2.6) - 1) * z, cx = x + w / 2, cy = py + ph / 2, tx = (960 - cx) * z, ty = (420 - cy) * z;
    return <g key={p.title} opacity={out(frame, at - 8, at + 8)} transform={`translate(${(1 - out(frame, at - 8, at + 12)) * -40} 0)`}>
      <g transform={`translate(${tx} ${ty}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
        <Panel title={p.title} series={p.series} x={x} y={py} w={w} h={ph} k={k} />
      </g>
    </g>;
  };
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
    {sparams.panels.map((p, i) => i !== on && panel(p, i))}
    {backdrop > 0 && <rect x={0} y={0} width={1920} height={1080} fill={C.page} opacity={.82 * backdrop} />}
    {on >= 0 && panel(sparams.panels[on], on)}
  </svg>;
}

/** A coil's pixel grid between two evaluations: a cell's metal fades from `now` to `next` by u, and a changing cell glows white. */
export function PixelGrid({ name, rows, columns, now, next, u, x, y, cell }: { name: string; rows: number; columns: number; now: string; next: string; u: number; x: number; y: number; cell: number }) {
  const colour = COILS[name] ?? EM, glow = Math.sin(Math.PI * u);
  return <g>
    <rect x={x - 6} y={y - 6} width={columns * cell + 12} height={rows * cell + 12} rx={10} fill={SURFACE} stroke={GRID} />
    {[...now].map((v, i) => {
      const a = v === '1' ? 1 : 0, b = next[i] === '1' ? 1 : 0, o = a + (b - a) * u;
      if (o <= 0 && a === b) return null;
      return <rect key={i} x={x + (i % columns) * cell + .8} y={y + Math.floor(i / columns) * cell + .8} width={cell - 1.6} height={cell - 1.6} rx={2}
        fill={a !== b ? mixHex(colour, P.glow, glow) : colour} fillOpacity={a !== b ? Math.max(o, .25 * glow) : 1} />;
    })}
    <text x={x} y={y + rows * cell + 36} {...text} fontWeight={700} fontSize={24}>{name}</text>
  </g>;
}

/** A half-turn coil as drawn: the table cell's conductor polygons (µm), centred on (cx, cy) at s px per µm. */
function Outline({ polygons, cx, cy, s, colour, opacity = 1 }: { polygons: number[][][]; cx: number; cy: number; s: number; colour: string; opacity?: number }) {
  const [x0, y0, x1, y1] = bounds(polygons), ox = cx - (x0 + x1) / 2 * s, oy = cy + (y0 + y1) / 2 * s;
  return <g opacity={opacity}>{polygons.map((p, i) => <path key={i} d={p.map(([x, y], k) => `${k ? 'L' : 'M'}${ox + x * s} ${oy - y * s}`).join('') + 'Z'} fill={colour} />)}</g>;
}
const bounds = (polygons: number[][][]) => { const xs = polygons.flat().map(p => p[0]), ys = polygons.flat().map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

/** An octagonal spiral of `turns` turns from the inner diameter (flat to flat), track width and spacing (µm), with a
 * straight lead out of each end, centred on (cx, cy) at s px per µm. Drawn from the run's parameters. */
function Spiral({ din, width, spacing, turns, cx, cy, s, colour }: { din: number; width: number; spacing: number; turns: number; cx: number; cy: number; s: number; colour: string }) {
  const steps = Math.round(turns * 8), cos = Math.cos(Math.PI / 8);
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const a = (din + width) / 2 + (k / 8) * (width + spacing), r = a / cos, t = Math.PI / 2 + Math.PI / 8 + k * Math.PI / 4;
    return [cx + r * Math.cos(t) * s, cy - r * Math.sin(t) * s];
  });
  const lead = (din / 2 + turns * (width + spacing) + 8) * s, [first] = pts, last = pts[pts.length - 1];
  const d = `M${first[0]} ${cy - lead}L${first[0]} ${first[1]}` + pts.slice(1).map(([x, y]) => `L${x} ${y}`).join('') + `L${last[0]} ${cy + lead}`;
  return <path d={d} fill="none" stroke={colour} strokeWidth={width * s} strokeLinejoin="miter" />;
}

/** The error against evaluations up to `upto`: each dot is one evaluation, the line is the best so far. With `ghost`, the
 * whole run's recorded errors stand faint behind, so the panel is never empty. Without `labels`, the curve stands alone;
 * `strong` draws it brighter and bolder, for a panel read at a glance. */
export function ErrorCurve({ errors, upto, x, y, w, h, colour, ghost = false, labels = true, strong = false }: { errors: number[]; upto: number; x: number; y: number; w: number; h: number; colour: string; ghost?: boolean; labels?: boolean; strong?: boolean }) {
  // The scale runs from the run's best to its first error (from zero when the run gains most of it); worse ones sit at the top edge.
  const top = errors[0] * 1.1, least = Math.min(...errors), lo = least < errors[0] / 2 ? 0 : least - (top - least) * .1, hi = top;
  const sx = (i: number) => x + (i / (errors.length - 1)) * w, sy = (e: number) => y + h - Math.min((e - lo) / (hi - lo), 1) * h;
  const n = Math.floor(upto);
  let best = Infinity;
  const line = errors.slice(0, n + 1).map((e, i) => { best = Math.min(best, e); return `${i ? 'L' : 'M'}${sx(i)} ${sy(best)}`; }).join('');
  return <g>
    <rect x={x - 24} y={y - 58} width={w + 48} height={h + 82} rx={14} fill={SURFACE} stroke={GRID} />
    <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={GRID} />
    {ghost && errors.map((e, i) => <circle key={`g${i}`} cx={sx(i)} cy={sy(e)} r={2.4} fill={MUTED} fillOpacity={strong ? .3 : .18} />)}
    {errors.slice(0, n + 1).map((e, i) => <circle key={i} cx={sx(i)} cy={sy(e)} r={strong ? 4.5 : 3} fill={colour} fillOpacity={strong ? .85 : .45} />)}
    <path d={line} fill="none" stroke={colour} strokeWidth={strong ? 5 : 3.5} />
    <line x1={sx(upto)} x2={sx(upto)} y1={y} y2={y + h} stroke={INK} strokeOpacity={.35} />
    {labels && <text x={x} y={y - 22} {...text} fontSize={24} fill={MUTED}>goal error</text>}
    {labels && <text x={x + w} y={y - 22} textAnchor="end" {...text} fontSize={24}>best {+best.toPrecision(2)}</text>}
  </g>;
}

/** The four transistors' widths, as bars on the run's own scale. */
function Fets({ fet, wMax, x, y, w }: { fet: Record<string, number>; wMax: number; x: number; y: number; w: number }) {
  return <g>{[1, 2, 3, 4].map((m, i) => { const yy = y + i * 40, bw = (fet[`w_M${m}`] / wMax) * (w - 330);
    return <g key={m}>
      <text x={x} y={yy + 24} {...text} fontWeight={700} fontSize={24}>M{m}</text>
      <rect x={x + 56} y={yy + 4} width={bw} height={26} rx={5} fill={PEX} />
      <text x={x + 56 + bw + 12} y={yy + 25} {...text} fontSize={22}>W {(fet[`w_M${m}`] * 1e6).toFixed(1)} µm · nf {Math.round(fet[`nf_M${m}`])}</text>
    </g>; })}</g>;
}

const mixHex = mix;
const smooth = (u: number) => u * u * (3 - 2 * u);

/** Where a run is at a frame: the sample it holds (j), the next one, and how far it has glided to it (u). Each step holds
 * for its first 40% and glides for the rest. */
export function stepper(samples: number[], frame: number, from: number, to: number) {
  const p = Math.max(0, Math.min(samples.length - 1, (frame - from) / (to - from) * (samples.length - 1)));
  const j = Math.min(Math.floor(p), samples.length - 2), u = smooth(Math.max(0, Math.min(1, (p - j - .4) / .6)));
  return { a: samples[j], b: samples[j + 1], u, at: samples[j] + (samples[j + 1] - samples[j]) * u };
}
const spread = (n: number, count: number) => Array.from({ length: count }, (_, j) => Math.round(j * (n - 1) / (count - 1)));
const lerpFet = (a: Record<string, number>, b: Record<string, number>, u: number) => Object.fromEntries(Object.keys(a).map(k => [k, a[k] + (b[k] - a[k]) * u]));

/** The pixel run's distinct grid sets, `count` of them spread over the run. */
export function pixelSamples(optimize: Optimize, count: number) {
  const seen = new Set<string>(), all = optimize.pixels.evaluations.flatMap((r, i) => { const k = Object.values(r.grids).join(''); return seen.has(k) ? [] : (seen.add(k), [i]); });
  return all.length <= count ? all : Array.from({ length: count }, (_, j) => all[Math.round(j * (all.length - 1) / (count - 1))]);
}
export { COILS, mixHex };

/** The three runs one after another in a column at (x, y), w wide; `phases` gives each run's [from, to] frames. */
export function OptimizeView({ optimize, frame, x, y, w, phases }: { optimize: Optimize; frame: number; x: number; y: number; w: number; phases: [number, number][] }) {
  const { pixels, halfturn, turns } = optimize;
  const wMax = (e: { fet: Record<string, number> }[]) => Math.max(...e.flatMap(r => [1, 2, 3, 4].map(m => r.fet[`w_M${m}`])));
  const errors = (e: { error: number }[]) => e.map(r => r.error);
  const coilW = (w - 2 * 36) / 3, coilY = y + 150, curveY = y + 478, fetY = y + 570;
  // A run's samples: the pixel run's distinct grids, the half-turn run's distinct table cells, the 1.5-turn run's spread.
  const distinct = <T,>(e: T[], key: (r: T) => string) => { const seen = new Set<string>(); return e.flatMap((r, i) => seen.has(key(r)) ? [] : (seen.add(key(r)), [i])); };
  const pick = (all: number[], count: number) => all.length <= count ? all : spread(all.length, count).map(i => all[i]);
  const ps = pick(distinct(pixels.evaluations, r => Object.values(r.grids).join('')), 12);
  const hs = pick(distinct(halfturn.evaluations, r => [1, 2, 3].map(l => `${r[`D_L${l}`]}_${r[`W_L${l}`]}`).join()), 10);
  const ts = spread(turns.evaluations.length, 10);
  const header = (title: string, note: string, algorithm: string, at: number, total: number) => <>
    <text x={x} y={y + 40} {...text} fontWeight={700} fontSize={40}>{title}</text>
    <text x={x} y={y + 82} {...text} fill={MUTED} fontSize={26}>{note}</text>
    <text x={x} y={y + 120} {...text} fill={MUTED} fontSize={26}>{algorithm.replace('_', '-').toUpperCase()} · evaluation <tspan fill={INK}>{Math.round(at) + 1}</tspan> of {total}</text>
  </>;
  const phase = (i: number, body: (from: number, to: number) => ReactNode) => {
    const [from, to] = phases[i], k = out(frame, from - 14, from) * (1 - out(frame, to, to + 14));
    return k > 0 && <g key={i} opacity={k} transform={`translate(0 ${(1 - out(frame, from - 14, from + 4)) * 24})`}>{body(from + 10, to - 16)}</g>;
  };
  const cell = Math.floor((coilW - 12) / 12);
  // One scale for every half-turn cell and one for every 1.5-turn coil, so sizes read against each other.
  const boxes = Object.values(halfturn.outlines).map(bounds), hScale = Math.min((coilW - 20) / Math.max(...boxes.map(b => b[2] - b[0])), 190 / Math.max(...boxes.map(b => b[3] - b[1])));
  const outer = Math.max(...turns.evaluations.flatMap(r => [1, 2, 3].map(l => r[`din_L${l}`] + 2 * r[`n_L${l}`] * (r[`width_L${l}`] + r[`spc_L${l}`])))), tScale = Math.min(coilW - 10, 190) / (outer + 16);
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
    {phase(0, (from, to) => { const s = stepper(ps, frame, from, to), a = pixels.evaluations[s.a], b = pixels.evaluations[s.b];
      return <>{header('Pixelated passive devices', 'random pixels on a 12 × 12 grid', pixels.algorithm, s.at, pixels.evaluations.length)}
        {Object.entries(pixels.coils).map(([name, g], i) => <PixelGrid key={name} name={name} rows={g.rows} columns={g.columns} now={a.grids[name]} next={b.grids[name]} u={s.u}
          x={x + 6 + i * (coilW + 36)} y={coilY + 6} cell={cell} />)}
        <ErrorCurve errors={errors(pixels.evaluations)} upto={s.at} x={x + 24} y={curveY} w={w - 48} h={62} colour={EM} />
        <Fets fet={lerpFet(a.fet, b.fet, s.u)} wMax={wMax(pixels.evaluations)} x={x} y={fetY} w={w} /></>; })}
    {phase(1, (from, to) => { const s = stepper(hs, frame, from, to), a = halfturn.evaluations[s.a], b = halfturn.evaluations[s.b];
      return <>{header('Half-turn inductors', 'table cells by diameter and width', halfturn.algorithm, s.at, halfturn.evaluations.length)}
        {[1, 2, 3].map((l, i) => { const cx = x + coilW / 2 + i * (coilW + 36), cy = coilY + 100, ka = `D${a[`D_L${l}`]}_W${a[`W_L${l}`]}`, kb = `D${b[`D_L${l}`]}_W${b[`W_L${l}`]}`;
          const r = s.u < .5 ? a : b;
          return <g key={l}>
            <Outline polygons={halfturn.outlines[ka]} cx={cx} cy={cy} s={hScale} colour={COILS[`L${l}`]} opacity={ka === kb ? 1 : 1 - s.u} />
            {ka !== kb && <Outline polygons={halfturn.outlines[kb]} cx={cx} cy={cy} s={hScale} colour={COILS[`L${l}`]} opacity={s.u} />}
            <text x={cx} y={coilY + 240} textAnchor="middle" {...text} fontSize={22}><tspan fontWeight={700}>L{l}</tspan><tspan fill={MUTED}>  D {r[`D_L${l}`]} · W {r[`W_L${l}`]} µm</tspan></text>
          </g>; })}
        <ErrorCurve errors={errors(halfturn.evaluations)} upto={s.at} x={x + 24} y={curveY} w={w - 48} h={62} colour={C.dc} />
        <Fets fet={lerpFet(a.fet, b.fet, s.u)} wMax={wMax(halfturn.evaluations)} x={x} y={fetY} w={w} /></>; })}
    {phase(2, (from, to) => { const s = stepper(ts, frame, from, to), a = turns.evaluations[s.a], b = turns.evaluations[s.b];
      const v = (k: string) => (a[k] as number) + ((b[k] as number) - (a[k] as number)) * s.u;
      return <>{header('1.5-turn inductors', 'inner diameter, width and spacing', turns.algorithm, s.at, turns.evaluations.length)}
        {[1, 2, 3].map((l, i) => { const cx = x + coilW / 2 + i * (coilW + 36), cy = coilY + 100;
          return <g key={l}>
            <Spiral din={v(`din_L${l}`)} width={v(`width_L${l}`)} spacing={v(`spc_L${l}`)} turns={a[`n_L${l}`]} cx={cx} cy={cy} s={tScale} colour={COILS[`L${l}`]} />
            <text x={cx} y={coilY + 240} textAnchor="middle" {...text} fontSize={22}><tspan fontWeight={700}>L{l}</tspan><tspan fill={MUTED}>  D {v(`din_L${l}`).toFixed(1)} · W {v(`width_L${l}`).toFixed(1)} µm</tspan></text>
          </g>; })}
        <ErrorCurve errors={errors(turns.evaluations)} upto={s.at} x={x + 24} y={curveY} w={w - 48} h={62} colour={P.pink} />
        <Fets fet={lerpFet(a.fet, b.fet, s.u)} wMax={wMax(turns.evaluations)} x={x} y={fetY} w={w} /></>; })}
  </svg>;
}
