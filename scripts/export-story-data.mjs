// The site's story animation data from the film's inputs (video/story/collect.mjs writes them from the records): the
// schematic the film draws, the layout's blocks, members, coil shapes and ground tiles, the block links, and the drawn
// stage and block pictures.
// The flow's schematic is the circuit record of the layout it shows (scripts/circuit-schematic.mjs), read at a git ref
// of the GENESIS checkout or, without --genesis, from a record folder on disk (a delivered chip's), and checked against
// that layout's LVS source netlist.
// Only what the drawing needs is kept: no record paths, hashes, cell or chip names; each member's cell becomes its kind.
//   node scripts/export-story-data.mjs <story inputs folder> [--genesis <GENESIS checkout> [--ref <git ref>]]
//     --circuit <record folder, in GENESIS with --genesis> --lvs <LVS source.cdl of the layout>
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { resolveRecord, schematicOf } from './circuit-schematic.mjs';

const root = resolve(import.meta.dirname, '..'), args = process.argv.slice(2), flag = name => { const at = args.indexOf(`--${name}`); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const genesis = flag('genesis'), ref = flag('ref') ?? 'HEAD', circuit = flag('circuit'), lvsSource = flag('lvs'), [inputs] = args;
if (!inputs || !circuit || !lvsSource) throw new Error('usage: node scripts/export-story-data.mjs <story inputs folder> [--genesis <GENESIS checkout> [--ref <git ref>]] --circuit <record folder> --lvs <source.cdl>');
const kindSource = ts.transpileModule(readFileSync(resolve(root, 'src/shared/story/kind.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { kindOf } = await import(`data:text/javascript,${encodeURIComponent(kindSource)}`);
const json = name => JSON.parse(readFileSync(resolve(inputs, name), 'utf8'));
const story = json('story.json'), sparams = json('sparams.json'), objective = json('objective.json'), layout = json('layout.json'), links = json('blocks.json'), tiles = json('gnd_tiles.json').tiles;

const record = resolveRecord(name => JSON.parse(genesis ? execFileSync('git', ['-C', genesis, 'show', `${ref}:${circuit}/${name}`], { encoding: 'utf8' }) : readFileSync(resolve(circuit, name), 'utf8')));
const { parts, wires, colouring } = schematicOf(record, readFileSync(lvsSource, 'utf8'));
const pictures = Object.keys(layout.files).filter(key => /^(stage|block)_/.test(key));
// The layer names and the ground-tile masters spell out one foundry's stack (NDA): layers go by position, bottom to top
// (metal_01, metal_02, ...), and a tile keeps only the layer that colours it, its master's top metal (tile_metal_13).
const layerName = Object.fromEntries(layout.layers.map(({ name }, i) => [name, `metal_${String(i + 1).padStart(2, '0')}`]));
const generic = name => layerName[name] ?? (() => { throw new Error(`No layer ${name} in layout.json`); })();
const tileOf = master => { const name = master.replace(/_\d+x\d+$/, ''), top = layout.layers.find(l => name.endsWith(l.name));
  return top ? `tile_${generic(top.name)}` : 'tile'; };
const genericLayers = layers => Object.fromEntries(Object.entries(layers).map(([name, polygons]) => [generic(name), polygons]));
const out = {
  schematic: { id: 'flow', title: '', parts, wires, colouring },
  layout: { die: layout.die, stages: layout.stages, blocks: layout.blocks, members: layout.members.map(m => ({ ...m, cell: kindOf(m.cell) })),
    shapes: Object.fromEntries(Object.entries(layout.shapes ?? {}).map(([member, { layers, bbox }]) => [member, { layers: genericLayers(layers), bbox }])),
    layers: layout.layers.map(({ name, color }) => ({ name: generic(name), color })), tiles: tiles.map(({ box, master }) => ({ box, master: tileOf(master) })),
    files: Object.fromEntries(pictures.map(key => [key, `assets/story/${key}.png`])) },
  links: { rf: links.rf.map(({ line, blocks, nets }) => ({ line, blocks, nets })), dc: links.dc.map(({ net, blocks }) => ({ net, blocks })), pins: links.pins },
};
const text = JSON.stringify(out);
const leak = /\/DATA|\/home|\/linux|isguven|sha256|spdt|final/i.exec(text);
if (leak) throw new Error(`exported data holds "${leak[0]}"`);
mkdirSync(resolve(root, 'src/content/story'), { recursive: true });
writeFileSync(resolve(root, 'src/content/story/flow.json'), text + '\n');
mkdirSync(resolve(root, 'public/assets/story'), { recursive: true });
for (const key of pictures) copyFileSync(resolve(inputs, layout.files[key].file), resolve(root, `public/assets/story/${key}.png`));

// The validation, 3D and any-circuit scenes: the checks' status and error count, the layer pictures bottom to top, and
// the four recorded circuits' schematics (ids renamed: they are cell names).
const drawnLayers = layout.layers.filter(l => layout.files[`layer_${l.name}`]), layerKeys = drawnLayers.map(l => `layer_${generic(l.name)}`);
const { drc, lvs, drc_violations, lvs_status } = story.signoff;
const validation = { record: { drc, lvs, drc_violations, lvs_status },
  layers: drawnLayers.map(({ name, color }) => ({ name: generic(name), color })),
  files: Object.fromEntries(layerKeys.map(key => [key, `assets/story/${key}.png`])),
  drawings: story.schematics.map(({ title, parts, wires, colouring }, i) => ({ id: `circuit_${i}`, title, parts, wires, colouring })) };
const vtext = JSON.stringify(validation), vleak = /\/DATA|\/home|\/linux|isguven|sha256|spdt|final/i.exec(vtext);
if (vleak) throw new Error(`exported validation data holds "${vleak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/validation.json'), vtext + '\n');
drawnLayers.forEach((l, i) => copyFileSync(resolve(inputs, layout.files[`layer_${l.name}`].file), resolve(root, `public/assets/story/${layerKeys[i]}.png`)));
console.log(`validation.json ${vtext.length} bytes, ${layerKeys.length} layer pictures`);
// The conversation the Ask scene draws (SPDT is the switch type the user asks for, not a chip name): the prompt, each reply with its choice cards and the answer taken.
// The foundries are under NDA: a technology name in a reply is dropped ("the documented <name> series–shunt topology"
// reads "the documented series–shunt topology"), and the export refuses any that remains.
const FOUNDRY = /\b(?:GF\s?-?\s?\d+\s?nm|GF\s?-?\s?\d*\s?(?:FDX|CBIC)\w*|\d+\s?FDX\w*|GlobalFoundries|TSMC|STMicro\w*|STM\s?FD-?SOI|IHP|Infineon|Samsung)\b(?:-PLUS)?/gi;
const unnamed = text => text.replace(new RegExp(`\\s*${FOUNDRY.source}`, 'gi'), '');
// The scenes show the record: a reply's ", including …" clause that names a part the record has none of is cut to the
// sentence's end ("the documented starting topology, including its input shunt capacitor." reads "… starting topology."),
// and the reply is marked an excerpt.
const drawn = new Set(parts.map(p => p.kind));
const PART = /\b(capacitor|inductor|resistor|transistor)s?\b/i;
const recorded = text => text.replace(/, including [^.]*(?=\.)/g, clause => { const kind = PART.exec(clause)?.[1].toLowerCase(); return kind && !drawn.has(kind === 'transistor' ? 'nmos' : kind) ? '' : clause; });
const ask = { prompt: unnamed(story.prompt), conversation: story.conversation.map(({ message, choices, answer }) => ({ message: recorded(unnamed(message)), ...(recorded(unnamed(message)) !== unnamed(message) ? { excerpt: true } : {}), choices: choices.map(unnamed), answer: answer ? { ...(answer.card ? { card: answer.card } : {}), ...(answer.text ? { text: answer.text } : {}) } : null })) };
const askText = JSON.stringify(ask), askLeak = /\/DATA|\/home|\/linux|isguven|sha256|final/i.exec(askText) ?? new RegExp(FOUNDRY.source, 'i').exec(askText);
if (askLeak) throw new Error(`exported conversation holds "${askLeak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/ask.json'), askText + '\n');
console.log(`ask.json ${askText.length} bytes`);
// The testbench and specification scenes: the testbench list, the PEX curves of each S-parameter panel and, of the
// objective, the four goals the plots draw and the first design's three curves. Series are rounded to what a plot shows.
const round = v => Math.round(v * 1000) / 1000;
const PLOT_CURVES = ['port2_on/S21_dB', 'port2_on/S31_dB', 'port2_on/S11_dB'], PLOT_GOALS = ['on2_transmission', 'on2_isolation', 'on2_input_match', 'on2_input_match_center'];
const first = objective.evaluations[0];
const analysis = {
  testbenches: story.testbenches.map(({ name, modes, ports, states }) => ({ name, modes, ports, states })),
  sparams: { title: '', panels: sparams.panels.map(({ title, series }) => ({ title, series: series.filter(s => /PEX/.test(s.label))
    .map(s => ({ label: 'PEX', x: s.x.map(round), y: s.y.map(round) })) })) },
  objective: { goals: objective.goals.filter(g => PLOT_GOALS.includes(g.name)), axis: objective.axis,
    evaluations: [{ iteration: first.iteration, error: first.error, values: [], terms: [], curves: Object.fromEntries(PLOT_CURVES.map(c => [c, first.curves[c].map(round)])) }] },
};
const analysisText = JSON.stringify(analysis);
const analysisLeak = /\/DATA|\/home|\/linux|isguven|sha256|spdt|final/i.exec(analysisText);
if (analysisLeak) throw new Error(`exported analysis data holds "${analysisLeak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/analysis.json'), analysisText + '\n');
console.log(`analysis.json ${analysisText.length} bytes`);
// The optimization scene: the run's error and switch-FET widths per design, every design's goal values (the Pareto
// front's two axes come from them) and first score, the coil candidates' pictures in run order, and the coil search's
// best designs (run names dropped: they are cell names). Numbers are rounded to what the drawing shows.
const optimize = json('optimize.json'), coilFrames = json('coil_frames.json'), coilCandidates = json('coil_candidates.json');
const precise = (v, digits = 4) => Number(v.toPrecision(digits));
const optimization = {
  run: optimize.pixels.evaluations.map(({ error, fet }) => ({ error: precise(error), fet: Object.fromEntries([1, 2, 3, 4].map(m => [`w_M${m}`, precise(fet[`w_M${m}`] * 1e6)])) })),
  objective: { goals: objective.goals.map(({ name, state, output, unit, sense, target, band }) => ({ name, state, output, unit, sense, target, band })), axis: [],
    evaluations: objective.evaluations.map(({ iteration, error, values }) => ({ iteration, error: precise(error), values: values.map(v => precise(v)), terms: [], curves: {} })) },
  frames: coilFrames.frames.map(({ family, px, file }, i) => ({ family, px, file: `assets/story/passive_device_${i}.png` })),
  candidates: coilCandidates.candidates.map(({ bbox, layers }, i) => ({ run: `candidate_${i}`, bbox, layers: genericLayers(layers) })),
};
const optimizationText = JSON.stringify(optimization), optimizationLeak = /\/DATA|\/home|\/linux|isguven|sha256|spdt|final/i.exec(optimizationText);
if (optimizationLeak) throw new Error(`exported optimization data holds "${optimizationLeak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/optimization.json'), optimizationText + '\n');
coilFrames.frames.forEach(({ file }, i) => copyFileSync(resolve(inputs, file), resolve(root, `public/assets/story/passive_device_${i}.png`)));
console.log(`optimization.json ${optimizationText.length} bytes, ${coilFrames.frames.length} passive device pictures`);
// Every design's three simulated curves (0.1 dB), fetched by the site when a reader steps through the run.
const curvesText = JSON.stringify({ axis: objective.axis, names: PLOT_CURVES, designs: objective.evaluations.map(e => PLOT_CURVES.map(c => e.curves[c].map(v => Math.round(v * 10) / 10))) });
const curvesLeak = /\/DATA|\/home|\/linux|isguven|sha256|spdt|final/i.exec(curvesText);
if (curvesLeak) throw new Error(`exported run curves hold "${curvesLeak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/run-curves.json'), curvesText + '\n');
console.log(`run-curves.json ${curvesText.length} bytes`);
console.log(`flow.json ${text.length} bytes, ${pictures.length} pictures`);
