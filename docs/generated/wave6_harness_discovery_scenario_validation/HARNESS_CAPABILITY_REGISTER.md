# Lane H0 — Harness Capability Register (read-only discovery)
| # | Capability | Classification | Evidence |
| --- | --- | --- | --- |
| 1 | Local runner scripts | AVAILABLE_NOW | src/local_repo_runner/{fixture-runner,doctor}.mjs; src/scenario_runner/scenario-core.mjs |
| 2 | Local run-server endpoints | AVAILABLE_NOW | /api/session,health,start,export,run-fixture,run-scenario,batch-export,batch-reset,last-evidence (loopback+token) |
| 3 | Browser/Playwright harnesses | AVAILABLE_NOW | node_modules/playwright + axe-core; 16 e2e suites under tests/e2e-dashboard/ |
| 4 | Evidence/export scripts | AVAILABLE_NOW | src/evidence_viewer/export-package.mjs; src/batch_evidence/batch-core.mjs (real ditto + unzip -t) |
| 5 | Fixture runner/adapters | AVAILABLE_NOW | node/python/java/static/monorepo/deps-aware/unsupported/runtime-missing |
| 6 | Scenario runner | AVAILABLE_NOW (built this run) | src/scenario_runner/scenario-core.mjs (calendar/task/crud/static + refusals) |
| 7 | Batch runner | AVAILABLE_NOW | server-owned buffer + aggregate ZIP |
| 8 | Evidence viewer/replay/compare | AVAILABLE_NOW | /api/last-evidence + viewer compare |
| 9 | History/ledger storage | AVAILABLE_NOW | localStorage (export/import, clearable) |
| 10 | Protected-files demo | AVAILABLE_NOW | synthetic policies (client-side, no fs) |
| 11 | Launcher scripts | AVAILABLE_NOW | ~/Desktop/FounderGate_Start_Here/Open_FounderGate_Converged_Demo.command |
| 12 | Doctor scripts | AVAILABLE_NOW | src/local_repo_runner/doctor.mjs (READY_LOCAL) |
| 13 | Writable run roots | AVAILABLE_NOW | ~/.foundergate/runs + worktree |
| 14 | Read-only sandbox areas | AVAILABLE_NOW | repo tree; git metadata; gh (read-only) |
| 15 | Hard forbidden/protected | PROTECTED_GATE_REQUIRED | deploy/bill/provider/customer data/merge/PR#200/SaaS/security — all founder gates |
