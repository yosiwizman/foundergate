# OpenSandbox Adapter Design (maps the provider-neutral contract onto Phase-2-proven seams)

**Status:** DESIGN · Phase 3 · no runtime executed. This describes *how* an OpenSandbox implementation of [`SANDBOX_PROVIDER_CONTRACT`](./SANDBOX_PROVIDER_CONTRACT.md) would work, using only the seams the Phase 2 spike actually exercised (PR #152, evaluated OpenSandbox `192b5bf5…`). OpenSandbox stays entirely behind the adapter.

## Contract → seam mapping (all seams observed working in Phase 2)
| Contract operation | OpenSandbox seam (Phase-2-proven) | Notes |
|---|---|---|
| `create_session` | `POST /v1/sandboxes` (REST) | body: `image.uri` (exact/digest), `entrypoint`, integer `timeout`, `resourceLimits`, `networkPolicy` |
| `upload_artifact` | execd `POST /files/upload` (multipart) | metadata part **must carry a filename** → lands in `form.File["metadata"]` (Phase-2 F6 fix) |
| `execute_command` | execd `POST /command` (NDJSON stream) | parse `stdout`/`stderr`/`execution_complete` events; retain exit + timestamps |
| `download_artifact` | execd `GET /files/download?path=…` | export needs no host mount; verify digest |
| `apply_egress_policy` | create-time `networkPolicy` `{defaultAction, egress:[{action,target}]}` (+ `[egress] mode=dns+nft`) | policy also observable via sidecar `/policy` (auth) |
| `inspect_session` | `GET /v1/sandboxes/{id}` + `…/diagnostics/inspect` (+ host `docker inspect` in a dev spike) | records mounts/caps/privileged/network/user/published-ports |
| `terminate_session` | `DELETE /v1/sandboxes/{id}` | 204 accepted |
| `prove_termination` | `GET /v1/sandboxes/{id}` → 404, plus provider-side container/sidecar/volume absence query | absence is the proof, not DELETE's return |
| `collect_evidence` | aggregate the above + diagnostics logs | export & hash before host destruction |
| `health_check` | `GET /openapi.json` / execd `GET /ping` | gate governed ops |

## Explicit architecture decisions (required record)
1. **REST lifecycle is the primary seam.** All lifecycle/state transitions go through the documented REST contract; the adapter validates request/response schemas locally.
2. **MCP is not used.** No agent tool surface is introduced; it would add unnecessary authority.
3. **The OpenSandbox SDK is optional and must not be authoritative.** It may be a convenience for a caller, but the **REST/execd contract is the ground truth**; the adapter is written against the wire schemas, not the SDK types. (Phase-2 F6: the pre-1.0 SDK create needed undocumented `entrypoint`+`resourceLimits`, and its upload sent the metadata part filename-less — both reasons the SDK is not trusted as the contract.)
4. **API request/response schemas are validated locally** (in-adapter), so a malformed or version-drifted provider response is rejected as `ProviderProtocolError` rather than silently parsed.
5. **Server/SDK pre-1.0 mismatch is a standing integration risk** — pin the exact evaluated versions; re-validate schemas on every provider upgrade.
6. **The macOS bridge-IP proxy failure must not become part of the permanent architecture.** Phase-2 F2: on macOS Docker Desktop the server-internal `/proxy/{port}` to the container bridge IP returned HTTP 000. That is a *host-platform artifact*, not a design pattern.
7. **Direct published-execd-port access is development-spike behavior only.** Phase 2 reached execd via a Docker-published host port purely to work around F2; the production adapter does not depend on publishing execd.
8. **Production design must not depend on ports published to `0.0.0.0`.** Phase-2 F3: execd/control ports bound `0.0.0.0` (not loopback-restricted). The adapter, in local-development mode, **rejects non-loopback endpoints and rejects `0.0.0.0` as a client target**; production must reach execd over a private in-host path or a private network, never a world-published port.
9. **OpenSandbox-specific objects remain behind the adapter.** REST/execd JSON shapes, execd NDJSON event types, sidecar policy shapes, `docker inspect` fields — all are translated into the contract's neutral types and neutral error classes; none leak outward.
10. **Provider replacement requires no FounderGate gate/ledger/founder-facing change.** Because callers see only the neutral contract, replacing OpenSandbox (or dropping in `fake_provider`) touches only `opensandbox_provider.py`-equivalent code.

## Primary deployment target for the next runtime phase: **EPHEMERAL LINUX VM** (PLANNED — not built)
Rationale:
- **Native Docker bridge networking** — no Docker Desktop shared-VM limitation; the F2 proxy failure does not occur on Linux, so the documented server↔execd proxy seam is available.
- **No Docker Desktop bridge limitation** — the host routes to container bridge IPs directly.
- **Fresh host per customer/run** — each run gets a clean, disposable machine; no cross-run residue.
- **Host destroyed after the run** — teardown includes destroying the VM itself, a stronger teardown boundary than deleting a container on a shared host.
- **Runtime authority stays separate from FounderGate application authority** — the lifecycle server runs on the ephemeral host, never inside FounderGate's control plane.
- **Stronger runtimes evaluable later** — gVisor/Kata/Firecracker remain a *separate* future evaluation on the same ephemeral-host shape.
- **No idle fleet required** — VMs are created on demand and torn down, so there is no standing attack surface or standing cost.

This target is **PLANNED**. Nothing in Phase 3 builds, provisions, or runs a Linux VM; the recommendation is a direction for a later, separately-authorized bounded runtime spike (where direct-IP egress denial must be re-verified on Linux).

## Inherited limitations carried into any adapter (from Phase 2 F1–F8)
runc = standard container isolation, not microVM/kernel (F1); no separate-kernel claim (F2 of the prior list); macOS proxy failure (F3-list / this doc §6); `0.0.0.0` publish (F4-list / §8); root-in-container is a risk to mitigate, not ignore (F5-list); execd staging volume is provider-internal, not a host path (F6-list); pre-1.0 server/SDK mismatches (F7-list / §3,§5); Playwright/rendered-UI unproven (F8-list). None is resolved by design alone; each is a gate for the Linux spike.
