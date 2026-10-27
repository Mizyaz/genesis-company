// The optimization objective of a recorded run for the story film's specification scene:
//   node story/objective.mjs --run <optimizer run folder> --out <inputs folder> --curves port2_on/S21_dB,port2_on/S11_dB,...
// Reads the run's goals (resolved_config.json, optimization.goals) and every evaluation (evaluations.jsonl), measures
// each goal from the stored curves as the goal evaluator does (band mean or the point value; P1dB as is), and rebuilds
// each evaluation's error: per sample log1p(violation^2), violation = (value - target) / scale past the target, mean over
// the band times the weight, summed over the goals. A rebuilt error that misses the recorded one stops the script.
// Writes <out>/objective.json: the goals, the frequency axis (GHz), and per evaluation its iteration, recorded error, goal
// values, goal terms and the named curves (state/output, dB to 0.01), which the film draws its goals and designs on.
import fs from 'node:fs';
import path from 'node:path';

const arg = name => { const i = process.argv.indexOf(`--${name}`); if (i < 0) throw new Error(`--${name} is required`); return process.argv[i + 1]; };
const run = arg('run'), out = arg('out'), named = arg('curves').split(',');
const goals = JSON.parse(fs.readFileSync(path.join(run, 'resolved_config.json'), 'utf8')).optimization.goals;

const samplesOf = (goal, curve) => {
  const c = goal.config;
  if (goal.kind === 'p1db') return curve.values;
  if (c.aggregation === 'point') return [curve.values[curve.axis.indexOf(c.at)]];
  return curve.values.filter((_, i) => curve.axis[i] >= c.band[0] && curve.axis[i] <= c.band[1]);
};
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const termOf = (goal, samples) => {
  const c = goal.config;
  return c.weight * mean(samples.map(v => { const d = (v - c.target) / c.scale, violation = Math.max(0, c.sense === 'at_least' ? -d : d); return Math.log1p(violation * violation); }));
};

const evaluations = [];
let axis = null;
for (const line of fs.readFileSync(path.join(run, 'evaluations.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line), curves = Object.values(e.measurements);
  const terms = [];
  const values = goals.map(g => {
    const curve = curves.find(m => m.state === g.source.state && m.output === g.source.output);
    if (!curve) throw new Error(`evaluation ${e.iteration} has no ${g.source.state} ${g.source.output}`);
    const samples = samplesOf(g, curve);
    terms.push(termOf(g, samples));
    return mean(samples);
  });
  const error = terms.reduce((x, y) => x + y, 0);
  if (Math.abs(error - e.goals.error) > 1e-9) throw new Error(`evaluation ${e.iteration}: rebuilt error ${error} against recorded ${e.goals.error}`);
  const drawn = Object.fromEntries(named.map(name => { const [state, output] = name.split('/'), curve = curves.find(m => m.state === state && m.output === output);
    if (!curve) throw new Error(`evaluation ${e.iteration} has no ${name}`);
    axis ??= curve.axis.map(f => f / 1e9);
    return [name, curve.values.map(v => Math.round(v * 100) / 100)]; }));
  evaluations.push({ iteration: e.iteration, error: e.goals.error, values, terms, curves: drawn });
}
evaluations.sort((a, b) => a.iteration - b.iteration);
fs.writeFileSync(path.join(out, 'objective.json'), JSON.stringify({
  goals: goals.map(g => ({ name: g.name, state: g.source.state, output: g.source.output, unit: g.config.unit, sense: g.config.sense, target: g.config.target, scale: g.config.scale,
    weight: g.config.weight, band: g.kind === 'p1db' ? null : g.config.aggregation === 'point' ? [g.config.at, g.config.at] : g.config.band })),
  axis, evaluations, source: { run },
}));
console.log(`${evaluations.length} evaluations, ${goals.length} goals, every error rebuilt -> ${out}/objective.json`);
