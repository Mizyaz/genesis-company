// Draws a 3D viewer scene (scene.json from the GENESIS layout viewer) top-down into PNG layers for the 2D story film:
//   node story/layout_layers.mjs --scene <scene.json> --out <folder> [--ppu 5]
// Writes <out>/layout/{stage,block,layer}_*.png and <out>/layout.json (die, blocks, members, stages, layer colours, provenance).
// Only metal layers are drawn; vias and markers stay out. Every rectangle is a polygon box from the scene, placed by its
// batch transform (x' = a x + b y + tx, y' = c x + d y + ty, as the viewer composes them).
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const scenePath = resolve(arg('scene')), out = resolve(arg('out')), ppu = Number(arg('ppu', '5'));
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const raw = readFileSync(scenePath), scene = JSON.parse(raw);
const decode = (text, Type) => { const b = Buffer.from(text, 'base64'); return new Type(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };

const metals = Object.entries(scene.layers).filter(([, l]) => l.kind === 'metal').sort((a, b) => a[1].z_um - b[1].z_um).map(([name]) => name);
const top = scene.blocks.find(b => b.name === '$top').box, die = [top[0][0], top[0][1], top[1][0], top[1][1]];
const objects = new Map(scene.objects.map(o => [o.id, o]));
// Each group collects [x0, y0, x1, y1, layer index] rows; a box lands in its stage, its layer and (essentials) its block.
const groups = new Map(), add = (key, row) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(...row); };
for (const batch of scene.batches) {
  const geometry = scene.geometries[batch.geometry], layer = metals.indexOf(geometry.layer);
  if (layer < 0) continue;
  const boxes = decode(geometry.polygon_boxes, Float64Array), t = decode(batch.transforms, Float32Array);
  const stage = objects.get(batch.object)?.stage ?? { essentials: 'essentials', rf_lines: 'interconnect', ground_tiles: 'gnd_tiling', fill: 'density' }[batch.source] ?? 'other';
  const block = scene.blocks[batch.block]?.name;
  for (let i = 0; i < t.length; i += 6) for (let j = 0; j < boxes.length; j += 4) {
    const xs = [], ys = [];
    for (const [x, y] of [[boxes[j], boxes[j + 1]], [boxes[j + 2], boxes[j + 3]]]) { xs.push(t[i] * x + t[i + 1] * y + t[i + 4]); ys.push(t[i + 2] * x + t[i + 3] * y + t[i + 5]); }
    const row = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), layer];
    add(`stage_${stage}`, row); add(`layer_${geometry.layer}`, row);
    if (stage === 'essentials' && block && !block.startsWith('$')) add(`block_${block}`, row);
  }
}

mkdirSync(`${out}/layout`, { recursive: true });
const width = Math.round((die[2] - die[0]) * ppu), height = Math.round((die[3] - die[1]) * ppu);
const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage();
const colours = metals.map(name => scene.layers[name].color), files = {};
for (const [key, rows] of groups) {
  // Rows go in z order so upper metals cover lower ones, as seen from above.
  const sorted = [];
  for (const layer of metals.keys()) for (let i = 0; i < rows.length; i += 5) if (rows[i + 4] === layer) sorted.push(rows[i], rows[i + 1], rows[i + 2], rows[i + 3], layer);
  const data = Buffer.from(new Float32Array(sorted).buffer).toString('base64');
  const png = await page.evaluate(({ data, width, height, die, ppu, colours }) => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), rows = new Float32Array(bytes.buffer);
    const canvas = Object.assign(document.createElement('canvas'), { width, height }), ctx = canvas.getContext('2d');
    for (let i = 0; i < rows.length; i += 5) {
      ctx.fillStyle = colours[rows[i + 4]];
      const x = (rows[i] - die[0]) * ppu, y = (die[3] - rows[i + 3]) * ppu;
      ctx.fillRect(x, y, Math.max(.6, (rows[i + 2] - rows[i]) * ppu), Math.max(.6, (rows[i + 3] - rows[i + 1]) * ppu));
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { data, width, height, die, ppu, colours });
  writeFileSync(`${out}/layout/${key}.png`, Buffer.from(png, 'base64'));
  files[key] = { file: `layout/${key}.png`, boxes: sorted.length / 5 };
  console.log(`${key}: ${sorted.length / 5} boxes`);
}
await browser.close();

const box = b => [b[0][0], b[0][1], b[1][0], b[1][1]];
writeFileSync(`${out}/layout.json`, JSON.stringify({
  title: scene.title, die, ppu, width, height, files,
  stages: scene.inspection.stages,
  layers: metals.map(name => ({ name, color: scene.layers[name].color, z_um: scene.layers[name].z_um, thickness_um: scene.layers[name].thickness_um })),
  blocks: scene.blocks.filter(b => !b.name.includes('#') && !b.name.startsWith('$')).map(b => ({ name: b.name, box: box(b.box) })),
  members: scene.inspection.members.map(m => ({ block: m.block, member: m.member, cell: m.cell, box: m.box })),
  source: { scene: scenePath, scene_sha256: createHash('sha256').update(raw).digest('hex'), gds: scene.source.gds, gds_sha256: scene.source.sha256 },
}, null, 1));
console.log(`${groups.size} layers, ${width}x${height} px -> ${out}`);
