# PR #198 — FG-PPRC-198: correct the three independent package-Checker findings

**Status: DRAFT. A FRESH INDEPENDENT PACKAGE CHECKER IS REQUIRED. Nothing here is accepted.**

A fresh independent read-only package Checker reviewed PR #198 and returned **FINDINGS** (report sha256
`1a38edbcb02178e5f2f09564418d84b535493e350afaf268d7c61ff016b66a9b`) with exactly three findings. All three
are corrected here. The report is preserved verbatim as
`PPRCHK_198_PACKAGE_CHECKER_REPORT_HISTORICAL.json` — **historical FINDINGS evidence only, never
acceptance.**

## Candidate / evidence split

| item | value |
|---|---|
| Package-correction candidate | `8e8c5569a75c1a23ebc90665ee6a77023b72ae10` |
| Package-correction candidate tree | `0048ea190ccc4a3d725ef60427745b2e347f9d63` |
| Evidence-only tail | exactly one commit after the candidate; resolve with `git log --oneline 8e8c5569..HEAD` |
| Approved authority candidate | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` (tree `012e0560fd21f7328088ec290f30f9eac84dc1ef`) — **byte-unchanged** |
| Base (PR #197) | `39dea6364d3a32420034f0ba4895486d1b918fa1` |
| Protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| Provider | `2.1.220`, sha256 `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` |
| Suite | `npm test` — **155/155**, green twice consecutively, identical family totals |
| `active_keys` | `[]` |
| Superseded | package candidate `58b3620`, evidence head `46f1f0d` — FINDINGS evidence only |

`git diff --stat 8e8c5569 HEAD -- src tools .foundergate/run-materials package.json package-lock.json`
must be **empty**.

## PPRCHK-198-01 (HIGH) — the final-head binding is now two artifacts at two stages

The prior wave froze a capsule at the package candidate `58b3620`, then committed evidence claiming
`SIGNATURE-REQUIRED`, `binds_exact_final_head: true` and empty `binding_defects` — **in the very commit
(`46f1f0d`) that advanced HEAD and falsified them.** Reproduced here: at that head the real results were
`BINDING-DEFECT` and `CAPSULE-VERIFIER INVALID`.

PF-5 fired correctly and failed **closed** — zero provider spawns, founder gate still `KEY_ENROLLMENT`.
The control was never broken. The evidence was false.

- **Stage A — committed package candidate.** Proves candidate bindings and package-byte integrity. It
  deliberately does **not** bind the final evidence head (a commit cannot embed its own hash), never claims
  `binds_exact_final_head`, and never claims PF-5 passes at a later head. Declared in
  `PACKAGE_CANDIDATE_SCOPE.json`.
- **Stage B — procedural final-head capsule.** New tool `tools/terminal0/lrcq/final-head-capsule.mjs`
  generates it **outside Git**, only after the final evidence tail exists. It takes the exact final HEAD and
  tree as **required explicit inputs**, re-resolves both from git, and refuses on any mismatch, a dirty
  worktree, an out-root inside the repository, `evaluated_sha == final head`, or a GitHub PR head mismatch.
  It is never committed, so it creates no self-reference. Declared in
  `PROCEDURAL_FINAL_HEAD_CAPSULE_CONTRACT.json`. It must be regenerated immediately before founder
  enrollment, and after any later commit.

**PF-5 is not weakened.** `run-five-hour.mjs` is byte-identical to the approved authority candidate.

The eleven prior-tail executed-results artifacts carrying the false claims were removed in the candidate and
rewritten correctly in the new evidence tail.

## PPRCHK-198-02 (MEDIUM) — the stale markers are now generator-emitted

`UNSIGNED_GATE_PACKET.json` is a retired V3-schema packet with unresolved founder-fill placeholders. Commit
`ce82c3b` hand-added `__status` / `__superseded_by` / `__reason` to a **generated** file, so the next
regeneration silently dropped all three.

`classify-and-packet.mjs` now emits the markers itself, mechanically enumerates every unresolved placeholder
(`__unresolved_founder_placeholders`), and **refuses to write** unless a fixed required contract holds.
That contract is declared independently of the emitted table — the first draft of this fix derived the
check from the emitted table's own keys and so could not detect a deletion, the identical defect class as
PPRCHK-198-03; it was found by executing the attack and corrected before freeze.

`--run-harness-candidate` is now a required frozen input (the generator no longer reads live HEAD), so
regeneration is byte-deterministic. `PACKAGE_VERIFICATION_INSTRUCTIONS.md` section 6 now names and executes
**all four** producing generators, and every producing generator is a hash-covered package member.

The packet confers nothing: `verifyActivation` refuses it `NOT_V4`, and PF-3 refuses any surviving
placeholder.

## PPRCHK-198-03 (LOW) — the generator consumes the authoritative tables

Ceilings were checked with strict equality, but exclusions were checked by **iterating the generator's own
table** — so deleting `no_deploy` removed the iteration, nothing refused, and a founder-readable artifact
keyed `ten_mandatory_exclusions` shipped listing **nine**.

`refreeze-package.mjs` now imports `V4_SIGNED_EXCLUSIONS` and `V4_SIGNED_LIMIT_FIELDS`.
`assertAuthoritativeTables()` requires exact equality — same keys, count, order, no missing, no extra, no
duplicate, plus a cardinality assertion because the artifact key names assert those counts — and runs
**before any artifact byte is written**. Both checks now iterate the authoritative inventories, and every
emitted founder-readable inventory is derived from those exports. The authoritative exports are unmodified.

## Verification actually executed

- Suite **155/155** green twice, identical family totals, zero skipped, zero failures. New regression family
  `package-authoritative-tables` (61 assertions) locks all three corrections.
- **74/74** negative attacks refused, **0** productive provider spawns; positive deterministic stub control
  proves the counter goes 0 → 1.
- **12/12** Stage-B refusal attacks refused (wrong head, wrong tree, in-repo out-root, self-seal, missing
  inputs, traversal, destination exists), zero spawns, no capsule created.
- Removing each of the ten exclusions, each of the six limit fields, additions, duplicates and reorderings
  all refuse with **no artifact written**.
- Full four-generator chain re-run at the frozen candidate leaves the tree **byte-identical**.
- All ten authority digests unchanged; `git diff` over authority paths is empty.

## What this does NOT claim

Not package acceptance. Not real productive Claude capability. Not that the committed candidate binds the
final evidence head — it deliberately does not. Not OS isolation. Not UI proof. Not founder-key-enrollment
readiness.

**Next gate:** a fresh independent package Checker returning
`FOUNDERGATE-PR197-PROVIDER-PACKAGE-CHECKER: CLEAN`, then a package Advisor. The Builder issues neither.
Founder key enrollment stays blocked until then; `active_keys` is `[]` and must remain so.
