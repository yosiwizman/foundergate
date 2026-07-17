# OpenSandbox Phase 4 — Command Transcript (disposable Linux-VM adapter spike)

Chronological record. Host: Apple M4 Pro Mac Mini (`Mac16,11`, 24 GiB, arm64, macOS 26.3.1). All runtime work occurred **inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM**, since destroyed. The Ubuntu WRX90 was not used; the M1 and AKIOR were not touched; FounderGate `main` was not modified.

## 0. Preflight + Lima install gate
- Host reconfirmed `Mac16,11` / `Apple M4 Pro` / 24 GiB / arm64. main `e1ca1989…` clean, local==remote. PR #151/#152/#153 OPEN/DRAFT at expected heads.
- Disk gate: 35.12 GiB ≥ 30 → PASS.
- `brew info lima`: stable **2.1.4**, homebrew/core, bottle `arm64_tahoe` sha256 `3c5700d3…`, **runtime deps `[]` (no QEMU)**, prebuilt bottle.
- `HOMEBREW_NO_AUTO_UPDATE=1 brew install lima` → "Would install 1 formula: lima"; poured `lima--2.1.4.arm64_tahoe.bottle.tar.gz`; no source build, no sudo/GUI/restart, no unexpected deps. `limactl version 2.1.4`. `kern.hv_support=1`; qemu absent.

## 1. Phase 4 branch + N1/N2 fixes
- Worktree `foundergate-wt-opensandbox-phase4` on `spike/opensandbox-linux-adapter-phase4` from PR#153 head `3fe19c1…`.
- **N1**: replaced the tautological download-digest assertion in `test_01` with meaningful checks (deterministic session id/state, exact evidence field, neutral response type, no provider-field leak, real download digest).
- **N2**: `contract.py` `validate_governed_image_ref()` requires `repo[:tag]@sha256:<64 lowercase hex>`; rejects tag-only, `:latest`, empty/short/uppercase/non-hex digest, missing name. Added `test_18` (positive + 9 negatives).
- `python3 -m unittest test_contract` → **Ran 18 tests, OK**.

## 2. VM create (plain, VZ, NAT-only, no mounts)
- Custom Lima YAML: `vmType: vz`, `plain: true`, arm64 Ubuntu image `sha256:cafa1a96…`, 4 CPU / 8 GiB / 24 GiB, `mounts: []`, `networks: []`, `portForwards: []`, `ssh.loadDotSSHPubKeys: false`, rosetta/containerd off.
- `limactl create` downloaded the digest-pinned official Ubuntu 24.04 ARM64 cloud image; effective config verified SAFE (vz/plain/no-mounts/no-ports/no-networks).
- Resource gate: 30.53 GiB ≥ 28; memory free 40%. `limactl start` → VZ running; log: "Running in plain mode. Mounts, dynamic port forwarding, containerd, etc. will be ignored." Lima SSH `127.0.0.1:57441` (loopback management only).
- In-VM verify: Ubuntu 24.04.4 LTS, kernel 6.8.0-124, aarch64, 4 CPU, 7.7Gi, 21G free, NAT IP `192.168.5.15`, only mount = read-only cloud-init ISO, no `/Users`, no docker.sock, outbound HTTP 200.

## 3. Docker + OpenSandbox in the VM only
- `apt-get install docker.io` → Docker 29.1.3 (overlayfs), VM-local socket. `opensandbox-server==0.2.1` in a venv (Python 3.12.3).
- Pulled `--platform linux/arm64`: `python@sha256:db3ff2e1…` `execd@sha256:1dc98c7d…` `egress@sha256:973130e0…` (Architecture=arm64, Os=linux confirmed). Server config pins the **execd image by digest**; `[egress] mode=dns+nft`.

## 4. Server bind + 0.0.0.0 finding
- Server started under the `docker` group; `ss -ltn` → `LISTEN 127.0.0.1:8090` **only** (not `0.0.0.0`). "Secure runtime is not configured" (runc).
- **Finding**: OpenSandbox 0.2.1 hardcodes publishing execd/http/policy ports to `0.0.0.0` (`port_allocator.py:25`, `networking.py:405-406`); `host_ip` does not change the publish bind. Observed sidecar publish `0.0.0.0:*->44772/8080/18080`. **Contained**: Lima `portForwards: []`; `Mac→192.168.5.15:<execd>` = HTTP 000 (unreachable); no macOS listener. The adapter used the native proxy, never the published port.

## 5–6. Native proxy + adapter-driven workload (`linux_spike_driver.py`, in-VM, loopback)
- Native proxy: `GET /v1/sandboxes/{id}/proxy/44772/ping` → 200; `POST …/command` → NDJSON `NATIVE_PROXY_OK`. Server access log shows only `/proxy/44772/{command,ping,files}` paths (no published-port fallback).
- Adapter lifecycle (sandbox `aa030fee…`): `build_create_body`→POST `/v1/sandboxes` (HTTP 202, `CreateSessionResult`); upload 3 files (200/200/200, metadata-with-filename fix); **in-sandbox digests == preupload digests** (README `19474f1f`, input `e95d4100`, builder `82f68bdf`); `bash builder.sh` exit **0**, elapsed 1.04 s, stdout JSON `{"event":"builder_ok",…,"uid":"0","working_directory":"/workspace"}`; `output/result.txt`=`FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK` digest `78cdd70b…`; download via native proxy digest `78cdd70b…` **matches** in-sandbox.

## 7. Trust-boundary
- Workload write to `/Users/…/foundergate/OPEN_SANDBOX_PHASE4_FORBIDDEN_SENTINEL.txt` succeeded **workload-local** (wrote_rc=0, 7 bytes); **ABSENT on the Mac host AND the VM host**; main clean. ⇒ *THE PATH WAS WORKLOAD-LOCAL. NO FOUNDERGATE HOST PATH WAS MODIFIED.*
- Workload: `SOCKET_ABSENT` (`/var/run/docker.sock` missing; `docker` CLI not found); uid=0(root); `/proc/mounts` has no docker.sock/`/Users`/foundergate/virtiofs/9p. Docker metadata: `CapAdd=null`, `Privileged=false`, `NetMode=container:<sidecar>`, one Docker **named** volume (`opensandbox-runtime-*`→`/opt/opensandbox`, execd staging — not a host path/socket).
- Root/non-root: default uid 0; execd per-command `uid:1000` → `uid=1000 gid=1000` → **NON_ROOT_WORKLOAD_CONFIRMED** (container/execd remain root; recorded risk).

## 8. Strict egress (`dns+nft`, deny, allow example.com)
- T1 example.com → ALLOW (DNS 104.20.23.154, HTTPS 200); T2 example.org HTTPS → DENIED; T3 example.org DNS → DNS_BLOCKED; T4 direct 1.1.1.1:443 → DENIED (timeout/nft); T5 numeric-IP HTTPS 1.1.1.1 → DENIED; T6 IPv6 available, direct v6 `2606:4700:4700::1111:443` → DENIED.
- Sidecar: `default=deny`, `mode dns+nft`, DNS redirect installed, nft static policy applied. nft chain `egress`: `policy drop` + accept established + drop 853 + drop `@deny` + accept `@dyn_allow`/`@allow` + final `drop`. Workload `CapAdd=null` (no NET_ADMIN); sidecar `CapAdd=[NET_ADMIN]`. ⇒ **EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-LINUX-SPIKE**.

## 9. Playwright — **RENDERED_UI_NOT_RUN** (optional; disk/time-bounded).

## 10. Sandbox teardown
- `DELETE /v1/sandboxes/aa030fee…` → 204; `GET` → 404; workload + sidecar + network + named volume all gone; server stopped (no binary process, `8090` CLOSED); VM Docker back to baseline (0 containers / 3 default networks / 0 opensandbox volumes). No global prune.

## 11. Evidence export + VM destruction
- Exported via `limactl copy` (no shared folder): `evidence-core.json` `da365e5b…`, `server.stderr.log` `f998ef74…`, `config.toml` `5704c765…`; readable; no secrets (only a benign "api_key not configured" log line). VM final: 19G free, 15 min uptime.
- `limactl stop` + `limactl delete` → instance shut down + deleted; VM dir + disk gone; no hostagent/VZ process; Mac port forwards 0; host disk recovered to **33.37 GiB**. Lima 2.1.4 remains installed (authorized). **Limitation: VM destruction proves removal under Lima's observable state, not forensic erasure from physical storage.**
- Final: Phase-4 sentinel ABSENT on Mac; main clean `e1ca1989…`.
