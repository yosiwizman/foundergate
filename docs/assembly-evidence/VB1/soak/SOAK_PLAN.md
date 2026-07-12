# VB1 — §29 soak program (plan + honest status)

**Law:** Assembly Manual §29 (Honest-Duration & Soak-Proof). VB1 (with VB2) acceptance requires an **8–9-hour soak
then a 24-hour soak**, each a named `FOUNDERGATE HARNESS <N>-HOUR SOAK PASS` with **real start/end timestamps whose
delta ≥ the claimed hours**, the exact SHA under test, monitoring evidence captured during the run, and a
failures/interventions log. A soak claim whose timestamps do not span the duration is **INVALID** (mechanically
checked by `report-provenance` `validateSoakClaims`). The rolling tool is `src/tools/reliability-soak.mjs`; the
runner is `src/tools/soak-run.mjs`.

## Duration up front (§29a)
Soak floor ≈ **33 hours** of real wall-clock (8–9h + 24h), on top of build + independent-checker + fix time. Per the
AKIOR advisor guidance (`docs/lanes/authority/akior-advisor-soak-guidance.md`): **best 36–48h · realistic 4–7 days ·
defect-heavy 1–2 weeks.** A "complete" return faster than the ~33h soak floor is a **progress checkpoint, not the
gate**.

## How it runs
```
# 8–9 hour soak, one health sample every 15 min, health = full suite green:
node src/tools/soak-run.mjs --claim 9 --interval 900 --sha <acceptance-sha> --probe "npm test" \
  --state docs/assembly-evidence/VB1/soak/soak-9h.json
# then the 24-hour soak:
node src/tools/soak-run.mjs --claim 24 --interval 900 --sha <acceptance-sha> --probe "npm test" \
  --state docs/assembly-evidence/VB1/soak/soak-24h.json
```
The runner emits a `<N>-HOUR SOAK PASS` (with start/end timestamps) **only** when the run genuinely spans the claim
and meets the SLO; a short or SLO-missed run yields an honest NOT-PASSED line and never "SOAK PASS".

## HONEST STATUS (§29d — what is still running)
- **The soak has NOT been run.** No `SOAK PASS` exists on disk, and none will be fabricated. VB1 acceptance is
  **HELD** until both soaks complete with real timestamps spanning 8–9h then 24h.
- This session **built the VB1 safety core + proofs** and **ran the independent adversarial checker**, but a 33h+
  soak cannot complete inside one session. The soak must be run by a persistent process (out-of-session) using the
  runner above; its `-PASS.txt` outputs + a monitoring/interventions log are committed as the acceptance evidence
  when they exist.

## Monitoring + interventions log (filled during the real run)
| Timestamp (UTC) | Event / intervention | Notes |
|-----------------|----------------------|-------|
| _(pending the real soak run)_ | | |
