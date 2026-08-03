// FounderGate — Repo / Evidence workflow. LOCAL / SYNTHETIC only: inspects an allowlisted local folder
// (a generated app, a self-owned demo, or a local allowlisted path). NO network, NO private repos, NO
// customer data. A private-repo / remote / non-allowlisted request is HELD.
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

// Allowlist: only local synthetic / self-owned areas.
const ALLOW = [/tests\/generated_apps\//, /publish_candidates\/self_owned_demo_repo/, /provider_runs\//, /\/demo\//];
const DENY = [/^https?:\/\//, /git@/, /github\.com/, /private/i, /customer|production|prod-data/i, /\.\.(\/|$)/];

export function checkRepo(folderPathRel, opts = {}) {
  const path = String(folderPathRel || '');
  // refuse remote / private / non-allowlisted up front
  if (DENY.some((re) => re.test(path)) || !ALLOW.some((re) => re.test(path))) {
    return { classification: 'HELD_UNSUPPORTED_OR_PRIVATE', path, reason: 'not on the local self-owned allowlist (no private repos, no remote, no customer data)', network_used: false, safe_next_action: 'Provide a local self-owned folder, or request a founder gate for private/remote sources.' };
  }
  const REPO = opts.repoRoot;
  const abs = REPO ? join(REPO, path) : path;
  if (!existsSync(abs)) return { classification: 'HOLD_MISSING_FOLDER', path, reason: 'folder not found locally', network_used: false, safe_next_action: 'Check the path.' };

  const files = readdirSync(abs);
  const hasPkg = files.includes('package.json');
  const hasCore = files.includes('core.mjs');
  const hasIndex = files.includes('index.html');
  const testsDir = join(abs, 'tests');
  const testFiles = existsSync(testsDir) ? readdirSync(testsDir).filter((f) => /selftest|\.test\.|\.spec\./.test(f)) : [];
  const jsFiles = files.filter((f) => /\.(mjs|js)$/.test(f));
  let project_type = 'unknown';
  if (hasPkg) { try { project_type = JSON.parse(readFileSync(join(abs, 'package.json'), 'utf8')).type === 'module' ? 'node-esm' : 'node'; } catch { project_type = 'node'; } }
  else if (hasIndex && hasCore) project_type = 'static-esm-app';
  else if (jsFiles.length) project_type = 'js';

  const risk_flags = [];
  if (testFiles.length === 0) risk_flags.push('NO_TESTS_FOUND');
  if (!hasIndex && !hasCore && !hasPkg) risk_flags.push('NO_RECOGNIZED_ENTRYPOINT');

  return {
    classification: testFiles.length ? 'LOCAL_REPO_OK_WITH_LIMITS' : 'LOCAL_REPO_NO_TESTS',
    path, project_type,
    available_tests: testFiles, missing_tests: testFiles.length ? [] : ['app-specific tests'],
    file_count: files.length, risk_flags,
    network_used: false, private_repo_accessed: false, customer_data_accessed: false,
    safe_next_action: testFiles.length ? 'Run its local tests read-only (no install).' : 'Add app-specific tests before claiming PASS.',
    evidence: { entrypoints: [hasIndex && 'index.html', hasCore && 'core.mjs', hasPkg && 'package.json'].filter(Boolean) },
    limits: 'Local self-owned synthetic only. Not production, not a private-repo scan, no network.',
  };
}
