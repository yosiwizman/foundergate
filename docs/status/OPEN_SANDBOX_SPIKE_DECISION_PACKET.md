# OpenSandbox — Phase 1 Spike Decision Packet (DOCUMENTATION-ONLY)

**FounderGate base SHA:** `e1ca1989d2397297a450893f7890dbe7fc21e494` · **Evaluated OpenSandbox commit:** `192b5bf54a5fd01c7050ba4de9aba48939776cef` (2026-07-17) · **Independent checker verdict:** CHECKER-FINDINGS (one LOW factual finding — corrected). **No install · No Docker · No sandbox executed · No M1 contact · No AKIOR contact · No main merge · Phase 2 NOT authorized.**

## Four build-gate determinations (each determined independently)

### ARCHITECTURE_CONFIRMED: **YES**
The Docker-only Mac topology (server + `execd` + optional egress sidecar; bridge mode; ports 8090 + per-sandbox 44772; SQLite default store; no Redis/K8s required), the **isolation boundary** (default `runc` = standard container isolation, *not* kernel/microVM; gVisor/Kata/Firecracker opt-in), the **egress behavior** (Docker-parity sidecar; deny-by-default via `dns+nft`; fail-closed on setup; HTTPS MITM experimental), and the **integration seam** (REST/OpenAPI primary) are documented well enough — with cited file paths — to design a bounded spike **without guessing**. Honestly documenting what the isolation does *not* prove is itself sufficient design input. [VERIFIED-DOCUMENTED]

### SCOPE_DISJOINT: **YES**
A future Phase-2 spike is designed to run on a **non-M1 spare machine**, uses only a trivial throwaway repo, and touches **no** FounderGate main, AKIOR, frozen candidate, soak evidence branch, qualification/acceptance artifact, gate/evidence ledger, production code, secret, or active lane file. This Phase-1 lane is already disjoint (dedicated worktree/branch; only `docs/research/opensandbox/` + lane/decision docs changed; VB2 and the M1 soak untouched — checker-confirmed).

### AUTHORITY_IDENTIFIED: **YES**
Recorded: **Founder = final acceptance authority** (non-developer, acceptance-only); **FounderGate Advisor = technical recommendation authority**; **Harvest Terminal = lane orchestrator + merge sheriff**; **builder = spike implementer**; **independent checker = verifier**. **No merge or adoption without a later founder gate.** **This Phase-1 prompt does not authorize Phase-2 execution.**

### SAFE_TO_BUILD: **YES** (Phase-2 execution nonetheless remains NOT AUTHORIZED)
The proposed spike (architecture-audit §J) has a **bounded host** (one non-M1 spare machine), **bounded files** (a trivial repo; no host source mount; no docker.sock into the sandbox), **bounded network** (deny-by-default egress; no live credentials/keys), **bounded duration** (short TTL), **explicit teardown + verify-absent**, **no credentials / no customer data / no production authority**, **no M1 / no AKIOR contact**, and a **falsifiable proof plan** (attempt-a-forbidden-write-and-record-the-refusal; prove no unintended mount). SAFE_TO_BUILD = YES does not authorize execution — a founder gate is still required.

## Rule
All four gates are **YES**, so the recommendation is permitted to be ADOPT_CANDIDATE (were any NO/UNKNOWN, it could not be).

## Recommendation: **ADOPT_CANDIDATE_FOR_SPIKE** (not adoption)
OpenSandbox is a **credible candidate for a later, isolated FounderGate spike**. It is actively developed (per-component semver; 12,043★; OpenAPI contracts), offers documented machine-verifiable teardown, documented Docker-parity deny-by-default egress, and a clean REST seam that FounderGate can hide behind its own replaceable adapter. The honest caveats — **default Docker isolation is standard-container, not kernel-strong; strict egress needs `dns+nft`; HTTPS interception is experimental; the Python SDK is pre-1.0; resource cost is UNKNOWN; secure runtimes on macOS are LARGE/UNKNOWN effort** — are exactly the falsifiable questions a bounded Phase-2 spike would answer, not disqualifiers. A spike must be evaluated against a FounderGate-owned adapter and must not overstate Docker-only isolation.

## Claim classes used
VERIFIED-DOCUMENTED · VERIFIED-GITHUB-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN (no "PASS").
