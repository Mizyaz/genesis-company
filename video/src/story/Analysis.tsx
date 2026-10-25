import { Easing, interpolate } from 'remotion';

// The analysis and optimization views of the 2D story film, drawn from records (story/analysis.mjs writes the inputs):
// the chip's S-parameter curves, PEX and EM, and three optimizer runs, one evaluation per step: random 12 x 12 pixel
// coils, half-turn coils picked from the drawn table cells, and 1.5-turn coils, each with its goal error and FET sizes.
type Series = { label: string; x: number[]; y: number[] };
export type SParams = { title: string; panels: { title: string; series: Series[] }[] };
type Evaluation = { iteration: number; error: number; fet: Record<string, number> };
type Sizes = Evaluation & { [coil: string]: number | Record<string, number> } & Record<`${string}_L${number}`, number>;
export type Optimize = {
  pixels: { algorithm: string; coils: Record<string, { rows: number; columns: number }>; evaluations: (Evaluation & { grids: Record<string, string> })[] };
  halfturn: { algorithm: string; outlines: Record<string, number[][][]>; evaluations: Sizes[] };
  turns: { algorithm: string; evaluations: Sizes[] };
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const EM = '#41dce8', PEX = '#b08af4', INK = '#dce8f4', MUTED = '#8aa0b6', GRID = '#1d3a55', SURFACE = '#0b2238';
const COILS: Record<string, string> = { L1: '#6fe0a5', L2: '#ff7aa8', L3: '#6fb9ed' };
const text = { fontFamily: 'Inter', fill: INK } as const;

/** Round ticks covering [lo, hi]. */
function ticks(lo: number, hi: number, n = 4) {
  const step = [1, 2, 5, 10, 20, 25, 50].map(s => s * 10 ** Math.floor(Math.log10((hi - lo) / n))).find(s => (hi - lo) / s <= n) ?? (hi - lo) / n;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

/** One S-parameter panel: dB against GHz, the EM curve solid and the PEX curve dashed, drawn left to right by k. */
function Panel({ title, series, x, y, w, h, k }: { title: string; series: Series[]; x: number; y: number; w: number; h: number; k: number }) {
  const all = series.flatMap(s => s.y), lo = Math.floor(Math.min(...all) / 5) * 5, hi = Math.ceil(Math.max(...all) / 5) * 5;
  const sx = (f: number) => x + 56 + (f / 110) * (w - 72), sy = (v: number) => y + 46 + (1 - (v - lo) / (hi - lo)) * (h - 136);
  // The figure's labels end in "<band mean> / <110 GHz> dB".
  const stats = (s: Series) => /(-?[\d.]+) \/ (-?[\d.]+) dB$/.exec(s.label);
  const em = series.find(s => /EM/.test(s.label)), pex = series.find(s => /PEX/.test(s.label));
  const clip = `inset(0 ${(1 - k) * 100}% 0 0)`;
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={16} fill={SURFACE} stroke={GRID} />
    <text x={x + 20} y={y + 32} {...text} fontWeight={700} fontSize={24}>{title.replace(/ \(dB\)$/, '').replace(/\s*\((ON|ISO)\)/, '')}</text>
    {ticks(lo, hi).map(v => <g key={v}><line x1={sx(0)} x2={sx(110)} y1={sy(v)} y2={sy(v)} stroke={GRID} strokeWidth={1} />
      <text x={sx(0) - 8} y={sy(v) + 5} textAnchor="end" {...text} fill={MUTED} fontSize={14}>{v}</text></g>)}
    {[0, 25, 50, 75, 100].map(f => <text key={f} x={sx(f)} y={y + h - 64} textAnchor="middle" {...text} fill={MUTED} fontSize={14}>{f}</text>)}
    <text x={sx(110)} y={y + h - 64} textAnchor="end" {...text} fill={MUTED} fontSize={14}>GHz</text>
    <g style={{ clipPath: clip }}>
      {[pex, em].map(s => s && <path key={s.label} d={s.x.map((f, i) => `${i ? 'L' : 'M'}${sx(f)} ${sy(s.y[i])}`).join('')} fill="none"
        stroke={s === em ? EM : PEX} strokeWidth={s === em ? 3 : 2.4} strokeDasharray={s === em ? undefined : '8 6'} strokeLinejoin="round" />)}
    </g>
    {[em, pex].map((s, i) => { const m = s && stats(s); return m && <text key={i} x={x + 20} y={y + h - 34 + i * 22} {...text} fontSize={15} opacity={out(k, .7, 1)}>
      <tspan fill={i ? PEX : EM} fontWeight={700}>{i ? 'PEX' : 'EM'}</tspan><tspan fill={MUTED}>  mean </tspan>{m[1]}<tspan fill={MUTED}> · 110 GHz </tspan>{m[2]} dB</text>; })}
  </g>;
}

export function SParamPlots({ sparams, frame, x, y, w, h, start }: { sparams: SParams; frame: number; x: number; y: number; w: number; h: number; start: number }) {
  const n = sparams.panels.length, gap = 28, pw = (w - gap * (n - 1)) / n;
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
    {sparams.panels.map((p, i) => {
      const at = start + i * 10, k = out(frame, at, at + 60);
      return <g key={p.title} opacity={out(frame, at - 6, at + 6)} transform={`translate(0 ${(1 - out(frame, at - 6, at + 10)) * 30})`}>
        <Panel title={p.title} series={p.series} x={x + i * (pw + gap)} y={y} w={pw} h={h} k={k} />
      </g>;
    })}
  </svg>;
}

/** A coil's pixel grid: metal cells in the coil's colour, cells that changed since the last evaluation lit white or red. */
function PixelGrid({ name, rows, columns, now, before, x, y, cell }: { name: string; rows: number; columns: number; now: string; before: string; x: number; y: number; cell: number }) {
  const colour = COILS[name] ?? EM;
  return <g>
    <rect x={x - 5} y={y - 5} width={columns * cell + 10} height={rows * cell + 10} rx={8} fill={SURFACE} stroke={GRID} />
    {[...now].map((v, i) => {
      const changed = v !== before[i];
      if (v === '0' && !changed) return null;
      return <rect key={i} x={x + (i % columns) * cell + .6} y={y + Math.floor(i / columns) * cell + .6} width={cell - 1.2} height={cell - 1.2} rx={1.5}
        fill={changed ? (v === '1' ? '#ffffff' : '#ff6b6b') : colour} fillOpacity={changed && v === '0' ? .6 : 1} />;
    })}
    <text x={x} y={y + rows * cell + 28} {...text} fontWeight={700} fontSize={19}>{name}</text>
  </g>;
}

/** A half-turn coil as drawn: the table cell's conductor polygons (µm), centred on (cx, cy) at s px per µm. */
function Outline({ polygons, cx, cy, s, colour, box }: { polygons: number[][][]; cx: number; cy: number; s: number; colour: string; box: number[] }) {
  const [x0, y0, x1, y1] = box, ox = cx - (x0 + x1) / 2 * s, oy = cy + (y0 + y1) / 2 * s;
  return <g>{polygons.map((p, i) => <path key={i} d={p.map(([x, y], k) => `${k ? 'L' : 'M'}${ox + x * s} ${oy - y * s}`).join('') + 'Z'} fill={colour} />)}</g>;
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

/** The error so far against evaluations: each dot is one evaluation, the line is the best so far. */
function ErrorCurve({ errors, upto, x, y, w, h, colour }: { errors: number[]; upto: number; x: number; y: number; w: number; h: number; colour: string }) {
  // The scale runs from the run's best to its first error (from zero when the run gains most of it); worse ones sit at the top edge.
  const top = errors[0] * 1.1, least = Math.min(...errors), lo = least < errors[0] / 2 ? 0 : least - (top - least) * .1, hi = top;
  const sx = (i: number) => x + (i / (errors.length - 1)) * w, sy = (e: number) => y + h - Math.min((e - lo) / (hi - lo), 1) * h;
  let best = Infinity;
  const line = errors.slice(0, upto + 1).map((e, i) => { best = Math.min(best, e); return `${i ? 'L' : 'M'}${sx(i)} ${sy(best)}`; }).join('');
  return <g>
    <rect x={x - 46} y={y - 44} width={w + 62} height={h + 60} rx={12} fill={SURFACE} stroke={GRID} />
    <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={GRID} />
    {[lo, hi].map(v => <text key={v} x={x - 6} y={sy(v) + (v === lo ? 0 : 10)} textAnchor="end" {...text} fill={MUTED} fontSize={12}>{+v.toPrecision(2)}</text>)}
    {errors.slice(0, upto + 1).map((e, i) => <circle key={i} cx={sx(i)} cy={sy(e)} r={1.8} fill={colour} fillOpacity={.35} />)}
    <path d={line} fill="none" stroke={colour} strokeWidth={3} />
    <text x={x} y={y - 18} {...text} fontSize={16} fill={MUTED}>goal error</text>
    <text x={x + w} y={y - 18} textAnchor="end" {...text} fontSize={16}>best {+best.toPrecision(2)}</text>
  </g>;
}

/** The four transistors' widths at this evaluation, as bars on the run's own scale. */
function Fets({ fet, wMax, x, y }: { fet: Record<string, number>; wMax: number; x: number; y: number }) {
  return <g>{[1, 2, 3, 4].map((m, i) => { const yy = y + i * 40, bw = (fet[`w_M${m}`] / wMax) * 150;
    return <g key={m}>
      <text x={x} y={yy + 20} {...text} fontWeight={700} fontSize={17}>M{m}</text>
      <rect x={x + 44} y={yy + 4} width={bw} height={22} rx={4} fill={PEX} />
      <text x={x + 44 + bw + 10} y={yy + 21} {...text} fontSize={15}>W {(fet[`w_M${m}`] * 1e6).toFixed(1)} µm · nf {fet[`nf_M${m}`]}</text>
    </g>; })}</g>;
}

const ROW = 262, TOP = 34;
/** One run's row: its title and evaluation counter, its coils, its goal error and its transistor sizes. */
function Row({ i, title, note, run, at, total, errors, fet, wMax, colour, frame, appear, children }: {
  i: number; title: string; note: string; run: { algorithm: string }; at: number; total: number; errors: number[]; fet: Record<string, number>; wMax: number; colour: string; frame: number; appear: number; children: React.ReactNode;
}) {
  const y = TOP + i * ROW;
  return <g opacity={out(frame, appear, appear + 12)} transform={`translate(0 ${(1 - out(frame, appear, appear + 14)) * 20})`}>
    <text x={110} y={y + 26} {...text} fontWeight={700} fontSize={24}>{title}</text>
    <text x={110} y={y + 54} {...text} fill={MUTED} fontSize={16}>{note}</text>
    <text x={110} y={y + 78} {...text} fill={MUTED} fontSize={16}>{run.algorithm.replace('_', '-').toUpperCase()}: evaluation <tspan fill={INK}>{at + 1}</tspan> of {total}</text>
    {children}
    <ErrorCurve errors={errors} upto={at} x={1030} y={y + 84} w={360} h={130} colour={colour} />
    <Fets fet={fet} wMax={wMax} x={1450} y={y + 50} />
  </g>;
}

export function OptimizeView({ optimize, frame, start, end }: { optimize: Optimize; frame: number; start: number; end: number }) {
  const p = interpolate(frame, [start, end], [0, 1], clamp), step = <T,>(e: T[]) => Math.round(p * (e.length - 1));
  const { pixels, halfturn, turns } = optimize;
  const wMax = (e: { fet: Record<string, number> }[]) => Math.max(...e.flatMap(r => [1, 2, 3, 4].map(m => r.fet[`w_M${m}`])));
  const pj = step(pixels.evaluations), hj = step(halfturn.evaluations), tj = step(turns.evaluations);
  const px = pixels.evaluations[pj], pb = pixels.evaluations[Math.max(0, pj - 1)], hx = halfturn.evaluations[hj], tx = turns.evaluations[tj];
  // One scale per row, so a coil's size reads against every other evaluation of its run.
  const boxes = Object.values(halfturn.outlines).map(bounds), hs = Math.min(290 / Math.max(...boxes.map(b => b[2] - b[0])), 150 / Math.max(...boxes.map(b => b[3] - b[1])));
  const outer = Math.max(...turns.evaluations.flatMap(r => [1, 2, 3].map(l => r[`din_L${l}`] + 2 * r[`n_L${l}`] * (r[`width_L${l}`] + r[`spc_L${l}`])))), ts = 160 / (outer + 16);
  const cell = 13;
  const run = (e: { error: number }[]) => e.map(r => r.error);
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
    <Row i={0} title="Pixel coils" note="random pixels on a 12 × 12 grid" run={pixels} at={pj} total={pixels.evaluations.length} errors={run(pixels.evaluations)}
      fet={px.fet} wMax={wMax(pixels.evaluations)} colour={EM} frame={frame} appear={start - 20}>
      {Object.entries(pixels.coils).map(([name, g], i) =>
        <PixelGrid key={name} name={name} rows={g.rows} columns={g.columns} now={px.grids[name]} before={pb.grids[name]} x={430 + i * (g.columns * cell + 26)} y={TOP + 14} cell={cell} />)}
      <text x={110} y={TOP + 130} {...text} fontSize={15} fill={MUTED}><tspan fill="#ffffff">■</tspan> metal added</text>
      <text x={110} y={TOP + 156} {...text} fontSize={15} fill={MUTED}><tspan fill="#ff6b6b">■</tspan> metal removed</text>
    </Row>
    <Row i={1} title="Half-turn coils" note="table cells by diameter and width" run={halfturn} at={hj} total={halfturn.evaluations.length} errors={run(halfturn.evaluations)}
      fet={hx.fet} wMax={wMax(halfturn.evaluations)} colour="#f5a623" frame={frame} appear={start - 8}>
      {[1, 2, 3].map((l, i) => { const key = `D${hx[`D_L${l}`]}_W${hx[`W_L${l}`]}`, polys = halfturn.outlines[key], cx = 220 + i * 290, y = TOP + ROW;
        return <g key={l}>
          <Outline polygons={polys} cx={cx} cy={y + 152} s={hs} colour={COILS[`L${l}`]} box={bounds(polys)} />
          <text x={cx - 130} y={y + 250} {...text} fontWeight={700} fontSize={19}>L{l}</text>
          <text x={cx - 100} y={y + 250} {...text} fill={MUTED} fontSize={16}>D {hx[`D_L${l}`]} µm · W {hx[`W_L${l}`]} µm</text>
        </g>; })}
    </Row>
    <Row i={2} title="1.5-turn coils" note="inner diameter, width and spacing" run={turns} at={tj} total={turns.evaluations.length} errors={run(turns.evaluations)}
      fet={tx.fet} wMax={wMax(turns.evaluations)} colour="#ff7aa8" frame={frame} appear={start + 4}>
      {[1, 2, 3].map((l, i) => { const cx = 220 + i * 290, y = TOP + 2 * ROW;
        return <g key={l}>
          <Spiral din={tx[`din_L${l}`]} width={tx[`width_L${l}`]} spacing={tx[`spc_L${l}`]} turns={tx[`n_L${l}`]} cx={cx} cy={y + 152} s={ts} colour={COILS[`L${l}`]} />
          <text x={cx - 130} y={y + 250} {...text} fontWeight={700} fontSize={19}>L{l}</text>
          <text x={cx - 100} y={y + 250} {...text} fill={MUTED} fontSize={16}>D {tx[`din_L${l}`].toFixed(1)} µm · W {tx[`width_L${l}`].toFixed(2)} µm</text>
        </g>; })}
    </Row>
  </svg>;
}
