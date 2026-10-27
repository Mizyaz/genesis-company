import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import analysis from '../content/story/analysis.json';
import flow from '../content/story/flow.json';
import optimization from '../content/story/optimization.json';
import pixels from '../content/story/pixels.json';
import validation from '../content/story/validation.json';
import { assetUrl, Icon } from './ui';
import { LayoutStages, type StagedLayout } from './story/LayoutStages';
import { fit, Schematic, type Drawing, type Ink } from './story/Schematic';

export type CoDesignContent = { label: string; design: string; repeat: string; play: string; pause: string; circuit: { label: string; name: string; note: string };
  passives: { pixelated: string; parametric: string; another: string; previous: string; note: string; candidate: string }; scrub: string;
  spec: { miss: string; target: string; met: string }; steps: { id: Step; title: string; detail: string }[]; first: string };
type Step = 'spec' | 'sizing' | 'passives' | 'simulate' | 'objective' | 'layout';
type Goal = { name: string; state: string; output: string; unit: string; sense: 'at_least' | 'at_most'; target: number; band: [number, number] | null };

// Everything drawn here is the film's own record (scripts/export-story-data.mjs): the run's designs in order, each with
// its error, its transistors' widths, its goal values and its simulated S-parameters, the coil candidates' pictures and
// the layout's DRC and LVS record; and pixelated designs from one of our EM datasets (scripts/export-pixel-samples.mjs).
const run = optimization.run, evaluations = optimization.objective.evaluations, goals = optimization.objective.goals as Goal[];
// The parametric tab keeps the drawn coil family (spirals); the pixel-filled candidates are left out.
const drawing = flow.schematic as Drawing, frames = optimization.frames.filter(f => f.family === 'spiral');
const bestAt = run.reduce((b, r, i) => r.error < run[b].error ? i : b, 0);
const ghz = (hz: number) => +(hz / 1e9).toPrecision(3);
const words = (name: string) => { const s = name.replace(/^on\d_/, '').replace(/_center$/, '').replace(/_/g, ' '); return /[A-Z]/.test(s) ? s : s[0].toUpperCase() + s.slice(1); };
const dB = (v: number) => v.toFixed(1).replace('-', '−');

// The board's colours are the page theme's (site.css, .codesign): every panel reads in the light and the dark theme.
const V = { s21: 'var(--brand-1)', s31: 'var(--brand-3)', s11: 'var(--cd-s11)', grid: 'var(--cd-grid)', text: 'var(--cd-text)', muted: 'var(--cd-muted)',
  screen: 'var(--cd-screen)', pixel: 'var(--brand-2)', met: 'var(--cd-met)', miss: 'var(--cd-miss)', fet: 'var(--brand-3)', focus: 'var(--cyan)' };
const INK: Ink = { wire: 'var(--brand-1)', text: V.text, muted: V.muted, page: V.screen };
const COIL: Record<string, string> = { L1: 'var(--cd-l1)', L2: 'var(--cd-l2)', L3: 'var(--brand-2)' };
/** The goal each simulated curve answers (the switch with port 2 on): what lights together when the reader points at one. */
const CURVES = [['port2_on/S21_dB', 'S21', V.s21, -2, 'Transmission'], ['port2_on/S31_dB', 'S31', V.s31, -20, 'Isolation'], ['port2_on/S11_dB', 'S11', V.s11, -15, 'Input match']] as const;

/** The specification's goals, one row per goal and band (the port states merged: a row holds the worse of them). */
const rows = [...new Map(goals.map(g => [`${words(g.name)}|${g.band ? g.band.join() : ''}`, g])).values()].map(g => {
  const same = goals.flatMap((o, i) => words(o.name) === words(g.name) && String(o.band) === String(g.band) ? [i] : []);
  const at = (e: number) => { const v = same.map(i => evaluations[e].values[i]); return g.sense === 'at_least' ? Math.min(...v) : Math.max(...v); };
  return { name: words(g.name), band: !g.band ? 'compression' : g.band[0] === g.band[1] ? `${ghz(g.band[0])} GHz` : `${ghz(g.band[0])}–${ghz(g.band[1])} GHz`,
    target: `${g.sense === 'at_least' ? '≥' : '≤'} ${dB(g.target)} ${g.unit}`, at, margin: (v: number) => g.sense === 'at_least' ? v - g.target : g.target - v };
});

/** The specification as a picture: each goal a bar from its target, to the right where the design on screen meets it and
 * to the left by how far it misses (up to 10 dB either way), with its value; pointing at a goal reads its target. */
function SpecPanel({ at, focus, setFocus, labels }: { at: number; focus: string | null; setFocus: (f: string | null) => void; labels: CoDesignContent['spec'] }) {
  const W = 372, RH = 24, T = 20, H = T + rows.length * RH + 4, x0 = 168, half = 66, cx = x0 + half, M = 10;
  return <svg viewBox={`0 0 ${W} ${H}`} className="codesign-svg codesign-spec" onPointerLeave={() => setFocus(null)}>
    <text x={x0} y={11} className="codesign-tick" textAnchor="start" fill={V.miss}>{labels.miss}</text>
    <text x={cx} y={11} className="codesign-tick" textAnchor="middle">{labels.target}</text>
    <text x={x0 + 2 * half} y={11} className="codesign-tick" textAnchor="end" fill={V.met}>{labels.met}</text>
    <line x1={cx} x2={cx} y1={T - 4} y2={H - 2} stroke={V.muted} strokeWidth={1} strokeDasharray="2 3" />
    {rows.map((row, i) => { const v = row.at(at), m = row.margin(v), ok = m >= 0, y = T + i * RH, w = Math.min(M, Math.abs(m)) / M * half, lit = focus === row.name;
      return <g key={row.name + row.band} className={`codesign-goal${lit ? ' is-focus' : ''}${ok ? ' is-met' : ' is-miss'}`} onPointerEnter={() => setFocus(row.name)}>
        <title>{`${row.name}, ${row.band}: ${dB(v)} against ${row.target}`}</title>
        <rect x={0} y={y} width={W} height={RH} rx={5} fill={lit ? 'var(--cd-hover)' : 'transparent'} />
        <text x={4} y={y + 15.5} className="codesign-goal-name">{row.name}<tspan dx={5} className="codesign-goal-band">{lit ? row.target : row.band}</tspan></text>
        <rect x={x0} y={y + 9} width={2 * half} height={5} rx={2.5} fill={V.grid} opacity={.55} />
        <rect className="codesign-bar" x={ok ? cx : cx - w} y={y + 6} width={Math.max(2, w)} height={11} rx={4} fill={ok ? V.met : V.miss} />
        <text x={W - 20} y={y + 15.5} textAnchor="end" className="codesign-goal-value" fill={ok ? V.text : V.miss}>{dB(v)}</text>
        <path d={ok ? `M${W - 14} ${y + 11} l3 3 l6 -7` : `M${W - 13} ${y + 7} l7 7 m0 -7 l-7 7`} fill="none" stroke={ok ? V.met : V.miss} strokeWidth={2} strokeLinecap="round" />
      </g>; })}
  </svg>;
}

const fets = drawing.parts.filter(p => p.kind === 'nmos'), coils = drawing.parts.filter(p => p.kind === 'inductor');
const widest = Object.fromEntries(fets.map(p => [p.label, Math.max(...run.map(r => (r.fet as Record<string, number>)[`w_${p.label}`]))]));

/** The circuit's own schematic with each switch FET's width in this design, as a number and a bar; pointing at a part
 * lights it here and in the card that draws it. */
function SizingPanel({ at, lit, focus, setFocus }: { at: number; lit: Step | null; focus: string | null; setFocus: (f: string | null) => void }) {
  const W = 420, H = 270, { k, dx, dy } = fit(drawing, W, H);
  const colours = new Map<string, string>([...fets.map(p => [p.label, V.fet] as const), ...Object.entries(COIL)]);
  const on = (label: string) => focus === label || (focus === 'passives' && label in COIL);
  return <svg viewBox={`0 0 ${W} ${H}`} className="codesign-svg" onPointerLeave={() => setFocus(null)}>
    <Schematic drawing={drawing} width={W} height={H} t={1} tint={1} colours={lit === 'passives' ? new Map(Object.entries(COIL)) : colours} labels={false} ink={INK} />
    {[...fets, ...coils].filter(p => on(p.label)).map(p => <circle key={p.id} cx={p.x * k + dx} cy={p.y * k + dy} r={30 * k + 6} fill="none" stroke={V.focus} strokeWidth={2} />)}
    {fets.map(p => { const w = (run[at].fet as Record<string, number>)[`w_${p.label}`], x = p.x * k + dx + (p.rotation ? -6 : 12), y = p.y * k + dy + (p.rotation ? -16 : 4), end = !!p.rotation;
      return <g key={p.id} transform={`translate(${x} ${y})`} className={on(p.label) ? 'codesign-part is-focus' : 'codesign-part'}>
        <text className="codesign-fet" textAnchor={end ? 'end' : 'start'}><tspan fill={V.fet}>{p.label}</tspan> {w.toFixed(1)} µm</text>
        <rect x={end ? -64 : 0} y={6} width={64} height={4} rx={2} fill={V.grid} opacity={.6} />
        <rect className="codesign-bar" x={end ? -64 : 0} y={6} width={64 * w / widest[p.label]} height={4} rx={2} fill={V.fet} /></g>; })}
    {coils.map(p => <text key={p.id} className="codesign-fet" x={p.x * k + dx} y={p.y * k + dy - 12} textAnchor="middle" fill={COIL[p.label]}>{p.label}</text>)}
    {[...fets, ...coils].map(p => <rect key={p.id} data-part={p.label} x={p.x * k + dx - 30 * k - 6} y={p.y * k + dy - 30 * k - 6} width={60 * k + 12} height={60 * k + 12} fill="transparent" onPointerEnter={() => setFocus(p.label)} />)}
  </svg>;
}

/** A pixelated design from the EM dataset: its metal pixels on the grid, and its simulated transmission to both outputs,
 * on the data's own dB range; the pointer reads both values at its frequency. */
function PixelDesign({ design }: { design: (typeof pixels.designs)[number] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = design.grid.length, G = 196, cell = G / n, W = 520, H = 230, L = G + 52, R = 14, T = 30, Bt = 26, f = pixels.ghz;
  const all = [...design.S21, ...design.S31], lo = Math.floor(Math.min(...all) / 5) * 5 - 5, hi = Math.min(0, Math.ceil(Math.max(...all) / 5) * 5 + 5);
  const ticks = Array.from({ length: Math.floor((hi - lo) / 5) + 1 }, (_, i) => hi - i * 5).filter((v, i, a) => a.length <= 6 || i % 2 === 0);
  const sx = (g: number) => L + (g - f[0]) / (f[f.length - 1] - f[0]) * (W - L - R), sy = (v: number) => T + (hi - v) / (hi - lo) * (H - T - Bt);
  const traces = [['S21', V.s21], ['S31', V.s31]] as const;
  const point = (event: PointerEvent<SVGRectElement>) => { const box = event.currentTarget.getBoundingClientRect(), u = (event.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(f.length - 1, Math.round(u * (f.length - 1))))); };
  return <svg viewBox={`0 0 ${W} ${H}`} className="codesign-svg codesign-pixel">
    <rect x={2} y={(H - G) / 2} width={G} height={G} rx={4} fill="none" stroke={V.grid} />
    {design.grid.flatMap((row, r) => [...row].map((bit, c) => <rect key={`${r}-${c}`} x={2 + c * cell + .7} y={(H - G) / 2 + r * cell + .7} width={cell - 1.4} height={cell - 1.4} rx={2}
      fill={bit === '1' ? V.pixel : V.grid} opacity={bit === '1' ? 1 : .35} data-on={bit} />))}
    {ticks.map(v => <g key={v}><line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke={V.grid} strokeWidth={.6} /><text x={L - 6} y={sy(v) + 4} textAnchor="end" className="codesign-tick">{v}</text></g>)}
    <text x={L - 6} y={T - 8} textAnchor="end" className="codesign-tick">dB</text>
    {[f[0], (f[0] + f[f.length - 1]) / 2, f[f.length - 1]].map(g => <text key={g} x={sx(g)} y={H - 8} textAnchor="middle" className="codesign-tick">{g} GHz</text>)}
    {traces.map(([name, colour], i) => <g key={name} transform={`translate(${L + i * 110} 12)`}><line x1={0} x2={18} y1={0} y2={0} stroke={colour} strokeWidth={3} />
      <text x={24} y={4} className="codesign-tick">{name}{hover !== null ? ` ${design[name][hover].toFixed(1)} dB` : ''}</text></g>)}
    {traces.map(([name, colour]) => <path key={name} className="codesign-curve" d={f.map((g, i) => `${i ? 'L' : 'M'}${sx(g).toFixed(1)} ${sy(design[name][i]).toFixed(1)}`).join('')} fill="none" stroke={colour} strokeWidth={2.2} />)}
    {hover !== null && <g><line x1={sx(f[hover])} x2={sx(f[hover])} y1={T} y2={H - Bt} stroke={V.muted} strokeOpacity={.6} />
      {traces.map(([name, colour]) => <circle key={name} cx={sx(f[hover])} cy={sy(design[name][hover])} r={4} fill={colour} />)}
      <text x={sx(f[hover])} y={T - 4} textAnchor={hover > f.length / 2 ? 'end' : 'start'} className="codesign-tick">{f[hover]} GHz</text></g>}
    <rect x={L} y={T} width={W - L - R} height={H - T - Bt} fill="transparent" onPointerMove={point} onPointerDown={point} onPointerLeave={() => setHover(null)} />
  </svg>;
}

/** Passive synthesis, both ways: the run's parametric spiral candidates, or free-form pixelated designs from our EM
 * dataset. Both walk along with the run; the reader can also pick one, until the run is played or scrubbed again. */
function PassivesPanel({ at, stamp, board }: { at: number; stamp: number; board: CoDesignContent }) {
  const [mode, setMode] = useState<'pixelated' | 'parametric'>('pixelated'), [own, setOwn] = useState<number | null>(null), [chosen, setChosen] = useState<number | null>(null);
  useEffect(() => { setOwn(null); setChosen(null); }, [stamp]);
  const N = pixels.designs.length, pick = own ?? Math.min(N - 1, Math.floor(at / run.length * N));
  const choose = (i: number) => setOwn((i + N) % N);
  const j = chosen ?? Math.min(frames.length - 1, Math.floor(at / run.length * frames.length)), strip = [0, 1, 2, 3].map(k => Math.floor(k * frames.length / 4));
  return <div className="codesign-coil">
    <div className="codesign-tabs" role="tablist">{(['pixelated', 'parametric'] as const).map(m => <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)}>{board.passives[m]}</button>)}</div>
    {mode === 'parametric' ? <>
      <img src={assetUrl(`/${frames[j].file}`)} alt="" />
      <ol>{strip.map((k, i) => <li key={k} className={j >= k && (i === 3 || j < strip[i + 1]) ? 'is-on' : ''}><button type="button" onClick={() => setChosen(k)}><img src={assetUrl(`/${frames[k].file}`)} alt="" /><span>{board.passives.candidate} {k + 1}</span></button></li>)}</ol>
    </> : <>
      <PixelDesign design={pixels.designs[pick]} />
      <div className="codesign-pixel-bar">
        <span>{board.passives.note}</span>
        <span className="codesign-pick"><button type="button" className="codesign-step" aria-label={board.passives.previous} onClick={() => choose(pick - 1)}><Icon name="arrow" /></button>
          <strong>{pick + 1} / {N}</strong>
          <button type="button" className="codesign-next" onClick={() => choose(pick + 1)}><Icon name="loop" />{board.passives.another}</button></span>
      </div>
    </>}
  </div>;
}

type RunCurves = { axis: number[]; names: string[]; designs: number[][][] };
let runCurves: Promise<RunCurves> | null = null;
/** Every design's simulated curves, loaded once (a chunk of their own) when the board first draws them. */
function useRunCurves() {
  const [curves, setCurves] = useState<RunCurves | null>(null);
  useEffect(() => {
    runCurves ??= import('../content/story/run-curves.json').then(m => m.default as RunCurves);
    let on = true;
    runCurves.then(c => { if (on) setCurves(c); }).catch(() => undefined);
    return () => { on = false; };
  }, []);
  return curves;
}

/** The design on screen's simulated S-parameters, parasitics included, against their targets, over the first design's
 * (dashed); the pointer reads the three values at its frequency, and pointing at a curve's name lights its goal. */
function SimulatePanel({ at, labels, focus, setFocus }: { at: number; labels: { first: string; design: string }; focus: string | null; setFocus: (f: string | null) => void }) {
  const [hover, setHover] = useState<number | null>(null), run = useRunCurves();
  const W = 420, H = 230, L = 40, R = 52, T = 26, Bt = 30, hi = 0, axis = analysis.objective.axis;
  const first = analysis.objective.evaluations[0].curves as Record<string, number[]>;
  const now = (key: string) => run ? run.designs[at][run.names.indexOf(key)] : first[key];
  const lit = CURVES.find(c => c[4] === focus)?.[0];
  // The dB range is the data's own, from 1 GHz (DC sits hundreds of dB down), in steps of 10 dB, no deeper than -80 dB.
  const lo = Math.max(-80, Math.floor(Math.min(...CURVES.flatMap(([key]) => [...now(key), ...first[key]].filter((_, i) => axis[i] >= 1))) / 10) * 10);
  const ticks = Array.from({ length: -lo / 10 + 1 }, (_, i) => -i * 10).filter((_, i, a) => a.length <= 7 || i % 2 === 0);
  const sx = (f: number) => L + f / 110 * (W - L - R), sy = (v: number) => T + (hi - Math.max(lo, Math.min(hi, v))) / (hi - lo) * (H - T - Bt);
  const path = (y: number[]) => axis.flatMap((f, i) => f < 1 ? [] : [`${sx(f).toFixed(1)} ${sy(y[i]).toFixed(1)}`]).map((p, i) => `${i ? 'L' : 'M'}${p}`).join('');
  const point = (event: PointerEvent<SVGRectElement>) => { const box = event.currentTarget.getBoundingClientRect(), f = (event.clientX - box.left) / box.width * 110;
    setHover(axis.reduce((b, g, i) => Math.abs(g - f) < Math.abs(axis[b] - f) ? i : b, 0)); };
  return <svg viewBox={`0 0 ${W} ${H}`} className="codesign-svg">
    {ticks.map(v => <g key={v}><line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke={V.grid} strokeWidth={.6} /><text x={L - 6} y={sy(v) + 4} textAnchor="end" className="codesign-tick">{v}</text></g>)}
    {[0, 55, 110].map(f => <text key={f} x={sx(f)} y={H - 10} textAnchor="middle" className="codesign-tick">{f} GHz</text>)}
    <text x={L - 6} y={T - 10} textAnchor="end" className="codesign-tick">dB</text>
    <g transform={`translate(${L} 10)`}><line x1={0} x2={16} y1={0} y2={0} stroke={V.muted} strokeWidth={1.5} strokeDasharray="3 3" /><text x={20} y={4} className="codesign-tick">{labels.first}</text>
      <line x1={110} x2={126} y1={0} y2={0} stroke={V.text} strokeWidth={2.5} /><text x={130} y={4} className="codesign-tick">{labels.design} {at + 1}</text></g>
    {CURVES.map(([key, name, colour, target, goal]) => { const y = now(key), dim = lit && lit !== key ? .18 : 1;
      return <g key={key} opacity={dim} style={{ transition: 'opacity .2s' }}><line x1={sx(1)} x2={sx(110)} y1={sy(target)} y2={sy(target)} stroke={colour} strokeWidth={1} strokeDasharray="4 4" opacity={.6} />
        <path d={path(first[key])} fill="none" stroke={colour} strokeWidth={1.6} strokeDasharray="4 3" opacity={.6} />
        <path className="codesign-curve" d={path(y)} fill="none" stroke={colour} strokeWidth={lit === key ? 3 : 2.2} />
        <text x={W - R + 6} y={sy(y[y.length - 1]) + 4} className="codesign-tick codesign-curve-name" fill={colour} onPointerEnter={() => setFocus(goal)} onPointerLeave={() => setFocus(null)}>{name}{hover !== null ? ` ${y[hover].toFixed(1)}` : ''}</text></g>; })}
    {hover !== null && <g><line x1={sx(axis[hover])} x2={sx(axis[hover])} y1={T} y2={H - Bt} stroke={V.muted} strokeOpacity={.6} />
      <text x={sx(axis[hover])} y={T + 10} textAnchor={axis[hover] > 55 ? 'end' : 'start'} dx={axis[hover] > 55 ? -4 : 4} className="codesign-tick">{+axis[hover].toFixed(1)} GHz</text></g>}
    <rect x={L} y={T} width={W - L - R} height={H - T - Bt} fill="transparent" onPointerMove={point} onPointerDown={point} onPointerLeave={() => setHover(null)} />
  </svg>;
}

/** The run's error, design after design: every design a dot, the best so far a line, this design lit (log scale);
 * the pointer picks a design. */
function ObjectivePanel({ at, pick }: { at: number; pick: (i: number) => void }) {
  const W = 420, H = 230, L = 40, R = 14, T = 14, Bt = 30, errors = run.map(r => r.error);
  const lo = Math.floor(Math.log10(Math.min(...errors))), hi = Math.ceil(Math.log10(Math.max(...errors))), decades = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (hi - i));
  const sx = (i: number) => L + i / (run.length - 1) * (W - L - R), sy = (e: number) => T + (hi - Math.log10(e)) / (hi - lo) * (H - T - Bt);
  let best = Infinity;
  const line = errors.slice(0, at + 1).map((e, i) => { best = Math.min(best, e); return `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(best).toFixed(1)}`; }).join('');
  const choose = (event: PointerEvent<SVGRectElement>) => { const box = event.currentTarget.getBoundingClientRect(); pick(Math.round((event.clientX - box.left) / box.width * (run.length - 1))); };
  return <svg viewBox={`0 0 ${W} ${H}`} className="codesign-svg">
    {decades.map(v => <g key={v}><line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke={V.grid} strokeWidth={.6} /><text x={L - 6} y={sy(v) + 4} textAnchor="end" className="codesign-tick">{v}</text></g>)}
    {[1, 100, 200, run.length].map(n => <text key={n} x={sx(n - 1)} y={H - 10} textAnchor="middle" className="codesign-tick">{n}</text>)}
    {errors.map((e, i) => <circle key={i} cx={sx(i)} cy={sy(e)} r={1.6} fill={i <= at ? V.s21 : V.grid} opacity={i <= at ? .6 : .6} />)}
    <path d={line} fill="none" stroke={V.s21} strokeWidth={2} />
    <line x1={sx(at)} x2={sx(at)} y1={T} y2={H - Bt} stroke={V.muted} strokeOpacity={.5} />
    <circle cx={sx(at)} cy={sy(errors[at])} r={5} fill={V.screen} stroke={V.s31} strokeWidth={2.5} />
    <text x={W - R} y={T + 12} textAnchor="end" className="codesign-value">best {best.toPrecision(2)}</text>
    <rect x={L} y={T} width={W - L - R} height={H - T - Bt} fill="transparent" style={{ cursor: 'crosshair' }} onPointerMove={choose} onPointerDown={choose} />
  </svg>;
}

/** The validated layout and its DRC and LVS record. */
function LayoutPanel() {
  const { drc_violations, lvs_status } = validation.record, layout = flow.layout as unknown as StagedLayout & { die: number[] }, die = layout.die, files = flow.layout.files as Record<string, string>;
  return <div className="codesign-layout">
    <div className="codesign-die" style={{ aspectRatio: `${die[2] - die[0]} / ${die[3] - die[1]}` }}><LayoutStages layout={layout} src={key => files[key] ? assetUrl(`/${files[key]}`) : null} frame={0} staged={false} /></div>
    <ul><li><Icon name="check" />DRC <strong>{drc_violations} errors</strong></li><li><Icon name="check" />LVS <strong>{lvs_status === 'LVS_CORRECT' ? 'correct' : lvs_status}</strong></li></ul>
  </div>;
}

/** How GENESIS designs a circuit, step by step, each step with what it draws: the specification's goals, the
 * transistor widths on the circuit's schematic, the passive candidates, the simulated response, the objective falling
 * over the run and the validated layout. The run plays design after design while the board is on screen and every card
 * follows it; the reader can pause it, scrub it or point at a design. Readers who ask for less motion see the best design at rest. */
export function CoDesign({ content }: { content: CoDesignContent }) {
  const box = useRef<HTMLElement>(null), [live, setLive] = useState(false), [at, setAt] = useState(bestAt), [tick, setTick] = useState(-1);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches), [stamp, setStamp] = useState(0), [focus, setFocus] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const view = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { threshold: .05 });
    view.observe(el);
    return () => view.disconnect();
  }, []);
  useEffect(() => {
    if (!live || !playing) return;
    // The first play starts at design 1; a play after a pause goes on from the design on screen.
    let n = started.current ? at : 0;
    if (!started.current) { started.current = true; setAt(0); }
    setTick(t => Math.max(0, t));
    const timer = window.setInterval(() => { n += 1; setAt(Math.min(run.length - 1, n % (run.length + 20))); if (n % 28 === 0) setTick(t => t + 1); }, 110);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, playing]);
  const pick = (i: number) => { setPlaying(false); setAt(Math.max(0, Math.min(run.length - 1, i))); setStamp(s => s + 1); };
  // Play runs the board even before the observer has seen it on screen: the reader asked for it.
  const toggle = () => { if (!playing && at >= run.length - 1) setAt(0); if (!playing) setLive(true); setPlaying(p => !p); setStamp(s => s + 1); started.current = true; };
  const lit = tick < 0 || !playing ? null : content.steps[tick % content.steps.length].id;
  const hot = (step: Step) => (step === 'passives' && (focus === 'passives' || /^L\d/.test(focus ?? ''))) || (step === 'sizing' && /^[ML]\d/.test(focus ?? ''))
    || ((step === 'spec' || step === 'simulate') && CURVES.some(c => c[4] === focus));
  const panels: Record<Step, ReactNode> = { spec: <SpecPanel at={at} focus={focus} setFocus={setFocus} labels={content.spec} />, sizing: <SizingPanel at={at} lit={lit} focus={focus} setFocus={setFocus} />,
    passives: <PassivesPanel at={at} stamp={stamp} board={content} />, simulate: <SimulatePanel at={at} labels={{ first: content.first, design: content.design }} focus={focus} setFocus={setFocus} />,
    objective: <ObjectivePanel at={at} pick={pick} />, layout: <LayoutPanel /> };
  return <figure ref={box} className={`codesign${lit ? ' is-live' : ''}`} aria-label={content.label}>
    <figcaption className="codesign-head">
      <span className="codesign-circuit">{content.circuit.label}<strong>{content.circuit.name}</strong><em>{content.circuit.note}</em></span>
      <span className="codesign-run">
        <button type="button" className="codesign-play" aria-pressed={playing} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} />{playing ? content.pause : content.play}</button>
        <span>{content.design} <strong>{at + 1}</strong> / {run.length}</span><span>error <strong>{run[at].error.toPrecision(2)}</strong></span>
        <label className="codesign-scrub"><span className="sr-only">{content.scrub}</span><input type="range" aria-label={content.scrub} min={1} max={run.length} value={at + 1} onChange={event => pick(+event.target.value - 1)} /></label>
        <span className="codesign-repeat"><Icon name="loop" />{content.repeat}</span>
      </span>
    </figcaption>
    <ol className="codesign-steps">{content.steps.map((step, i) => <li key={step.id} id={step.id === 'passives' ? 'non-intuitive' : undefined} data-step={step.id}
      className={[lit === step.id && 'is-lit', hot(step.id) && 'is-focus'].filter(Boolean).join(' ')}
      onPointerEnter={step.id === 'passives' ? () => setFocus('passives') : undefined} onPointerLeave={step.id === 'passives' ? () => setFocus(null) : undefined}>
      <h3><span>{String(i + 1).padStart(2, '0')}</span>{step.title}</h3>
      <p>{step.detail}</p>
      <div className="codesign-screen">{panels[step.id]}</div>
    </li>)}</ol>
  </figure>;
}
