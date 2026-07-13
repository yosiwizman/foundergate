# FounderGate Roadmap Tracker — v6

**STATUS: v6 · living tracker**

> **Plain English.** This is the on-disk, current-state tracker for the V8-B ("build era") pipeline and its
> surrounding proposals. It is a truthful twin of where each piece actually stands *on disk right now* — not where
> we hope it lands. One row per work item: what it is, whether it is merged, whether the founder has **accepted**
> it, and the exact evidence that backs the claim. `docs/assembly-evidence/STAGE_TRACKER.md` remains the
> stage-level V8-A summary; `docs/assembly-evidence/WHERE_AM_I.md` holds live per-substep detail; the authoritative
> master roadmap is `docs/ROADMAP.md` (V8.11). This tracker sits alongside them and does not replace or edit them.
>
> **As of:** 2026-07-13 · **Base:** main `ecba6a7ed28381180f52ed7c0b903abe5edd8088` · **Repo:** private ·
> **Author lane:** W5 (docs-only). **This tracker makes no readiness, approval, pilot, or production claim.**

---

## Proof-label discipline (inherited from the Current Proof Ledger, `docs/ROADMAP.md` §1.5)

No row below may exceed its label. **MERGED is not ACCEPTED. Scaffold is not executing. A DRAFT authorizes nothing.
A soak is not passed until a named `SOAK PASS` with real spanning timestamps exists on disk. UNKNOWN means the
source was not verified from this base.** Per **Law 54**, anything that cannot be established from disk/ledger at
this base SHA is reported as UNKNOWN rather than guessed.

---

## V8-B pipeline — current on-disk state

| Item | What it is (plain English) | On-disk state | Founder acceptance | Evidence / SHA / PR |
|------|----------------------------|---------------|--------------------|---------------------|
| **VB0 — Attached Projects Registry (persistent attach)** | Read-only foundation that remembers which projects are attached; enforces cross-project isolation (never auto-attach; no SECRET/state bleed; honest UNKNOWN). No executor, no live path. | **MERGED · code present** (`src/v8b0/*`) | ✅ **ACCEPTED** — `G3-B-VB0` (2026-07-12), product-final `041c80d`. First V8-B sub-system accepted. | `docs/assembly-evidence/VB0/` (vb0-completion + checker rounds 1–3 + pre-signature + pre-acceptance audits); build PR #84 `041c80d`; accept PR #87 `19fd2f7`. Two non-blocking residuals recorded as contract notes (hardlink isolation deferred to File Cabinet guard; project id = 64-bit SHA-256 truncation). |
| **VB1 — Run Launcher SAFETY CORE (executor · rollback · session-token)** | The one gated writer: backup-before-write + fail-closed root-contained rollback, short-lived boot-bound revocable session tokens, cross-process O_EXCL lock. Act edge is HMAC-authenticated and machine-gated on VB3 (`VB3_VERIFIER = null` → nothing acts for real). | **MERGED · code present** (`src/v8b1/*`); nothing executes for real (VB3 not wired) | ⏸️ **NOT ACCEPTED — acceptance HELD.** Only `G1-B-VB1` (start, APPROVED) exists; there is **no** `G3-B-VB1`. The **§29 qualifying soak has NOT been run** — no `SOAK PASS` artifact exists on disk. | `docs/assembly-evidence/VB1/checker-report.md` + `checker-report-round2.md` (round-2 ALL CLOSED); `docs/assembly-evidence/VB1/soak/SOAK_PLAN.md` ("The soak has NOT been run… VB1 acceptance is [held]"); merge PR #90 `ddafb6d`. Three tracked VB1→VB3 residuals (LOW-2 write-intent guard; NEW-1 verifier binding; NEW-2 commit-phase O_NOFOLLOW), none exploitable in VB1. |
| **VB2 — CTO-queue data model + read-only UI shell** | NON-EXECUTING scaffold: schema + accessors + escaped display. No act/approval/execute edge; no `src/v8b1` import; SECRET/blocked refused at ingress and redacted at render. Act/wiring deferred to VB3. | **MERGED · code present** (`src/v8b2/*`); **non-executing scaffold** | ❌ **NOT ACCEPTED** (no acceptance gate; built wide-safe by an independent builder). | `docs/assembly-evidence/VB2/LANE_B_REPORT.md` + `checker-report.md` (adversarial checker VERDICT CLEAN; 3 LOW hardening findings closed); merge PR #91 `eeff0b1`. **ClassifiedObjectStore amendment is a DRAFT (W2 lane)** — see UNKNOWN / parallel-lane section below; not on main at this base. |

---

## Proposals / routers / authority — merged DRAFTs (authorize nothing)

| Item | What it is | On-disk state | Authorizes | Evidence / SHA / PR |
|------|-----------|---------------|------------|---------------------|
| **Dispatcher design** | Separation-of-duties router (CTO ≠ Advisor; AUDIT→Advisor / BUILD→CTO never crossing; gate signatures never auto-issued — founder-only; dispatcher itself SENSITIVE). | **MERGED DRAFT** (`docs/lanes/dispatcher-proposal.md`) | **Nothing.** Must-fix F1–F7 before any build authorization. | Merge PR #92 `81ad7c3`; `docs/lanes/authority/separation-of-duties.md`; `docs/assembly-evidence/dispatcher/{LANE_A_REPORT,checker-report}.md` (checker: §28 authority CLEAN, design NOT-CLEAN → 5 rules upgraded to mechanical; F4/F7 tracked as build-lane requirements). **Dispatcher final-authority is a DRAFT (W3 lane)** — not on main at this base (see UNKNOWN section). |
| **V8-C ("Blueprints era") proposal** | Saved/reusable run configurations re-launched only through the wired Gate/Witness Engine (VB3) + cost enforcement (VB4). Provisional VC0..VCn DAG, a founder gate per phase, every gate PENDING V8-B whole-stage acceptance. | **MERGED DRAFT** (`docs/lanes/V8-C-proposal.md`) | **Nothing** (docs-only; PENDING V8-B, Law 69). | Merge PR #93 `7238a8c`; `docs/assembly-evidence/v8c/LANE_D_REPORT.md`. |

---

## Shared Host Workload Lease (SHWL)

| Item | What it is | On-disk state (this base) | Signature / build | Evidence |
|------|-----------|---------------------------|-------------------|----------|
| **SHWL — Shared Host Workload Lease** | Machine-level cooperative safety interlock so heavy local work is not accidentally started while a qualifying endurance soak owns the Mac. A cooperative interlock for harness entry points — **not** a security boundary. | **ABSENT from main.** Authority packet lives on branch `shwl-authority` (`docs/lanes/shared-host-workload-lease.md`), not merged into base `ecba6a7`. Independent-check work exists on branch `shwl-check-evidence`. | Authority is in **AMENDMENT / independent check**; the packet is marked `STATUS: DRAFT — PENDING INDEPENDENT CHECK AND FOUNDER APPROVAL`. **NOT signed. Build HELD** (the packet's own §13 is a HELD execution prompt). | Branch `shwl-authority` (Advisor-authored, design-only, no readiness claim). Not touched or edited by this tracker. |

---

## Host-control infrastructure — ABSENT (authority/doc only, no code)

The following host-control pieces have **no implementation code on disk** at this base. They exist, at most, as
authority/doctrine/DRAFT text; there is **no executing implementation**. Do not read any of these as live.

| Piece | Code on disk? | Note |
|-------|---------------|------|
| Freeze-manifest | ❌ ABSENT | No `src/` implementation. |
| Run-attestation | ❌ ABSENT | No `src/` implementation. |
| Environment-provenance | ❌ ABSENT | No `src/` implementation. |
| Quiet-host preflight | ❌ ABSENT | No `src/` implementation. |
| Quiet-host continuous monitor | ❌ ABSENT | No `src/` implementation. |
| Lease IMPLEMENTATION code | ❌ ABSENT | Only the SHWL authority packet (DRAFT, branch `shwl-authority`) exists; no lease runtime under `src/`. |

Verified by disk search: `src/` contains `v8b0`, `v8b1`, `v8b2` (no `v8b3+`), and no module matching
freeze-manifest / run-attestation / environment-provenance / quiet-host / lease-runtime.

---

## UNKNOWN / parallel-lane items (Law 54)

These are attributed to concurrent wide lanes and are **not verifiable from this base `ecba6a7`** — recorded as
UNKNOWN-on-main rather than asserted:

| Item | Reported status | On-main at this base? |
|------|-----------------|------------------------|
| ClassifiedObjectStore amendment (VB2) | DRAFT — parallel lane **W2** | **Not present on main at `ecba6a7`** (UNKNOWN from this base). |
| Dispatcher final-authority | DRAFT — parallel lane **W3** | **Not present on main at `ecba6a7`** (UNKNOWN from this base). |
| Any live CI / PR / branch / GitHub state not network-verified in this pass | UNKNOWN | Recheck required before any gate/merge/investor claim (Current-State Recheck Rule, `docs/ROADMAP.md` §1.5). |

---

## Supersession & scope note

This v6 tracker supersedes any prior roadmap-tracker snapshot for current-state reading of the V8-B era. It does
**not** edit, replace, or invalidate `docs/ROADMAP.md` (V8.11, the authoritative master roadmap),
`docs/assembly-evidence/STAGE_TRACKER.md`, `docs/assembly-evidence/WHERE_AM_I.md`, or any ledger — those remain the
authorities they were. Per the Proof Ledger law, nothing here may be read as a readiness, approval, pilot,
platform, commercial, or production claim. Where this tracker and a signed ledger disagree, the ledger wins and
this document must be corrected.
