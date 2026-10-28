import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guard } from './leak-guard.mjs';

// The verification card's record: the summary lines of the DRC and LVS reports of the physical-flow chain the cards
// show (its density stage's verify folder, the latest run of each). Kept: the rule checks run and the results of the
// DRC; the overall LVS result, each cell's result and the matched ports, nets and instances. Cell names are written
// as words (a leading "blk_" dropped, "fets" as "transistors", the top cell as "whole layout"); no paths or hashes.
//   node scripts/export-verification.mjs <chain folder>/density/verify

const root = resolve(import.meta.dirname, '..'), [folder] = process.argv.slice(2);
if (!folder) throw new Error('usage: node scripts/export-verification.mjs <chain folder>/density/verify');
const report = (kind) => {
  const runs = readdirSync(resolve(folder, kind)).filter(name => /^\d{8}T/.test(name)).sort();
  if (!runs.length) throw new Error(`no ${kind} run in ${folder}`);
  return readFileSync(resolve(folder, kind, runs.at(-1), 'report.txt'), 'utf8');
};
const one = (text, re, what) => { const m = re.exec(text); if (!m) throw new Error(`no ${what} in the report`); return m; };

const drcText = report('drc');
const drc = {
  rule_checks: Number(one(drcText, /^TOTAL DRC RuleChecks Executed:\s+(\d+)/m, 'rule check count')[1]),
  results: Number(one(drcText, /^TOTAL DRC Results Generated:\s+(\d+)/m, 'result count')[1]),
};

const lvsText = report('lvs');
const overall = one(lvsText, /OVERALL COMPARISON RESULTS[\s\S]*?#\s+(CORRECT|INCORRECT)\s+#/, 'overall result')[1];
const summary = one(lvsText, /CELL\s+SUMMARY[\s\S]*?-+\s+-+\s+-+\n([\s\S]*?)\n\s*\n/, 'cell summary')[1];
const word = (cell, top) => cell === top ? 'whole layout' : cell.replace(/^blk_/, '').replaceAll('_', ' ').replace(/\bfets\b/, 'transistors');
const rows = summary.trim().split('\n').map(line => line.trim().split(/\s+/));
const top = rows.at(-1)[1];
const cells = rows.map(([result, layout]) => ({ cell: word(layout, top), result }));
// The matched objects of the top cell: the last INFORMATION AND WARNINGS table of the report.
const info = lvsText.slice(lvsText.lastIndexOf('INFORMATION AND WARNINGS'));
const matched = Object.fromEntries(['Ports', 'Nets', 'Total Inst'].map(name => {
  const [, layout, source, unLayout, unSource] = one(info, new RegExp(`^\\s+${name}:\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)`, 'm'), name);
  return [name === 'Total Inst' ? 'instances' : name.toLowerCase(), { layout: +layout, source: +source, unmatched: +unLayout + +unSource }];
}));

const out = { drc, lvs: { result: overall, cells, matched } };
const text = JSON.stringify(out);
guard(text, 'exported verification summary', ['[0-9a-f]{12}']);
writeFileSync(resolve(root, 'src/content/story/verification.json'), text + '\n');
console.log(JSON.stringify(out, null, 1));
