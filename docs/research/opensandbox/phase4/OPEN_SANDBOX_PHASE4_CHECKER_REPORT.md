# OpenSandbox Phase 4 — Independent Checker Report (disposable Linux-VM adapter spike)

## Role & independence statement
I am the **independent checker** for OpenSandbox Phase 4. I did **not** build the spike. This review is
**adversarial and read-only** except for this single report file. The disposable Ubuntu 24.04 ARM64 VM was
already destroyed before my review, so I verified **durable evidence** (exported artifacts, on-disk docs,
git/gh state) and **reproducible-from-disk facts** (stdlib-only prototype tests, digest recomputation,
validator behavior). I did **not** modify FounderGate main, did not merge/close/ready any PR, did not touch
the M1 / Ubuntu WRX90 / AKIOR systems, did not create/start any VM or runtime, did not run Docker/OpenSandbox,
and installed nothing. `limactl list` was run read-only only to confirm absence of the instance.

Date of review: 2026-07-17. Reviewer host: `Mac16,11` / `Apple M4 Pro`.

---

## Check-by-check results (pass/fail + command/artifact)

| # | Check | Result | Command / Artifact |
|---|-------|--------|--------------------|
| 1 | Mac host = Mac16,11 / Apple M4 Pro | **PASS** | `sysctl -n hw.model`→`Mac16,11`; `machdep.cpu.brand_string`→`Apple M4 Pro` |
| 2 | No Ubuntu WRX90 used/contacted | **PASS** | grep of all artifacts: only "WRX90 **not** used / out of commission / unused" statements; no contact |
| 3 | M1 not touched | **PASS** | artifacts state "M1 untouched"; no M1 reference as a used host; no network contact evidence |
| 4 | AKIOR not touched | **PASS** | no `AKIOR-Mac-mini` string in any artifact; grep clean (label only, not present) |
| 5 | PR#151/152/153 heads OPEN/DRAFT/UNMERGED | **PASS** | `gh pr view`: 151=e58632b8 OPEN draft mergedAt=null; 152=adcb169e OPEN draft null; 153=3fe19c11 OPEN draft null |
| 6 | Phase-4 base is PR#153 head | **PASS** | `git -C <wt4> merge-base --is-ancestor 3fe19c11… HEAD` → exit **0** |
| 7 | N1 test correction (no tautological x==x) | **PASS** | `test_01` uses meaningful assertions (`dl.downloaded_sha256 == _sha(b"RESULT")`, session identity/state, no field leak); explicit "N1" comment |
| 8 | N2 strict sha256 validation in contract.py + test_18 | **PASS** | `validate_governed_image_ref` present; `test_18` rejects tag/`:latest`/empty/short/uppercase/non-hex/missing-name, accepts valid |
| 9 | Prototype tests (expect 18 OK) | **PASS** | `python3 -m unittest test_contract -v` → **Ran 18 tests … OK** |
| 10 | Only the allowed files changed | **PASS** | `git status --porcelain -uall`: 2 modified (contract.py, test_contract.py) + 5 untracked (lane doc, 3 phase4 research docs, linux_spike_driver.py). This report is the authorized 8th. All within the authorized Phase-4 set; **none outside scope**. `git diff --name-only 3fe19c11…` = the 2 tracked files |
| 11 | main unchanged (HEAD e1ca1989, clean) | **PASS** | `git -C /…/foundergate rev-parse HEAD`→`e1ca1989…`; `status --porcelain` empty |
| 12 | Disposable Ubuntu ARM64 VM used | **PASS** | lima yaml `vmType: vz`, `os Linux`, `arch aarch64`, Ubuntu 24.04 image digest `cafa1a96…`; RUNTIME_EVIDENCE vm block (Ubuntu 24.04.4, kernel 6.8.0-124, aarch64) |
| 13 | No shared folder | **PASS** | lima yaml `mounts: []`; plain mode |
| 14 | No FounderGate/host mount | **PASS** | RUNTIME_EVIDENCE trust_boundary `host_mounts_in_proc: none`; evidence-core `identity: no-host-mounts`; only a Docker **named** volume for execd staging |
| 15 | Native Linux proxy used (WORKS) | **PASS** | RUNTIME_EVIDENCE native_proxy `WORKS`; evidence-core `seam: native-proxy`; transcript shows `/v1/sandboxes/{id}/proxy/44772/{ping,command,files}` 200 |
| 16 | No direct published-execd fallback | **PASS** | RUNTIME_EVIDENCE `native_proxy.published_port_fallback_used == false`; server access log shows only proxy paths |
| 17 | No 0.0.0.0 lifecycle exposure; finding disclosed w/ containment | **PASS** | config `host=127.0.0.1 port=8090`; server.stderr "Uvicorn running on http://127.0.0.1:8090"; `zero_zero_finding` disclosed honestly with containment (`control_exposed_beyond_vm: false`, Mac→VM execd HTTP 000) and listed in RESULT REMAINING RISKS #2. **Honestly represented, not hidden** |
| 18 | No VM port forwarded to macOS | **PASS** | lima yaml `portForwards: []`; RUNTIME_EVIDENCE `mac_port_forwards: 0` |
| 19 | Exact linux/arm64 image digests recorded | **PASS** | python `db3ff2e1…`, execd `1dc98c7d…`, egress `973130e0…` (config.toml + RUNTIME_EVIDENCE); ubuntu `cafa1a96…` (lima yaml) |
| 20 | No workload Docker socket | **PASS** | evidence-core `docker_socket: SOCKET_ABSENT` + "docker: command not found" |
| 21 | Sentinel absent on Mac now | **PASS** | `ls /…/foundergate/OPEN_SANDBOX_PHASE4_FORBIDDEN_SENTINEL.txt` → No such file (SENTINEL_ABSENT) |
| 22 | stdout/stderr/exit/timestamps captured | **PASS** | evidence-core builder: `exit_code 0`, stdout JSON, `builder_start/end` timestamps, `elapsed_s 1.042` |
| 23 | upload==download digest equality | **PASS** | builder output_digest == result.txt == download == `78cdd70b…` (all equal); preupload==insandbox digests all equal (verified programmatically) |
| 24 | Strict egress recorded | **PASS** | RUNTIME_EVIDENCE egress: T1 ALLOW, T2/T3 DENIED, nft chain `policy DROP` + allow-sets |
| 25 | Direct-IP result denied | **PASS** | T4 `1.1.1.1:443` DENIED, T5 `https://1.1.1.1` DENIED |
| 26 | IPv6 result denied | **PASS** | T6 `2606:4700:4700::1111:443` DENIED |
| 27 | Sandbox teardown | **PASS** | RUNTIME_EVIDENCE teardown: DELETE 204 / GET 404; containers/network/volume gone (corroborated in server.stderr: kill/remove/cleanup/removed managed volume) |
| 28 | Server shutdown (8090 closed) | **PASS** | server.stderr "Shutting down … Application shutdown complete … Finished server process"; RUNTIME_EVIDENCE `8090 CLOSED` |
| 29 | VM destruction | **PASS** | `limactl list` → "No instance found"; RUNTIME_EVIDENCE vm_destruction instance/dir/disk gone, no hostagent |
| 30 | Provider-neutral evidence | **PASS** | create returned `CreateSessionResult`; evidence-core `provider_meta_leak_check: CreateSessionResult` |
| 31 | No provider acceptance verdict | **PASS** | contract.py `Acceptance` requires `issued_by=='founder'` (raises otherwise); `RunOutcome` explicitly "NOT a founder acceptance"; adapter returns observations |
| 32 | root/non-root recorded | **PASS** | RUNTIME_EVIDENCE root_non_root: default uid=0; per-command `uid=1000` confirmed |
| 33 | Playwright NOT_RUN | **PASS** | RUNTIME_EVIDENCE rendered_ui `RENDERED_UI_NOT_RUN`; RESULT "RENDERED_UI_NOT_RUN" |
| 34 | No adoption/production claim | **PASS** | RUNTIME_EVIDENCE authorizations all **NO**; RESULT recommendation is **design-only** ("authorizes design, not customer execution or adoption; the founder gate remains"); "no microVM/hardened/production claim" |

---

## Falsification attempts (adversarial)

- **Native-proxy claim** — tried to falsify: server access log / RUNTIME_EVIDENCE show only `/proxy/44772/*` paths and `published_port_fallback_used=false`. Could not falsify. **Holds.**
- **Port-binding claim (really 127.0.0.1?)** — server.stderr line 10 "Uvicorn running on http://127.0.0.1:8090"; config `host="127.0.0.1"`; `ss` "LISTEN 127.0.0.1:8090 only". Could not falsify. **Holds.**
- **No-mac-forward claim** — lima yaml `portForwards: []`; RUNTIME_EVIDENCE Mac→192.168.5.15:execd = HTTP 000 (unreachable). Could not falsify. **Holds.**
- **Docker-socket claim** — evidence-core `SOCKET_ABSENT` + docker CLI absent; workload_metadata `CapAdd=null, Privileged=false`. Could not falsify. **Holds.**
- **Host-mount claim** — `host_mounts_in_proc: none`; only a Docker named volume (not a host path / not docker.sock). Could not falsify. **Holds.**
- **Egress claim** — T1 allow / T2–T6 deny with nft `policy DROP`; no bypass observed (direct-IP v4/v6/numeric all denied). Could not falsify. **Holds.**
- **Digest claim (recompute)** — programmatically confirmed builder output_digest == result.txt digest == download digest == `78cdd70b…`; and **independently recomputed** `sha256("FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK")` (40 bytes, no newline) = `78cdd70b6cf73f1df92024c030e3036804194ad92b0d5c3cd35779dac0c37f86` — an exact match. Could not falsify. **Holds.**
- **Sandbox-teardown claim** — DELETE 204 / GET 404 corroborated by server.stderr kill/remove/cleanup + "removed managed volume". Could not falsify. **Holds.**
- **VM-destruction claim** — `limactl list` returns "No instance found. Run `limactl create`…" — no `foundergate-opensandbox-phase4` instance exists. Could not falsify. **Holds.**
- **Provider-neutral claim** — `grep -n '^import|^from' contract.py` = stdlib only (`re, abc, dataclasses, enum, typing`); no `opensandbox`/`requests`/`httpx` import (only a source comment mentioning "no OpenSandbox"). Could not falsify. **Holds.**

### Independent validator runs
- `validate_governed_image_ref`: `:latest` **REJECTED**, uppercase-hex **REJECTED**, short digest **REJECTED**, valid `repo@sha256:<64 lowercase hex>` **ACCEPTED**. Matches N2 spec.
- `OpenSandboxProvider(OpenSandboxConfig(execd_endpoint='http://0.0.0.0:44772'))` **raised** `ValidationError: '0.0.0.0' is not a valid client target` (opensandbox_provider.py:62). 0.0.0.0 rejected as required.

---

## Findings (with severity)

- **F1 — INFO/LOW (metadata off-by-one, not a keystone).** In `evidence-core.json` the download step records `"bytes": 41`, but the byte string that actually hashes to the recorded/reproduced digest `78cdd70b…` is the **40-byte** content `FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK` (no trailing newline). The 41-byte content (with newline) hashes to `6e2f37b6…`, which is **not** the recorded digest. All three load-bearing digests (builder output, result.txt, download) are mutually equal and match the 40-byte recompute, so the **digest-equality keystone holds**; the `bytes:41` field is a cosmetic count discrepancy (likely a stray trailing byte counted but not hashed). No integrity impact.
- **F2 — INFO (disclosure, correctly represented).** The 0.0.0.0-publish behavior of OpenSandbox 0.2.1 is real and is **disclosed**, not hidden: server binds loopback only, the hardcoded publish is contained inside the NAT-only VM (`portForwards:[]`, Mac→VM execd unreachable), never used (native proxy), and it is flagged as REMAINING RISK #2 for intake design. Honest representation confirmed.
- **F3 — INFO (scope note).** The Phase-4 work is present as **uncommitted working-tree changes** on branch `spike/opensandbox-linux-adapter-phase4` (HEAD is exactly the PR#153 base commit `3fe19c11…`). This is consistent with an unmerged spike; main is untouched and clean.

No keystone was falsified. No disallowed file was modified. No forbidden host was contacted. Sentinel is absent on the Mac.

---

## VERDICT: CHECKER-CLEAN
