# Logging Defect Scope

## Exact defect (from L3B source, verified line-by-line)
All three prior harness scripts share the same failure design:

```
monitor.sh:  RUN="$1"; LOG="$RUN/evidence/resources/resource_monitor.log"   # $RUN = Desktop folder
ledger.sh:   RUN="$1"; LOG="$RUN/evidence/ledger/ledger.log"                # $RUN = Desktop folder
endurance_driver.sh:  RUN="$1"; ... writes under $RUN/evidence/endurance/...
             ... EL=$(( (NOW-START)/60 )); if [ "$EL" -ge "$MIN" ]; then ... break; fi
```

Three compounding faults:
1. **Movable path** — every duration-critical log is written under `$RUN`, an absolute Desktop path. When the founder relocates the folder in Finder, the path vanishes and `>> "$LOG"` silently writes nothing while the loop keeps spinning.
2. **No write-success check** — no loop verifies the append succeeded, so evidence loss is invisible.
3. **Wall-clock completion** — the driver decides "done" from `elapsed = date +%s − START`, *not* from monitor/ledger disk spans. So it "completed at 5h" while monitor/ledger had died at ~62 min → a phantom PASS over a ~4h hole.

## Fix scope (narrow — logging/duration only)
- Introduce a **fixed evidence root** outside Desktop: `~/.foundergate/runs/<run_id>/`.
- All duration-critical logs write there; each write is checked; any failure ⇒ `HELD_EVIDENCE_WRITE_FAILURE`, no PASS.
- Duration classification computed **only** from fixed-root monitor + ledger first/last timestamps; both must span the threshold.
- Desktop folder keeps only a convenience summary/index (non-authoritative).

## Touched-file classification
| File | Class |
|------|-------|
| scripts/monitor.sh, ledger.sh, endurance_driver.sh (prior, defective) | narrow-sensitive (runtime driver/monitor/ledger/classification) |
| new: fg_run_env.sh, fg_monitor.sh, fg_ledger.sh, fg_driver.sh, fg_duration_classify.mjs | narrow-sensitive |
| new: fg_duration_classify.selftest.mjs | wide-safe (test) |

**Not touched:** package.json / package-lock.json, product `src/**`, governance/CI, launcher redesign, permission/classifier/allowlist. Product repo tree remains unmodified; the corrected harness lives as standalone scripts in this run's workspace and is backed up to a non-main branch in Phase 9.
