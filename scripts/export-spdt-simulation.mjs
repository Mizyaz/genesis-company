import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { guard } from './leak-guard.mjs';

// The simulation card's record: the S-parameters of the traditional SPDT version (its extracted layout with the
// electromagnetic windows), output 2 switched on, 1-110 GHz: S21 (transmission), S31 (isolation), S11 (input match)
// and S22 (output match), in dB. One file serves both the card (src/content/story/simulation.json) and the public
// record each number on the card links to (public/assets/records/spdt-s-parameters.json).
// Only the frequency axis and the four curves are kept: no record paths, names or hashes.
//   node scripts/export-spdt-simulation.mjs <traditional sp file, output 2 on>

const root = resolve(import.meta.dirname, '..'), [file] = process.argv.slice(2);
if (!file) throw new Error('usage: node scripts/export-spdt-simulation.mjs <traditional sp file, output 2 on>');

const body = readFileSync(file, 'utf8').split('\nVALUE\n')[1];
if (!body) throw new Error('no VALUE section in the S-parameter record');
const freq = [], s = {};
for (const line of body.split('\n')) {
  let m = /^"freq"\s+(\S+)/.exec(line);
  if (m) { freq.push(Number(m[1])); continue; }
  m = /^"(s\d+)"\s+\((\S+)\s+(\S+)\)/.exec(line);
  if (m) (s[m[1].toUpperCase()] ??= []).push(20 * Math.log10(Math.hypot(Number(m[2]), Number(m[3]))));
}
const keep = freq.map((f, i) => i).filter(i => freq[i] >= 1e9 - 1 && freq[i] <= 110e9 + 1);
const round = (v) => Math.round(v * 100) / 100;
const CURVES = ['S21', 'S31', 'S11', 'S22'];
for (const k of CURVES) if (s[k]?.length !== freq.length) throw new Error(`${k} is missing or has the wrong length`);
if (keep.length < 100 || keep.length > 125) throw new Error(`${keep.length} points`);

const out = {
  what: 'S-parameters of the single-pole double-throw switch with traditional passive devices: its extracted layout with electromagnetic simulation, output 2 switched on',
  unit: 'dB', ghz: keep.map(i => Math.round(freq[i] / 1e7) / 100),
  ...Object.fromEntries(CURVES.map(k => [k, keep.map(i => round(s[k][i]))])),
};
const text = JSON.stringify(out);
guard(text, 'exported S-parameters', ['[0-9a-f]{32}']);
const record = resolve(root, 'public/assets/records/spdt-s-parameters.json');
mkdirSync(dirname(record), { recursive: true });
for (const path of [resolve(root, 'src/content/story/simulation.json'), record]) writeFileSync(path, text + '\n');
const stat = (y) => `${(y.reduce((p, v) => p + v, 0) / y.length).toFixed(2)} / ${y[y.length - 1].toFixed(2)}`;
for (const k of CURVES) console.log(k, 'band mean / 110 GHz', stat(out[k]));
console.log(`simulation.json ${text.length} bytes, ${out.ghz.length} points`);
