# OpenSandbox Phase 6 — Public-Repo Intake Runtime Spike Lane (NARROW-SENSITIVE)

**Status:** EXECUTING · live runtime inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM · **[HOLD]** · **NO CUSTOMER CODE · NO PRIVATE REPO · NO ADOPTION · NO MERGE · NO PRODUCTION CLAIM.** One Pro builder + one independent checker.

## Founder authorization
One bounded runtime spike proving the Phase-5 public-repository intake path: **public GitHub URL → exact commit → validated immutable snapshot → disposable Ubuntu VM → OpenSandbox provider adapter → sandboxed repository check → durable evidence → sandbox teardown → source-snapshot deletion → VM destruction.** Fixed public evaluation fixture: `https://github.com/pypa/sampleproject` (open-source fixture, **not** customer code; no fallback repo). Resolve its current default HEAD to one exact immutable commit SHA before acquisition.

**Permitted:** resolve exact commit; download one public exact-commit archive; validate before extraction; canonical manifest; one disposable VM; Docker + OpenSandbox in VM only; apply the Phase-4.1 loopback patch in VM only; upload the immutable snapshot via the FounderGate intake + sandbox-provider prototypes; run only the harness-owned checks; test network denial + boundaries; export evidence; delete snapshot; destroy VM; independent checker; one draft HOLD PR.
**NOT permitted:** contacting/operating the M1; stopping/querying the M1 soak; merging main; private repo; any token/App/SSH/credential; customer code; running any repository-defined command (setup.py, pip install, npm/yarn/pnpm/make/tox/nox/CI, entry points, Makefile, package-manager lifecycle); deploy; adoption; production integration; customer execution; production-ready claim.

## Cross-machine coordination (founder-relayed; NOT independently probed from Pro)
M1 run `integrated-8h-rerun-20260717T173028Z`, evaluated SHA `b9af1def60009ac9dae69bf519b5e0a2680d4600`, reported RUNNING (start 2026-07-17T17:37:33Z). Recorded as **FOUNDER_RELAYED_RUNNING — NOT INDEPENDENTLY PROBED FROM PRO.** The M1 is not contacted. During the soak: no main merge; no soak-evidence-branch / M1-run-dir / M1-detached-worktree modification; no force-push/delete of qualification refs; no tags; no self-hosted runner; no M1-contacting automation. Remote main is monitored **read-only** via `git ls-remote` at the required checkpoints; expected `e1ca1989…`.

## Pinned state
Base = PR#156 head `e1147c50eb9b7f3bef17c6760556a0f52964df13`. main `e1ca1989…` (clean). PR#151 `e58632b`, #152 `adcb169`, #153 `3fe19c11`, #154 `f6eeb8f`, #155 `900fa8f`, #156 `e1147c5` — all OPEN/DRAFT/UNMERGED. OpenSandbox `192b5bf5…` (tested candidate, not adopted). Phase-5 verdicts: CROSS-MACHINE-PARALLELISM READY; PROCEED_TO_PUBLIC_REPO_INTAKE_RUNTIME_SPIKE.

## Rules in force
Exact-commit binding; immutable-snapshot digest; no repository script/command executes anywhere (Pro or sandbox) except the harness-owned compileability check; the public fixture lives only under `/tmp/foundergate-public-repo-phase6-<run-id>` (never `/Users/.../Projects`, a worktree, the FG repo, or the founder's home projects); no FG repo or acquired repo mounted into the VM; no macOS Docker socket; no shared folders; no LAN exposure; disposable VM destroyed after the run; disk-first recording; no mid-runtime commit; builder may not approve own work; UNKNOWN over inference.

## Allowed files (exactly fifteen)
`docs/coordination/{CROSS_MACHINE_PARALLEL_STATE.json, OPEN_SANDBOX_PHASE6_RUN_LEDGER.jsonl, OPEN_SANDBOX_PHASE6_RECOVERY_STATE.json}` · `docs/lanes/OPEN_SANDBOX_PHASE6_PUBLIC_REPO_RUNTIME_LANE.md` · `docs/research/opensandbox/phase6/{OPEN_SANDBOX_PHASE6_SOURCE_ACQUISITION_EVIDENCE.json, _COMMAND_TRANSCRIPT.md, _RUNTIME_EVIDENCE.json, _RESULT.md, _CHECKER_REPORT.md}` · `docs/status/OPEN_SANDBOX_PHASE6_DECISION_PACKET.md` · `prototypes/customer_repository_intake/{README.md, contract.py, github_public_provider.py, runtime_driver.py, test_contract.py}`.

## Stop conditions
`PHASE6-BLOCKED: MAIN-CHANGED-DURING-M1-SOAK` (remote main ≠ e1ca1989); `PHASE6-BLOCKED: M1-AUTOMATION-RISK` (self-hosted runner / M1 automation appears); `PHASE6-BLOCKED: INSUFFICIENT-DISK` (<26 GiB host before VM, or <8 GiB in VM after install); `PHASE6-HOLD: CROSS-MACHINE-CONTRACT-CHANGED` (main changes or M1 runner appears mid-run → finish teardown+deletion, do NOT push); redirect to a non-allowlisted host; any archive-validation failure; governed `0.0.0.0` binding; Docker authority in the workload (REJECT); checker REJECT/INSUFFICIENT uncorrectable in scope.
