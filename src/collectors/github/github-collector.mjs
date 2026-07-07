#!/usr/bin/env node
// FounderGate — READ-ONLY GitHub CI / Copilot state collector.
//
// WHAT IT IS
//   A read-only collector that, for the open PRs of a repo, reports:
//     number, title, branch, head SHA, files changed, CI check-runs,
//     Copilot reviews (and whether each is bound to the current head SHA),
//     unresolved review threads, and mergeability.
//
// HOW IT TALKS TO GITHUB
//   It shells the EXISTING, already-authenticated local `gh` CLI session via
//   read-only verbs only (`gh pr list`, `gh api <GET>`, `gh api graphql`
//   queries). It introduces NO new credential, NO new GitHub app, NO OAuth,
//   NO token file, and it performs NO write to GitHub. Every argv is checked
//   against a write-verb denylist (`assertReadOnly`) and rejected fail-closed
//   before exec, so even a future edit cannot smuggle a mutation through.
//
// TRUTH LABELLING
//   Output carries `source`: "live-gh" when produced from a live read-only
//   `gh` session, or "fixture" when produced from a committed sample bundle.
//   Live and fixture data are never conflated.
//
// REDACTION
//   Nothing emitted may carry a secret. All output passes through
//   `deepRedact` and a fail-closed `assertNoSecret` gate (see ./redact.mjs).
//
// OFFLINE TEST
//   `normalizeBundle(rawBundle)` is a pure function over an already-fetched
//   raw JSON bundle; the committed fixture + selftest exercise it with zero
//   network, so CI never depends on live GitHub.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deepRedact, assertNoSecret } from './redact.mjs';

// ── Read-only guard ────────────────────────────────────────────────────────
// The ONLY gh subcommands this collector may invoke. Anything else — and any
// HTTP-method override that could mutate — is refused before spawn.
const ALLOWED_GH_SUBCOMMANDS = new Set(['api', 'pr']);
const ALLOWED_PR_SUBCOMMANDS = new Set(['list', 'view']);
const WRITE_METHOD_RE = /^(POST|PUT|PATCH|DELETE)$/i;
const MUTATING_PR_VERBS = new Set([
  'merge', 'close', 'edit', 'comment', 'review', 'ready', 'reopen',
  'lock', 'unlock', 'create', 'checkout',
]);

/**
 * Throw fail-closed if a gh argv is anything other than a read-only call.
 * Exported so tests can prove the guard bites.
 * @param {string[]} args
 */
export function assertReadOnly(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('GH_GUARD: empty gh argv refused');
  }
  const sub = args[0];
  if (!ALLOWED_GH_SUBCOMMANDS.has(sub)) {
    throw new Error(`GH_GUARD: gh subcommand "${sub}" is not on the read-only allowlist`);
  }
  // Reject any explicit write HTTP method (`-X POST` / `--method PATCH` / ...).
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-X' || a === '--method') {
      const m = args[i + 1] || '';
      if (WRITE_METHOD_RE.test(m)) {
        throw new Error(`GH_GUARD: write HTTP method "${m}" refused (read-only collector)`);
      }
    }
    const inline = /^(?:-X|--method=)(\w+)$/.exec(a);
    if (inline && WRITE_METHOD_RE.test(inline[1])) {
      throw new Error(`GH_GUARD: write HTTP method "${inline[1]}" refused (read-only collector)`);
    }
    // A GraphQL body that contains a mutation is refused.
    if (/\bmutation\b/i.test(a) && /\{/.test(a)) {
      throw new Error('GH_GUARD: GraphQL mutation refused (read-only collector)');
    }
    // Field/flag writes (`-f a=b` on a POST) are already caught by the method
    // guard above; a bare `gh api <path>` defaults to GET, which is safe.
  }
  if (sub === 'pr') {
    const prSub = args[1];
    if (MUTATING_PR_VERBS.has(prSub)) {
      throw new Error(`GH_GUARD: "gh pr ${prSub}" is a mutating verb — refused`);
    }
    if (!ALLOWED_PR_SUBCOMMANDS.has(prSub)) {
      throw new Error(`GH_GUARD: "gh pr ${prSub}" is not on the read-only allowlist`);
    }
  }
  return true;
}

/**
 * Default read-only exec: shell the local `gh` and return parsed stdout.
 * Injectable so the selftest stays hermetic (no live gh).
 * @param {string[]} args
 * @returns {string} raw stdout
 */
function defaultGhExec(args) {
  assertReadOnly(args);
  const res = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) {
    const err = (res.stderr || '').slice(0, 400);
    throw new Error(`H5_GH_EXEC: gh ${args[0]} failed (status ${res.status}): ${err}`);
  }
  return res.stdout;
}

function ghJson(exec, args) {
  const out = exec(args);
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

// ── CI check-run rollup ─────────────────────────────────────────────────────
function rollupChecks(checkRuns) {
  const runs = Array.isArray(checkRuns) ? checkRuns : [];
  let passed = 0, failed = 0, pending = 0;
  const normalized = runs.map((r) => {
    const status = r.status || 'unknown';
    const conclusion = r.conclusion || null;
    if (status !== 'completed') pending++;
    else if (conclusion === 'success') passed++;
    else if (['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].includes(conclusion)) failed++;
    else if (conclusion === 'neutral' || conclusion === 'skipped') passed++; // non-blocking
    else pending++;
    return { name: r.name || '(unnamed)', status, conclusion };
  });
  let state = 'none';
  if (normalized.length > 0) {
    if (failed > 0) state = 'failing';
    else if (pending > 0) state = 'pending';
    else state = 'passing';
  }
  return { checkRuns: normalized, ci: { total: normalized.length, passed, failed, pending, state } };
}

function normalizeReviews(reviews, headSha) {
  const list = Array.isArray(reviews) ? reviews : [];
  const copilot = list
    .filter((r) => {
      const login = (r.user && r.user.login) || '';
      return /copilot/i.test(login);
    })
    .map((r) => {
      const commitId = r.commit_id || null;
      return {
        reviewer: (r.user && r.user.login) || null,
        state: r.state || null,
        commitId,
        boundToHead: !!headSha && commitId === headSha,
        submittedAt: r.submitted_at || null,
      };
    });
  const copilotBoundToHead = copilot.some((r) => r.boundToHead);
  const copilotReviewed = copilot.length > 0;
  return { copilotReviews: copilot, copilotReviewed, copilotBoundToHead };
}

function normalizeThreads(reviewThreads) {
  // Accepts the GraphQL reviewThreads.nodes[] shape (or null when not fetched).
  if (!reviewThreads || !Array.isArray(reviewThreads.nodes)) {
    return { unresolvedReviewThreads: null, unresolvedByCopilot: null };
  }
  let unresolved = 0, unresolvedCopilot = 0;
  for (const t of reviewThreads.nodes) {
    if (t.isResolved === false) {
      unresolved++;
      const firstAuthor =
        t.comments && Array.isArray(t.comments.nodes) && t.comments.nodes[0] &&
        t.comments.nodes[0].author ? t.comments.nodes[0].author.login : '';
      if (/copilot/i.test(firstAuthor || '')) unresolvedCopilot++;
    }
  }
  return { unresolvedReviewThreads: unresolved, unresolvedByCopilot: unresolvedCopilot };
}

function normalizeFiles(files) {
  const list = Array.isArray(files) ? files : [];
  const filesChanged = list.map((f) => ({
    filename: f.filename,
    status: f.status || null,
    additions: typeof f.additions === 'number' ? f.additions : null,
    deletions: typeof f.deletions === 'number' ? f.deletions : null,
  }));
  return { filesChanged, filesChangedCount: filesChanged.length };
}

/**
 * Pure normalizer: raw bundle → normalized, redacted, truth-labelled JSON.
 * This is the function the offline fixture test exercises.
 *
 * rawBundle shape (produced by collectRawLive OR read from a fixture):
 *   {
 *     source: "live-gh" | "fixture",
 *     repo: "owner/name",
 *     prList: [ { number, headRefName, headRefOid, mergeable, isDraft, title } ],
 *     perPr: {
 *       "<number>": {
 *         checkRuns: { check_runs: [...] } | [...],
 *         reviews:   [...],
 *         files:     [...],
 *         reviewThreads: { nodes: [...] } | null,
 *         prView:    { mergeable, mergeStateStatus } | null
 *       }
 *     }
 *   }
 * @param {object} rawBundle
 * @returns {object} normalized bundle
 */
export function normalizeBundle(rawBundle) {
  const bundle = rawBundle || {};
  const source = bundle.source === 'live-gh' ? 'live-gh' : 'fixture';
  const perPr = bundle.perPr || {};
  const prs = Array.isArray(bundle.prList) ? bundle.prList : [];

  const pullRequests = prs.map((pr) => {
    const headSha = pr.headRefOid || pr.headSha || null;
    const raw = perPr[String(pr.number)] || {};
    const checkRunsRaw = raw.checkRuns && raw.checkRuns.check_runs
      ? raw.checkRuns.check_runs
      : raw.checkRuns;
    const prView = raw.prView || {};

    return {
      number: pr.number,
      title: pr.title || null,
      branch: pr.headRefName || null,
      headSha,
      isDraft: !!pr.isDraft,
      mergeable: prView.mergeable || pr.mergeable || 'UNKNOWN',
      mergeStateStatus: prView.mergeStateStatus || null,
      ...normalizeFiles(raw.files),
      ...rollupChecks(checkRunsRaw),
      ...normalizeReviews(raw.reviews, headSha),
      ...normalizeThreads(raw.reviewThreads),
    };
  });

  const out = {
    collector: 'foundergate-github-ci-copilot',
    version: 1,
    source,
    readOnly: true,
    collectedAt: bundle.collectedAt || new Date().toISOString(),
    repo: bundle.repo || null,
    openPrCount: pullRequests.length,
    pullRequests,
  };

  // Fail-closed redaction: mask every string leaf, then assert nothing
  // secret-shaped survived before we return anything to a caller.
  const redacted = deepRedact(out);
  assertNoSecret(redacted);
  return redacted;
}

// ── Live read-only collection (shells the existing gh session) ──────────────
/**
 * Collect a raw bundle from the live, already-authenticated local `gh`.
 * Read-only verbs only; every argv passes assertReadOnly before spawn.
 * @param {object} opts
 * @param {string} opts.repo  "owner/name"
 * @param {(args:string[])=>string} [opts.exec] injectable exec (defaults to gh)
 * @param {number} [opts.limit]
 * @returns {object} raw bundle (source: "live-gh")
 */
export function collectRawLive({ repo, exec = defaultGhExec, limit = 20 } = {}) {
  if (!repo) throw new Error('H5: repo ("owner/name") is required');
  const [owner, name] = repo.split('/');

  const prList = ghJson(exec, [
    'pr', 'list', '-R', repo, '--state', 'open', '--limit', String(limit),
    '--json', 'number,headRefName,headRefOid,mergeable,isDraft,title',
  ]) || [];

  const perPr = {};
  for (const pr of prList) {
    const n = pr.number;
    const sha = pr.headRefOid;
    const entry = {};
    entry.checkRuns = sha
      ? ghJson(exec, ['api', `repos/${repo}/commits/${sha}/check-runs`, '--jq', '{check_runs: [.check_runs[] | {name, status, conclusion, head_sha}]}'])
      : { check_runs: [] };
    entry.reviews = ghJson(exec, ['api', `repos/${repo}/pulls/${n}/reviews`, '--jq', '[.[] | {user: {login: .user.login}, state, commit_id, submitted_at}]']) || [];
    entry.files = ghJson(exec, ['api', `repos/${repo}/pulls/${n}/files`, '--jq', '[.[] | {filename, status, additions, deletions}]']) || [];
    entry.reviewThreads = ghJson(exec, [
      'api', 'graphql',
      '-f', 'query=query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved isOutdated comments(first:1){nodes{author{login}}}}}}}}',
      '-F', `o=${owner}`, '-F', `r=${name}`, '-F', `n=${n}`,
    ]);
    // Unwrap graphql envelope to the reviewThreads node the normalizer expects.
    if (entry.reviewThreads && entry.reviewThreads.data) {
      try {
        entry.reviewThreads = entry.reviewThreads.data.repository.pullRequest.reviewThreads;
      } catch { entry.reviewThreads = null; }
    }
    entry.prView = ghJson(exec, ['pr', 'view', String(n), '-R', repo, '--json', 'mergeable,mergeStateStatus']) || null;
    perPr[String(n)] = entry;
  }

  return {
    source: 'live-gh',
    repo,
    collectedAt: new Date().toISOString(),
    prList,
    perPr,
  };
}

/** Convenience: live collect + normalize in one call. */
export function collectLive(opts) {
  return normalizeBundle(collectRawLive(opts));
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main(argv) {
  const args = argv.slice(2);
  const opts = { repo: null, fixture: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo') opts.repo = args[++i];
    else if (args[i] === '--fixture') opts.fixture = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      process.stdout.write(
        'foundergate-github-collector — READ-ONLY PR/CI/Copilot state collector\n' +
        'Usage:\n' +
        '  node github-collector.mjs --repo owner/name        # live read-only gh\n' +
        '  node github-collector.mjs --fixture path/to.json   # offline (no network)\n');
      return 0;
    }
  }
  let normalized;
  if (opts.fixture) {
    const raw = JSON.parse(readFileSync(opts.fixture, 'utf8'));
    normalized = normalizeBundle(raw);
  } else if (opts.repo) {
    normalized = collectLive({ repo: opts.repo });
  } else {
    process.stderr.write('H5: pass --repo owner/name (live read-only) or --fixture path (offline)\n');
    return 2;
  }
  process.stdout.write(JSON.stringify(normalized, null, 2) + '\n');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv));
}
