# Dispatcher-Design (LANE A) — Independent Adversarial Checker Report

**VERDICT: NOT-CLEAN** — §28 authority integrity is clean (SHAs resolve, quotes verbatim, sources exist), but the DESIGN itself has must-fix separation-of-duties gaps: every one of the five hard rules is asserted in prose with no described enforcement mechanism, and the design is silent on caller-identity, result-provenance, and signature-binding — the exact seams through which a role-cross, an injected audit, or a forwarded signature would pass.

## §28 Authority integrity — CLEAN (verified)
- `git cat-file -t 7098261b4a019adad4e3c304a4d3be9a89c47097` → commit (real; "LANE A (docs): commit separation-of-duties authority (§28)…"); it contains `docs/lanes/authority/separation-of-duties.md`.
- Every AUTHORITY cell in the proposal and `LANE_A_REPORT.md` cites this same resolving SHA. No short or all-decimal tokens.
- Verbatim quotes genuine: §26 VA-REPAIR-5 (`ASSEMBLY_MANUAL.md` l.487), §28 (l.520), HARNESS_STRESS_LOG "Standing lesson" (l.32) and S1 (l.26) all match.
- Self-referential citation (authority file cites its own commit) is valid under §28 (authority landed at `7098261` before the proposal at `ff3b573`). Not a defect. No uncited claim found.

## Design findings
### F1 — No caller identity at the dispatcher's INPUT; impersonation prevented by assertion only — CRITICAL, MUST-FIX
Rule 3 says "no path lets one role speak in the other's name," but the design never says who may invoke the dispatcher, how it authenticates the caller, or what a "badge" is. Nothing stops the CTO invoking the dispatcher, nor one process registered as both CTO and Advisor. Fix: verifiable caller identity per item; reject unauthenticated/multi-role callers; disjoint credentials.
### F2 — No provenance on RESULTS; an audit result can be authored by the build role — CRITICAL, MUST-FIX
Routing is one-way on entry; nothing verifies who produced the returning work. The CTO could produce an "audit result" and the dispatcher would accept it as the Advisor's. Fix: routed result accepted only if attested by the routed-to role's identity.
### F3 — "Dispatcher forwards approval" / replay path not closed — CRITICAL, MUST-FIX
Rule 4 forbids issuing a signature but permits the dispatcher to "prepare a gate." Nothing binds a founder signature to the artifact/SHA it signs; no nonce. Loopholes: transporting/forwarding a captured approval, replaying a stale signed bundle. Fix: bind signature to bundle path@SHA + one-time nonce; forbid re-presentation.
### F4 — Rule 5 (sensitivity) asserted, not mechanized — HIGH, MUST-FIX
No mechanical guard detects a build lacking an independent checker or a role holding both badges — unlike §26 (`report-provenance.mjs`) and §28 (two CI guards). Fix: named validator that verifies checker≠builder and blocks merge on green-suite-alone.
### F5 — No routing row for "work that modifies the dispatcher itself" — HIGH, MUST-FIX
Once the dispatcher exists, a change to itself arrives as BUILD and the running dispatcher routes/checks that flow — a self-approval seam. Fix: dispatcher-self-modification → UNROUTED / founder bootstrap.
### F6 — Classification is trusted and unchecked; a mis-classification silently crosses the streams — HIGH, MUST-FIX
"Never cross" is only as good as the classifier, which is the dispatcher's fallible judgment; no routing log, no founder confirmation on ambiguous items, no second opinion. Fix: immutable founder-visible routing log; low-confidence → UNROUTED.
### F7 — Dispatcher is a single trusted chokepoint with only build-time protection — MEDIUM
Only protection is a build-time checker; no runtime attestation/tamper-evidence. Fix: runtime integrity/attestation so the deployed dispatcher matches the approved artifact.

## Must-fix-before-authorization summary
F1, F2, F3, F4, F5 must be closed before this design could be authorized to build — they are the seams through which role-cross, injected audit, forwarded/replayed signature, and self-approval remain possible because the DRAFT states prohibitions without enforcing mechanisms. F6, F7 resolve before build or as gating build-lane requirements. The §28 paperwork is honest and resolves; the design's problem is rules the document does not yet make mechanical.
