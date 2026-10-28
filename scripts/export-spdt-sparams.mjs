// S-parameters of the two SPDT versions for the portfolio card: insertion loss S21, isolation S31 and input match S11
// (dB, 1-110 GHz) of the final EM-included simulation of each version, with the first output port switched on.
// Only the frequency axis and the three curves are kept: no record paths, names or hashes.
//   node scripts/export-spdt-sparams.mjs <pixelated sp file> <traditional sp file>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guard } from './leak-guard.mjs';

const root = resolve(import.meta.dirname, '..'), [pixelated, traditional] = process.argv.slice(2);
if (!pixelated || !traditional) throw new Error('usage: node scripts/export-spdt-sparams.mjs <pixelated sp file> <traditional sp file>');

/** A simulator sweep result: its frequencies (Hz) and |S| per parameter (dB), 1-110 GHz only. */
function read(path) {
  const body = readFileSync(path, 'utf8').split('\nVALUE\n')[1];
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
  for (const k of ['S11', 'S21', 'S31']) if (s[k]?.length !== freq.length) throw new Error(`${k} is missing or has the wrong length`);
  return { ghz: keep.map(i => Math.round(freq[i] / 1e7) / 100), S21: keep.map(i => round(s.S21[i])), S31: keep.map(i => round(s.S31[i])), S11: keep.map(i => round(s.S11[i])) };
}

const a = read(pixelated), b = read(traditional);
if (a.ghz.length !== b.ghz.length || a.ghz.some((f, i) => f !== b.ghz[i])) throw new Error('the two records differ in frequency axis');
if (a.ghz.length > 125) throw new Error(`${a.ghz.length} points`);
const strip = ({ ghz, ...curves }) => curves;
const out = { ghz: a.ghz, versions: { pixelated: strip(a), traditional: strip(b) } };
const text = JSON.stringify(out);
guard(text, 'exported S-parameters', ['[0-9a-f]{32}']);
writeFileSync(resolve(root, 'src/content/story/spdt.json'), text + '\n');
const stat = (y) => `${(y.reduce((p, v) => p + v, 0) / y.length).toFixed(2)} / ${y[y.length - 1].toFixed(2)}`;
for (const [name, v] of Object.entries(out.versions)) console.log(name, 'S21', stat(v.S21), 'S31', stat(v.S31), 'S11', stat(v.S11));
console.log(`spdt.json ${text.length} bytes, ${out.ghz.length} points`);
