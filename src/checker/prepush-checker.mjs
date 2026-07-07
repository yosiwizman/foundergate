#!/usr/bin/env node
// FounderGate — Independent Pre-Push CHECKER (read-only; SCAFFOLD ONLY).
//
// CHECKER SCAFFOLD ONLY — final checker claims require independent Checker +
// Advisor verification; a checker cannot self-certify; this checker never
// edits code.
//
// What this module IS:
//   A pure, read-only reviewer. Given a read-only SNAPSHOT of a CLEAN worktree
//   (branch, head SHA, clean/dirty status, diff baseline, changed files, and
//   any findings a caller supplies), it produces a checker-report.schema.json
//   report describing what it observed — WITHOUT editing, committing, pushing,
//   or merging anything.
//
// What this module is NOT:
//   - It is NOT an authorization. A CLEAN verdict does not permit a push/merge;
//     it only records that the independent checker did not object.
//   - It does NOT self-certify. Its own no-edit attestation is a CLAIM about
//     its behavior that an independent Advisor/Checker must still verify.
//   - It cannot approve its own restriction. Loosening the checker's read-only
//     mandate requires independent authority, never the checker itself.
//
// Read-only guarantee (mechanically checkable):
//   This module imports NO filesystem-write API and issues NO repo-mutating
//   command. The only git it may run (in the default probe) are read-only
//   subcommands: status / rev-parse / diff. prepush-checker.selftest.mjs scans
//   this source for any write/commit/push token and fails if one appears.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateReport } from './validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_SCHEMA = JSON.parse(
  readFileSync(join(HERE, 'checker-report.schema.json'), 'utf8'),
);

// The verbatim doctrine every report emitted by this checker is bound by.
export const DOCTRINE =
  'CHECKER SCAFFOLD ONLY — final checker claims require independent Checker + Advisor verification; a checker cannot self-certify; this checker never edits code.';

export const SCHEMA_VERSION = '1.0.0';

// Decide the single review verdict from a read-only snapshot.
//   BLOCKED  -> the checker could not review (snapshot.blocked / no baseline).
//   ABSTAIN  -> the checker declines (out of competence / conflict of interest).
//   DIRTY_WORKTREE -> the worktree was not clean, so a pre-push review cannot
//                     be certified (what would be pushed != what was reviewed).
//   FINDINGS -> at least one finding was recorded.
//   CLEAN    -> clean worktree, zero findings; the checker does not object.
export function deriveVerdict(snapshot) {
  if (snapshot.blocked) return 'BLOCKED';
  if (snapshot.abstain) return 'ABSTAIN';
  if (!snapshot.baseline || !snapshot.baseline.sha) return 'BLOCKED';
  if (snapshot.worktreeClean !== true) return 'DIRTY_WORKTREE';
  const findings = Array.isArray(snapshot.findings) ? snapshot.findings : [];
  if (findings.length >= 1) return 'FINDINGS';
  return 'CLEAN';
}

// Build a report object from a read-only snapshot. Pure: returns a new object,
// mutates nothing, writes nothing. Throws if the produced report does not
// satisfy checker-report.schema.json (a checker must never emit a malformed
// report).
export function buildReport(snapshot, { checkerId } = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('buildReport: snapshot object is required');
  }
  const verdict = deriveVerdict(snapshot);
  const findings = Array.isArray(snapshot.findings) ? snapshot.findings : [];
  const evidenceRefs =
    Array.isArray(snapshot.evidenceRefs) && snapshot.evidenceRefs.length
      ? snapshot.evidenceRefs
      : [`git rev-parse HEAD => ${snapshot.headSha || 'unknown'} (read-only probe)`];

  const report = {
    schema_version: SCHEMA_VERSION,
    report_kind: 'prepush-checker-report',
    checker_id: checkerId || snapshot.checkerId || 'foundergate-independent-prepush-checker',
    verdict,
    target: {
      branch: snapshot.branch || 'unknown',
      head_sha: snapshot.headSha,
    },
    worktree_clean: snapshot.worktreeClean === true,
    baseline: {
      ref: (snapshot.baseline && snapshot.baseline.ref) || 'unknown',
      sha: snapshot.baseline && snapshot.baseline.sha,
    },
    findings,
    evidence_refs: evidenceRefs,
    // The checker performed ZERO writes/commits/pushes producing this report.
    // These are claims about the checker's OWN behavior; independent
    // verification is still required (a checker cannot self-certify).
    read_only_assertion: {
      self_write_count: 0,
      self_commit_count: 0,
      self_push_count: 0,
    },
    no_edit_attestation: {
      asserted: true,
      method:
        'read-only reviewer: module imports no filesystem-write API and runs only read-only git (status/rev-parse/diff); caller verifies post-run git-status delta equals pre-run',
      files_written_by_checker: 0,
    },
    self_certification: false,
    independent_verification_required: true,
    checker_self_approval: false,
    doctrine: DOCTRINE,
  };
  if (typeof snapshot.reviewerNote === 'string') {
    report.reviewer_note = snapshot.reviewerNote;
  }

  const { valid, errors } = validateReport(report, REPORT_SCHEMA);
  if (!valid) {
    throw new Error(`buildReport: produced an invalid report — ${errors.join('; ')}`);
  }
  return report;
}

// Default READ-ONLY worktree probe. Uses only non-mutating git subcommands.
// Never invoked by the hermetic selftest (which injects a fixture snapshot).
export function defaultGitProbe({ cwd = process.cwd(), baselineRef = 'origin/main' } = {}) {
  const git = (args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const porcelain = git(['status', '--porcelain']);
  const headSha = git(['rev-parse', 'HEAD']);
  let branch = 'DETACHED';
  try {
    branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    /* detached HEAD is fine */
  }
  let baselineSha = null;
  try {
    baselineSha = git(['rev-parse', baselineRef]);
  } catch {
    baselineSha = null;
  }
  let changedFiles = [];
  if (baselineSha) {
    try {
      const out = git(['diff', '--name-only', `${baselineSha}...${headSha}`]);
      changedFiles = out ? out.split('\n').filter(Boolean) : [];
    } catch {
      changedFiles = [];
    }
  }
  return {
    branch,
    headSha: headSha.slice(0, 40).toLowerCase(),
    worktreeClean: porcelain.length === 0,
    baseline: baselineSha
      ? { ref: baselineRef, sha: baselineSha.slice(0, 40).toLowerCase() }
      : null,
    changedFiles,
    findings: [],
    evidenceRefs: [
      `git status --porcelain => ${porcelain.length === 0 ? 'clean' : 'dirty'} (read-only)`,
      `git rev-parse HEAD => ${headSha} (read-only)`,
    ],
  };
}

// Run the checker against a probe (default: read-only git probe). The probe is
// injectable so the selftest can drive fully hermetic fixtures.
export function runPrePushChecker({ probe = defaultGitProbe, checkerId, probeArgs = {} } = {}) {
  const snapshot = typeof probe === 'function' ? probe(probeArgs) : probe;
  return buildReport(snapshot, { checkerId });
}

// CLI: emit a report for the current worktree to stdout (never writes to disk).
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const report = runPrePushChecker({});
  // stdout only — the checker never writes files.
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
