# OpenSandbox Phase 4.1 — Port-Binding Mitigation Lane (NARROW-SENSITIVE WRITER)

**Status:** EXECUTING · live runtime inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM · **[HOLD]** · **NO ADOPTION / NO MERGE / NO PRODUCTION CLAIM.** Runs concurrently with Lane B (read-only VB2 audit, separate clone).

## Founder authorization
Determine whether OpenSandbox can be used without publishing execd/HTTP workload ports on `0.0.0.0`. Preferred outcomes: (1) do not publish the ports (native proxy suffices); (2) else bind published ports to `127.0.0.1` only inside the VM; (3) else classify the current version unsuitable for customer-intake execution. **NAT containment or firewalling alone does NOT count as fixing the `0.0.0.0` problem.**

## Pinned state
- Phase 4 PR **#154** — `spike/opensandbox-linux-adapter-phase4@f6eeb8fe84bc6af95801a6635682869babfd908f` (OPEN/DRAFT); Phase-4.1 base = this SHA.
- main `e1ca1989…` · OpenSandbox `192b5bf5…` · Lima 2.1.4 (VZ) · `opensandbox-server==0.2.1`.
- Exact blocker (from Phase 4): OpenSandbox 0.2.1 publishes execd/HTTP/policy ports with `HostIp 0.0.0.0`.

## Boundaries
One repository writer (this worktree). No M1/AKIOR/WRX90 contact. No main modification. No merge/close/ready of PR #151/#152/#153/#154. No adoption. Disposable VM (destroyed after run). Patch applied **only inside the disposable VM**; the global macOS OpenSandbox is never modified. No customer code/credentials. **No mid-runtime git commit** (per the disk-first amendment and the VB2 HEAD-move failure lesson): commit only after runtime finished → sandbox terminated → server stopped → evidence exported → VM destroyed → evidence finalized → independent checker. UNKNOWN over inference; no PASS on exit-zero alone.

## Allowed files (this lane)
`docs/lanes/OPEN_SANDBOX_PHASE4_1_PORT_BINDING_LANE.md` · `docs/research/opensandbox/phase4_1/{OPEN_SANDBOX_PHASE4_1_SOURCE_ANALYSIS.md, _COMMAND_TRANSCRIPT.md, _RUNTIME_EVIDENCE.json, _RESULT.md, _CHECKER_REPORT.md}` · `docs/status/OPEN_SANDBOX_PHASE4_1_DECISION_PACKET.md` · `prototypes/sandbox_provider_adapter/{README.md, opensandbox_provider.py, linux_spike_driver.py, test_contract.py, patches/opensandbox_0_2_1_port_binding.patch}` · **(disk-first amendment)** `docs/coordination/{PARALLEL_PHASE4_1_VB2_RUN_LEDGER.jsonl, PARALLEL_PHASE4_1_VB2_RECOVERY_STATE.json, PARALLEL_PHASE4_1_VB2_FINAL_REPORT.md}`.

## Evidence & keystone
Progressive disk recording (ledger + recovery-state + transcript + runtime-evidence JSON), raw evidence copied out of scrollback, hashes per phase. **Port-binding keystone:** for every governed port record container/internal/published/HostIp + reachability from VM-loopback, VM-non-loopback, and macOS, and whether the adapter used that path. A pass requires exactly one of: **(A) no host port published**, or **(B) host port bound to `127.0.0.1` only**. Any governed port on `0.0.0.0` fails.

## Stop conditions
Native proxy fails after the loopback patch (`LINUX_PROXY_SEAM_FAILED`); any governed port still `0.0.0.0` (mitigation fails); Docker authority reachable in the workload (REJECT); host disk <28 GiB at VM start or VM disk <10 GiB (INSUFFICIENT_EVIDENCE); checker REJECT/INSUFFICIENT uncorrectable in scope.
