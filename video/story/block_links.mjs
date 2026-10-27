// Reads how the chip's blocks connect, for the 2D story film's block view:
//   node story/block_links.mjs --scene <scene.json> --out <folder>
//   node story/block_links.mjs --essentials <essentials record.json> --interconnect <interconnect record.json> --out <folder>
// Writes <out>/blocks.json: the RF lines of the interconnect record (the two blocks each one lands on and its path) and
// the DC nets that join two or more blocks (from the scene's pins, or the essentials record's member pins), and every member pin on a net (its terminal and box in
// microns), so wires can land on the member they reach. The ground net stays out: it is the ground plane.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1]; };
const out = resolve(arg('out')), sha = text => createHash('sha256').update(text).digest('hex');
const box = polygon => { const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
let inspection, source, recordPath;
if (arg('scene')) {
  const scenePath = resolve(arg('scene')), raw = readFileSync(scenePath);
  inspection = JSON.parse(raw).inspection; recordPath = `${inspection.stage_directories.interconnect}/record.json`;
  source = { scene: scenePath, scene_sha256: sha(raw) };
} else {
  // The essentials record lists every member with its pins (terminal, net, polygon in chip microns).
  const essentialsPath = resolve(arg('essentials')), raw = readFileSync(essentialsPath);
  const pins = JSON.parse(raw).geometry.flatMap(m => m.pins.map(p => ({ block: m.block, member: m.member, terminal: p.terminal, net: p.net, box: box(p.polygon) })));
  inspection = { pins }; recordPath = resolve(arg('interconnect'));
  source = { essentials: essentialsPath, essentials_sha256: sha(raw) };
}
const record = readFileSync(recordPath);

const rf = JSON.parse(record).rf_lines.lines.map(line => ({
  line: line.block, blocks: line.landing_pins.map(pin => pin.block), nets: line.landing_pins.map(pin => pin.net), path_um: line.path_um, length_um: line.length_um,
}));
const byNet = new Map();
for (const pin of inspection.pins) if (pin.net && pin.net !== 'GND') byNet.set(pin.net, new Set([...(byNet.get(pin.net) ?? []), pin.block]));
const dc = [...byNet].filter(([, blocks]) => blocks.size > 1).map(([net, blocks]) => ({ net, blocks: [...blocks] }));

const pins = inspection.pins.filter(pin => pin.net && pin.net !== 'GND').map(({ block, member, terminal, net, box }) => ({ block, member, terminal, net, box }));
writeFileSync(`${out}/blocks.json`, JSON.stringify({ rf, dc, pins, source: { ...source, interconnect: recordPath, interconnect_sha256: sha(record) } }, null, 1));
console.log(`${rf.length} RF lines, ${dc.length} DC nets -> ${out}/blocks.json`);
