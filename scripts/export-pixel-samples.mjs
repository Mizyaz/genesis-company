// Pixelated passives for the site, drawn from one of our EM datasets of random pixel grids: a seeded pick of designs
// with their grid and their simulated S-parameters (dB). Only the grids, the frequency axis and the curves are kept:
// no record paths or hashes.
//   node scripts/export-pixel-samples.mjs <dataset folder> [count] [min fill] [max fill]
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const root = resolve(import.meta.dirname, '..'), [folder, count = '24', lo = '.3', hi = '.6'] = process.argv.slice(2);
if (!folder) throw new Error('usage: node scripts/export-pixel-samples.mjs <dataset folder> [count] [min fill] [max fill]');
const config = JSON.parse(readFileSync(resolve(folder, 'dataset_config.json'), 'utf8')).sim_cfg;

/** A .npy file's array: its shape and its values (uint8, or complex64 as [re, im] pairs). */
function npy(path) {
  const b = readFileSync(path), length = b.readUInt16LE(8), header = b.toString('latin1', 10, 10 + length);
  const shape = /'shape': \(([^)]*)\)/.exec(header)[1].split(',').filter(s => s.trim()).map(Number), data = b.subarray(10 + length);
  return { shape, data: /c8/.test(header) ? new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length)) : Uint8Array.from(data) };
}

// A seeded draw over the first designs of the manifest, kept when the grid's fill is in range.
let seed = 7;
const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const lines = createInterface({ input: createReadStream(resolve(folder, 'manifest.jsonl')) }), picked = [];
for await (const line of lines) {
  if (picked.length >= Number(count)) break;
  if (random() > .02) continue;
  const { grid_path, sparams_path } = JSON.parse(line), file = (path) => resolve(folder, path.split('/').slice(-2).join('/'));
  const grid = npy(file(grid_path)), [, rows, columns] = grid.shape, fill = grid.data.reduce((a, v) => a + v, 0) / grid.data.length;
  if (fill < Number(lo) || fill > Number(hi)) continue;
  const s = npy(file(sparams_path)), [points, ports] = s.shape;
  const dB = (i, j) => Array.from({ length: points }, (_, f) => { const k = ((f * ports + i) * ports + j) * 2; return Math.round(20 * Math.log10(Math.hypot(s.data[k], s.data[k + 1])) * 100) / 100; });
  picked.push({ grid: Array.from({ length: rows }, (_, r) => Array.from(grid.data.subarray(r * columns, (r + 1) * columns)).join('')), S21: dB(1, 0), S31: dB(2, 0), S11: dB(0, 0) });
}
const steps = Math.round((config.freq_stop - config.freq_start) / config.freq_step) + 1;
const out = { structure: config.structure, ports: config.n_ports, pixel_um: config.pixel_size_um, ghz: Array.from({ length: steps }, (_, i) => (config.freq_start + i * config.freq_step) / 1e9), designs: picked };
const text = JSON.stringify(out), leak = /\/DATA|\/home|\/linux|isguven|sha256|[0-9a-f]{32}/i.exec(text);
if (leak) throw new Error(`exported pixels hold "${leak[0]}"`);
writeFileSync(resolve(root, 'src/content/story/pixels.json'), text + '\n');
console.log(`pixels.json ${text.length} bytes, ${picked.length} designs`);
