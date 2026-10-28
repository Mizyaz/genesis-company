// The site's physical-flow animation data from one physical-flow chain: video/story/flow_motion.py extracts the stages'
// geometry (motion.raw.json); this adds the circuit's schematic (the density stage's circuit record, checked against the
// LVS source that stage was verified with), guards the result and writes src/content/story/motion.json.
//   node scripts/export-flow-motion.mjs <motion.raw.json> --chain <chain folder>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveRecord, schematicOf } from './circuit-schematic.mjs';
import { guard } from './leak-guard.mjs';

const root = resolve(import.meta.dirname, '..'), args = process.argv.slice(2), at = args.indexOf('--chain');
const raw = args.find((a, i) => !a.startsWith('--') && i !== at + 1), chain = at >= 0 ? args[at + 1] : undefined;
if (!raw || !chain) throw new Error('usage: node scripts/export-flow-motion.mjs <motion.raw.json> --chain <chain folder>');
const density = resolve(chain, 'density'), lvs = resolve(density, 'verify/lvs');
// The source names each device's own tap of a net <net>__<member>_<n>; the lines and ground tiles join the taps into that net.
const tapsJoined = cdl => cdl.replace(/\b([A-Za-z0-9]\w*?)__\w+/g, '$1');
const run = readdirSync(lvs).filter(name => /^\d{8}T/.test(name)).sort().at(-1);
const { parts, wires, colouring } = schematicOf(resolveRecord(name => JSON.parse(readFileSync(resolve(density, name), 'utf8'))), tapsJoined(readFileSync(resolve(lvs, run, 'source.cdl'), 'utf8')));
// The tiles take the colours the 3D view gives the same metals (validation.json, bottom to top; the ground plane's are the top ones).
const motion = JSON.parse(readFileSync(raw, 'utf8')), layers = JSON.parse(readFileSync(resolve(root, 'src/content/story/validation.json'), 'utf8')).layers;
const out = { ...motion, colours: layers.slice(-motion.metals).map(l => l.color), schematic: { id: 'flow', title: '', parts, wires, colouring } };
const text = JSON.stringify(out);
guard(text, 'exported flow motion', ['spdt', 'final']);
writeFileSync(resolve(root, 'src/content/story/motion.json'), text + '\n');
console.log(`motion.json ${text.length} bytes`);
