#!/usr/bin/env node
// FounderGate — offline, fixture-driven selftest for the READ-ONLY GitHub
// CI/Copilot collector. Zero network: it exercises the pure normalizer over a
// committed sample bundle, proves the redaction rules, and proves the
// read-only gh guard bites on any write verb. CI never touches live GitHub.
//
// NOTE ON SECRET LITERALS: every secret-shaped test input is constructed at
// runtime via string concatenation so this tracked file never contains a
// contiguous secret literal (keeps static secret scanners quiet).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  normalizeBundle,
  assertReadOnly,
  collectRawLive,
} from './github-collector.mjs';
import { redactString, deepRedact, assertNoSecret, REDACTED } from './redact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

// ── 1. Fixture → normalized shape ───────────────────────────────────────────
const raw = JSON.parse(readFileSync(join(HERE, 'fixtures', 'sample-bundle.json'), 'utf8'));
const norm = normalizeBundle(raw);

check('bundle-level truth labels', () => {
  assert.equal(norm.source, 'fixture');
  assert.equal(norm.readOnly, true);
  assert.equal(norm.collector, 'foundergate-github-ci-copilot');
  assert.equal(norm.openPrCount, 3);
  assert.equal(norm.repo, 'owner/example-repo');
});

const byNum = Object.fromEntries(norm.pullRequests.map((p) => [p.number, p]));

check('PR139: head SHA, branch, files, mergeable-from-prView', () => {
  const p = byNum[139];
  assert.equal(p.branch, 'feature/example-lane');
  assert.equal(p.headSha, '7e1e068a372dcb2eb4f28da301c7ee844824bc35');
  assert.equal(p.filesChangedCount, 2);
  assert.equal(p.isDraft, false);
  // prView.mergeable ("CONFLICTING") wins over prList.mergeable ("UNKNOWN").
  assert.equal(p.mergeable, 'CONFLICTING');
  assert.equal(p.mergeStateStatus, 'DIRTY');
});

check('PR139: CI rollup is failing (1 fail, 1 pass, 1 pending)', () => {
  const p = byNum[139];
  assert.equal(p.ci.total, 3);
  assert.equal(p.ci.passed, 1);
  assert.equal(p.ci.failed, 1);
  assert.equal(p.ci.pending, 1);
  assert.equal(p.ci.state, 'failing');
});

check('PR139: Copilot review is bound to head SHA', () => {
  const p = byNum[139];
  assert.equal(p.copilotReviewed, true);
  assert.equal(p.copilotBoundToHead, true);
  assert.equal(p.copilotReviews.length, 1); // only the copilot review, not the human one
  assert.equal(p.copilotReviews[0].boundToHead, true);
});

check('PR139: unresolved review threads counted (3 unresolved, all copilot)', () => {
  const p = byNum[139];
  assert.equal(p.unresolvedReviewThreads, 3);
  assert.equal(p.unresolvedByCopilot, 3);
});

check('PR140: Copilot review present but NOT bound to head (stale commit_id)', () => {
  const p = byNum[140];
  assert.equal(p.copilotReviewed, true);
  assert.equal(p.copilotBoundToHead, false);
  assert.equal(p.ci.state, 'passing');
  assert.equal(p.unresolvedReviewThreads, 0);
  assert.equal(p.mergeable, 'MERGEABLE');
  assert.equal(p.isDraft, true);
});

check('PR141: no reviews; threads not fetched => unresolved is null (unknown, not zero)', () => {
  const p = byNum[141];
  assert.equal(p.copilotReviewed, false);
  assert.equal(p.copilotBoundToHead, false);
  assert.equal(p.unresolvedReviewThreads, null);
  assert.equal(p.unresolvedByCopilot, null);
  assert.equal(p.ci.state, 'pending');
});

// ── 2. Redaction rules ──────────────────────────────────────────────────────
// Build secret-shaped inputs at runtime (never a committed literal).
const FAKE_GH_TOKEN = 'gh' + 'p_' + 'A'.repeat(36);
const FAKE_JWT = 'ey' + 'JhbGciOiJIUzI1NiJ9' + '.' + 'eyJzdWIiOiIxMjM0NQ' + '.' + 'c2lnbmF0dXJlU2ln';
const FAKE_BEARER = 'Authorization: ' + 'Bearer' + ' ' + FAKE_JWT;
const FAKE_KV = 'access' + '_token' + '=' + 'S3cr3tV@lueLong123';
const FAKE_PEM =
  '-----BEGIN' + ' RSA PRIVATE KEY-----\n' + 'MIIExampleBase64Body\n' + '-----END' + ' RSA PRIVATE KEY-----';

check('redactString masks a GitHub token', () => {
  const out = redactString('leaked token ' + FAKE_GH_TOKEN + ' here');
  assert.ok(!out.includes(FAKE_GH_TOKEN), 'token must be gone');
  assert.ok(out.includes(REDACTED));
});

check('redactString masks a Bearer JWT header', () => {
  const out = redactString(FAKE_BEARER);
  assert.ok(!out.includes(FAKE_JWT), 'jwt must be gone');
  assert.ok(out.includes(REDACTED));
});

check('redactString masks a key=value secret but keeps the key', () => {
  const out = redactString('config ' + FAKE_KV);
  assert.ok(!out.includes('S3cr3tV@lueLong123'), 'secret value must be gone');
  assert.ok(/access_token/i.test(out), 'the key name may remain');
  assert.ok(out.includes(REDACTED));
});

check('redactString collapses a PEM private-key block', () => {
  const out = redactString('embedded ' + FAKE_PEM);
  assert.ok(!out.includes('MIIExampleBase64Body'));
  assert.ok(out.includes(REDACTED));
});

check('redactString does NOT redact a benign 40-hex git SHA', () => {
  const sha = '7e1e068a372dcb2eb4f28da301c7ee844824bc35';
  assert.equal(redactString('sha ' + sha), 'sha ' + sha);
});

check('deepRedact walks nested objects/arrays', () => {
  const dirty = { a: [{ note: 'tok ' + FAKE_GH_TOKEN }], n: 5, ok: true };
  const clean = deepRedact(dirty);
  assert.ok(!JSON.stringify(clean).includes(FAKE_GH_TOKEN));
  assert.equal(clean.n, 5);
  assert.equal(clean.ok, true);
});

check('assertNoSecret throws when a secret survives', () => {
  assert.throws(() => assertNoSecret('raw ' + FAKE_GH_TOKEN), /REDACTION_LEAK/);
  assert.doesNotThrow(() => assertNoSecret('clean ' + REDACTED));
});

check('end-to-end: a secret injected into a PR title is redacted by normalizeBundle', () => {
  const dirty = JSON.parse(JSON.stringify(raw));
  dirty.prList[0].title = 'oops leaked ' + FAKE_GH_TOKEN + ' and ' + FAKE_BEARER;
  const n2 = normalizeBundle(dirty);
  const s = JSON.stringify(n2);
  assert.ok(!s.includes(FAKE_GH_TOKEN), 'no gh token in output');
  assert.ok(!s.includes(FAKE_JWT), 'no jwt in output');
  assert.ok(s.includes(REDACTED));
});

// ── 3. Read-only gh guard bites on any write verb ───────────────────────────
check('assertReadOnly ALLOWS read-only verbs', () => {
  assert.doesNotThrow(() => assertReadOnly(['pr', 'list', '-R', 'o/r', '--json', 'number']));
  assert.doesNotThrow(() => assertReadOnly(['pr', 'view', '139', '-R', 'o/r', '--json', 'mergeable']));
  assert.doesNotThrow(() => assertReadOnly(['api', 'repos/o/r/pulls/1/files']));
  assert.doesNotThrow(() => assertReadOnly(['api', 'graphql', '-f', 'query=query($n:Int!){x}']));
});

check('assertReadOnly REFUSES gh pr merge/close/comment', () => {
  assert.throws(() => assertReadOnly(['pr', 'merge', '139']), /GH_GUARD/);
  assert.throws(() => assertReadOnly(['pr', 'close', '139']), /GH_GUARD/);
  assert.throws(() => assertReadOnly(['pr', 'comment', '139', '-b', 'x']), /GH_GUARD/);
});

check('assertReadOnly REFUSES a write HTTP method on gh api', () => {
  assert.throws(() => assertReadOnly(['api', 'repos/o/r/pulls/1/requested_reviewers', '-X', 'POST']), /GH_GUARD/);
  assert.throws(() => assertReadOnly(['api', 'x', '--method', 'PATCH']), /GH_GUARD/);
  assert.throws(() => assertReadOnly(['api', 'x', '-XDELETE']), /GH_GUARD/);
});

check('assertReadOnly REFUSES a GraphQL mutation body', () => {
  assert.throws(() => assertReadOnly(['api', 'graphql', '-f', 'query=mutation{addComment(input:{}){x}}']), /GH_GUARD/);
});

check('assertReadOnly REFUSES an off-allowlist subcommand', () => {
  assert.throws(() => assertReadOnly(['auth', 'token']), /GH_GUARD/);
  assert.throws(() => assertReadOnly(['repo', 'delete', 'o/r']), /GH_GUARD/);
});

check('collectRawLive only ever issues read-only argvs (recording exec)', () => {
  const recorded = [];
  const recExec = (args) => {
    recorded.push(args);
    assertReadOnly(args); // every call must pass the guard
    // Return minimal valid JSON so the collector completes hermetically.
    if (args[0] === 'pr' && args[1] === 'list') {
      return JSON.stringify([{ number: 7, headRefName: 'b', headRefOid: 'c'.repeat(40), mergeable: 'MERGEABLE', isDraft: false, title: 't' }]);
    }
    if (args.includes('check-runs')) return JSON.stringify({ check_runs: [] });
    if (args[0] === 'api' && args[1] === 'graphql') return JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [] } } } } });
    if (args[0] === 'pr' && args[1] === 'view') return JSON.stringify({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' });
    return JSON.stringify([]);
  };
  const bundle = collectRawLive({ repo: 'owner/name', exec: recExec });
  assert.equal(bundle.source, 'live-gh');
  assert.ok(recorded.length >= 5, 'issued several read calls');
  for (const args of recorded) assert.doesNotThrow(() => assertReadOnly(args));
  // Prove the normalizer accepts the live-shaped bundle too.
  const n = normalizeBundle(bundle);
  assert.equal(n.source, 'live-gh');
  assert.equal(n.openPrCount, 1);
});

console.log('');
console.log('COLLECTOR-SELFTEST: PASS (' + passed + ' checks)');
