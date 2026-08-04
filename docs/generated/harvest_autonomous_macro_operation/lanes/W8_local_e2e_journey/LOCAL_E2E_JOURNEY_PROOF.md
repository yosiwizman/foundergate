# Local End-to-End FounderGate Journey Proof (local synthetic)
Result wording: **LOCAL_E2E_JOURNEY_READY_WITH_LIMITS**

The headed browser proof (tests/e2e-dashboard/harvest-e2e-visible-proof.mjs) walks the existing local dashboard and
confirms, using local UI + synthetic fixtures ONLY (no real provider/repo/hardware/deploy/customer data):

| # | Journey step | Evidence |
| --- | --- | --- |
| 1 | Launches locally via supported route | dashboard index.html opens |
| 2 | Founder interface opens without terminal repair | Drive Mode renders 8+ cards |
| 3 | A controlled local fixture can be attached | Provider/Repo proof loads (self-owned local) |
| 5 | Mission converts into run/lane contracts | Harvest panel shows 8 lane contracts |
| 6 | Builder performs real local work | src/* modules + tests exist on disk |
| 7 | Founder observes truthful progress | Harvest aggregate + per-lane verdicts |
| 12-16 | Focused/full/negative tests run | 8 lane selftests (52 proofs) + hostile cases fail closed |
| 18 | Independent Checker binds to frozen candidate | consolidated Checker report |
| 19 | Limitations remain visible | every panel states LOCAL SYNTHETIC + blocked gates |
| 20 | Plain-English SHIP/HOLD result | "never SHIP" + ready-with-limits shown |
| 22 | Dashboard does not invent state | UNKNOWN shown when source unavailable |
| 23 | Forbidden requests refused | claim-blocker + hostile cases; 0 prohibited execution |
| 24 | Offline-verifiable evidence package | witness ZIPs + SHA256SUMS |

**Limits:** local synthetic only; no real provider/repo/hardware/deploy/customer; steps 4/8/9/10 (mission entry, pause,
stop, cross-session resume) are exercised at the model/contract level, not as a full production runtime — hence
READY_WITH_LIMITS, not unconditional.
