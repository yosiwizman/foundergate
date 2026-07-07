// FounderGate — PRIVATE proof package: the SOURCE MODEL (generic sample).
//
// This is a single, human-auditable source of a proof package. The generator
// (build-proof-package.mjs) reads THIS model, runs the secret+PII scanner over
// it, and writes the normalized data/proof-package.json.
//
// This dataset is a FICTIONAL sample for a placeholder project (`your-org/
// your-project`). It contains no real merge history, no infrastructure details,
// and no private paths — it exists only to exercise (and prove) the builder's
// labelling, no-overclaim, rollup, scan, and determinism logic in this repo.
//
// EVERY capability/PR/evidence item carries an explicit `label` from LABELS.
//
// NO OVERCLAIM RULE (enforced by the selftest):
//   - `docs/spec` is NEVER counted as runtime capability.
//   - `preview-only` means a preview card / read-only view was produced; it
//     does NOT enact and does NOT send.
//   - `gated` means the code path exists but is fail-closed / OFF pending a
//     founder gate.
//   - `working-runtime` is reserved for tooling that actually RAN and produced
//     a real, checkable effect on THIS machine (a diagnostic and the CI-safety
//     gate). It is NOT claimed for any provider send / live enact.
//   - `planned` is future work with no shipped artifact.

export const LABELS = Object.freeze({
  'working-runtime': 'Ran and produced a real, checkable effect on this machine (diagnostic / gate). Never a provider send.',
  'preview-only': 'Produced a preview card or read-only view. Does NOT enact and does NOT send.',
  'docs/spec': 'Documentation, spec, law, plan, schema, or hermetic test. NEVER counted as runtime capability.',
  'planned': 'Future work. No shipped artifact yet.',
  'gated': 'Code path exists but is fail-closed / OFF pending an explicit founder gate.',
});

// A fictional merged-PR window (#1-#10). `label` reflects the user-facing
// capability each PR delivered — NOT the effort behind it. `mergeCommit` is a
// synthetic 12-hex placeholder. Distribution: docs/spec x6, preview-only x3,
// gated x1 (working-runtime: 0 — honest: no live runtime shipped in this sample).
const MERGED_PRS = [
  { pr: 1, mergedAt: '2026-01-01T09:00:00Z', branch: 'feature/spec-evidence-bus', mergeCommit: 'a1b2c3d4e5f6', label: 'docs/spec', title: 'evidence-bus spec + hermetic test (docs-only)' },
  { pr: 2, mergedAt: '2026-01-01T09:10:00Z', branch: 'feature/spec-checker-contract', mergeCommit: 'b2c3d4e5f6a1', label: 'docs/spec', title: 'checker report/event schema contract (docs-only)' },
  { pr: 3, mergedAt: '2026-01-01T09:20:00Z', branch: 'feature/spec-gate-doctrine', mergeCommit: 'c3d4e5f6a1b2', label: 'docs/spec', title: 'founder-gate doctrine + parking model (docs-only)' },
  { pr: 4, mergedAt: '2026-01-01T09:30:00Z', branch: 'feature/preview-dashboard', mergeCommit: 'd4e5f6a1b2c3', label: 'preview-only', title: 'read-only founder dashboard tile (preview-only)' },
  { pr: 5, mergedAt: '2026-01-01T09:40:00Z', branch: 'feature/spec-egress-policy', mergeCommit: 'e5f6a1b2c3d4', label: 'docs/spec', title: 'egress allowlist policy + decision-log schema (docs-only)' },
  { pr: 6, mergedAt: '2026-01-01T09:50:00Z', branch: 'feature/gated-local-action', mergeCommit: 'f6a1b2c3d4e5', label: 'gated', title: 'session-scoped local-action authorization (OFF / fail-closed by default)' },
  { pr: 7, mergedAt: '2026-01-01T10:00:00Z', branch: 'feature/preview-intent-router', mergeCommit: '0a1b2c3d4e5f', label: 'preview-only', title: 'local NL intent preview router (PREVIEW-ONLY)' },
  { pr: 8, mergedAt: '2026-01-01T10:10:00Z', branch: 'feature/spec-emergency-stop', mergeCommit: '1b2c3d4e5f60', label: 'docs/spec', title: 'emergency-stop / kill-switch law (spec only, fail-closed)' },
  { pr: 9, mergedAt: '2026-01-01T10:20:00Z', branch: 'feature/preview-morning-brief', mergeCommit: '2c3d4e5f601b', label: 'preview-only', title: 'read-only morning-brief page (preview-only)' },
  { pr: 10, mergedAt: '2026-01-01T10:30:00Z', branch: 'feature/spec-safety-checklist', mergeCommit: '3d4e5f601b2c', label: 'docs/spec', title: 'safety regression checklist + hermetic invariant guard (docs-only)' },
];

// The prompt->PR->merge loop, described as stages (not any specific log).
const RUN_TIMELINE = [
  { stage: 1, name: 'founder prompt', detail: 'A scoped task is issued to an isolated writer lane. The prompt is the direction; it is never provider consent.' },
  { stage: 2, name: 'isolated worktree', detail: 'The lane works in its own git worktree under a file lease; it touches only files inside that lease.' },
  { stage: 3, name: 'hermetic proof', detail: 'The lane produces an offline hermetic selftest / CI-safety evidence before handback. No live provider, no send.' },
  { stage: 4, name: 'draft PR + review requested', detail: 'A DRAFT PR is opened; an automated reviewer is requested via a read-only API.' },
  { stage: 5, name: 'advisor verdict', detail: 'The read-only advisor emits a machine-checkable verdict (PASS/GATED/...). It never merges.' },
  { stage: 6, name: 'merge sheriff', detail: 'One-at-a-time merge only when: advisor + CI-safety PASS, CI green at the exact head SHA, review bound-to-head with findings resolved, mergeable, no hard exclusion crossed.' },
  { stage: 7, name: 'evidence recorded', detail: 'The merge commit + proofs are appended to the evidence bus; this package is one such rollup.' },
];

// CI / reviewer / advisor posture, described from already-safe evidence.
const CI_REVIEWER_ADVISOR = {
  ci: {
    label: 'working-runtime',
    detail: 'The CI-safety gate ran on the worktree head and reported PASS with all checks green, 0 fail. This gate runs offline and is a real, checkable effect.',
    evidence: 'CI-SAFETY: PASS (all checks green / 0 FAIL) at the sample head',
  },
  reviewer: {
    label: 'docs/spec',
    detail: 'Every merged PR in the window required a review bound to the exact head SHA with all findings replied/resolved before the sheriff merged. A stale (not-bound-to-head) review is reported as NOT bound and blocks merge. This package records the posture; it does not re-fetch reviews.',
    evidence: 'merge discipline: SHA-bound review gate, fail-closed on absent/unknown',
  },
  advisor: {
    label: 'docs/spec',
    detail: 'The read-only advisor emits a machine-readable verdict. PASS = safe + proven, no blocker, never a live crossing. The advisor cannot write, commit, or merge.',
    evidence: 'advisor-verdict schema + advisor operating contract',
  },
};

// Founder gate reports — the true gates that stay founder-only. Described,
// never activated. All sample/mock; nothing wired.
const GATE_REPORTS = [
  { id: 'provider-secrets-gate', label: 'gated', defaultState: 'REJECTED', why: 'Provider account access is never granted silently and secrets are never shown on screen. Sample/mock only; nothing wired.' },
  { id: 'session-token-gate', label: 'gated', defaultState: 'REJECTED', why: 'Session-scoped local-action authorization is OFF / fail-closed by default (PR #6). Enact requires an explicit founder gate.' },
  { id: 'send-safety-gate', label: 'gated', defaultState: 'REJECTED', why: 'Any send is dry-run-only until a separate founder send gate.' },
];

// Runtime evidence captured on this machine at package build time.
const RUNTIME_EVIDENCE = [
  {
    id: 'doctor',
    label: 'working-runtime',
    what: 'A sample health-check diagnostic ran and produced a real snapshot.',
    result: 'DOCTOR: all sample checks green.',
    honestNote: 'A diagnostic check, not a provider action. This sample lane never restarts or activates any service.',
    greenChecks: ['runner present', 'fixtures parse', 'a capability turn produced a real local effect', 'timezone rendering', 'no synthetic seed leaked'],
  },
  {
    id: 'ci-safety',
    label: 'working-runtime',
    what: 'The CI-safety gate ran offline on the worktree head.',
    result: 'CI-SAFETY: PASS (all checks green / 0 FAIL).',
    honestNote: 'Static/offline safety gate. A check, not a provider action.',
  },
  {
    id: 'local-action-fail-closed',
    label: 'preview-only',
    capabilityNote: 'The local-action capability is PREVIEW-ONLY + fail-closed. A confirm:true enact refuses ("standing enactment token not established — founder gate pending"). It is NOT live-enacting.',
    what: 'A hermetic local-action executor selftest ran.',
    result: 'LOCAL-EXECUTOR-SELFTEST: PASS (live OFF by default; no real store touched).',
    honestNote: 'Proves the fail-closed refusal path and net-zero preview. Guarded capability is preview + gated-enact, never counted as a live send.',
  },
];

const RUN_CLOSEOUT = {
  ref: 'docs/CLOSEOUT.md',
  label: 'docs/spec',
  summary: 'Sample merge-sheriff closeout. Lanes landed one-at-a-time under the merge checklist. Read-only / preview / proof only — no live writes, no provider secrets.',
  standingPosture: [
    'live-action acceptance marker: not established (fail-closed)',
    'every inert response stamps nothingSends:true / providerMutation:false / dispatchable:false',
  ],
};

const RUN_SUMMARY = {
  window: 'PRs #1-#10 (sample run)',
  totalMerged: 10,
  headline: 'A safety / spec / preview sample run. ZERO new live-runtime capability shipped in this window — by design. No provider send, no live enact, no activation.',
  byLabel: null, // filled by the generator from MERGED_PRS
  tracks: [
    'Spec/law: evidence-bus, checker contract, gate doctrine, egress policy, emergency-stop, safety checklist (all docs/spec, fail-closed).',
    'Preview: read-only dashboard tile, intent preview router, morning-brief page (all preview-only, no send).',
    'Gated: session local-action authorization (OFF / fail-closed pending a founder gate).',
  ],
  honesty: [
    'gated means the path exists but is fail-closed pending a founder gate.',
    'preview-only means a card/read-only view was produced — it does not enact and does not send.',
    'docs/spec is never counted as runtime capability.',
    'The only working-runtime evidence is the diagnostic and the CI-safety gate running on this machine — both are checks, not provider actions.',
  ],
};

export const MODEL = Object.freeze({
  package: {
    id: 'foundergate-sample-proof-package',
    title: 'FounderGate — PRIVATE proof package (generic sample)',
    classification: 'PRIVATE',
    private: true,
    no_public_sharing: true,
    no_external_publication: true,
    generated_context: 'Assembled offline from a fictional sample: merged PRs #1-#10, CI/reviewer/advisor posture, founder gate reports, a diagnostic, the local-action fail-closed proof, a closeout, and the run summary.',
    disclaimer: 'No public claims. No secret or private-PII leakage. No activation. No provider send. preview != live; docs/spec is never counted as runtime; guarded paths are fail-closed. Every item is explicitly labeled.',
    redaction_checklist_ref: 'src/proof-packages/REDACTION_CHECKLIST.md',
  },
  labels: LABELS,
  run_timeline: RUN_TIMELINE,
  merged_prs: { window: 'PR #1-#10', rows: MERGED_PRS },
  ci_copilot_advisor: CI_REVIEWER_ADVISOR,
  gate_reports: GATE_REPORTS,
  runtime_evidence: RUNTIME_EVIDENCE,
  run_closeout: RUN_CLOSEOUT,
  run_summary: RUN_SUMMARY,
});
