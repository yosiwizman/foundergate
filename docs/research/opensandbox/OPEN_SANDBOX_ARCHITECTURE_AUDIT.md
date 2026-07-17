# OpenSandbox — Phase 1 Architecture Audit (DOCUMENTATION-ONLY)

**Subject:** https://github.com/opensandbox-group/OpenSandbox · **Evaluated commit:** `192b5bf54a5fd01c7050ba4de9aba48939776cef` (branch `main`, 2026-07-17T19:57:56+08:00). **FounderGate base:** `e1ca1989d2397297a450893f7890dbe7fc21e494`. **Retrieval date for GitHub metadata:** 2026-07-17. Digests: LICENSE `sha256:50e6751797c50dedd75ef1b8a0d9e42f5f8472e9fbce91f34718e9f97b0c780a`; README.md `sha256:298275a2e93aa0e67d80a246a0a593f045d7a6c569a5bf7e91197fb84bad06e4`.
**No install, no Docker, no sandbox executed.** A README/doc claim is documentation evidence, not runtime proof.

## Files read (present) and absent
Present: `README.md`, `LICENSE`, `SECURITY.md`, `ROADMAP.md`, `GOVERNANCE.md`, `AGENTS.md`, `server/README.md`, `server/configuration.md`, `server/opensandbox_server/examples/example.config.toml`, `server/docker-compose.example.yaml`, `cli/README.md`, `components/{execd,egress,ingress}/README.md`, `sdks/mcp/sandbox/python/README.md`, `specs/README.md`, `specs/execd-api.yaml`, `examples/README.md`, `examples/playwright/README.md`, `examples/claude-code/README.md`, `docs/architecture/{index,network-isolation,single-host-network}.md`, `docs/guides/secure-container.md`, `docs/components/egress.md`, `docs/examples/playwright.md`, `docs/guides/credential-vault.md`, `specs/{sandbox-lifecycle.yml,egress-api.yaml,diagnostic-api.yml}`.
**FILE-NOT-PRESENT** (named in the audit request, absent at this commit): `docs/architecture.md` (a `docs/architecture/` directory exists instead), `docs/release-verification.md`, `specs/sandbox-api.yaml` (present instead: `specs/sandbox-lifecycle.yml` + `specs/execd-api.yaml`), `NOTICE`.

---

## A. Minimum Docker-only Mac deployment  [VERIFIED-DOCUMENTED unless noted]
Source: `server/docker-compose.example.yaml`, `server/configuration.md`, `docs/architecture/single-host-network.md`, `server/pyproject.toml`.

- **Host software:** Docker Desktop (server mounts `/var/run/docker.sock`); a config TOML. (`docker-compose.example.yaml` lines ~40-55.)
- **Python:** server `requires-python >=3.10` (3.10–3.13) — `server/pyproject.toml:28`. (Runs as a container image `opensandbox/server:latest`, so host Python is not strictly required when using the image.)
- **Docker Desktop requirement:** yes — the runtime provider is Docker; the server drives the host Docker socket. [VERIFIED-DOCUMENTED]
- **Lifecycle server process:** FastAPI server under `server/` (`docs/architecture/index.md` §3), port `8090`.
- **Docker runtime provider:** `runc` (Docker default) unless `[secure_runtime]` selects gVisor/Kata/Firecracker (`docs/guides/secure-container.md` table; `server/configuration.md:55`).
- **execd:** per-sandbox injected daemon on container port `44772`, bundling a reverse proxy (`docs/architecture/single-host-network.md`). Image `opensandbox/execd:v1.0.21`.
- **ingress:** optional; `[ingress] mode="direct"` in the Docker example (compose config). Full ingress gateway is a Kubernetes concern.
- **egress:** optional sidecar image `opensandbox/egress:v1.1.4`; required only when clients use `networkPolicy` on create (`server/configuration.md:52`).
- **Required images:** `opensandbox/server`, `opensandbox/execd:v1.0.21`, (optional) `opensandbox/egress:v1.1.4`, plus a sandbox workload image (e.g. `opensandbox/playwright:latest`). Some tags point at an Aliyun registry mirror (`sandbox-registry.cn-zhangjiakou.cr.aliyuncs.com/...`). [VERIFIED-DOCUMENTED]
- **Ports:** server `8090`; per-sandbox only `execd` proxy port `44772` (+ optional `8080`) mapped from a host range `40000–60000` (`docker` config). [VERIFIED-DOCUMENTED]
- **Local configuration files:** `config.toml` (example.config.toml / docker-compose inline config).
- **Data persistence:** the `[store]` default is **persistent SQLite (file-backed)** — `type` default `"sqlite"`, `path` default `~/.opensandbox/opensandbox.db`; the docs state `memory` is *intentionally not* the default because server-managed records must survive restarts (`configuration.md:239-258`). [VERIFIED-DOCUMENTED — corrected per independent-checker Finding 1; the earlier "non-persistent/UNKNOWN" reading was wrong.]
- **Logs:** Python logging level via `[log] level` (`configuration.md:84`).
- **Cleanup / TTL:** per-sandbox `timeout` on create, server-side capped by `max_sandbox_timeout_seconds` (≥60) (`configuration.md:69`). Teardown is via the lifecycle delete API. [VERIFIED-DOCUMENTED]
- **Authentication:** configurable auth section exists; the Docker example sets **no token** → local default appears unauthenticated. [PARTIALLY-VERIFIED — treat local default as no-auth unless configured.]
- **Redis required?** **Not for the minimum Docker deployment** (absent from the example; `[store]` optional). [PARTIALLY-VERIFIED]
- **Kubernetes required?** **No** — `[docker]` applies only when `runtime.type="docker"`; `[kubernetes]` only when type is kubernetes (`configuration.md:47-49`). [VERIFIED-DOCUMENTED]
- **Officially documented local path?** Yes — an official Docker single-host path exists (`docker-compose.example.yaml`, `example.config.toml`, `docs/architecture/single-host-network.md`). [VERIFIED-DOCUMENTED]
- **Idle/active CPU, memory, disk-image cost:** **UNKNOWN** — not documented in the files read. (`pids_limit=4096` and per-sandbox timeouts are the only quantified limits.) No resource estimates invented.

## B. FounderGate lane mapping  [seam detail in the Integration-Seam doc]
OpenSandbox primitives (lifecycle create/get/delete + `execd` command/file ops + `get_endpoint`) map to FounderGate lanes as:
1. **Builder lane** — create sandbox (image select) → place repo (file upload / git in-sandbox) → run scripted command via execd → capture stdout/stderr/exit → extract artifacts → delete. Evidence: structured exec result + endpoint; environment digest = the image tag/digest. Timeout/cancel via lifecycle timeout + delete.
2. **Independent checker lane** — a second disposable sandbox at a pinned image running read-only checks; least-authority (no host mount, no docker.sock).
3. **Rehearsal lane** — a sandbox with an egress `networkPolicy` (bridge mode + egress sidecar) to rehearse under deny-by-default network.
4. **Rendered-UI evidence lane** — the Playwright image → headless Chromium → screenshot artifact downloaded out (§E).
5. **Disposable customer-intake review lane** — a per-intake ephemeral sandbox, deny-by-default egress, no host source mount, deleted after review.
For each: creation = lifecycle API; command exec + stdout/stderr = execd; structured result = execd API; artifact extraction = file download; teardown = delete + verify-absent; metadata = sandbox record; **exact-version binding = pin image + component digests** (the example uses mutable `:latest`/version tags — pinning is an audit assertion until done). **What is mechanical:** exec result, exit code, file digests, sandbox existence. **What remains an audit assertion:** that no unintended host authority was mounted (must be proven by the spike's negative test, §J).

## C. Isolation truth  [VERIFIED-DOCUMENTED]
Sources: `docs/guides/secure-container.md`, `docs/architecture/single-host-network.md`, `server/docker-compose.example.yaml`, `server/configuration.md`.

- **Docker default runtime = `runc`** → "Process-level cgroups", labelled "Trusted workloads, local development" (`secure-container.md` overview table). gVisor (user-space kernel), Kata (QEMU VM), Firecracker (microVM) are **opt-in** via `[secure_runtime]` — **NOT the default**.
- **On macOS**, Docker Desktop runs all containers inside a **single shared Linux VM**. That yields a VM boundary between containers and the macOS host, but it is **not** a per-sandbox microVM and **not** gVisor/Kata/Firecracker. [VERIFIED-DOCUMENTED that secure runtimes are optional; the macOS Docker-Desktop-VM boundary is a platform property, PARTIALLY-VERIFIED from these docs.]

Docker-only minimum path provides (default `runc`, bridge mode, example hardening):
- process isolation — **YES** (container/cgroup). filesystem isolation — **YES** (container fs). user-namespace isolation — **UNVERIFIED** (not shown enabled by default). syscall isolation — **PARTIAL** (default seccomp; `seccomp_profile` optional; not gVisor). Docker-socket isolation for the **sandbox** — **YES by default** (the socket is mounted into the *server*, not sandboxes) — provided no one mounts it into a sandbox. privileged-container prevention — **YES** (`no_new_privileges=true`, capabilities dropped incl. `SYS_ADMIN`/`NET_ADMIN`/`NET_RAW`/`SYS_PTRACE`; `docker-compose.example.yaml`). host-path mount prevention — **NOT ENFORCED BY DEFAULT** (host mounts are a create-time choice; the platform can mount host paths — see examples `host-volume-mount`, `docker-ossfs-volume-mount`). device-access prevention — **PARTIAL** (dropped `MKNOD`). network-namespace isolation — **YES in bridge mode** (default `host` mode shares the host stack — weaker). kernel boundary — **NO** (shared kernel under runc). microVM boundary — **NO** (only with Kata/Firecracker).
- Language forbidden by boundary #15 (hardened / strong isolation / "could not touch the host") is **not** used for the Docker-only default path.

**Explicit answer:** *A Docker-only OpenSandbox spike would prove only that **no live-state mount or authority was intentionally provided** to the sandbox (a negative, config-level result). It would NOT prove that a rehearsal **could not** touch FounderGate live state in a strong kernel sense — default `runc` shares the host kernel and host mounts are a create-time option. Strong "could-not-touch" isolation requires a secure runtime (gVisor/Kata/Firecracker) plus a proven no-mount, no-socket, deny-by-default configuration.* [VERIFIED-DOCUMENTED]

## D. Egress enforcement  [VERIFIED-DOCUMENTED unless UNVERIFIED noted]
Source: `docs/components/egress.md`, `docs/architecture/network-isolation.md`, `specs/egress-api.yaml`.
- **Enforcement component:** egress **sidecar** sharing the sandbox network namespace. **Runtime: Docker OR Kubernetes** (`egress.md` "Requirements: Runtime: Docker or Kubernetes") → **not Kubernetes-only; Docker parity documented.**
- **Traffic path:** transparent DNS proxy (port 53 redirected via iptables) + optional `nftables` IP enforcement (`dns+nft` mode).
- **Default policy / deny-by-default:** achievable — `dns+nft` mode enforces **default-deny** at DNS + IP layer; `deny.always` file gives unconditional highest-priority denial. **Default mode is `dns` (DNS-only)**, which does **not** stop direct-IP connections → strict deny-by-default requires `dns+nft`. [VERIFIED-DOCUMENTED]
- **Allowlist / domain / IP / DNS:** FQDN allowlist, wildcard subdomains, IP/CIDR targets, dynamic-DNS→nft with TTL. [VERIFIED-DOCUMENTED]
- **HTTP / HTTPS interception:** transparent DNS + optional **experimental** HTTPS MITM (mitmproxy) for 80/443 + credential injection. HTTPS interception = **experimental**. [VERIFIED-DOCUMENTED as experimental]
- **UDP / IPv6 / raw sockets:** **UNVERIFIED** — not explicitly documented for the Docker path (nft can cover IP-layer; raw sockets are blocked by dropping `NET_RAW` capability in the example). Direct-IP bypass in `dns`-only mode = **known gap**; closed by `dns+nft`. Alternate-interface / host-network-mode bypass: host-network mode shares the host stack → egress control does not apply there. [UNVERIFIED where noted]
- **Container privilege:** `CAP_NET_ADMIN` **only on the sidecar**; app container unprivileged. [VERIFIED-DOCUMENTED]
- **Fail-open / fail-closed:** **fail-closed on setup** — "the sidecar exits if no enforced redirect can be installed" (`egress.md`). Optional subsystems degrade gracefully. [VERIFIED-DOCUMENTED]
- **Policy update / audit:** policy via `POST/PATCH /policy` (machine-readable, `egress-api.yaml`); denied-hostname webhook (`OPENSANDBOX_EGRESS_DENY_WEBHOOK`). [VERIFIED-DOCUMENTED]
- **Docker/K8s parity:** the sidecar mechanism is the same; **Docker parity is documented** but the network-isolation guide is K8s-centric → treat Docker deny-by-default as documented-but-locally-unproven. [PARTIALLY-VERIFIED]

## E. Rendered-UI evidence  (Playwright)  Source: `docs/examples/playwright.md`
- headless Chromium execution — **VERIFIED-DOCUMENTED** (Playwright+Chromium headless).
- screenshot output — **VERIFIED-DOCUMENTED** (full-page screenshot saved in-sandbox and **downloaded locally**).
- HTML/DOM output — **PARTIALLY-DOCUMENTED** (example scrapes title/body text; full DOM/HTML export not shown).
- accessibility tree — **NOT-DOCUMENTED** in the example.
- console logs — **NOT-DOCUMENTED**. network logs — **NOT-DOCUMENTED**. trace files — **NOT-DOCUMENTED** (Playwright supports them; the OpenSandbox example does not document them).
- deterministic browser version — **PARTIALLY-DOCUMENTED** (Chromium pinned inside the built image; the image tag is `latest`, not digest-pinned in the example). browser-image digest — **NOT-DOCUMENTED** (mutable tag).
- artifact export — **VERIFIED-DOCUMENTED** (file download out of sandbox). clean teardown — **VERIFIED-DOCUMENTED** (lifecycle delete).

## F. Integration seam  (summary; full scoring in the Integration-Seam doc)
Candidates: Python SDK, TypeScript SDK, `osb` CLI, MCP server, direct REST/OpenAPI. **Primary recommendation: direct REST/OpenAPI** (thinnest, least-authority, most testable, replaceable behind a FounderGate-owned adapter). **Fallback: Python SDK** (ergonomic, but pre-1.0 `v0.1.14`). **MCP is NOT recommended** for orchestration — it adds an agent-facing authority surface FounderGate does not need for scripted lanes.

## G. Maturity and dependency risk  [VERIFIED-GITHUB-METADATA, retrieved 2026-07-17]
- **Release cadence:** very active — per-component releases within days (e.g. `docker/execd/v1.0.21`, `docker/egress/v1.1.4`, `docker/ingress/v1.0.10` on 2026-07-12; `python/sandbox/v0.1.14` on 2026-07-13). Risk: **LOW** on abandonment, **MEDIUM** on churn.
- **Versioning maturity:** per-component semver; **Python SDK is pre-1.0 (`v0.1.14`)** while server components are v1.0–v1.1 → **MEDIUM-HIGH** SDK API-stability risk.
- **Server API stability:** OpenAPI specs exist (`specs/`), young project (created 2025-12-17, ~7 months) → **MEDIUM**.
- **Component version skew:** execd v1.0.21 / egress v1.1.4 / ingress v1.0.10 → must pin exact versions → **MEDIUM**.
- **Documented experimental features:** HTTPS MITM egress is experimental → **MEDIUM** if relied upon.
- **Security policy:** present (private advisory, 48h ack) → **LOW** on process.
- **Release signing/attestations:** `docs/release-verification.md` **FILE-NOT-PRESENT**; no signed/attested release process observed in files read → **UNKNOWN**.
- **Open issue / PR volume:** 67 open issues, **58 open PRs** → active, with a review backlog → **MEDIUM**.
- **Maintainer concentration / bus factor:** 12,043★ / 1,005 forks, single org, ~7 months old → **UNKNOWN/MEDIUM** (contributors not enumerated here).
- **Dependency footprint / image provenance:** FastAPI/Python server, Go egress (nftables + mitmproxy) + execd; images from Docker Hub `opensandbox/*` and an **Aliyun CR mirror** → **MEDIUM** (external registry provenance).
- **Replaceability:** the lifecycle + exec + egress contracts are OpenAPI-defined → **a thin FounderGate-owned adapter can preserve replaceability** → **LOW** lock-in *if* an adapter is used. What FounderGate would lose if OpenSandbox stalled: the runtime/egress implementation, not the contract (re-implementable). 

## I. FounderGate fit  (hypotheses)
1. Replace manual worktree/path isolation — **PARTIALLY-SUPPORTED** (container isolation > path discipline, but default runc ≠ kernel isolation).
2. Stronger runtime isolation than current lane practice — **PARTIALLY-SUPPORTED** (only "strong" with gVisor/Kata/Firecracker; Docker-default is standard container).
3. Machine-verifiable teardown — **SUPPORTED** (lifecycle delete + verify-absent).
4. Machine-verifiable egress denial — **PARTIALLY-SUPPORTED** (deny-by-default needs `dns+nft`; Docker parity documented but locally unproven; HTTPS interception experimental).
5. Rendered-UI evidence — **PARTIALLY-SUPPORTED** (screenshot + export documented; DOM/console/network/trace not documented in the example).
6. Reduce founder burden — **SUPPORTED (indirectly)** (founder stays acceptance-only; operation is terminal/advisor-side).
7. Introduce a large operational dependency — **SUPPORTED** (Docker + server + sidecars + images = real operational surface).
8. False sense of security if Docker-only isolation is overstated — **SUPPORTED** (real risk — mitigated only by honest labelling + secure runtime).
9. Integrate through a replaceable adapter — **SUPPORTED** (OpenAPI contracts make a FounderGate-owned adapter feasible).

## J. Proposed Phase-2 spike  (DESIGN ONLY — not executed)
On a **non-M1 spare machine**, prove ONLY: (1) create one disposable sandbox; (2) place a trivial repo; (3) run one scripted builder command; (4) capture structured stdout/stderr/exit/timestamps + output-file digests; (5) attempt a write to one explicitly **non-mounted** host path and record the refusal; (6) prove no FounderGate repo path / docker.sock / secret / production authority was mounted (inspect the create request + container config); (7) teardown; (8) verify the sandbox no longer exists; (9) preserve durable evidence. **Stretch:** the Playwright image renders one **local static** test page → export one screenshot + one DOM-related artifact.
**Excluded:** Kubernetes, AKIOR, customer code, FounderGate production code, live credentials, LLM/API keys, Claude Code execution, external model calls, host source mounts, production data, adoption work, lane-tool rewrites.
**Effort classes:** core spike (steps 1-9) = **MEDIUM**; deny-by-default egress proof (`dns+nft`) = **MEDIUM**; Playwright stretch = **SMALL–MEDIUM**; secure-runtime (gVisor/Kata) proof = **LARGE/UNKNOWN** on macOS.
