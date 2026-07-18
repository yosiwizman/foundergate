# OpenSandbox Phase 2 — Command Transcript (bounded runtime spike)

Chronological record of the runtime spike on the Apple M4 Pro Mac Mini. All services bound to `127.0.0.1`. Runtime root: `/tmp/foundergate-opensandbox-phase2-runtime` (RT, ephemeral). Raw evidence captured under `RT/evidence/`.

## 0. Environment (isolated, no global installs)
- `uv` venv at `RT/venv` (Python 3.11.15); `opensandbox-server==0.2.1`; SDK `opensandbox==0.1.14` (used only for schema introspection; lifecycle driven over REST/execd).
- Docker baseline recorded: **17 containers, 5 networks, 22 images** (shared host — surgical teardown only, no prune).
- Images pulled and pinned by digest: `python:3.11-slim` → `sha256:db3ff2e1…`; `opensandbox/execd:v1.0.21`; `opensandbox/egress:v1.1.4` → `sha256:973130e0…`.

## 1. Server start (core config, no egress)
- `opensandbox-server --config RT/config.toml`, env `OPENSANDBOX_INSECURE_SERVER=YES`.
- Config: `[server] host=127.0.0.1 port=8090 max_sandbox_timeout_seconds=600`; `[runtime] type=docker execd_image=opensandbox/execd:v1.0.21`; `[docker] network_mode=bridge drop_capabilities=[AUDIT_WRITE,MKNOD,NET_ADMIN,NET_RAW,SYS_ADMIN,SYS_MODULE,SYS_PTRACE,SYS_TIME,SYS_TTY_CONFIG] no_new_privileges=true`; `[store] type=sqlite`.
- Log: "Uvicorn running on http://127.0.0.1:8090" · "**Secure runtime is not configured**" (⇒ default runc). `GET /openapi.json` → 200. Bound to loopback only (lsof).

## 2. Trivial repo (Phase 3)
- `README.md` `sha256=6ca386e0…`; `input.txt`(`FOUNDERGATE_OPENSANDBOX_PHASE2_INPUT`) `sha256=65da4a84…`; `builder.sh` `sha256=accad72f…`. No git remote.

## 3. Create-request schema discovery (REST)
`POST /v1/sandboxes` requires `image:{uri}` (object), integer `timeout`, `entrypoint`, `resourceLimits`. (String image / string timeout / missing entrypoint / missing resourceLimits each returned HTTP 422 — recorded.)

## 4. Core sandbox lifecycle — sandbox `e1fa2e91-…` (container `3d40e2707829`)
Request: `{image:{uri:python@sha256:db3ff2e1…}, entrypoint:[sleep,infinity], timeout:600, resourceLimits:{cpu:1000m,memory:512Mi}}` → **HTTP 202**, state Running.
Host `docker inspect` (VERIFIED-DOCKER-METADATA): `Privileged=false · NetworkMode=bridge · CapAdd=null · CapDrop=[9 caps] · SecurityOpt=[no-new-privileges:true] · Devices=null · **Mounts=[]**`.
- execd started inside (diagnostics log: "execd listening on :44772"); reached via **Docker-published host port** (server-internal `/proxy/{port}` returned HTTP 000 on macOS — see F2).
- Upload `README.md/input.txt/builder.sh` via `POST /files/upload` → **200/200/200** (metadata part requires a filename → `form.File["metadata"]`).
- In-sandbox `sha256sum` == pre-upload digests (all three match).
- `bash builder.sh` → exit **0**; stdout JSON `{"event":"builder_ok",…,"uid":"0","cwd":"/workspace"}`; `output/result.txt` = `FOUNDERGATE_OPENSANDBOX_PHASE2_BUILDER_OK`, `sha256=68c15306…`.
- Export via `GET /files/download` (no host mount) → `sha256=68c15306…` **matches** in-sandbox digest.

## 5. Host-boundary + Docker-socket (Phase 5)
- Boundary: inside the sandbox, `echo … > /Users/yosiwizman/Projects/foundergate/OPEN_SANDBOX_FORBIDDEN_WRITE_SENTINEL.txt` **succeeded (container-local, wrote_rc=0, 28 bytes)**. On the **host** the sentinel is **ABSENT**. ⇒ *THE PATH WAS CONTAINER-LOCAL. THE HOST FOUNDERGATE PATH WAS NOT MODIFIED.*
- Docker socket: `ls -l /var/run/docker.sock` → "No such file or directory" ⇒ **SOCKET_ABSENT**. `host.docker.internal` resolves (DNS alias `fdc4:…::254`) but is not a socket / Docker API.
- Identity: `uid=0(root)`, hostname=`3d40e2707829`, `/proc/mounts` has no host/docker/foundergate mount.
- Core teardown: `DELETE /v1/sandboxes/e1fa2e91-…` → **204**; `GET` → **404**; container gone.

## 6. Egress (Phase 6) — restart with `[egress] image=opensandbox/egress:v1.1.4 mode=dns+nft`
Sandbox `07d8778e-…`: workload `1caa7755` + **egress sidecar `a5bad1689d`** (`opensandbox/egress:v1.1.4`).
`networkPolicy={defaultAction:deny, egress:[{action:allow, target:example.com}]}`.
- Workload: `CapAdd=null` (no NET_ADMIN), `NetworkMode=container:<sidecar>` (**shares sidecar netns**). Sidecar: `CapAdd=[NET_ADMIN]`.
- Sidecar log: "enforcement mode: dns+nft" · "nftables: applying static policy: default=deny" · DNS redirect OUTPUT:53→15353 installed · policy server on :18080.
- Tests from inside workload (python3):
  - **T1** `https://example.com` → **ALLOWED (200)**.
  - **T2** `https://example.org` (not allowlisted) → **DENIED** (`URLError: Name or service not known` — DNS NXDOMAIN).
  - **T3** direct IP `1.1.1.1:443` (no DNS) → **DENIED** (`TimeoutError` — nft IP-layer drop; no direct-IP bypass).
  - **T4** resolve `example.org` → **DNS_BLOCKED** (`gaierror`).
- `nft list ruleset` (sidecar): `table inet opensandbox` chain `egress` `type filter hook output priority filter; policy drop` + accept established/mark/lo/allow-sets + final `drop`.
- `/policy` API → 401 (auth required); policy already confirmed from sidecar logs.
- Classification: **EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-SPIKE** (no HTTPS MITM, no custom root cert used).

## 7. Teardown (Phase 7)
- `DELETE /v1/sandboxes/07d8778e-…` → **204**; `GET` → **404**; **workload + sidecar + named volume all gone**.
- Server stopped: PID gone, no `opensandbox-server` process, `127.0.0.1:8090` no listener.
- Docker state restored: **containers 17 == baseline 17 · networks 5 == baseline 5**; no `opensandbox/sandbox` containers or networks remain.
- Final re-verify: host sentinel **ABSENT**; FounderGate `main` clean at `e1ca1989…`. **M1 and AKIOR never contacted.**

## Deviations / limitations recorded (see RUNTIME_EVIDENCE.json findings F1–F7)
F1 runc (not microVM). F2 macOS proxy HTTP 000 → used published port. **F3 execd/control ports published on `0.0.0.0`, not loopback-restricted (LAN-reachability not tested from a 2nd host).** F4 root-in-container. F5 execd-staging named volume (not a host path/socket). F6 SDK/execd upload-metadata mismatch. F7 Playwright not run.
