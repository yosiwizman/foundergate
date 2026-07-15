# Wide-lane independent RE-CHECKS (run 2) — evidence, HELD

> Second-round INDEPENDENT adversarial checks of the six merged DRAFT authorities / evidence records, run
> read-only against `main` `bf7c905ea55c4743b756c15bf58849d05ffd494c`. Each checker ≠ the authoring lane; each read
> only its subject and returned a verdict. Committed here as evidence. **These DRAFTs still authorize nothing until
> the founder signs each; nothing is signed here.** Findings that need a founder decision are listed at the end.

## Summary
| Lane | Subject | Verdict | Open finding |
|---|---|---|---|
| W1 | #98 vb1-hardening amendment | **CLEAN** (DRAFT) | **W1-H1** — labeled soak sub-result (mismatch-hazard closure) |
| W2 | #101 vb2-classifiedobjectstore amendment | **CLEAN** (DRAFT) | 3 must-fix-before-build (id entropy quantified; hash fn pinned; status mapping) |
| W3 | #100 dispatcher final-authority | **CLEAN** (DRAFT) | **KCA disjointness STILL-OPEN** — hard gate before dispatcher build |
| W4 | #103 evidence-ledger reconciliation | **CONSISTENT** | VB1 pre-signature-audit gap genuinely still OPEN (recorded, not fabricated) |
| W5 | #102 roadmap tracker v6 | **STALE** | regenerate/re-stamp to `bf7c905` (under-states SHWL / L1–L4 / VB1-soak) |
| — | #105 wide-lane checks (round 1) | **CONSISTENT** | none |

---

## W1 (#98) vb1-hardening amendment — CLEAN
All five VB3 entry criteria (EC-1 rollback TOCTOU/O_NOFOLLOW; EC-2 immutable approval provenance; EC-3 mechanical single-writer; EC-4 module-private verifier; EC-5 proven-still-inert-at-freeze) are stated as unmet MUST-satisfy preconditions with acceptance tests. §28 citations resolve as full-40-char blobs (`checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434`, `V8-B-build-contract.md @ 670046b74b805790de785daa3f14cb0c7f5bad12`). Honest DRAFT — "authorizes nothing, accepts nothing, merges nothing"; VB1 acceptance remains HELD; no bare gate-pass line in the doc.

### FINDING W1-H1 — labeled soak sub-result (mismatch-hazard closure)
In the run-1 soak bundle, the §29 accumulator (`src/tools/reliability-soak.mjs`) emits an unqualified availability line (`…SOAK PASS`) in `soak-8h-PASS.txt` and quoted at `VERDICT.txt` L18, sitting beside the authoritative gate line `…SOAK — NOT-PASSED` (VERDICT.txt L1). The two tokens differ only by the `— NOT-PASSED` suffix, so a reader (or a naive `grep`) landing on the sub-result artifact standalone can mistake an **availability + duration sub-result** for the **gate verdict**. The bundle `README.md` explains this, but the mitigation lives outside the two artifacts that carry the bare line — they remain self-mislabeling. Real hardening gap; not a blocker (the gate verdict is unambiguously NOT-PASSED and the DRAFT emits no such line).
- **Proposed W1 hardening item (belongs in `docs/lanes/vb1-hardening-amendment.md`):** the accumulator and every bundle reproducing its output MUST render the availability/duration sub-result with a label that cannot read as the gate verdict — `AVAILABILITY SUB-RESULT — NOT THE GATE VERDICT: …availability PASS` — and the gate-verdict token MUST be emitted only by the AND-gate (accumulator SLO AND QUIET_HOST eligibility AND frozen-code integrity). Acceptance test: a scan of any soak bundle finds the unqualified gate-pass token on zero lines except the gate verdict line itself.

## W2 (#101) vb2-classifiedobjectstore amendment — CLEAN
All six requirements present, consistent, and faithful to the VB2 scaffold (`src/v8b2/*`): opaque IDs; separate metadata-vs-content authorization (grounded in `displaySafe`); append-only hash-chained QueueEvent (`previous_hash`+`event_hash`, genesis, `intact|broken-at-<id>`); immutable content-addressed snapshots; explicit+logged retention; distinct pending/dismissed/expired + honest UNKNOWN. §28 (4 citations) resolve full-40-char; DRAFT authorizes nothing (Law 69). **ID-entropy note ADDRESSED in substance** — enumeration cannot leak content because holding an ID is not authorization (the §2 content grant gates reads).
- **Must-fix-before-build (non-blocking for the DRAFT):** (1) quantify per-namespace ID entropy (do not inherit 48-bit scaffold width as "infeasible to enumerate"; raise width or state enumeration-resistance is delegated to the content grant); (2) pin the concrete hash function + canonical serialization; (3) specify the explicit scaffold-status ↔ lifecycle-state mapping.

## W3 (#100) dispatcher final-authority — CLEAN (DRAFT)
Six mechanical hard rules all PASS: HR-1 signed out-of-band routing envelope (no infer-from-payload fallback; binds origin/dest/path@SHA/nonce/freshness); HR-2 replay protection (one-time nonce + freshness, nonce bound into signed body); HR-3 origin→destination DENY matrix with CTO↔Advisor=DENY both directions, default-deny, deny-before-allow; HR-4 KCA as a dependency; HR-5 hardware-backed founder step-up; HR-6 anchored append-only hash-chained ledger. Faithful supersession of #92 (CF-1…CF-5 + F1–F7 carried, no regression). §28 resolves; authorizes nothing.
- **FINDING — KCA disjointness STILL-OPEN (hard gate before dispatcher build):** HR-4 is unchanged since run 1 (single commit `d12137f`). The doc pushes the KCA authorization to "a separate, out-of-scope artifact" (fails "exists + §28-cited"), and has **no** clause requiring the KCA be provably DISJOINT from CTO/Advisor/dispatcher/founder (fails disjointness); `separation-of-duties.md` names no KCA/disjointness either. Latent for the DRAFT (authorizes nothing); must close before any dispatcher build is authorized.

## W4 (#103) evidence-ledger reconciliation — CONSISTENT
The G1-B-VB1 ⟨W4 RECONCILIATION⟩ annotation is present exactly once; the referenced `docs/assembly-evidence/VB1/advisor-pre-signature-audit.md` is **genuinely still ABSENT** (`git ls-files docs/assembly-evidence/VB1/` = checker-report.md, checker-report-round2.md, soak/** only); the original founder quote is byte-identical (MD5 unchanged before/after W4); the VB0 pre-signature-audit contrast is truthful; nothing fabricated/backfilled/backdated. The original §28 prose block was intentionally superseded by real dated ledger rows on merge (`9fc10d8`) — the more honest outcome. No unresolvable SHAs; evidence-integrity + report-provenance selftests PASS. **Pre-signature-audit gap: STILL OPEN (recorded, not closed).**

## W5 (#102) roadmap tracker v6 — STALE
Honest and non-overstated **at its stamped base `ecba6a7`** (VB0 ACCEPTED, VB1 merged-not-accepted, VB2 scaffold, dispatcher/V8-C DRAFTs, Law-54 UNKNOWNs honest) — but materially STALE against current `main`: it under-states SHWL (now founder-signed authority `6a4488d` + built `628bb11` + founder-accepted `G-SHWL-BUILD`, I/J held), host-control L1–L4 (now merged `src/` code, PRs #110–#113), and the VB1 run-1 soak (now recorded VERIFIED-NOT-PASSED, acceptance still HELD). No fabrication, no false readiness claim.
- **Finding:** regenerate/re-stamp v6 to `bf7c905` with corrected SHWL / host-control / VB1-soak rows.

## #105 wide-lane checks (round 1) — CONSISTENT
Faithfully records the round-1 verdicts (W1/W2/W3 CLEAN, W4/W5 CONSISTENT) and the W3 KCA-disjointness + W2 id-entropy design notes; cited blob SHAs resolve; scoped to "this wave"; makes no readiness/approval claim and authorizes nothing. Not made stale by later merges (it records verdicts, not current merge state).

---
## Findings needing a founder decision
1. **W1-H1** — adopt the labeled-soak-sub-result hardening (fold into the vb1-hardening amendment + accumulator) to close the `…SOAK PASS` vs `…NOT-PASSED` mismatch hazard.
2. **W3 KCA disjointness** — still open; require an existing, §28-cited, provably-disjoint Key-Custody Authority before any dispatcher build authorization.
3. **W5 v6 staleness** — authorize a roadmap-v6 regenerate to base `bf7c905`.
4. **W2 build-time items** (id entropy, hash fn, status mapping) and the **VB1 pre-signature-audit gap** remain tracked-open (no action taken here).

**Nothing signed. Each DRAFT authority awaits the founder's signature (a founder gate).**
