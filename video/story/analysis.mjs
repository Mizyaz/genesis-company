// Reads the chip's analysis and optimization records for the 2D story film:
//   node story/analysis.mjs --sparams <fig.json> --pixels <run> --halfturn <run> --halfturn-table <table> --turns <run> --out <folder>
// Writes <out>/sparams.json: the ON, ISO and S11 panels of the S-parameter figure (each with its PEX and EM curves), and
// <out>/optimize.json: three optimizer runs, each evaluation with its goal error and FET sizes, and
//   pixels:   every coil's pixel grid (a pixel is metal above 0.5, as the drawing thresholds it; random start),
//   halfturn: each coil's inner diameter D and width W, and the drawn outline of every table cell the run picked,
//   turns:    each 1.5-turn coil's inner diameter, width, spacing and turns (µm).
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : resolve(argv[i + 1]); };
const sha = text => createHash('sha256').update(text).digest('hex');
const rows = async path => { const out = []; for await (const line of createInterface({ input: createReadStream(path) })) if (line.trim()) out.push(JSON.parse(line)); return out; };

const figPath = arg('sparams'), fig = readFileSync(figPath);
const panels = JSON.parse(fig).panels.filter(p => /^(ON|ISO|S11)\b/.test(p.title)).map(p => ({
  title: p.title, series: p.series.map(s => ({ label: s.label, x: s.x, y: s.y.map(v => +v.toFixed(3)) })),
}));
writeFileSync(`${arg('out')}/sparams.json`, JSON.stringify({ title: JSON.parse(fig).title, panels, source: { figure: figPath, sha256: sha(fig) } }));

const COIL = [1, 2, 3], FET = ['w', 'l', 'nf'].flatMap(p => [1, 2, 3, 4].map(m => `${p}_M${m}`));
const algorithm = run => JSON.parse(readFileSync(`${run}/resolved_config.json`)).optimization.algorithm;
const evaluations = async (run, coils) => (await rows(`${run}/evaluations.jsonl`)).map(r => ({
  iteration: r.iteration, error: r.goals.error, fet: Object.fromEntries(FET.map(k => [k, r.parameters[k]])), ...coils(r.parameters),
}));

// Coil grids are the passive record's (rows x columns); the run's pixel parameters fill them row by row.
const pixelRun = arg('pixels'), grids = {};
for (const coil of COIL.map(l => `L${l}`)) {
  const [first] = readFileSync(`${pixelRun}/passive/${coil}/evaluations.jsonl`, 'utf8').split('\n', 1).map(JSON.parse);
  grids[coil] = { rows: first.grid[0].length, columns: first.grid[0][0].length };
}
const pixels = await evaluations(pixelRun, p => ({ grids: Object.fromEntries(Object.entries(grids).map(([coil, g]) => [coil,
  Array.from({ length: g.rows * g.columns }, (_, i) => p[`${coil}.px${String(i).padStart(3, '0')}`] > .5 ? 1 : 0).join('')])) }));

// The half-turn run picks each coil from the table's cells by D and W; the outline is the cell's conductor polygons.
const halfRun = arg('halfturn'), table = arg('halfturn-table');
const half = await evaluations(halfRun, p => Object.fromEntries(COIL.flatMap(l => [[`D_L${l}`, +p[`D_L${l}`]], [`W_L${l}`, +p[`W_L${l}`]]])));
const outlines = {};
for (const r of half) for (const l of COIL) {
  const key = `D${r[`D_L${l}`]}_W${r[`W_L${l}`]}`;
  outlines[key] ??= JSON.parse(readFileSync(`${table}/cells/halfturn_QA_${key}/geometry.json`)).shapes.filter(s => s.kind === 'conductor').map(s => s.points.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]));
}

const turnRun = arg('turns'), µm = v => +(v * 1e6).toFixed(3);
const turns = await evaluations(turnRun, p => Object.fromEntries(COIL.flatMap(l => [
  [`din_L${l}`, µm(p[`din_L${l}`])], [`width_L${l}`, µm(p[`width_L${l}`])], [`spc_L${l}`, µm(p[`spc_L${l}`])], [`n_L${l}`, +p[`n_L${l}`]]])));

writeFileSync(`${arg('out')}/optimize.json`, JSON.stringify({
  pixels: { run: pixelRun, algorithm: algorithm(pixelRun), coils: grids, evaluations: pixels },
  halfturn: { run: halfRun, table, algorithm: algorithm(halfRun), outlines, evaluations: half },
  turns: { run: turnRun, algorithm: algorithm(turnRun), evaluations: turns },
}));
console.log(`${panels.length} S-parameter panels; ${pixels.length} pixel, ${half.length} half-turn (${Object.keys(outlines).length} cells) and ${turns.length} 1.5-turn evaluations -> ${arg('out')}`);
