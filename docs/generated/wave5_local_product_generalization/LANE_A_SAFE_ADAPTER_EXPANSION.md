# Lane A — Safe Adapter Expansion
New synthetic/self-owned adapters (execFileSync array-args, no shell, timeout, NO network/install/
provider/spend). Verified live:
| Fixture | Behavior |
| --- | --- |
| go-style | UNKNOWN_RUNTIME_MISSING (go toolchain absent) — not a failure, not green |
| rust-style | UNKNOWN_RUNTIME_MISSING (cargo absent) |
| java-style | PASS (real javac compile + java run) |
| monorepo | FAIL — 1/2 packages (pkgA PASS, pkgB FAIL); honest aggregate |
| deps-present | PASS (dependencies already present locally; no install) |
| deps-missing | HOLD_DEPENDENCIES_NOT_INSTALLED |
| py-deps-missing | HOLD_DEPENDENCIES_NOT_INSTALLED |
| install-requested | REFUSED_NEEDS_AUTHORIZATION (never installs) |
| unsupported | UNKNOWN (no safe adapter) |
Runtime missing is UNKNOWN, never failure and never green.
