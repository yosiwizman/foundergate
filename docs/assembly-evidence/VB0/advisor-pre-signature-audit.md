# Terminal Advisor — pre-signature audit of G1-B-VB0 (verbatim)

> **Provenance:** committed verbatim by the FounderGate CTO at the founder's instruction. Authored by the founder's
> **separate read-only Terminal Advisor lane** (not a CTO-dispatched subagent), hard read-only hook — no product
> code executed, no network. Read-only evidence. Reproduced exactly as supplied.

---

TERMINAL ADVISOR — PRE-SIGNATURE AUDIT of G1-B-VB0 (foundergate)

Provenance: founder's separate read-only Terminal Advisor lane (not a CTO-dispatched subagent), hard read-only hook; no product code executed, no network. Main = b442734 (PR #83), clean except the still-untracked stranger-test-run-5.md (finding-only, by design). Live test/CI/branch-protection state is UNKNOWN in this lane (exec/network blocked).

1. ACCEPTANCE RECORD → PASS

- V8-A whole-product ACCEPTED with the founder's verbatim sentence — FOUNDER_GATE_LEDGER.md:38: "I accept V8-A (Truth Dashboard + Preview Bay + Bug Collector + File Cabinet + Project Guide) complete at product-final 85a59f9 (exact-SHA CI green), on the basis of Stranger Test Run 7 PASSED — a genuine first-timer, all 7 steps unaided, full P1 interview — with the full seven-run evidence chain including the two failures and the aborted run…"
- git cat-file -t 85a59f9 → commit (PR #73 FD-IMPLEMENT product-final).
- Run-7 sheet committed with P1 dictation — docs/assembly-evidence/VA/stranger-test-run-7.md ("PASSED — all 7 steps unaided, full P1 per-check interview dictated by the founder"); gate ledger :37 records all 7 steps + verbatim quotes.
- Seven-run chain honestly represented — git ls-files | grep run → run-6 + run-6-abort-diagnosis.md + run-7 committed; run-5 untracked (uncommitted/finding-only, git status shows ?? …run-5.md); Run 6 recorded as aborted.

2. LAWS REAL → PASS

- §28 Written-Authority Law (ASSEMBLY_MANUAL.md:513) + §29 Honest-Duration/Soak-Proof Law (:538) exist.
- Authority guard (evidence-integrity): src/tools/evidence-integrity.selftest.mjs §5 (lines 103-123) — asserts the AUTHORITY column header exists, every ledger row's AUTHORITY path exists + SHA resolves (shaResolves), else CI-red (honestly grandfathered only as AUTHORITY-UNRECORDED). This is the validateAuthorityCells logic.
- Soak guard (validateSoakClaims, span-≥-claim): src/tools/report-provenance.selftest.mjs:78 "SOAK PASS with timestamps spanning >= claimed duration is VALID"; :84 "timestamps span LESS than claimed → INVALID (phantom soak)"; plus phantom-PR/SHA (:34,47) and phantom-authority (:65) → INVALID.
- CI fetch-depth: 0 — .github/workflows/selftests.yml:20 (full history so the SHA-resolving laws work).
- Authorities resolve on disk — docs/lanes/POST-ACCEPTANCE-QUEUE.md and docs/lanes/authority/akior-advisor-soak-guidance.md both exist (the §28/§29 governing artifacts).

3. CONTRACT STATE → PASS

- V8-B contract LIVE, all G1-B-* UNFIRED — docs/lanes/V8-B-build-contract.md:3-6: "LIVE — V8-A ACCEPTED… authorizes nothing by itself (Law 69)… every G1-B-* gate remains UNFIRED. No V8-B code has begun." :21-22: "no V8-B code exists."
- NO V8-B product code — git ls-files 'src/**' | grep -iE 'launcher|executor|queue|registry|attach' returns only pre-existing components (worker-adapter registry, checker-swarm queue, V8-A1 registry.mjs, stranger-test launcher-health.selftest.mjs); the only V8-B files are docs/lanes/V8-B-build-contract.md + V8-B-proposal.md. No V8-B launcher/executor/queue/attach product exists.
- VB0 = named substep with the four isolation boundary rules (:121-125): (1) never auto-attach; (2) the founder chooses the active project; (3) no project's SECRET/blocked content or state ever bleeds into another; (4) Law-54 honest UNKNOWN when a project can't be read. Its gate sentence exists (:155).
- VB1/VB2 carry the §29 soak requirement + duration range (:104-112): 8-9-hour soak + 24-hour soak, each a named FOUNDERGATE HARNESS <N>-HOUR SOAK PASS with real start/end (delta ≥ claimed), exact SHA, monitoring + interventions log; "best 36-48h · realistic 4-7 days · defect-heavy 1-2 weeks (floor ≈33h)"; authority akior-advisor-soak-guidance.md; "mechanically checked by report-provenance validateSoakClaims."

4. QUEUE DRAIN TRUTH → PASS (protection UNKNOWN)

- Completion reports exist — docs/assembly-evidence/{post-accept/refinements-completion.md (VBDAG/M1/M2, #80), HD/hd-completion.md (§29, #82), WAL/wal-completion.md (§28, #78)}; stamp PRs #81/#83 "with AUTHORITY" (per git log).
- AUTHORITY resolution is mechanically enforced — the §28 guard (evidence-integrity.selftest.mjs §5) fails CI on any ledger row whose PR+SHA or AUTHORITY path doesn't resolve; report-provenance fails any lane claim without a resolving PR+SHA. (I sampled rather than reading every completion-report lane line-by-line; the CI guards are the enforcement.)
- M1 "On Hold" in source with guard — view-model.mjs:206-207 (blocked/paused → "On Hold"), :174 state-word map; guarded by home-model.selftest.mjs:101 ("M1: the held state reads 'On Hold', not 'stuck'").
- M2 SECRET teal in source — filecabinet/ui/filecabinet.css:59 ("M2 (Run-7): SECRET gets its own CALM teal hue so it's distinct from the purple [lock/UNKNOWN]").
- No placeholders — only EVIDENCE_LEDGER.md:89 descriptive prose ("literal placeholder tokens, which count as UNKNOWN").
- Branch protection + enforce_admins: UNKNOWN — requires gh api …/protection (network), blocked in this read-only lane.

5. ADVERSARIAL SPOT (contract wording) → PASS — no execution-before-VB3 or attach-without-choice loophole

Reading the amended contract for any wording that could authorize execution before VB3 or attach without founder choice: the wording is explicitly and repeatedly gated:
- "The executor's act edge is gated on VB3" (:129); "Queued items act only once VB3 wires approvals" (:133); VB3 "is the gate that all execution edges depend on… approval-without-record, gate-escape, replay, and self-approval all refused" (:134-137); "No paid action executes before [VB4] is proven" (:139-140); VB5 "routes nothing without the go-ahead" (:142-143).
- Attach: "never auto-attach; the founder chooses" (:123); "none fires until V8-A is accepted (Law 69). No sub-system auto-follows the previous one; the founder records each sentence explicitly" (:150-151); wide-safe shells have "no action-looking buttons that are not wired" (:147).
- One bounded allowance to read carefully (not a loophole): :129 — VB1 "launcher scaffolding + rollback/token proofs may land first" (before VB3). This is correctly scoped (the act edge stays VB3-gated), so it permits non-executing scaffolding + safety proofs, not execution. Worth the founder noting, but it does not authorize execution before VB3.

---
Summary

┌───────────────┬─────────────────────────────────────────────────────────────────┐
│     Item      │                             Verdict                             │
├───────────────┼─────────────────────────────────────────────────────────────────┤
│ 1 Acceptance  │ PASS — verbatim V8-A ACCEPTED @ 85a59f9, Run-7 committed w/ P1, │
│ record        │  seven-run chain honest                                         │
├───────────────┼─────────────────────────────────────────────────────────────────┤
│ 2 Laws real   │ PASS — §28/§29 + guards (authority-cell resolve, soak           │
│               │ span-≥-claim) + fetch-depth:0 + authorities resolve             │
├───────────────┼─────────────────────────────────────────────────────────────────┤
│ 3 Contract    │ PASS — LIVE, all G1-B-* UNFIRED, no V8-B code, VB0 four         │
│ state         │ isolation rules, VB1/VB2 §29 soak+range                         │
├───────────────┼─────────────────────────────────────────────────────────────────┤
│ 4 Queue drain │ PASS — completion reports + AUTHORITY mechanically enforced,    │
│  truth        │ M1/M2 in source w/ guards, no placeholders; protection UNKNOWN  │
│               │ (network)                                                       │
├───────────────┼─────────────────────────────────────────────────────────────────┤
│ 5 Adversarial │ PASS — execution gated on VB3, no attach-without-choice; one    │
│               │ bounded pre-VB3 scaffolding allowance noted                     │
└───────────────┴─────────────────────────────────────────────────────────────────┘

Bottom line: The pre-signature package for G1-B-VB0 is coherent and honestly governed on disk. V8-A whole-product acceptance is recorded verbatim at a resolving product-final SHA on the basis of a committed 7/7 Run-7 with full P1 dictation and an honest seven-run chain; §28/§29 exist with real CI-discovered guards (authority-resolution + soak-span) and a fetch-depth:0 runner; the V8-B contract is LIVE with every gate unfired and zero V8-B product code, VB0's four isolation rules and VB1/VB2's §29 soak-with-duration are present, M1/M2 are in source behind guards, and the contract's wording keeps all execution edges gated on VB3 with no attach-without-founder-choice. UNKNOWNs (this lane only): live CI-green and branch-protection enforce_admins (network-gated) — an exec/network-capable check should confirm both before/at signature. This report is read-only evidence; I wrote nothing.

---

## CTO disposition (post-audit) — the two UNKNOWNs closed

The Advisor's two network-gated UNKNOWNs are confirmed by the CTO (exec/network-capable) at commit time:
- **Live CI green:** `main` @ `b442734` — CI conclusion **success** (`gh run list --branch main`).
- **Branch protection / enforce_admins:** `gh api .../branches/main/protection` → `enforce_admins: true`, required check `["selftests"]` — protection is live, admins included.
- The **bounded pre-VB3 scaffolding allowance** (contract :129) is noted and accepted: VB0/VB1 may land non-executing scaffolding + safety proofs; the executor *act* edge stays gated on VB3. VB0 as built ships **no executor and no act edge** — read-only registry only.

All five items PASS; both UNKNOWNs closed. This report is corroborating evidence for the VB0 acceptance card (the primary basis remains the committed isolation proofs + the independent adversarial checker's round-3 ALL-CLOSED verdict).
