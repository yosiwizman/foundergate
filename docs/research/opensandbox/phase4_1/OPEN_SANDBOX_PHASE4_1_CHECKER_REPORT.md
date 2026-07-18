# OpenSandbox Phase 4.1 — Independent Checker Report (port-binding mitigation)

**Role & independence.** I am the INDEPENDENT CHECKER for Phase 4.1. I did not build this spike. This review is adversarial and read-only except for this single report file. The disposable VM was already destroyed; I verified durable, reproducible-from-disk evidence only. I did not modify FounderGate main, did not touch any PR, did not create/start any VM or runtime, did not run Docker/OpenSandbox, and installed nothing. I ran only the isolated stdlib Python prototype (no network).

**Scope of evidence examined.**
- Phase-4.1 worktree: `/Users/yosiwizman/Projects/foundergate-wt-opensandbox-phase4-1` (branch `spike/opensandbox-port-binding-phase4-1`).
- Exported raw VM evidence (Mac): `/tmp/foundergate-opensandbox-phase4-1-host/{evidence-core.json, server.stderr.log, config.toml, patch-proof.txt, lima-phase4-1.yaml}`.
- FounderGate main worktree: `/Users/yosiwizman/Projects/foundergate`.
- Base = PR#154 head `f6eeb8fe84bc6af95801a6635682869babfd908f`.

---

## Check results (pass/fail + command/artifact)

| # | Check | Result | Command / artifact |
|---|-------|--------|--------------------|
| 1 | Host Mac16,11 / Apple M4 Pro | PASS | `system_profiler SPHardwareDataType` → Mac mini, `Mac16,11`, Apple M4 Pro |
| 2 | Branch descends from `f6eeb8f` | PASS | `git merge-base --is-ancestor f6eeb8f HEAD` → exit 0. NB: worktree HEAD **==** `f6eeb8f`; all Phase-4.1 work is uncommitted in the working tree (see INFO-1) |
| 3 | main unchanged (`e1ca1989`, clean) | PASS | `git -C /Users/.../foundergate rev-parse HEAD` → `e1ca1989…`; `git status --porcelain` → empty |
| 4 | PR #151/#152/#153/#154 OPEN/DRAFT | PASS | `gh pr view` → all `state=OPEN`, `isDraft=true`; #154 head `f6eeb8f` |
| 5 | Patch scope: only `0.0.0.0`→`127.0.0.1` | PASS | Patch file: 2 files, 3 changed literal lines — `port_allocator.py:25` `DOCKER_PUBLISH_HOST` and `networking.py:405-406` sidecar 44772/8080. No auth/egress/socket/privileged/mount/host-net change |
| 6 | patch-proof.txt shows 127.0.0.1 in-VM | PASS | `patch-proof.txt` lines 25/405/406 all `127.0.0.1` |
| 7 | SOURCE-ANALYSIS honesty (proxy uses host-mapped 127.0.0.1) | PASS | `SOURCE_ANALYSIS.md` maps `_resolve_proxy_host()`→`127.0.0.1` when `server.host=127.0.0.1`; egress sidecar resolves to host-mapped port, so loopback-bind preserves proxy while no-publish (A) would break egress. Coherent, not overclaimed (explicitly limits A viability to non-egress) |
| 8 | Native proxy used `/proxy/44772`, builder exit 0 | PASS | `evidence-core.json` builder `exit_code:0`; transcript A5 "adapter drove … via `/proxy/44772/…`"; `native_proxy.result: PRESERVED` |
| 9 | Loopback-only keystone (Outcome B) | PASS | `RUNTIME_EVIDENCE.port_binding_keystone.reachability`: vm_loopback 58165→**200**, vm_nonloopback `192.168.5.15:58165`→**000**, macos→**000** |
| 10 | Docker metadata sidecar HostIp 127.0.0.1 | PASS | `evidence-core.port_binding.per_container_ports`: egress sidecar 44772/8080/18080 all `HostIp:127.0.0.1`; workload container `{}` (no publish) |
| 11 | Docker socket absent | PASS | `evidence-core.docker_socket`: `SOCKET_ABSENT`; `docker: command not found` |
| 12 | Host-mount absence | PASS | `evidence-core.identity`: `no-host-mounts`; `config.toml` `allowed_host_paths` → a `-nonexistent` dir; VM `mounts:[]` |
| 13 | Sentinel absent on Mac now | PASS | `ls …/OPEN_SANDBOX_PHASE4_1_FORBIDDEN_SENTINEL.txt` → No such file |
| 14 | Egress T1 allow / T2-T4 deny; nft drop | PASS | `RUNTIME_EVIDENCE.egress`: T1 ALLOW(200), T2/T3/T4 DENIED, `nft policy drop`, `workload_NET_ADMIN:false` |
| 15 | Digest integrity (recompute) | PASS | `printf '%s' "FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK" \| shasum -a256` → `78cdd70b6cf73f1df92024c030e3036804194ad92b0d5c3cd35779dac0c37f86` (41 bytes) == builder `output_digest` == `download.downloaded_sha256` |
| 16 | Teardown DELETE 204 / GET 404 | PASS | `RUNTIME_EVIDENCE.teardown.session: DELETE 204/GET 404`; containers/network/volume gone; 8090 CLOSED |
| 17 | VM destroyed | PASS | `limactl list` → "No instance found"; no `foundergate-opensandbox-phase4-1` |
| 18 | Provider-neutral guard errors | PASS | Guard raises only `AuthorityError`/`ProviderProtocolError` (both from `contract`); see falsification F9 |
| 19 | Prototype tests 19 OK | PASS | `python3 -m unittest test_contract -v` → `Ran 19 tests … OK` (incl. `test_19_port_binding_guard`) |
| 20 | Only allowed files changed | PASS | `git status --porcelain` + `git diff --name-status f6eeb8f`: modified `linux_spike_driver.py`, `opensandbox_provider.py`, `test_contract.py`; untracked `docs/coordination/`, `docs/lanes/…LANE.md`, `docs/research/opensandbox/phase4_1/`, `patches/`. All within the allowed list. (`__pycache__/` untracked build artifact — INFO-3) |
| 21 | Coordination ledger valid append-only JSONL; recovery valid JSON | PASS | Ledger parses as 19 JSON objects; `RECOVERY_STATE.json` parses (schema_version, lane_a/b_state, head_sha_by_lane…) |
| 22 | No adoption/production/merge claim | PASS | `RUNTIME_EVIDENCE.authorizations`: PRODUCTION/ADOPTION/MERGE all `NO`; `RESULT.md` recommendation is "design only … not customer execution, adoption, or merge; founder gate remains" |

Export-hash integrity (cross-check): recomputed sha256 of all four exported files == `RUNTIME_EVIDENCE.evidence_export_sha256`:
`evidence-core.json e2bc26db…`, `server.stderr.log 7ab02393…`, `config.toml 2dce41de…`, `patch-proof.txt 7bc12d3e…`. Patch file sha256 `38c111c7…` == `RUNTIME_EVIDENCE.patch.sha256`. All match.

---

## Falsification attempts (all failed to break a keystone)

- **F1 — Does the patch secretly change more than the port host?** NO. The patch is 2 files / 3 changed literal lines, each strictly `0.0.0.0`→`127.0.0.1` with a comment. No auth, egress, socket, capability, mount, or host-networking hunk present.
- **F2 — Was the native proxy faked?** NO. `evidence-core` builder `exit_code:0` with a real `output_digest`; upload→exec→download drove `/proxy/44772`; exported download digest equals the in-sandbox `result.txt` digest. A faked proxy could not produce a matching content-addressed round trip.
- **F3 — Loopback bind vs. NAT masking (the key challenge).** GENUINE LOOPBACK BIND. The decisive datum is that the VM probed its **own** non-loopback NAT interface `192.168.5.15:58165` and got **000 (unreachable)**. A `0.0.0.0` bind masked only by host NAT would still be reachable from the VM's own non-loopback IP; it was not. This is independently corroborated by Docker metadata (`HostIp:127.0.0.1` on every governed sidecar port) and by `server.stderr.log` containing **no** `0.0.0.0` (uvicorn bound `127.0.0.1:8090`). Two independent layers (runtime reachability + Docker port metadata) agree → Outcome B is not a fluke.
- **F4 — Docker socket really blocked?** YES. `SOCKET_ABSENT` and `docker: command not found` inside the workload.
- **F5 — Host mounts hidden?** NO. `no-host-mounts`; VM `mounts:[]`; config `allowed_host_paths` points at a deliberately non-existent dir.
- **F6 — Egress weakened by the patch?** NO. Reproven under patch: allow=example.com(200); example.org/direct-IPv4/IPv6 denied; `nft policy drop`.
- **F7 — Digest doctored?** NO. Independent recompute reproduces `78cdd70b…` at exactly 41 bytes, matching builder output and downloaded artifact.
- **F8 — VM/teardown claims?** Consistent: session DELETE 204/GET 404; `limactl` shows zero instances.
- **F9 — Guard provider-neutrality + behavior.** `grep -i opensandbox contract.py` → only a comment ("no OpenSandbox"), **no import**. I executed the guard directly:
  - `{"44772/tcp":[{"HostIp":"0.0.0.0",…}]}` → **AuthorityError** (reject)
  - `{"44772/tcp":[{"HostIp":"127.0.0.1",…}]}` → accept
  - `{"44772/tcp":None}` → accept (exposed, not published)
  - `{"44772/tcp":[{"HostPort":"1"}]}` (missing HostIp) → **ProviderProtocolError**
  - `["x"]` (non-dict) → **ProviderProtocolError**
  - `::` and empty `HostIp` on governed ports → **AuthorityError**
  - ungoverned port `9999/tcp` on `0.0.0.0` → ignored (correct scope)
  All neutral, fail-closed; never silently continues.

---

## Findings

- **INFO-1 (severity: low / informational).** All Phase-4.1 work is uncommitted in the working tree (branch HEAD == base `f6eeb8f`). Durable evidence therefore rests on working-tree files plus the exported `/tmp` artifacts rather than on an immutable git commit. Not a rule violation and does not falsify any keystone, but it lowers tamper-resistance; recommend committing the lane/docs/patch/prototype changes before founder review.
- **INFO-2 (informational).** No `OPEN_SANDBOX_PHASE4_1_DECISION_PACKET.md` exists in `docs/status/` yet (only prior Phase 2/3/4 packets). The task noted this may not exist; recorded as expected-absent.
- **INFO-3 (informational).** `prototypes/sandbox_provider_adapter/__pycache__/` is present as an untracked build artifact; harmless, ignorable.
- **INFO-4 (severity: low).** `server.stderr.log` shows the server ran with `OPENSANDBOX_INSECURE_SERVER` (no `server.api_key`). Acceptable for a loopback-only, disposable, single-VM spike (bind was `127.0.0.1:8090`) and out of scope for the port-binding keystone, but this insecure posture must not carry into any future adoption. No secrets were found in the export.

None of the findings rise to a keystone falsification. No governed port remained `0.0.0.0`; the native proxy was not faked; no keystone was falsified.

---

## VERDICT: CHECKER-CLEAN
