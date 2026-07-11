# HONEST-DURATION & SOAK-PROOF LAW (HD) — completion report

**Bundle:** HD (docs + one guard extension; no product code). **Authority:** the AKIOR advisor's soak guidance,
committed verbatim FIRST (per §28) — `docs/lanes/authority/akior-advisor-soak-guidance.md`. Lane PR + SHA are
stamped into these rows and the Evidence-Ledger row immediately after this PR merges (living-ledger maintenance).

## Disk-proof completion table (with AUTHORITY column)
| Lane | What landed | Evidence (file) | Authority (path) |
|---|---|---|---|
| Authority committed first | AKIOR advisor soak guidance, verbatim (provenance note; read-only) | `docs/lanes/authority/akior-advisor-soak-guidance.md` | `docs/lanes/authority/akior-advisor-soak-guidance.md` |
| Assembly Manual §29 | HONEST-DURATION & SOAK-PROOF LAW: duration up front (best/realistic/defect-heavy); soak claims need named PASS + real start/end timestamps + exact SHA + monitoring + failure log; early returns say what's still running, never claim the gate | `docs/ASSEMBLY_MANUAL.md` | `docs/lanes/authority/akior-advisor-soak-guidance.md` |
| Soak-proof guard | `report-provenance` `validateSoakClaims` — a `… SOAK PASS` line without start/end timestamps whose delta ≥ the claimed hours is INVALID, like a phantom SHA (+ selftest cases) | `src/tools/report-provenance.mjs` + `report-provenance.selftest.mjs` | `docs/lanes/authority/akior-advisor-soak-guidance.md` |
| V8-B contract soak requirement | Run Launcher + CTO queue acceptance criteria gain an 8–9h + 24h soak with §29 evidence; duration range stated up front (best 36–48h · realistic 4–7 days · defect-heavy 1–2 weeks; floor ≈ 33h) | `docs/lanes/V8-B-build-contract.md` | `docs/lanes/authority/akior-advisor-soak-guidance.md` |

## Verification
Suite 50/50 green; `report-provenance` soak cases pass (span ≥ claim = valid; too-short span = INVALID; no
timestamps = INVALID); evidence-integrity (incl. §28 authority) green. The AKIOR guidance resolves on disk as the
authority BEFORE §29 exists — the Written-Authority Law satisfied for its own adoption bundle.
