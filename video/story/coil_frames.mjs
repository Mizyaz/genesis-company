// Copies the coil candidates GC drew for the film (drawings only, no EM, no score) into <out>/coil_frames/ and lists
// them in <out>/coil_frames.json in the manifest's film order (spirals by turns, then the pixel grids):
//   node story/coil_frames.mjs --manifest <coil frames manifest.json> --out <folder>
// The manifest draws every candidate at one scale ({ px_per_um, frames: [{ id, family, png_clean, extent_um, ... }] }),
// so each frame's size in microns is kept and the film can show the coils growing and shrinking. Only GC's clean
// pictures (no text) are used. Each frame keeps the pixels where its leads leave it (ports_px), when the manifest has them.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); if (i < 0) throw new Error(`--${name} is required`); return resolve(argv[i + 1]); };
const manifestPath = arg('manifest'), out = arg('out');
const text = readFileSync(manifestPath), manifest = JSON.parse(text);
if (!manifest.px_per_um || !Array.isArray(manifest.frames)) throw new Error('The manifest must draw every frame at one scale: { px_per_um, frames }');
const FAMILIES = ['spiral', 'square', 'hexagon', 'triangle'];
mkdirSync(`${out}/coil_frames`, { recursive: true });
const frames = manifest.frames.map(e => {
  if (!FAMILIES.includes(e.family)) throw new Error(`Unknown family ${e.family}`);
  if (!e.png_clean || !e.extent_um) throw new Error(`${e.id} has no png_clean or extent_um`);
  if (Math.abs(e.px_per_um - manifest.px_per_um) > 1e-5) throw new Error(`${e.id} is drawn at another scale`);
  const file = `coil_frames/${e.id}.png`;
  copyFileSync(e.png_clean, `${out}/${file}`);
  const png = readFileSync(e.png_clean), px = [png.readUInt32BE(16), png.readUInt32BE(20)];  // the IHDR size: shown at its native size times one film scale
  if (e.ports_px && [e.ports_px.in, e.ports_px.out].some(([x, y]) => x < 0 || y < 0 || x > px[0] || y > px[1])) throw new Error(`${e.id} has a port outside its picture`);
  return { id: e.id, family: e.family, layers: e.metal_layers_drawn, extent_um: e.extent_um, px, ...(e.ports_px && { ports_px: e.ports_px }), file, png: e.png_clean, png_sha256: createHash('sha256').update(png).digest('hex') };
});
writeFileSync(`${out}/coil_frames.json`, JSON.stringify({ px_per_um: manifest.px_per_um, source: { manifest: manifestPath, sha256: createHash('sha256').update(text).digest('hex') }, frames }, null, 1));
console.log(`${frames.length} frames -> ${out}/coil_frames.json`);
