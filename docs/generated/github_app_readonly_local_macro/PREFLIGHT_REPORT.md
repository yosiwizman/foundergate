# PREFLIGHT — GitHub App Read-Only Local Macro (read-only)
- Machine: yosi's Mac Studio · 14 cpu · 36 GB · 302 Gi free · swap 6 GB · Playwright OK · gh=yosiwizman.
- Base head `d5acfc7692103baafb9a85f7485f23c10d157f74`; origin/main `65fd01669f80094e7ef9a0fa689c87347ae0c089` untouched; PR #200 OPEN/DRAFT untouched.
- Active authorized operation: NONE (no leases/locks/build procs). Supervisor (Terminal-0) qualified.
- Prior packages present: fine-grained PAT proof, credential-route matrix. No `github-app` branch exists yet.
- **No GitHub App private key or installation token files in the workspace.**
- Secret scan: only pre-existing **fake** negative-test fixtures (env-provenance selftests, clearly labeled) matched — no real token/key; out of this run's scope. → NOT CRITICAL_HOLD.

## N1 — Live-action gate detector
Searched `~/.foundergate` and `docs/` for a durable six-lock founder signature authorizing live GitHub App creation/installation/token. **None found.** This prompt is explicitly NOT a live-action signature.
- **LIVE_GITHUB_APP_ACTION_AUTHORITY = false**
- Expected final: **TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED** (local route prepared ready-with-limits; live action needs a separate founder gate).

## Decision
Proceed with the local-only macro (models, simulator, guards, refusal matrix, replay, UI, e2e, Checker, Gate Advisor, ZIP). No live GitHub App action.
