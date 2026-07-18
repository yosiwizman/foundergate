# OpenSandbox Phase 4 — Result (disposable Linux-VM adapter spike)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, 24 GiB, arm64). **Runtime:** live OpenSandbox inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM, now destroyed. **Isolation:** default Docker = **runc / standard container isolation** ("Secure runtime is not configured") — **no microVM / hardened / production claim.** M1 and AKIOR untouched; Ubuntu WRX90 unused; `main` unmodified.

Claim classes: **VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN.**

## PROVEN BY THIS SPIKE (for this configuration)
- **Disposable Linux VM** — Lima 2.1.4 (VZ, no QEMU) created a plain-mode, NAT-only Ubuntu 24.04 ARM64 VM with **no host mounts, no port forwards, no shared folders**, digest-pinned image `sha256:cafa1a96…`; destroyed afterward. [VERIFIED-VM-METADATA]
- **Native Linux proxy seam** — the FounderGate adapter reached execd through the server's internal `/v1/sandboxes/{id}/proxy/44772/…` path (ping/command/files all 200); server log shows **no published-port fallback**. The Phase-2 macOS proxy failure did **not** recur on Linux. [VERIFIED-RUNTIME]
- **Live provider-neutral adapter** — create→upload→exec→download driven through `contract.py`+`opensandbox_provider.py`; responses came back as neutral types (`CreateSessionResult`, parsed `ExecResult`); no OpenSandbox object escaped. [VERIFIED-RUNTIME]
- **Exact-digest enforcement** — governed mode required `repo@sha256:<64 hex>`; workload run on `python@sha256:db3ff2e1…` (arm64); execd pinned by digest in config. [VERIFIED-DISK]
- **Runtime lifecycle + integrity** — builder exit 0 (1.04 s); in-sandbox digests == preupload digests; `output/result.txt`=`FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK`; exported digest `78cdd70b…` == in-sandbox digest (native-proxy export). [VERIFIED-RUNTIME]
- **Host-path non-exposure** — a workload write to a FounderGate-looking absolute path stayed **workload-local**; sentinel **ABSENT on the Mac host and the VM host**; main clean. [VERIFIED-RUNTIME + DOCKER-METADATA]
- **Workload Docker-socket blocked** — `SOCKET_ABSENT`, no `docker` CLI, `CapAdd=null`, `Privileged=false`, no host bind mounts (only a Docker named execd-staging volume). [VERIFIED-DOCKER-METADATA]
- **Strict `dns+nft` egress** — allowlisted example.com reachable; example.org denied at DNS + HTTPS; direct-IP v4 and v6 and numeric-IP HTTPS all denied; nft chain `policy drop` + allow-sets. **EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-LINUX-SPIKE**. [VERIFIED-RUNTIME]
- **Direct-IP bypass blocked** — 1.1.1.1:443 (TCP), https://1.1.1.1, and IPv6 `2606:4700:4700::1111:443` all denied. [VERIFIED-RUNTIME]
- **Non-root workload** — execd ran a command as `uid=1000 gid=1000` with no unsafe modification. **NON_ROOT_WORKLOAD_CONFIRMED** (per-command). [VERIFIED-RUNTIME]
- **Sandbox teardown** — DELETE 204 / GET 404; workload+sidecar+network+volume gone; server down / 8090 closed; VM back to Docker baseline. [VERIFIED-RUNTIME + DOCKER-METADATA]
- **VM destruction** — instance + dir + disk removed; no hostagent process; Mac forwards 0; host disk recovered. [VERIFIED-VM-METADATA]

## NOT PROVEN
- Kernel/microVM or separate-kernel isolation — **not demonstrated** (runc); runc ≠ gVisor/Kata/Firecracker. [CONTRADICTED as a claim]
- Production/customer readiness or hardened security — **not claimed**. [UNVERIFIED]
- Rendered-UI/Playwright feasibility — **RENDERED_UI_NOT_RUN**. [UNKNOWN]
- Forensic erasure of the VM disk from physical storage — only observable-state removal was proven. [UNKNOWN]

## LINUX-SPECIFIC FINDINGS
- **The native proxy works on Linux** (native Docker bridge routing), retiring the macOS published-port workaround. Server bound `127.0.0.1:8090` only.
- Docker 29.1.3 / overlayfs; execd staged into the workload via a Docker **named** volume (not a host path).

## ADAPTER FINDINGS
- The adapter drove a real lifecycle over the native proxy with no provider-type leakage; the pre-1.0 quirks are handled in the adapter (upload metadata-with-filename; explicit `entrypoint`+`resourceLimits`; local schema validation). SDK/MCP not used.

## TRUST-BOUNDARY FINDINGS
- Workload had no Docker socket, no host mounts, ran unprivileged-capability-wise (`CapAdd=null`) but as **root uid=0 by default** (recorded risk; non-root per-command confirmed). Server held the Docker socket as control-plane authority inside the VM only.

## EGRESS FINDINGS
- `dns+nft` deny-by-default enforced at both DNS and IP layers, including IPv6 and numeric-IP; no bypass observed. Not called "secure egress".

## TEARDOWN FINDINGS
- Clean sandbox teardown and full VM destruction; Docker returned to baseline; host disk reclaimed. No global prune.

## REMAINING RISKS
1. **runc only** — untrusted customer code would need a secure runtime (gVisor/Kata/Firecracker); a separate future evaluation.
2. **0.0.0.0 publish (hardcoded)** — OpenSandbox 0.2.1 publishes execd/http/policy ports to `0.0.0.0`; here contained by the NAT-only VM (unreachable from the Mac) and unused (native proxy), but a production deployment must isolate or patch this. [VERIFIED-DOCKER-METADATA]
3. **root-in-container by default** — mitigate with non-root/user-ns/secure runtime.
4. **pre-1.0 server/SDK** — pin exact versions; re-validate schemas on upgrade.
5. **Rendered-UI unproven**; forensic VM erasure unproven.

## RECOMMENDATION
**PROCEED_TO_CUSTOMER_INTAKE_DESIGN** (design only) — the disposable-Linux-VM shape, native proxy, live adapter, exact-digest enforcement, host-path/Docker-socket non-exposure, strict egress, sandbox teardown, and VM destruction all behaved as observed, behind a replaceable adapter. This authorizes **design**, not customer execution or adoption; the founder gate remains, and the 0.0.0.0-publish and root-in-container items must be addressed in intake design.
