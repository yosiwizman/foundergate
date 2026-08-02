// Continuous repeatability CI: runs the ladder N times, appends to a durable trend
// history with per-run timing + verdict signature, proves stability (no flake, no
// false-green). Rerunnable by one command. No network, no external/customer data.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const N = Math.max(3, Number(process.env.LADDER_N || 10));
const OUT = process.env.TREND_OUT || '/private/tmp/claude-501/trend_out';
mkdirSync(OUT, { recursive: true });
const HIST = join(OUT, 'REPEATABILITY_TREND_HISTORY.json');
const history = existsSync(HIST) ? JSON.parse(readFileSync(HIST, 'utf8')) : { runs: [] };

// monotonic timing without Date.now(): use process.hrtime.bigint (allowed; not wall clock)
const t0all = process.hrtime.bigint();
const batch = [];
for (let i = 1; i <= N; i++) {
  const jsonPath = join(OUT, `r_${i}.json`);
  const t0 = process.hrtime.bigint();
  let exit = 0;
  try { execFileSync('node', ['tests/repeatability/ladder-runner.mjs'], { env: { ...process.env, LADDER_JSON: jsonPath, LADDER_TMP: join(OUT, `fx_${i}`) }, stdio: 'ignore' }); }
  catch (e) { exit = e.status || 1; }
  const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
  const res = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const sig = res.rows.map(r => `${r.fixture}=${r.actual}`).join('|');
  batch.push({ seq: history.runs.length + i, ms, exit, pass: res.pass, fail: res.fail, falseGreen: res.falseGreen, sig });
}
const totalMs = Number((process.hrtime.bigint() - t0all) / 1000000n);
history.runs.push(...batch);
const sigs = new Set(history.runs.map(r => r.sig));
const summary = {
  totalRuns: history.runs.length, batchN: N, batchTotalMs: totalMs,
  uniqueSignatures: sigs.size, stable: sigs.size === 1,
  anyFail: history.runs.filter(r => r.fail !== 0 || r.exit !== 0).length,
  anyFalseGreen: history.runs.filter(r => r.falseGreen !== 0).length,
  avgMsPerRun: Math.round(history.runs.reduce((a, r) => a + r.ms, 0) / history.runs.length),
  signature: [...sigs][0],
};
history.summary = summary;
writeFileSync(HIST, JSON.stringify(history, null, 2));
for (const r of batch) console.log(`run ${r.seq}: ${r.ms}ms pass=${r.pass} fail=${r.fail} fg=${r.falseGreen} exit=${r.exit}`);
console.log(`total runs=${summary.totalRuns} uniqueSignatures=${summary.uniqueSignatures} stable=${summary.stable} anyFail=${summary.anyFail} anyFalseGreen=${summary.anyFalseGreen} avg=${summary.avgMsPerRun}ms`);
const ok = summary.stable && summary.anyFail === 0 && summary.anyFalseGreen === 0;
console.log(ok ? `ALL GREEN: ${summary.totalRuns} runs stable, 1 signature, 0 flake, 0 false-green.` : `RED: instability`);
process.exit(ok ? 0 : 1);
