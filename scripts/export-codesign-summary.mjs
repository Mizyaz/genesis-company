// The numbers the co-design diagram (src/shared/CoDesignDiagram.tsx) shows, taken from the story's records so the page
// does not load them whole: the run's size and best design, its transistors' widths and goal values, the passive
// candidates, the testbenches and the layout's DRC and LVS result. Writes src/content/story/codesign.json.
//   node scripts/export-codesign-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guard } from './leak-guard.mjs';

const root = resolve(import.meta.dirname, '..'), read = name => JSON.parse(readFileSync(resolve(root, 'src/content/story', name), 'utf8'));
const optimization = read('optimization.json'), analysis = read('analysis.json'), validation = read('validation.json'), pixels = read('pixels.json');
const { run, objective: { goals, evaluations } } = optimization;
const best = run.reduce((b, r, i) => r.error < run[b].error ? i : b, 0), values = evaluations.find(e => e.iteration === best)?.values;
if (!values) throw new Error(`no goal values for the best design (${best})`);
const ghz = hz => +(hz / 1e9).toPrecision(3);
const words = name => name.replace(/^on\d_/, '').replace(/_center$/, '').split('_').map((w, i) => i ? w : w[0].toUpperCase() + w.slice(1)).join(' ').replace(/^P1dB$/, 'P1dB');
// One row per goal and band; the two port states merged into the worse value.
const rows = new Map();
goals.forEach((g, i) => {
  const band = !g.band ? '' : g.band[0] === g.band[1] ? `${ghz(g.band[0])} GHz` : `${ghz(g.band[0])}–${ghz(g.band[1])} GHz`, key = `${words(g.name)}|${band}`;
  const row = rows.get(key) ?? { goal: words(g.name), band, target: `${g.sense === 'at_least' ? '≥' : '≤'} ${g.target} ${g.unit}`, value: g.sense === 'at_least' ? Infinity : -Infinity, unit: g.unit };
  row.value = g.sense === 'at_least' ? Math.min(row.value, values[i]) : Math.max(row.value, values[i]);
  rows.set(key, row);
});
const out = {
  designs: run.length, best: best + 1, error: run[best].error,
  fets: Object.fromEntries(Object.entries(run[best].fet).map(([k, w]) => [k.replace(/^w_/, ''), +w.toFixed(1)])),
  goals: [...rows.values()],
  passives: { candidates: optimization.frames.length, shapes: new Set(optimization.frames.map(f => f.family)).size, pixel_um: pixels.pixel_um },
  testbenches: analysis.testbenches.map(t => ({ modes: t.modes, states: t.states.length })),
  layout: { drc_violations: validation.record.drc_violations, lvs: validation.record.lvs_status === 'LVS_CORRECT' },
};
const text = JSON.stringify(out);
guard(text, 'co-design summary');
writeFileSync(resolve(root, 'src/content/story/codesign.json'), text + '\n');
console.log(`codesign.json ${text.length} bytes`);
