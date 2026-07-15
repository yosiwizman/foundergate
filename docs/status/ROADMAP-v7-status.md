# FounderGate Roadmap Tracker — v7-status

**STATUS: v7-status · living tracker · SUPERSEDES v6 (`docs/status/ROADMAP-v6.md`)**

> **Plain English.** This is the on-disk, current-state tracker for the V8-B ("build era") pipeline and its
> surrounding proposals/authorities. It is a truthful twin of where each piece actually stands *on disk right now* —
> not where we hope it lands. One row per work item: what it is, whether it is merged, whether the founder has
> **accepted** it, and the exact evidence that backs the claim. `docs/assembly-evidence/STAGE_TRACKER.md` remains the
> stage-level V8-A summary; `docs/assembly-evidence/WHERE_AM_I.md` holds live per-substep detail; the authoritative
> master roadmap is `docs/ROADMAP.md` (V8.11). This tracker sits alongside them and does not replace or edit them.
>
> **This tracker supersedes `docs/status/ROADMAP-v6.md`** (which was honest at its own base `ecba6a7` but now lags
> current main). v6 remains on disk as a historical snapshot; where v6 and this v7-status disagree for
> *current-state* reading, this v7-status governs — subject to the same rule below that a signed ledger beats either.
>
> **As of:** 2026-07-14 · **Base:** main `0a48a144c5f0a2d16d346d1eb7596c1f8395c97d` · **Repo:** private ·
> **Author lane:** Lane B (docs-only). **This tracker makes no readiness, approval, pilot, or production claim.**

---

## Proof-label discipline (inherited from the Current Proof Ledger, `docs/ROADMAP.md` §1.5)

No row below may exceed its label. **MERGED is not ACCEPTED. Scaffold is not executing. A DRAFT authorizes nothing.
A soak is not passed until a named `SOAK PASS` with real spanning timestamps AND the full AND-gate exists on disk;
an availability/duration sub-result is not a soak pass.** UNKNOWN means the source was not verified from this base.
Per **Law 54**, anything that cannot be established from disk/ledger at this base SHA is reported as UNKNOWN rather
than guessed. **No verdict is pre-claimed for any run that is still in progress.**

---

## V8-B pipeline — current on-disk state

| Item | What it is (plain English) | On-disk state | Founder acceptance | Evidence / SHA / PR |
|------|----------------------------|---------------|--------------------|---------------------|
| **VB0 — Attached Projects Registry (persistent attach)** | Read-only foundation that remembers which projects are attached; enforces cross-project isolation (never auto-attach; no SECRET/state bleed; honest UNKNOWN). No executor, no live path. | **MERGED · code present** (`src/v8b0/*`, 5 modules) | ✅ **ACCEPTED** — `G3-B-VB0` (2026-07-12), product-final `041c80d`. First V8-B sub-system accepted. | Founder Gate Ledger row `G3-B-VB0` (ACCEPTED; pre-acceptance audit 6/6 PASS); `docs/assembly-evidence/VB0/` (vb0-completion + checker rounds 1–3 + pre-signature + pre-acceptance audits); build PR #84 `041c80d`. Two non-blocking residuals recorded as contract notes (hardlink isolation deferred to File Cabinet guard; project id = 64-bit SHA-256 truncation). |
| **VB1 — Run Launcher SAFETY CORE (executor · rollback · session-token)** | The one gated writer: backup-before-write + fail-closed root-contained rollback, short-lived boot-bound revocable session tokens, cross-process O_EXCL lock. Act edge is HMAC-authenticated and machine-gated on VB3 (`VB3_VERIFIER = null` → nothing acts for real). | **MERGED · code present** (`src/v8b1/*`, 8 modules); nothing executes for real (VB3 not wired) | ⏸️ **NOT ACCEPTED — acceptance HELD.** Only `G1-B-VB1` (start, APPROVED) exists; there is **no** `G3-B-VB1`. | Founder Gate Ledger `G1-B-VB1` (APPROVED); Evidence Ledger row `VB1` (#90 `ddafb6d`, round-2 checker ALL CLOSED). Three tracked VB1→VB3 residuals (LOW-2 write-intent guard; NEW-1 verifier binding; NEW-2 commit-phase O_NOFOLLOW), none exploitable in VB1. **Qualifying-soak state: see the Qualifying-soak section below.** |
| **VB2 — CTO-queue data model + read-only UI shell** | NON-EXECUTING scaffold: schema + accessors + escaped display. No act/approval/execute edge; no `src/v8b1` import; SECRET/blocked refused at ingress and redacted at render. Act/wiring deferred to VB3. | **MERGED · code present** (`src/v8b2/*`, 4 modules); **non-executing scaffold** | ❌ **NOT ACCEPTED** (no acceptance gate; built wide-safe by an independent builder). | Evidence Ledger row `LANE-B/VB2` (#91 `eeff0b1`, adversarial checker VERDICT CLEAN; 3 LOW hardening findings closed). A **ClassifiedObjectStore amendment authority is now founder-SIGNED** (W2, authorizes no build) with 3 build-time items tracked-open — see the Wide-lane authorities section. **VB2 rebuild is NOT started** (frozen/tracked). |

**Not started (frozen/tracked):** VB2 rebuild, dispatcher build, VB3, doctrine backlog, and the RC-gate. None has a
build authorization; each remains tracked-open only.

---

## Qualifying soak (VB1 §29) — current state

| Run | State | Verdict | Evidence |
|-----|-------|---------|----------|
| **VB1 run-1 — first lease-guarded 8–9h qualifying soak** | **MERGED + STAMPED** (evidence PR #115 `be116b5`; ledger stamp PR #116 `bf7c905`). Independently VERIFIED by the Harvest Terminal (evidence-only diff — zero src/CI/code change). | **VERIFIED-NOT-PASSED.** Availability PASS (100% over 28 samples) and span ELIGIBLE (8.13h) are availability/duration sub-results only; the AND-gate fails on the **permanent §5.1 QUIET_HOST downgrade** — quiet-host was **lost to host idle-sleep** (10 stale-heartbeat violations, first 16:33:34Z). Attested SHA under test `c22b86a`; freeze-manifest-bound, no code drift, no capability leak. | Evidence Ledger row `VB1-SOAK-NOT-PASSED`; `docs/assembly-evidence/VB1/soak/run-2026-07-14/*` (`VERDICT.txt` = "…SOAK — NOT-PASSED", monitor record, intervention log, attestation anchor, freeze-manifest). **Consequence: no 24h soak; no re-run authorized from this run; VB1 acceptance stays HELD.** |
| **VB1 run-2 — soak on the Qualification Host (M1)** | **RELEASED on the Qualification Host tonight; IN PROGRESS.** Its result arrives **separately** and is **not on disk at this base**. | **UNKNOWN — verdict pending; NOT pre-claimed.** No `SOAK PASS`, no `NOT-PASSED`, no artifact for run-2 exists at this base. This tracker records only "in progress, verdict UNKNOWN" and asserts nothing further. | No run-2 artifact on disk (only `run-2026-07-14/` = run-1). Recheck the ledger for the run-2 verdict when its evidence is committed and independently verified. |

---

## Proposals / routers / authority — merged DRAFTs (authorize nothing)

| Item | What it is | On-disk state | Authorizes | Evidence / SHA / PR |
|------|-----------|---------------|------------|---------------------|
| **Dispatcher design (proposal)** | Separation-of-duties router (CTO ≠ Advisor; AUDIT→Advisor / BUILD→CTO never crossing; gate signatures never auto-issued — founder-only; dispatcher itself SENSITIVE). | **MERGED DRAFT** (`docs/lanes/dispatcher-proposal.md`) | **Nothing.** Must-fix F1–F7 before any build authorization. | Evidence Ledger row `LANE-A` (#92 `81ad7c3`); `docs/lanes/authority/separation-of-duties.md`; checker: §28 authority CLEAN, design revised to 5 mechanical rules (F4/F7 tracked). **Superseded in authority by the dispatcher final-authority DRAFT — see Wide-lane authorities.** |
| **Dispatcher final-authority (W3)** | Supersedes the proposal in authority: signed out-of-band routing envelope (HR-1), replay protection (HR-2), origin→destination DENY matrix with CTO↔Advisor=DENY (HR-3), **named Key-Custody Authority (KCA) dependency — not granted here (HR-4)**, hardware step-up on the founder gate (HR-5), anchored append-only ledger (HR-6). | **MERGED DRAFT** (`docs/lanes/dispatcher-final-authority.md`, #100 `5ba4393`); on-disk `STATUS: DRAFT — PENDING INDEPENDENT CHECK`. **AMENDED this wave (KCA clause, HR-4).** | **Nothing** (docs-only; authorizes no build; fires no gate). | `docs/assembly-evidence/dispatcher-final/W3_REPORT.md`. **NOT signed:** there is **no `G-W3`/dispatcher-final gate in the Founder Gate Ledger**; the amended draft is **pending re-check**, not accepted. |
| **V8-C ("Blueprints era") proposal** | Saved/reusable run configurations re-launched only through the wired Gate/Witness Engine (VB3) + cost enforcement (VB4). Provisional VC0..VCn DAG, a founder gate per phase, every gate PENDING V8-B whole-stage acceptance. | **MERGED DRAFT** (`docs/lanes/V8-C-proposal.md`) | **Nothing** (docs-only; PENDING V8-B, Law 69). | Merge PR #93 `7238a8c`; `docs/assembly-evidence/v8c/LANE_D_REPORT.md`. |

---

## Shared Host Workload Lease (SHWL)

| Item | What it is | On-disk state (this base) | Signature / build / acceptance | Evidence |
|------|-----------|---------------------------|--------------------------------|----------|
| **SHWL — authority** | Machine-level cooperative safety interlock so heavy local work is not accidentally started while a qualifying endurance soak owns the Mac. A cooperative interlock — **not** a security boundary. | **MERGED into main** (`docs/lanes/shared-host-workload-lease.md`). | ✅ **Founder-SIGNED** at the exact independently-checked SHA `9ef4fa0`; merged at `6a4488d` (PR #97). §12 gate honored (author≠checker≠founder); independent checker VERDICT CLEAN. **§13 execution prompt + full B→J build were HELD at signature.** | Founder Gate Ledger `G-SHWL-AUTHORITY` (APPROVED; BUILD HELD); Evidence Ledger `SHWL-AUTHORITY`; `docs/assembly-evidence/shwl/independent-check-9ef4fa0.md`. |
| **SHWL — build (implementation)** | `src/shwl/` — cooperative lease library + guard: atomic lock-dir acquire, lease_id-checked release, fail-closed RECOVERY_REQUIRED, §4.5 capability custody, §5.1 override permanently disqualifies QUIET_HOST, 14-row cross-project matrix. | **MERGED · code present** (`src/shwl/*`, 31 modules/selftests). Suite 76/76 GREEN; §8.1 matrix 14/14. | ✅ **Founder-ACCEPTED** — `G-SHWL-BUILD` (2026-07-13), build merge `628bb11` (PR #106), checker-verified code `5a9cea4`. Two-round independent checker CLEAN; pre-acceptance audit 5/5 PASS; disclosed events.log residual accepted as recorded. **Steps I (clean AKIOR quiet-host rerun) and J (FounderGate qualifying soak) remain HELD.** | Founder Gate Ledger `G-SHWL-BUILD` (ACCEPTED; steps I/J HELD); Evidence Ledger `SHWL-BUILD`; `docs/assembly-evidence/shwl-build/{BUILD_REPORT,checker-report-round1,checker-report-round2,pre-acceptance-audit}.md`. |

---

## Host-control / evidence-integrity infrastructure — PRESENT (merged `src/` code)

Unlike at the v6 base (where these were ABSENT, authority/doc only), the four evidence-integrity lanes that **gate
every future §29 soak** are now MERGED as code. Each was built by ONE builder + ONE INDEPENDENT adversarial checker
(report = evidence, looped to CLEAN), disjoint by directory. Combined suite 82/82 GREEN on main at merge. **No soak
ran from these lanes; steps I/J untouched.** Every heavy entry point imports the ACCEPTED `src/shwl` guard
(imported-not-modified).

| Piece | Code on disk? | Module / PR | Checker |
|-------|---------------|-------------|---------|
| **L1 — Freeze-manifest** | ✅ PRESENT | `src/freeze-manifest/*` (4 modules) · #111 `5f3a1d2` | r1 CLEAN-core + A1–A4 advisories → r2 A1–A4 CLOSED (3 test-strength follow-ups tracked). |
| **L2 — Run-attestation** | ✅ PRESENT | `src/run-attestation/*` (5 modules) · #112 `69a312b` | r1 NOT-CLEAN (F1 undisclosed full-rewrite) → r2 CLOSED (disclosed as accepted events.log-class residual + `expectedHeadHash` anchor). |
| **L3 — Environment-provenance** | ✅ PRESENT | `src/environment-provenance/*` (2 modules) · #110 `a9f0deb` | r1 NOT-CLEAN (F1/F2 HIGH value-leak) → r2 F1–F5 CLOSED. |
| **L4 — Quiet-host continuous monitor + preflight** | ✅ PRESENT | `src/quiet-host-monitor/*` (6 modules) · #113 `490477a` | CLEAN. Detection complement (§8/§10) + preflight (§4.2); permanent QUIET_HOST downgrade via §5.1; no process-kill surface. |
| **Reviewed soak driver** | ✅ PRESENT | `src/tools/soak-driver.mjs` (Lane 1) · #118 `490440d` (merge) | Independent adversarial checker **VERDICT CLEAN** — `docs/assembly-evidence/soak-driver-harvest/checker-report.md`. Verdict gate is a single strict `=== true` AND-expression (accumulator ∧ quiet-eligible ∧ no-drift); the ONLY source of `isPass:true`. |
| **Lease IMPLEMENTATION code** | ✅ PRESENT | `src/shwl/*` (accepted; see SHWL section). | — |

Stamped: Evidence Ledger row `L1-L4-EVIDENCE-INTEGRITY` (#111/#112/#110/#113, `5f3a1d2`).

---

## Wide-lane authorities — founder-SIGNED this wave (authorize no build)

| Item | What it is | On-disk state | Signature | Tracked-open |
|------|-----------|---------------|-----------|--------------|
| **W1 — VB1-hardening amendment** | Five VB3 entry criteria adopted as binding VB3 build preconditions (EC-1 rollback TOCTOU/O_NOFOLLOW · EC-2 immutable approval provenance · EC-3 mechanical single-writer · EC-4 module-private verifier · EC-5 proven-inert-at-freeze). | **MERGED DRAFT** (`docs/lanes/vb1-hardening-amendment.md`, #98 `900fc10`). | ✅ **Founder-SIGNED** — `G-W1-VB1-HARDENING` (2026-07-14) at main `490440d`; independent re-check (run 2) VERDICT CLEAN. **Authorizes no build; fires no G1-B-VB* gate; VB1 acceptance stays HELD.** | **W1-H1** (labeled soak sub-result) adopted as a TRACKED hardening item — future evaluation-class lane, not authorized now. The §29 accumulator / PASS-emitter code is untouched. |
| **W2 — VB2 ClassifiedObjectStore amendment** | Data-model amendment for the VB2 CTO-queue store. | **MERGED DRAFT** (`docs/lanes/vb2-classifiedobjectstore-amendment.md`, #101 `6181876`). | ✅ **Founder-SIGNED** — `G-W2-VB2-COS` (2026-07-14) at main `490440d`; independent re-check (run 2) VERDICT CLEAN. **Authorizes no build.** | **3 build-time items** carried as must-fix-before-build (quantify ID entropy · pin hash function · specify status mapping). No rebuild authorized this wave. |
| **W3 — Dispatcher final-authority** | See Proposals table (HR-1..HR-6, KCA/HR-4). | **MERGED DRAFT** (`docs/lanes/dispatcher-final-authority.md`, #100 `5ba4393`); `STATUS: DRAFT — PENDING INDEPENDENT CHECK`. **AMENDED (KCA clause, HR-4).** | ⏸️ **NOT SIGNED — pending re-check.** No `G-W3` gate exists in the Founder Gate Ledger. | Re-check required before any signature; must-fix F1–F7 (from the proposal) plus the KCA dependency remain build-lane prerequisites. |

Both W1 and W2 signatures stamped together in PR #119 `f91a215` (GATE 0). W1/W2 authorize **no build**; W3 is not yet signed.

---

## Pre-signature-audit gap (VB1) — OPEN

The `G1-B-VB1` founder quote referenced an independent VB1 pre-signature audit "to be committed" at
`docs/assembly-evidence/VB1/advisor-pre-signature-audit.md`. **That artifact is ABSENT on disk** — the VB1 evidence
directory holds only `checker-report.md`, `checker-report-round2.md`, and `soak/`. Per the W4 reconciliation note in
the Founder Gate Ledger (`G1-B-VB1`), the founder quote is preserved verbatim; only the artifact's recorded status
is corrected from "to be committed" to MISSING. It was NOT fabricated, backfilled, or backdated (Law 54). **This gap
stays OPEN** until the genuine independent advisor pre-signature audit is committed at that path. (By contrast, the
VB0 pre-signature audit `docs/assembly-evidence/VB0/advisor-pre-signature-audit.md` exists on disk.)

---

## Not started — frozen / tracked (no build authorization)

| Item | State |
|------|-------|
| VB2 rebuild | Not started. W2 amendment SIGNED (authorizes no build); 3 build-time items tracked-open. |
| Dispatcher build | Not started. W3 final-authority DRAFT pending re-check, NOT signed; F1–F7 + KCA prerequisites open. |
| VB3 (Gate/Witness Engine — the act edge) | Not started. `VB3_VERIFIER = null`; W1 EC-1..EC-5 adopted as binding preconditions. |
| Doctrine backlog | Not started / tracked. |
| RC-gate | Not started / tracked. |

---

## UNKNOWN / recheck items (Law 54)

| Item | Reported status | On-main at this base? |
|------|-----------------|------------------------|
| **VB1 run-2 qualifying soak verdict** | IN PROGRESS on the Qualification Host (M1); verdict **UNKNOWN**, **not pre-claimed** | **No run-2 artifact on main at `0a48a14`.** Arrives separately; recheck the ledger when committed + independently verified. |
| VB1 advisor pre-signature audit artifact | MISSING (gap OPEN, see above) | Absent at this base. |
| Dispatcher final-authority independent re-check verdict | Pending (draft AMENDED, not signed) | Draft present; no re-check verdict / `G-W3` gate on main at this base. |
| Any live CI / PR / branch / GitHub state not network-verified in this pass | UNKNOWN | Recheck required before any gate/merge/investor claim (Current-State Recheck Rule, `docs/ROADMAP.md` §1.5). |

---

## Supersession & scope note

This v7-status tracker **supersedes `docs/status/ROADMAP-v6.md`** for current-state reading of the V8-B era and is
honest at main `0a48a144c5f0a2d16d346d1eb7596c1f8395c97d`. It does **not** edit, replace, or invalidate
`docs/ROADMAP.md` (V8.11, the authoritative master roadmap), `docs/assembly-evidence/STAGE_TRACKER.md`,
`docs/assembly-evidence/WHERE_AM_I.md`, or any ledger — those remain the authorities they were. Per the Proof Ledger
law, nothing here may be read as a readiness, approval, pilot, platform, commercial, or production claim. **No
verdict is claimed for any in-progress run.** Where this tracker and a signed ledger disagree, the ledger wins and
this document must be corrected.
