# OpenSandbox — Phase 1 Architecture Audit Lane (DOCUMENTATION-ONLY)

- **Objective:** Determine whether OpenSandbox is a credible candidate for a later, isolated FounderGate spike (builder / checker / rehearsal / rendered-UI evidence lanes). Hypothesis evaluation, **not** an adoption decision. No spike is authorized.
- **Base SHA (FounderGate main, read during preflight):** `e1ca1989d2397297a450893f7890dbe7fc21e494`
- **Branch:** `audit/opensandbox-phase1`
- **Worktree:** `/Users/yosiwizman/Projects/foundergate-wt-opensandbox-phase1`
- **Evaluated OpenSandbox commit:** `192b5bf54a5fd01c7050ba4de9aba48939776cef` (branch `main`, 2026-07-17T19:57:56+08:00), read-only shallow checkout at `/tmp/foundergate-opensandbox-phase1-source`.

## Allowed files (only these may be created/edited)
- `docs/lanes/OPEN_SANDBOX_PHASE1_ARCHITECTURE_AUDIT_LANE.md`
- `docs/research/opensandbox/OPEN_SANDBOX_ARCHITECTURE_AUDIT.md`
- `docs/research/opensandbox/OPEN_SANDBOX_LICENSE_COMPATIBILITY.md`
- `docs/research/opensandbox/OPEN_SANDBOX_INTEGRATION_SEAM_ANALYSIS.md`
- `docs/research/opensandbox/OPEN_SANDBOX_PHASE1_CHECKER_REPORT.md`
- `docs/status/OPEN_SANDBOX_SPIKE_DECISION_PACKET.md`

## Forbidden files
Every other FounderGate file. No change to main, frozen candidates, soak evidence branches, qualification/acceptance artifacts, the gate ledger, or the evidence ledger.

## Boundaries
- **No-install:** no uvx/pip/npm/package installs; no OpenSandbox/osb/MCP/Playwright/Chromium execution.
- **No-Docker:** no Docker/Compose/Kubernetes/Kind/Helm; no container started; no port bound; no server started.
- **No-M1:** the Mac Mini M1 / qual-host-m1 is not contacted, inspected, pinged, mounted, or signalled. Work runs only on this Apple **M4 Pro** Mac mini (Model Mac16,11) — mechanically proven not-M1.
- **No-AKIOR:** the AKIOR repo is not accessed, cloned, fetched, inspected, modified, or directed.
- **No-merge:** no PR is merged; no PR marked ready-for-review; the branch/worktree are not deleted.

## Evidence requirements
Every material claim carries a class: VERIFIED-DOCUMENTED · VERIFIED-GITHUB-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN. A README claim is documentation evidence, **not** runtime proof. Docker default isolation is **not** described as gVisor/Kata/Firecracker equivalence. Time-sensitive claims carry a retrieval date + source.

## Roles
- **Founder:** acceptance authority only (non-developer, post hand surgery). Not asked to operate Docker/TOML/keys/logs. Receives one plain-English result + one draft HOLD PR.
- **FounderGate Advisor:** technical recommendation authority.
- **Harvest Terminal:** lane orchestrator + merge sheriff (this terminal).
- **Independent checker:** verifier in a separate context (checker ≠ architecture author).

## Independent-check requirement
The architecture author does not check or approve its own work. A separate checker reads the evaluated OpenSandbox files at the exact SHA, challenges every material claim, and issues CHECKER-CLEAN / CHECKER-FINDINGS / INSUFFICIENT-EVIDENCE into `OPEN_SANDBOX_PHASE1_CHECKER_REPORT.md`.

## Stop conditions
Stop without creating anything if: machine identity is not provably not-M1; repo identity/clean-state/main-alignment/lane-disjointness cannot be proven; the branch/worktree/tmp-source already exist (report collision, do not reuse). Stop the lane (no merge) on any genuine safety violation. Phase 2 execution is **NOT authorized** by this lane.
