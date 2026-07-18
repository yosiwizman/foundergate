# OpenSandbox Phase-1 Architecture Audit — INDEPENDENT CHECKER REPORT

**Role:** Independent checker (did NOT author the audit). Strictly read-only: no install, no Docker/npm/pip/uvx/osb, no server/port bound, no M1/AKIOR contact. Only file reads and read-only git queries were performed.

## Evaluated SHA (verified)
- `git -C /tmp/foundergate-opensandbox-phase1-source rev-parse HEAD` → **`192b5bf54a5fd01c7050ba4de9aba48939776cef`** — MATCHES the required SHA.
- Branch `main`; `git log -1` → commit timestamp `2026-07-17 19:57:56 +0800`, message "Merge pull request #1333 …" — matches the audit header.
- `git status` on the source: "nothing to commit, working tree clean" — the evaluated checkout is unmodified (no runtime mutation).

## Per-claim verification
**Isolation (Section C) — SUPPORTED / no overclaim.** `docs/guides/secure-container.md:30` labels `runc` (default) "Process-level cgroups … Trusted workloads, local development"; gVisor/Kata/Firecracker are opt-in via `[secure_runtime]` (`server/configuration.md:262-276`). Default `network_mode` = `host` (`configuration.md:106`), so the audit's "bridge=isolated, host=weaker" note is accurate. The explicit answer ("proves only no live-state authority intentionally provided … NOT a kernel could-not-touch boundary") is honest; boundary-#15 language is correctly withheld.

**Egress (Section D) — SUPPORTED / no overstatement.** Docker parity documented (`docs/components/egress.md:51` "Runtime: Docker or Kubernetes"). Default `dns` mode is DNS-only with direct-IP bypass; `dns+nft` gives IP-layer default-deny (`egress.md:60-62`, `configuration.md:205`). `deny.always` unconditional (`egress.md:88,94`). HTTPS MITM experimental (`egress.md:18,152-158`). Fail-closed on setup (`egress.md:22`). `CAP_NET_ADMIN` sidecar-only (`:21,52`); policy via `POST/PATCH /policy` + deny webhook. PARTIALLY-VERIFIED hedge on Docker deny-by-default is honest (the network-isolation guide is titled "on Kubernetes").

**Mac compatibility — honestly labeled.** The "Docker Desktop single shared Linux VM" is a platform property, not in the repo; the audit flags it PARTIALLY-VERIFIED and only claims VERIFIED-DOCUMENTED for the narrower "secure runtimes are optional." Correct.

**Resource cost — honest UNKNOWN.** Audit says idle/active CPU/memory/disk cost is UNKNOWN, none invented. Confirmed: only `pids_limit=4096` and port ranges are quantified.

**SDK/CLI/MCP seam — justified by least-authority.** Seams exist as claimed (SDKs python/js/kotlin/csharp/go, `osb` CLI, MCP, REST specs present). REST-primary / Python-fallback (pre-1.0 `v0.1.14`) / MCP-not-recommended, reasoned on least-authority ("MCP adds an unnecessary authority surface"), not "agent-friendly". Correct.

**License — accurate, no legal overreach.** `LICENSE:1-2` Apache-2.0; NOTICE absent (confirmed); use-vs-redistribute drawn and hedged "confirm with counsel"; dependency/image inventory required (UNVERIFIED); repeatedly marked "NOT legal advice."

**Rendered-UI / Playwright — matches source.** `docs/examples/playwright.md:50`: headless Chromium, full-page screenshot saved + downloaded; scrapes title/body only; image tag `:latest`. The audit's PARTIALLY/NOT-DOCUMENTED marks for DOM/console/network/trace/accessibility are correct.

**File presence/absence — all correct.** Absent as stated: `NOTICE`, `docs/architecture.md` (dir exists), `docs/release-verification.md`, `specs/sandbox-api.yaml` (present: `sandbox-lifecycle.yml` + `execd-api.yaml`). `docker.sock` mounted into the server only (`docker-compose.example.yaml:48`); `requires-python >=3.10`; execd v1.0.21 / egress v1.1.4 confirmed.

**GitHub metadata (Section G):** star/issue/PR/release claims carry `VERIFIED-GITHUB-METADATA` + retrieval date 2026-07-17; as a no-network checker I did not re-verify live counts; appropriately class-labeled, not challenged.

## Findings
**Finding 1 (LOW — factual, since CORRECTED by the author).** The persistence default was mis-stated as "non-persistent / UNKNOWN." Contradicted by the audit's own cited file: `server/configuration.md:239-258` documents `[store]` default `type="sqlite"`, `path=~/.opensandbox/opensandbox.db`, and states `memory` is intentionally not the default. Peripheral to the core conclusions (isolation, egress, license, spike safety). Corrected in the architecture audit to "default `[store]` is SQLite file-backed, persistent."

*(Non-blocking observations, not findings: the audit omits (a) the documented gVisor + egress-sidecar incompatibility — gVisor lacks the iptables `nat` table, `secure-container.md:722-740`, `network-isolation.md:175`; and (b) that an unauthenticated local server requires an explicit insecure-mode acknowledgment at startup, `configuration.md:67`. Both would only strengthen the audit's cautions; no correction required for a Phase-1 pass.)*

## Allowed-files + disjointness
- `git -C /Users/yosiwizman/Projects/foundergate-wt-opensandbox-phase1 status --porcelain` returns only paths within the six allowed files (lane doc + `docs/research/opensandbox/*` + the pending checker report + decision packet). No FounderGate `src/`, no gate/evidence ledger, no main-worktree file modified.
- Branch `audit/opensandbox-phase1` in a dedicated worktree; changes touch only `docs/research/opensandbox/` + the lane/decision docs — **disjoint from VB2 and the M1 soak**. No merge, no ready-for-review.
- **No install/runtime activity:** audit asserts no-install/no-Docker/no-sandbox; source checkout is git-clean; no port/server binding observed.

## VERDICT: CHECKER-FINDINGS
One LOW-severity factual finding (persistence default), peripheral and corrected. All mandated core challenge areas — Docker-isolation honesty, egress enforcement, macOS-VM boundary labeling, resource-cost UNKNOWN, REST/Python/MCP least-authority reasoning, and the Apache-2.0/NOTICE-absent/use-vs-redistribute/inventory-required license conclusion with its "not legal advice" disclaimer — are SUPPORTED with no overclaim. The evaluated SHA, allowed-file scope, lane disjointness, and no-install/no-Docker posture are confirmed clean. The finding does not block the Phase-1 recommendation once corrected.
