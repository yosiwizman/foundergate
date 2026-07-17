# OpenSandbox Phase 6 — Command Transcript (public-repo intake runtime spike)

Host: Apple M4 Pro Mac Mini (`Mac16,11`, 24 GiB, arm64). Runtime inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM (`foundergate-opensandbox-phase6`), since destroyed. **M1 not contacted** (state founder-relayed only). Public fixture `pypa/sampleproject`. Continuous disk recording; no git commit while the runtime was active.

## 0 Preflight + gates
Host confirmed; **remote main == `e1ca1989`** (git ls-remote, read-only); PR#151–156 OPEN/DRAFT at expected heads (PR#156 `e1147c5`); disk 36.74 GiB; **M1_PUSH_TRIGGER_RISK NONE** (0 self-hosted runners; workflows `ubuntu-latest`). M1 recorded **FOUNDER_RELAYED_RUNNING — NOT INDEPENDENTLY PROBED FROM PRO** (run `integrated-8h-rerun-20260717T173028Z`, SHA `b9af1def…`).

## 1–2 Branch + disk-first
Worktree on `spike/opensandbox-public-repo-intake-phase6` from `e1147c5`. Ledger + recovery-state + cross-machine state initialized. Acquisition root `/tmp/foundergate-public-repo-phase6-p6run20260717` (outside `/Users/.../Projects`, worktrees, and the FG repo).

## 3–6 Live acquisition (`github_public_provider.py`, on the Pro)
- Resolved default HEAD → **exact commit `621e4974ca25ce531773def586ba3ed8e736b3fc`** via `git ls-remote HEAD` (no auth).
- Downloaded the **exact-commit** archive `https://codeload.github.com/pypa/sampleproject/tar.gz/621e4974…` → **5978 bytes, HTTP 200, `application/x-gzip`**, final host `codeload.github.com`, **no cross-host redirect** (host-allowlist enforced). `archive_sha256 = fd8597e4…`.
- Pre-extraction scan: **18 entries, no unsafe** (no absolute/traversal/symlink/hardlink/device/duplicate/case-collision/oversize), `LICENSE.txt` present, no secrets/submodules/LFS. Extracted safely.
- **Canonical manifest: 12 files, `canonical_manifest_sha256 = 649ecb02d79d5cee55c86549b6dff26fb341c4a4de6d3c92d959c42714b6e7de`.** Binding recorded (url + exact commit + archive sha + manifest sha). No repository file executed on the Pro. → `OPEN_SANDBOX_PHASE6_SOURCE_ACQUISITION_EVIDENCE.json`.

## 7 Tests
`python3 -m unittest test_contract` → **Ran 36, OK** (22 intake + 14 github-provider; synthetic tars, **no network**).

## 8–9 Disposable VM + patched server
Lima/VZ plain-mode VM (arm64 Ubuntu `sha256:cafa1a96…`, `mounts:[]`, `portForwards:[]`, 20 GiB). Docker + `opensandbox-server==0.2.1` in VM; **Phase-4.1 loopback patch applied** (`DOCKER_PUBLISH_HOST="127.0.0.1"`). Digests: `python@sha256:db3ff2e1…`, `execd@sha256:1dc98c7d…`, `egress@sha256:973130e0…`. Server bound **`127.0.0.1:8090` only**; "Secure runtime is not configured" (runc). VM disk 15 GiB (≥8 gate).

## 10 Controlled transfer
`limactl copy` (no shared folder): archive, canonical manifest, `runtime_driver.py`, adapter (`contract.py`+`opensandbox_provider.py`). **In-VM transfer digests match Pro**: archive `fd8597e4…`, manifest `649ecb02…`.

## 11–12 Adapter sandbox + harness verifier
`runtime_driver.py orchestrate` (FounderGate adapter over the native loopback proxy): created governed sandbox `4d2d46bd…` (default-deny egress, **no allowed domains**). **PORT-BINDING KEYSTONE: GUARD_PASS** — sidecar `44772→127.0.0.1:44941`, `8080→127.0.0.1:56904`, `18080→127.0.0.1:46786` (loopback only). Uploaded archive+manifest+driver; in-sandbox upload digests verified; exec `python3 runtime_driver.py verify`.
Harness verifier (in sandbox): archive re-validated OK; extracted to `/workspace/repository`; **in-sandbox manifest `649ecb02…` == Pro manifest**; `LICENSE.txt` present; `pyproject.toml` parseable (tomllib; `name=sampleproject`, has build-system); `src/` exists; **only** `python -m compileall -q .../src` → **exit 0**; 2 `.pyc` generated then deleted; **post-cleanup snapshot still == Pro manifest**. Classification **COMPILEABILITY_OBSERVED**; explicitly not claimed: APPLICATION_WORKS/BUILD_PASSED/TESTS_PASSED/SAFE/PRODUCTION_READY. No `setup.py`/`pip`/build/tests/scripts/entry-points/Makefile/CI ran.
Docker metadata: `Privileged=false`, `CapAdd=null`, `Devices=null`, `NetMode=container:<sidecar>`, one Docker **named** execd-staging volume (not a host bind/socket/FG/macOS path).

## 13 Egress + authority
`docker.sock` **SOCKET_ABSENT/FILE_ABSENT**; **NO_DOCKER_API** (FileNotFoundError); **NO_DOCKER_CLI**; **NO_USERS** (no macOS path); **NO_HOST_MOUNTS**. Egress (empty allowlist): example.com DNS+HTTPS denied; direct `1.1.1.1:443` denied; IPv6 direct denied; nft `policy drop`.

## 14 Output/digest proof
Exported manifest == in-sandbox manifest == Pro manifest (`649ecb02…`); exact commit + archive sha bound; verifier result downloaded via the adapter; no provider-specific field leaked into the FG evidence result.

## 15 Teardown
`DELETE /v1/sandboxes/4d2d46bd…` → 204; GET → 404; workload+sidecar+network+volume gone; server stopped (procs 0, 8090 CLOSED); VM Docker baseline (0 containers).

## 16 Deletion + VM destruction
Evidence exported+hashed (`verifier_result.json 9a73ce99…`, `orchestrate_result.json 42b45b60…`, `server.stderr.log 40c51a35…`, `config.toml 6ff7334e…`); no secrets. VM source archive+manifest deleted (absent). `limactl stop`+`delete` → instance/dir/disk gone; no hostagent; Mac forwards 0; host disk 30.74 GiB. **Pro acquisition root deleted + proven absent** (archive, extracted tree, manifest copies, directory). *Deletion is proven under observable filesystem and VM-manager state, not physical-storage forensic erasure.*

## 18 Cross-machine checkpoints
Remote main == `e1ca1989` at preflight, after acquisition, and after VM destruction; runners = 0 throughout. **M1 never contacted.**
