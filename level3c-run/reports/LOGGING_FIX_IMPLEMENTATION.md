# Logging Fix Implementation

**One writer** (Terminal-0). Standalone harness scripts; product repo tree untouched.

## What changed vs. the L3B design
| L3B (defective) | L3C (fixed) |
|-----------------|-------------|
| `RUN="$1"` = Desktop folder; logs under `$RUN/evidence/…` | Fixed root `~/.foundergate/runs/<run_id>/` (never Desktop) |
| `>> "$LOG"` with no check | `fg_append` verifies byte count grew; failure ⇒ `fg_held` |
| Completion from `elapsed = date +%s − START` | Wall-clock minimum is **not** a pass; `TIMER_MINIMUM_REACHED` only |
| Duration = wall clock | Duration = `fg_duration_classify.mjs` over monitor+ledger disk spans |
| Silent evidence loss on move | Logs live off-Desktop; Desktop move can't touch them; unwritable root ⇒ fail-closed HELD |

## Files
- `scripts/fg_run_env.sh` — fixed-root resolver + `fg_append` write-guard + `fg_held` fail-closed + identity files.
- `scripts/fg_monitor.sh` — resource monitor loop → fixed root.
- `scripts/fg_ledger.sh` — ledger loop → fixed root.
- `scripts/fg_driver.sh` — timer / health (10m) / git-lock (10m) / recovery (30m) loops → fixed root; watch-mode; timer≠pass.
- `scripts/fg_duration_classify.mjs` — pure classifier; PASS only if monitor **and** ledger span ≥ threshold with continuous samples.
- `scripts/fg_duration_classify.selftest.mjs` — 13 deterministic assertions.

## Verification so far
- `bash -n` OK on all 4 shell scripts; `node --check` OK on the classifier.
- Classifier selftest: **13 passed, 0 failed**.

## Fail-closed guarantees
1. Root missing/unwritable → `HELD_EVIDENCE_WRITE_FAILURE`, loop exits 3.
2. Append that writes 0 bytes → HELD.
3. Timer reaching minimum → `TIMER_MINIMUM_REACHED`, explicitly not a pass.
4. Any duration claim is computed from disk logs only.

Forbidden files untouched: package.json / package-lock.json, `src/**`, governance/CI, launcher, permission/classifier/allowlist.
