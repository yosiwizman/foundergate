# OpenSandbox Phase 4.1 — Decision Packet (port-binding mitigation)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). **Runtime:** patched `opensandbox-server==0.2.1` inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM, destroyed after capture. **Independent checker: CHECKER-CLEAN (22/22; 19/19 tests).** runc (no microVM/hardened/production claim). M1/AKIOR/WRX90 untouched; `main` unmodified (`e1ca1989…`, clean); PR #151/#152/#153/#154 untouched (open drafts). Concurrent with Lane B (read-only VB2 audit).

**Pins:** Phase-4.1 base = PR#154 head `f6eeb8fe84bc6af95801a6635682869babfd908f` · OpenSandbox `192b5bf5…` · Lima 2.1.4 (VZ) · images `execd@sha256:1dc98c7d…` `egress@sha256:973130e0…` `python@sha256:db3ff2e1…` · Ubuntu `sha256:cafa1a96…`.

## Determinations
| Determination | Value | Basis |
|---|---|---|
| OPEN_SANDBOX_SOURCE_BINDING_UNDERSTOOD | **YES** | all governed publish paths + proxy-target logic mapped (source-analysis doc). |
| PATCH_MINIMAL_AND_REVIEWABLE | **YES** | 3 lines / 2 files, only `0.0.0.0`→`127.0.0.1`; no auth/egress/socket/priv/mount/host-net change (checker-confirmed). |
| NATIVE_PROXY_PRESERVED | **YES** | adapter drove full lifecycle via `/proxy/44772` after patch; builder exit 0. |
| NO_GOVERNED_0_0_0_0_BINDING_PROVEN | **YES** | sidecar 44772/8080/18080 published `HostIp 127.0.0.1`; guard `GUARD_PASS`; `server.stderr` zero `0.0.0.0`. |
| NO_HOST_PORT_PUBLICATION_PROVEN | **NO** | ports are still published (to loopback); no-publish (Outcome A) not achievable for egress sandboxes. |
| LOOPBACK_ONLY_FALLBACK_PROVEN | **YES** | VM loopback→200, **VM non-loopback→000**, Mac→000 (genuine `127.0.0.1` bind, not NAT). |
| LIVE_ADAPTER_RETEST_PROVEN | **YES** | create/upload/exec/download; in-sandbox==preupload digests; export `78cdd70b…` matches. |
| DEFAULT_DENY_EGRESS_REPROVEN | **YES** | example.com allowed; example.org/direct-IPv4/IPv6 denied; nft `policy drop`; patch didn't weaken it. |
| DOCKER_SOCKET_BLOCKED | **YES** | `SOCKET_ABSENT`; no docker CLI; `CapAdd=null`. |
| HOST_MOUNTS_ABSENT | **YES** | no-host-mounts; sentinel absent on Mac + VM host. |
| SANDBOX_TEARDOWN_PROVEN | **YES** | DELETE 204/GET 404; containers+network+volume gone; server down/8090 closed. |
| VM_DESTRUCTION_PROVEN | **YES** | instance+dir+disk gone; no hostagent; Mac forwards 0 (observable-state removal, not forensic erasure). |
| PROVIDER_REPLACEABILITY_PRESERVED | **YES** | neutral contract unchanged; guard raises only neutral errors; no OpenSandbox leak. |
| UPSTREAM_MAINTENANCE_RISK | **MEDIUM** | FounderGate-local 3-line patch; must be re-verified on every OpenSandbox upgrade until an upstream `[docker].publish_host` config exists. |
| PRODUCTION_INTEGRATION_AUTHORIZED | **NO** | design only; founder gate required. |
| OPENSANDBOX_ADOPTION_AUTHORIZED | **NO** | replaceable candidate behind the adapter. |
| MAIN_MERGE_AUTHORIZED | **NO** | evidence-only [HOLD]. |

## Recommendation: **PROCEED_TO_CUSTOMER_INTAKE_DESIGN**
All PROCEED conditions are met: checker clean; native proxy preserved; **no governed `0.0.0.0` binding** (loopback-only proven by non-loopback unreachability, not NAT); live adapter retest passed; egress reproven; Docker socket blocked; no host mounts; sandbox teardown proven; VM destruction proven; provider replaceability preserved; patch maintenance risk MEDIUM (≤ MEDIUM). The Phase-4 blocker is resolved for this configuration by a minimal, reviewable, proxy-preserving loopback-bind patch. **This authorizes design only — not customer execution, adoption, or merge.** Intake design must settle the patch's upstream/maintenance path, the secure-runtime (non-runc) question, and root-in-container hardening. The founder gate remains.

## Claim classes
VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN (no "PASS").
