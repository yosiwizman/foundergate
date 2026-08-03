// FounderGate — generated-app validator / failure classifier. Given a factory app folder, it classifies the
// app's trustworthiness. It NEVER returns OK/PASS for a broken, stale, mismatched, or unverified artifact.
// This is the single classifier used by the crash-test harness, the tests, and the Crash Test UI panel.
import { isUnsafeRequest, requestHash } from '../idea_builder/template-registry.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// deterministic content hash over the app's source files (FNV-1a), for post-checker mutation detection.
export function contentHash(dir) {
  let acc = '';
  for (const rel of ['core.mjs', 'index.html']) { const p = join(dir, rel); if (existsSync(p)) acc += rel + ':' + readFileSync(p, 'utf8'); }
  return requestHash(acc);
}

function runTest(dir) {
  const testsDir = join(dir, 'tests');
  if (!existsSync(testsDir)) return { ran: false, ok: false, result: 'NO_TEST_FILE' };
  const tf = readdirSync(testsDir).find((f) => f.endsWith('.selftest.mjs'));
  if (!tf) return { ran: false, ok: false, result: 'NO_TEST_FILE' };
  try {
    const out = execFileSync('node', [join(testsDir, tf)], { timeout: 20000, encoding: 'utf8', env: { PATH: process.env.PATH } });
    const m = out.match(/ALL GREEN:\s*(\d+)\/(\d+)/);
    return m ? { ran: true, ok: true, result: `PASS ${m[1]}/${m[2]}` } : { ran: true, ok: false, result: 'RAN_NO_GREEN' };
  } catch (e) { return { ran: true, ok: false, result: 'FAIL' }; }
}

// classifyApp(dir, opts) → { classification, preview_allowed, test_result, reason }
// opts: { currentRunId, requireRunId=true, serverBase (string|null): if set, verifies preview reachability }
export async function classifyApp(dir, opts = {}) {
  const { currentRunId = null, requireRunId = true, serverBase = null } = opts;
  const hold = (classification, reason) => ({ classification, preview_allowed: false, test_result: 'N/A', reason });

  const manPath = join(dir, 'manifest.json');
  if (!existsSync(manPath)) return hold('HOLD_MISSING_MANIFEST', 'manifest.json not found');
  let m;
  try { m = JSON.parse(readFileSync(manPath, 'utf8')); }
  catch { return hold('HOLD_CORRUPTED_MANIFEST', 'manifest.json is not valid JSON'); }

  // stale evidence: a manifest must belong to the CURRENT run to be shown as current proof
  if (requireRunId && currentRunId && m.run_id !== currentRunId) return hold('HOLD_STALE_EVIDENCE', `manifest run_id ${m.run_id || '(none)'} != current ${currentRunId}`);

  // unsafe / protected-gate request must not yield a preview (real-world intent only, not "no template")
  if (m.request_text) { const u = isUnsafeRequest(m.request_text); if (u.unsafe) return hold('HOLD_UNSUPPORTED_OR_UNSAFE', `unsafe intent: ${u.label} (${u.kind})`); }

  // request hash integrity
  if (!m.request_text || m.request_id !== 'req_' + requestHash(m.request_text)) return hold('HOLD_REQUEST_HASH_MISMATCH', 'request_id does not match hash(request_text)');

  // preview binding: preview_url must point to THIS app's own folder (its generated_app_path basename)
  const ownFolder = String(m.generated_app_path || '').split('/').filter(Boolean).pop();
  if (!m.preview_url || !ownFolder || !m.preview_url.includes(ownFolder + '/index.html')) return hold('HOLD_PREVIEW_MISMATCH', 'preview_url not bound to this app folder');

  // artifact presence + partial generation
  const hasIndex = existsSync(join(dir, 'index.html'));
  const hasCore = existsSync(join(dir, 'core.mjs'));
  if (!hasIndex && !hasCore) return hold('HOLD_MISSING_ARTIFACT', 'no index.html and no core.mjs');
  if (!hasIndex || !hasCore) return hold('HOLD_PARTIAL_GENERATION', `missing ${!hasIndex ? 'index.html' : 'core.mjs'}`);

  // post-checker mutation: if the manifest recorded a checker content hash, the files must still match it
  if (m.checker_content_hash && m.checker_content_hash !== contentHash(dir)) return hold('HOLD_POST_CHECKER_MUTATION', 'app files changed after checker recorded content hash');

  // app-specific test must pass
  const t = runTest(dir);
  if (!t.ok) return { classification: 'HOLD_TEST_FAILURE', preview_allowed: false, test_result: t.result, reason: 'app test did not pass' };

  // server reachability (preview cannot open if server unreachable)
  if (serverBase != null) {
    let reachable = false;
    try { const r = await fetch(new URL(m.preview_url.replace(/^\.\.\/\.\.\//, '/'), serverBase).href, { method: 'GET' }); reachable = r.ok; } catch { reachable = false; }
    if (!reachable) return { classification: 'HOLD_SERVER_UNAVAILABLE', preview_allowed: false, test_result: t.result, reason: 'preview server unreachable' };
  }

  return { classification: 'OK', preview_allowed: true, test_result: t.result, reason: 'all checks passed' };
}
