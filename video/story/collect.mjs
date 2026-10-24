// Gathers what the 2D story film shows into <out>/story.json, each fact from its record:
//   node story/collect.mjs --footage <footage folder> --circuit <circuit.json of the chip> --verify <verify/record.json> --out <folder>
// The conversation and the four schematics come from recorded takes (clips/<id>.evidence.json, <id>.circuit.json); the
// testbenches from the chip's circuit config; the signoff from its verify record. Run story/layout_layers.mjs first.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); if (i < 0) throw new Error(`--${name} is required`); return resolve(argv[i + 1]); };
const footage = arg('footage'), out = arg('out');
const read = path => { const text = readFileSync(path); return { data: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex'), path }; };
const sources = [];
const load = path => { const file = read(path); sources.push({ path, sha256: file.sha256 }); return file.data; };

const circuits = JSON.parse(readFileSync(new URL('../record/circuits.json', import.meta.url))).circuits;
const schematics = circuits.map(({ id, title }) => {
  const { drawing } = load(`${footage}/clips/${id}.circuit.json`);
  return { id, title, parts: drawing.parts.map(({ id, kind, label, name, x, y, rotation, terminals }) => ({ id, kind, label: label ?? name, x, y, rotation: rotation ?? 0, terminals })),
    wires: drawing.wires.map(({ from, to, net }) => ({ from, to, net })), colouring: drawing.colouring ?? {} };
});
const evidence = load(`${footage}/clips/${circuits[0].id}.evidence.json`);
const prompt = circuits[0].prompt;
// Answer i is what the recorder sent after reply i: a clicked card or a typed text; the last reply is the proposal.
if (!evidence.answers) throw new Error(`${circuits[0].id} was recorded before takes kept their answers; record it again`);
const conversation = evidence.replies.map((reply, i) => ({ message: reply.message, choices: reply.choices ?? [], answer: evidence.answers[i] ?? null }));

const chip = load(arg('circuit')), verify = load(arg('verify')), layout = load(`${out}/layout.json`);
if (verify.geometry.sha256 !== layout.source.gds_sha256) throw new Error('The verify record is for another GDS than the drawn layout');
const testbenches = Object.entries(chip.testbenches).map(([name, tb]) => ({
  name, cell: tb.cell, modes: tb.modes.map(m => typeof m === 'string' ? m : m.mode), ports: Object.keys(tb.drives).length,
  states: Object.keys(chip.maestros?.[name]?.states ?? {}),
}));
const outputs = Object.values(chip.outputs ?? {}).flat().map(o => o.name);

writeFileSync(`${out}/story.json`, JSON.stringify({
  prompt, conversation, schematics, testbenches, outputs,
  signoff: { status: verify.status, drc: verify.drc_verified, lvs: verify.lvs_verified, gds_sha256: verify.geometry.sha256, record: arg('verify') },
  sources,
}, null, 1));
console.log(`story.json: ${schematics.length} schematics, ${conversation.length} replies, ${testbenches.length} testbenches, signoff ${verify.status}`);
