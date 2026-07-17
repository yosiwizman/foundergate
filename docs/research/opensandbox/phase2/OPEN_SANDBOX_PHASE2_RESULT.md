# OpenSandbox Phase 2 — Result (bounded runtime spike)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, HOST-PROVEN-NOT-M1). **Runtime:** default Docker = **runc / standard container isolation** ("Secure runtime is not configured"). **No adoption · no merge · no security claim · no microVM claim.** M1 and AKIOR never contacted; `main` never modified.

Claim classes: **VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN.**

## PROVEN (for this configuration, on this host)
- **Runtime lifecycle** — create → upload → in-sandbox digest match → `bash builder.sh` exit 0 → export digest match, all over the REST + execd seam. `output/result.txt` = `FOUNDERGATE_OPENSANDBOX_PHASE2_BUILDER_OK`, in-sandbox `sha256=68c15306…` **==** exported `sha256=68c15306…`. [VERIFIED-RUNTIME]
- **No FounderGate source path mounted; no host home mounted** — core sandbox `docker inspect` `Mounts=[]`. [VERIFIED-DOCKER-METADATA]
- **No Docker socket in the workload** — `/var/run/docker.sock` absent inside (`SOCKET_ABSENT`); `Mounts=[]` corroborates. The server held Docker-socket control-plane authority; it was never handed to the workload. [VERIFIED-RUNTIME + VERIFIED-DOCKER-METADATA]
- **A same-looking absolute host path did not modify the host** — a write to `/Users/…/foundergate/OPEN_SANDBOX_FORBIDDEN_WRITE_SENTINEL.txt` succeeded *container-local* (wrote_rc=0) while the **host sentinel stayed ABSENT**. *THE PATH WAS CONTAINER-LOCAL. THE HOST FOUNDERGATE PATH WAS NOT MODIFIED.* [VERIFIED-RUNTIME]
- **Constrained container metadata** — `Privileged=false`, `NetworkMode=bridge`, `CapAdd=null`, 9 caps dropped, `no-new-privileges:true`, `Devices=null`. [VERIFIED-DOCKER-METADATA]
- **Egress behaved as observed under `dns+nft` deny-by-default** — allowlisted `example.com` reachable (HTTPS 200); non-allowlisted `example.org` denied at the DNS layer (NXDOMAIN); direct-IP `1.1.1.1:443` denied at the nft layer (timeout — no direct-IP bypass). nft `table inet opensandbox` chain `egress` is `policy drop` + allow-sets. [VERIFIED-RUNTIME] — classified **EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-SPIKE**.
- **Teardown removed sandbox resources** — both sandboxes DELETE→204/GET→404; workload + egress sidecar + named volume gone; Docker returned to **baseline (17 containers / 5 networks)**; server stopped, `8090` closed. [VERIFIED-RUNTIME + VERIFIED-DOCKER-METADATA]

## NOT PROVEN (explicitly out of scope / not demonstrable here)
- The host was **not** shown to be theoretically unreachable; **no** separate kernel / microVM boundary was demonstrated; runc ≠ gVisor/Kata/Firecracker. [by design — CONTRADICTED as a claim]
- OpenSandbox is **not** shown production-secure or commercially ready for customer isolation. [UNVERIFIED]
- Rendered-UI / Playwright feasibility — **NOT-RUN** (optional Phase 8 skipped). [UNKNOWN]
- LAN-reachability of published sandbox ports was **not** independently tested from a second host (rule 2 forbade extra hosts). [UNKNOWN]

## OBSERVED LIMITATIONS (F1–F7, see RUNTIME_EVIDENCE.json)
1. **F1 — runc default**, not kernel/microVM (server said "Secure runtime is not configured").
2. **F2 — macOS Docker Desktop:** the server-internal `/proxy/{port}` path to execd returned HTTP 000 (host cannot route to the container bridge IP); execd had to be reached via its Docker-published host port. A host-run server on macOS does not get the documented proxy seam for free.
3. **F3 — hardening gap:** execd/control ports were Docker-published with `HostIp 0.0.0.0` (all interfaces), **not** `127.0.0.1`. At minimum host-localhost reachable; not loopback-restricted. Any non-loopback deployment must pin `host_ip`/publish scope.
4. **F4** — workload ran as **uid=0 (root)** inside the container (mitigated by `no-new-privileges` + dropped caps, but still root).
5. **F5** — egress-mode sandbox carried one Docker **named volume** (execd staging → `/opt/opensandbox`); core sandbox had `Mounts=[]`. Neither is a host source path or docker.sock.
6. **F6** — SDK/execd mismatch: SDK 0.1.14 `create` needs `entrypoint`+`resourceLimits` (undocumented in the quick-start), and its upload sends the `metadata` part filename-less while execd v1.0.21 requires a filename. Drove the lifecycle over raw REST/execd instead.
7. **F7** — Playwright/rendered-UI not exercised.

## ADOPTION RISKS (for a later, separate decision — not authorized here)
- **Isolation posture**: default runc is standard-container only; any FounderGate customer-isolation claim would require an opt-in secure runtime (gVisor/Kata/Firecracker), whose macOS/host effort is UNKNOWN and untested here.
- **Exposure defaults**: F3 (0.0.0.0 published control ports) and F4 (root-in-container) mean the *default* posture is not hardened; an adapter would need to force loopback publishing, non-root, and per-sandbox egress `dns+nft`.
- **Seam stability**: pre-1.0 SDK with a real create/upload contract mismatch (F6); FounderGate should sit behind its own adapter and pin the REST/execd contract, not the SDK.
- **Platform seam gap on macOS** (F2): production would run the server on Linux (where the proxy works) or always use published ports — to be settled in adapter design.

## NEXT STEP
Proceed to **adapter design** against the pinned REST/execd contract (loopback-only publishing, non-root workloads, mandatory `dns+nft` egress, secure-runtime evaluation as a separate spike) — **gated by the founder; no adoption or merge is authorized by this spike.**
