// Adds one clean circuit layout to the 2D story film's "any circuit" scene:
//   node story/circuit_layouts.mjs --id <recorded circuit id, e.g. A_mixer> --layout <folder from story/layout_layers.mjs> --density <density stage folder> --out <story folder>
// Merges into <out>/circuit_layouts.json: the circuit's drawn layout (its layout.json, file paths relative to <out>) and its
// signoff from the density stage's records: DRC (violations, rule checks), LVS status and density markers. Every
// record must be for the drawn GDS.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); if (i < 0) throw new Error(`--${name} is required`); return argv[i + 1]; };
const id = arg('id'), dir = resolve(arg('layout')), density = resolve(arg('density')), out = resolve(arg('out'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const json = path => JSON.parse(readFileSync(path));
const layout = json(`${dir}/layout.json`), gds = layout.source.gds_sha256;
const verify = json(`${density}/verify/record.json`), drc = json(`${density}/verify/drc/record.json`), lvs = json(`${density}/verify/lvs/record.json`), fill = json(`${density}/record.json`);
for (const [name, value] of [['verify', verify.geometry.sha256], ['DRC', drc.sha256], ['LVS', lvs.sha256]]) if (value !== gds) throw new Error(`The ${name} record is for another GDS than the drawn layout`);
if (!drc.complete || !drc.uncapped) throw new Error('The DRC run is capped or incomplete');
const prefix = relative(out, dir);
const entry = {
  id, die: layout.die, width: layout.width, height: layout.height, blocks: layout.blocks,
  files: Object.fromEntries(Object.entries(layout.files).map(([key, f]) => [key, { ...f, file: `${prefix}/${f.file}` }])),
  signoff: { status: verify.status, drc_violations: drc.violation_count, drc_rule_checks: drc.rule_checks, lvs: lvs.status, density_markers: fill.markers, gds_sha256: gds },
  source: { layout: `${dir}/layout.json`, layout_sha256: sha(`${dir}/layout.json`), verify: `${density}/verify/record.json`, drc: `${density}/verify/drc/record.json`, lvs: `${density}/verify/lvs/record.json`, density: `${density}/record.json`, scene: layout.source.scene },
};
const path = `${out}/circuit_layouts.json`, all = existsSync(path) ? json(path) : { circuits: [] };
all.circuits = [...all.circuits.filter(c => c.id !== id), entry];
writeFileSync(path, JSON.stringify(all, null, 1));
console.log(`${id}: ${entry.signoff.status}, DRC ${entry.signoff.drc_violations} of ${entry.signoff.drc_rule_checks} checks, ${entry.signoff.lvs}, ${entry.signoff.density_markers} density markers -> ${path}`);
