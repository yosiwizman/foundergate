# OpenSandbox Phase 4.1 — Result (port-binding mitigation)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). **Runtime:** patched `opensandbox-server==0.2.1` inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM, destroyed after capture. **Isolation:** runc (no microVM/hardened/production claim). M1/AKIOR/WRX90 untouched; `main` unmodified. Concurrent with Lane B (read-only VB2 audit).

Claim classes: VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN.

## The blocker and the fix
Phase 4 found OpenSandbox 0.2.1 hardcodes execd/HTTP/policy publish to `0.0.0.0`. Source analysis showed there is no config for it, and that egress-sandbox proxying uses a **host-mapped endpoint on `127.0.0.1`** (not the bridge IP). A minimal 3-line, 2-file patch changes `0.0.0.0` → `127.0.0.1` at the two publish sites; this **preserves the native proxy** and **eliminates the `0.0.0.0` bind**.

## PROVEN BY THIS SPIKE (for this configuration)
- **OpenSandbox source binding understood** — every governed publish path identified (`port_allocator.py:25/94`, `networking.py:405-406`); proxy-target logic mapped. [VERIFIED-DISK]
- **Minimal, reviewable patch** — 3 lines, 2 files, applied **only inside the VM**; global macOS OpenSandbox untouched. [VERIFIED-DISK]
- **No governed `0.0.0.0` binding** — with the patch, sidecar published `44772/8080/18080` to `127.0.0.1` only; the adapter guard returned `GUARD_PASS`. [VERIFIED-DOCKER-METADATA]
- **Loopback-only proven, not containment** — execd port reachable from VM loopback (200) but **UNREACHABLE from the VM's own non-loopback NAT IP (000)** and from the Mac (000). This is a genuine `127.0.0.1` bind, not firewall/NAT masking. [VERIFIED-RUNTIME] → **Outcome B: HOST PORT BOUND TO 127.0.0.1 ONLY**.
- **Native proxy preserved** — adapter drove the full lifecycle via `/proxy/44772/…` after the patch; builder exit 0; export digest `78cdd70b…` == in-sandbox. [VERIFIED-RUNTIME]
- **Egress reproven** — `dns+nft` deny-by-default intact (example.com allowed; example.org/direct-IPv4/IPv6 denied; nft `policy drop`); the patch did not weaken egress. [VERIFIED-RUNTIME]
- **Docker socket blocked; host non-exposure** — `SOCKET_ABSENT`; PHASE4_1 sentinel absent on Mac + VM host; no host mounts. [VERIFIED-RUNTIME + DOCKER-METADATA]
- **Sandbox teardown + VM destruction** — DELETE 204/GET 404, all gone; server down/8090 closed; VM instance+dir+disk removed, host disk reclaimed. [VERIFIED-RUNTIME + VM-METADATA]
- **Provider guard + tests** — `assert_no_public_port_binding` rejects non-loopback governed ports and malformed metadata with provider-neutral errors; 19/19 tests. [VERIFIED-DISK]

## NOT PROVEN
- Kernel/microVM isolation (runc); production/customer readiness — not claimed. [CONTRADICTED as a claim / UNVERIFIED]
- **No-publication (Outcome A)** — not achieved for egress sandboxes (proxy needs the host-mapped port); only loopback-bind (Outcome B). [documented]
- Forensic VM-disk erasure — only observable-state removal. [UNKNOWN]
- Upstream acceptance of the patch — this is a FounderGate-local compatibility patch; a config option should be proposed upstream. [UNKNOWN]

## REMAINING RISKS
1. **Patch is FounderGate-local** — must be re-applied/re-verified on every OpenSandbox upgrade until upstreamed (a `[docker].publish_host` config option would remove this). **Maintenance risk: LOW–MEDIUM.**
2. **runc only** — untrusted customer code needs a secure runtime (separate evaluation).
3. **root-in-container by default** — mitigate with non-root/user-ns.
4. pre-1.0 server; Playwright/rendered-UI still unrun.

## RECOMMENDATION
**PROCEED_TO_CUSTOMER_INTAKE_DESIGN** (design only). The `0.0.0.0` blocker is resolved for this configuration by a minimal, reviewable, proxy-preserving loopback-bind patch, proven by genuine loopback reachability (not NAT containment); the live adapter, native proxy, exact digests, Docker-socket block, host non-exposure, strict egress, teardown, and VM destruction all hold, checker pending. This authorizes **design only** — not customer execution, adoption, or merge; the founder gate remains, and the patch's upstream/maintenance path must be settled in intake design.
