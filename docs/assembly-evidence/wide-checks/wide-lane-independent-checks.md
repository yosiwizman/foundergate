# Wide-lane independent checks — SHWL BUILD wave (evidence, HELD)

> Independent READ-ONLY checks of the five wide-lane DRAFT PRs, run in parallel with the SHWL build lane.
> Each checker touched no `src/` and no build-lane file, edited nothing in its target, and returned a verdict.
> Committed here as evidence on a branch separate from the build lane and every target lane. **HELD — no
> wide-lane PR is merged this wave; these verdicts are held for the founder's word.** These are checks of DRAFT
> authorities/docs that authorize nothing.

## Summary
| Lane | PR | Scope | Verdict |
|---|---|---|---|
| W1 VB1-hardening amendment | #98 | full check vs its VB3 entry criteria | **CLEAN** |
| W2 VB2 ClassifiedObjectStore amendment | #101 | full check vs its six requirements | **CLEAN** |
| W3 Dispatcher final-authority (supersedes #92) | #100 | full check vs six mechanical hard rules | **CLEAN** (1 SoD design-note) |
| W4 Evidence-ledger reconciliation | #103 | light consistency | **CONSISTENT** |
| W5 Roadmap tracker v6 | #102 | light consistency | **CONSISTENT** |

---

## W1 (#98) VB1-hardening — VERDICT: CLEAN
Coherently specifies all five VB3 entry criteria, each with an acceptance test; cites resolvable full-40-char blob SHAs (`2ad8d3daf61e87e8c6584a34b19c7613a7b26434` checker-report-round2, `670046b74b805790de785daa3f14cb0c7f5bad12` V8-B contract); no soak-pass line; honest DRAFT, no readiness claim; VB1 residuals (LOW-2/NEW-1/NEW-2) faithfully reflected.
- **EC-1** rollback commit-phase TOCTOU (NEW-2): PASS — re-canon + re-check containment before each write + O_NOFOLLOW-or-fd; acceptance test = tampered-manifest + symlink-race must fail closed with no advisory lock.
- **EC-2** append-only tamper-evident approval provenance: PASS — honestly framed as a VB1 baseline property (not a residual); hash-chain/monotonic; acceptance test detects edit/delete/reorder/splice.
- **EC-3** mechanical single-writer guard (LOW-2/#4): PASS — single sanctioned write path, out-of-guard write structurally fail-closed regardless of lock.
- **EC-4** module-private verifier not a defaultable `act()` arg (NEW-1): PASS — verifier set only by VB3 wiring; acceptance test refuses a substituted verifier.
- **EC-5** proven-still-inert-at-freeze (ran=0): PASS — reproduces the HIGH-1 repros (forged `{wired:true}`→NO_WIRED_APPROVAL, ran=0).
- Notes for a future VB3-time checker (non-blocking): EC-2 rests on author framing (no round-2 lineage) but is not misrepresented; EC-5 is a baseline anchor not a post-wiring proof; nothing here is satisfied yet — all entry criteria, correctly deferred.

## W2 (#101) VB2 ClassifiedObjectStore — VERDICT: CLEAN
Coherent, honestly scoped, authorizes nothing; all four §28 citations resolve as blobs and match `HEAD:<path>` (`670046b7…` contract, `44d6a6d3…` cto-queue, `7e4d5eb7…` queue-view, `37c42c1a…` schema); no soak-pass line; DRAFT with repeated no-readiness disclaimers.
- (1) Opaque object IDs: PASS — no meaning/ordering/handle; grounded in the real `^q[0-9a-f]{12}$` id + duplicate-id refusal.
- (2) Separate metadata vs content authorization: PASS — two grants; SECRET/blocked never in metadata; honest "content withheld", tied to real `displaySafe` redaction.
- (3) Append-only hash-chained QueueEvent log: PASS — `previous_hash`+`event_hash` with explicit formula, genesis sentinel, `intact | broken-at-<id>` verification.
- (4) Immutable content-addressed snapshots: PASS — write-once; change = new snapshot + event; corrupt never served.
- (5) Explicit + logged retention: PASS — horizon vs caller DATA; deletion needs explicit request + event before bytes released; no silent GC.
- (6) Distinct pending/dismissed/expired + honest UNKNOWN: PASS — additive to the real `queued/blocked/done/UNKNOWN`; mapping explicit; UNKNOWN grounded in the real label.
- Forward design note (non-blocking): reconcile the ~48-bit scaffold id entropy with §1's "infeasible to enumerate" when the store is actually built.

## W3 (#100) Dispatcher final-authority — VERDICT: CLEAN
All six mechanical hard rules present and mechanically stated; faithfully supersedes #92 (CF-1…CF-5 + F1–F7 carried, log strengthened into HR-6) with no regression; authorizes nothing; three §28 citations resolve (`3200874d…` proposal, `6436eadf…` round-1 checker, `1817cf2b…` separation-of-duties); no soak-pass line.
- **HR-1** signed out-of-band routing envelope: PASS (no infer-from-payload fallback; binds origin/dest/`path@SHA`/nonce/freshness).
- **HR-2** replay protection: PASS (one-time nonce + independent freshness; nonce bound into signed body).
- **HR-3** origin→destination DENY matrix, CTO↔Advisor=DENY, default-deny, deny-before-allow: PASS.
- **HR-4** Key-Custody Authority named as a dependency, custody not granted, no self-minted keys: PASS.
- **HR-5** hardware-backed founder step-up (software key necessary-not-sufficient; bound to nonce+`path@SHA`): PASS.
- **HR-6** anchored, append-only, hash-chained ledger: PASS.
- **SoD design-completeness note (must close before build authorization, non-blocking for the DRAFT):** HR-4 names the KCA as a dependency but does not require the KCA itself to be an authority provably DISJOINT from CTO/Advisor/dispatcher/founder — a concentration point. Partially mitigated by HR-5's founder-physical step-up + "no agent mints its own key," but before any build lane: (a) the KCA authorization artifact must exist and be §28-cited, and (b) the KCA must be provably disjoint from the roles it attests.

## W4 (#103) Evidence-ledger reconciliation — VERDICT: CONSISTENT
- VB1 pre-signature-audit recorded ABSENT/MISSING honestly, NOT fabricated/backfilled/backdated (Law 54); genuine absence confirmed (`git ls-files docs/assembly-evidence/VB1/` = checker-report.md, checker-report-round2.md, soak/SOAK_PLAN.md only).
- Original founder quote preserved byte-identical; only an appended reconciliation annotation.
- §28 reconciliation invents NO SHAs — the four wide-lane DRAFT authorities recorded in prose as "to be stamped on merge," no unresolvable AUTHORITY cell, no soak-pass line.
- Only the two ledger files touched (against merge-base).

## W5 (#102) Roadmap tracker v6 — VERDICT: CONSISTENT
Reflects on-disk truth without overstatement, verified at base `ecba6a7`: VB0 ACCEPTED (G3-B-VB0 + evidence); VB1 MERGED-but-NOT-accepted, no §29 soak-pass artifact (soak dir = SOAK_PLAN.md only); VB2 merged non-executing scaffold; dispatcher/V8-C merged DRAFTs; SHWL authority state; host-control infrastructure ABSENT as code (no v8b3+, no host-control/lease modules). Nothing "accepted/live" without an on-disk artifact; Law-54 UNKNOWNs honest; no readiness claim. Minor non-defect: a host-control note enumerates only the V8-B pipeline dirs (src/ also holds V8-A dirs) — the load-bearing absence claims hold.

---
**Disposition:** all five wide lanes verified positive. Per the wave instruction, **no wide-lane PR is merged**; these DRAFTs authorize nothing and are held for the founder's word. The W3 KCA-disjointness note and the W2 id-entropy note are recorded as must-address-before-build-authorization items for those future lanes.
