import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { guard } from './leak-guard.mjs';

// The timing record the claims strip and the layout card compute from: the stages of one clean physical-flow chain
// (its flow.json), each with its wall seconds (launch included) and, for the stage that runs them, the seconds of its DRC
// and LVS run; plus the DRC and LVS result of that chain (density/verify). The site computes "layout in N minutes" as
// the stages' seconds minus the verification seconds, and "DRC and LVS in M minutes" as the verification seconds.
// Kept: stage names, seconds, the verdict and the check results; no paths, commits, circuit names or hashes.
//   node scripts/export-chain-timing.mjs <chain folder>

const root = resolve(import.meta.dirname, '..'), [chain] = process.argv.slice(2);
if (!chain) throw new Error('usage: node scripts/export-chain-timing.mjs <chain folder>');
const read = (path) => JSON.parse(readFileSync(resolve(chain, path), 'utf8'));
const flow = read('flow.json'), verify = read('density/verify/record.json');
if (flow.verdict !== 'PASS' || flow.dirty) throw new Error(`the chain is not a clean pass (verdict ${flow.verdict}, dirty ${flow.dirty})`);
if (!(verify.drc_verified && verify.lvs_verified)) throw new Error('the chain is not DRC and LVS clean');
const { drc, lvs } = verify.checks;

const out = {
  what: 'Wall seconds of each stage of one physical-flow chain of the single-pole double-throw switch, launch included, with the seconds of the DRC and LVS run, and its DRC and LVS result',
  verdict: flow.verdict,
  stages: flow.stages.map(s => ({ stage: s.stage, seconds: s.seconds, ...(s.verification_seconds ? { verification_seconds: s.verification_seconds } : {}) })),
  drc: { rule_checks: Number(drc.rule_checks), violations: Number(drc.violation_count) },
  lvs: lvs.status,
};
const text = JSON.stringify(out);
guard(text, 'exported chain timing', ['[0-9a-f]{9,}']);
const record = resolve(root, 'public/assets/records/layout-timing.json');
mkdirSync(dirname(record), { recursive: true });
writeFileSync(record, text + '\n');
const total = out.stages.reduce((a, s) => a + s.seconds, 0), checks = out.stages.reduce((a, s) => a + (s.verification_seconds ?? 0), 0);
console.log(`layout ${(total - checks).toFixed(1)} s, DRC and LVS ${checks.toFixed(1)} s, ${out.drc.violations} of ${out.drc.rule_checks} rule checks, ${out.lvs}`);
