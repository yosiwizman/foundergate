// Repeatability CI: run the crash-test ladder N>=3 times, prove determinism
// (no flake), all 12 fixtures behave as expected every run, false-green 0 each.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const N = Math.max(3, Number(process.env.LADDER_N || 3));
const OUT = process.env.CI_OUT || '/private/tmp/claude-501/ci_out';
mkdirSync(OUT, { recursive: true });
const runs = [];
for (let i = 1; i <= N; i++) {
  const jsonPath = join(OUT, `run_${i}.json`);
  let stdout = '', code = 0;
  try {
    stdout = execFileSync('node', ['tests/repeatability/ladder-runner.mjs'],
      { env: { ...process.env, LADDER_JSON: jsonPath, LADDER_TMP: join(OUT, `fx_${i}`) }, encoding: 'utf8' });
  } catch (e) { code = e.status || 1; stdout = (e.stdout || '').toString(); }
  const res = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const verdicts = res.rows.map(r => `${r.fixture}=${r.actual}`).join('|');
  runs.push({ run: i, exit: code, pass: res.pass, fail: res.fail, falseGreen: res.falseGreen, verdicts });
}
// determinism: every run must have identical verdict signature, fail 0, falseGreen 0
const sig0 = runs[0].verdicts;
const flake = runs.filter(r => r.verdicts !== sig0);
const anyFail = runs.filter(r => r.fail !== 0 || r.exit !== 0);
const anyFalseGreen = runs.filter(r => r.falseGreen !== 0);
const summary = {
  N, allIdentical: flake.length === 0, flakeCount: flake.length,
  anyFail: anyFail.length, anyFalseGreen: anyFalseGreen.length,
  perRun: runs.map(r => ({ run: r.run, pass: r.pass, fail: r.fail, falseGreen: r.falseGreen, exit: r.exit })),
  verdictSignature: sig0,
};
writeFileSync(join(OUT, 'ci_summary.json'), JSON.stringify(summary, null, 2));
for (const r of runs) console.log(`run ${r.run}: pass=${r.pass} fail=${r.fail} falseGreen=${r.falseGreen} exit=${r.exit}`);
console.log(`identical across ${N} runs: ${summary.allIdentical} | flake: ${summary.flakeCount} | anyFail: ${summary.anyFail} | anyFalseGreen: ${summary.anyFalseGreen}`);
const ok = summary.allIdentical && summary.anyFail === 0 && summary.anyFalseGreen === 0;
console.log(ok ? `ALL GREEN: ${N}/${N} repeatability runs deterministic, 0 flake, 0 false-green.` : `RED: repeatability instability detected`);
process.exit(ok ? 0 : 1);
