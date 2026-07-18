# OpenSandbox Phase 4.1 — Command Transcript (port-binding mitigation)

Host: Apple M4 Pro Mac Mini (`Mac16,11`, 24 GiB, arm64). Runtime inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM (`foundergate-opensandbox-phase4-1`), since destroyed. M1/AKIOR/WRX90 untouched; `main` unmodified; concurrent with Lane B (read-only). Continuous disk recording per the disk-first amendment; **no git commit while the runtime was active**.

## A0–A1 preflight + branch
Host reconfirmed; main `e1ca1989` clean; PR #151/#152/#153/#154 OPEN/DRAFT at expected heads (PR#154 `f6eeb8f`). Disk 34 GiB; mem free 77%; no phase4-1 collision. Worktree `foundergate-wt-opensandbox-phase4-1` on `spike/opensandbox-port-binding-phase4-1` from `f6eeb8f`.

## A2 source analysis (isolated uv venv on macOS; global untouched)
`opensandbox-server==0.2.1`: `0.0.0.0` publish at `port_allocator.py:25` (`DOCKER_PUBLISH_HOST`, used `:94`) and `networking.py:405-406` (sidecar execd/http). Proxy target resolution (`networking.py:201-270`): **non-egress** sandboxes → bridge IP (`_resolve_internal_endpoint`, publish not needed); **egress** sandboxes (governed default-deny) → host-mapped endpoint via `_resolve_proxy_host()` which returns `127.0.0.1` when `server.host=127.0.0.1`. ⇒ **loopback-bind (patch B) preserves the proxy; no-publish (patch A) would break egress sandboxes.** See `OPEN_SANDBOX_PHASE4_1_SOURCE_ANALYSIS.md`.

## A3 patch + guard + tests
- Minimal patch `patches/opensandbox_0_2_1_port_binding.patch` (3 lines, 2 files): `0.0.0.0` → `127.0.0.1`. No change to auth/egress/socket/privileged/host-net/mounts/adapter.
- Provider guard `assert_no_public_port_binding()` in `opensandbox_provider.py`: rejects any governed port (44772/8080/18080) on a non-loopback HostIp (neutral `AuthorityError`), rejects malformed metadata (`ProviderProtocolError`), never silently continues.
- `test_19` (no-publish/loopback pass; 0.0.0.0/`::`/empty/public reject; malformed reject). `python3 -m unittest test_contract` → **Ran 19, OK**.

## A4 disposable VM + patch applied in VM
Lima/VZ plain-mode VM (arm64 Ubuntu `sha256:cafa1a96…`, `mounts:[]`, `portForwards:[]`, NAT-only). Docker 29.x + `opensandbox-server==0.2.1` installed **in VM**; patch applied with `patch -p0` (dry-run then apply). In-VM proof: `port_allocator.py:25 DOCKER_PUBLISH_HOST="127.0.0.1"`; `networking.py:405-406 "127.0.0.1"`. Images pinned by digest (`execd@sha256:1dc98c7d…`, `egress@sha256:973130e0…`).

## A5 runtime proof
- Server bound `127.0.0.1:8090` only (`ss`), "Secure runtime is not configured" (runc).
- **PORT-BINDING KEYSTONE (sandbox `403641eb…`):** guard `GUARD_PASS`; sidecar published `44772→127.0.0.1:58165`, `8080→127.0.0.1:53327`, `18080→127.0.0.1:57075`. Reachability: **VM loopback `127.0.0.1:58165` → HTTP 200** (proxy works); **VM non-loopback `192.168.5.15:58165` → HTTP 000 (UNREACHABLE)**; **Mac → HTTP 000**. ⇒ **Outcome B: host port bound to `127.0.0.1` only** (genuine loopback bind, not NAT containment). No governed `0.0.0.0`.
- **Native proxy PRESERVED** after the patch: adapter drove create/upload/exec/download via `/proxy/44772/…`. Builder exit 0 (1.03 s); in-sandbox digests == preupload; `output/result.txt` digest `78cdd70b…`; download `78cdd70b…` **matches**.
- Trust boundary: workload-local write; **PHASE4_1 sentinel ABSENT on Mac + VM host**; main clean. `SOCKET_ABSENT`; uid=0(root); no-host-mounts.
- Egress (`dns+nft`, deny, allow example.com): example.com 200; example.org denied; direct 1.1.1.1:443 denied; IPv6 direct denied; nft `policy drop`; workload `CapAdd=null`. **Egress reproven; patch did not weaken it.**

## A5 teardown + A6 VM destruction
- `DELETE /v1/sandboxes/403641eb…` → 204; GET → 404; containers+network+volume gone; server stopped (procs 0, 8090 CLOSED); VM Docker baseline (0 containers).
- Evidence exported via `limactl copy` (no shared folder), hashed: `evidence-core.json` `e2bc26db…`, `server.stderr.log` `7ab02393…`, `config.toml` `2dce41de…`, `patch-proof.txt` `7bc12d3e…`. No secrets.
- `limactl stop` + `delete` → instance/dir/disk gone; no hostagent; Mac forwards 0; host disk 30.04 GiB; Lima 2.1.4 remains. Sentinel absent; main clean `e1ca1989`. (Removal under Lima observable state, not forensic erasure.)

## Disk-first
Coordination ledger `docs/coordination/PARALLEL_PHASE4_1_VB2_RUN_LEDGER.jsonl` (A000–A014 + Lane B B001–B004) and recovery-state updated at each phase boundary. No governed-runtime evidence was committed while the runtime was active.
