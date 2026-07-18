# OpenSandbox Phase 4 — Disposable Linux-VM Adapter Spike Lane (NARROW-SENSITIVE)

**Status:** EXECUTING · live runtime **inside one disposable Ubuntu 24.04 ARM64 VM on the Mac Mini Pro** · **[HOLD]** · **NO ADOPTION / NO MERGE / NO PRODUCTION CLAIM.**
**Run mode:** NARROW-SENSITIVE — one builder, one independent checker, one disposable VM, no WIDE runtime execution, no parallel runtime writers.

## Founder authorization (this phase)
Authorizes: closing the two Phase-3 hardening notes (N1, N2); installing **Lima** (one VM manager, current stable Homebrew bottle) on the Pro; creating one disposable Ubuntu 24.04 ARM64 VM; installing Docker + OpenSandbox **inside that VM only**; running the FounderGate provider-neutral adapter against OpenSandbox in the VM; testing lifecycle/file-transfer/exec/native-proxy/egress/evidence/teardown/VM-destruction; durable evidence; independent checker; one draft HOLD PR.
Does **NOT** authorize: using the Ubuntu WRX90; touching the M1; installing any other VM/virtualization software; adopting OpenSandbox; production integration; customer use; merging PR #151/#152/#153/Phase-4 PR; replacing FounderGate lane tooling; Kubernetes; customer code; production data/credentials; any microVM/hardened/compliance/production-readiness claim.

## Host (mechanically reconfirmed)
Apple M4 Pro Mac Mini — `Mac16,11`, `Apple M4 Pro`, 24 GiB, arm64, macOS 26.3.1. HOST-PROVEN-NOT-M1. The Ubuntu WRX90 is out of commission and was **not** used or contacted.

## Selected VM manager
**Lima 2.1.4** (Homebrew bottle `arm64_tahoe`, sha256 `3c5700d39777426daf59dafdd7afaa34ac29d88ad9c5e4e345929d7cf55410c0`, zero runtime deps — no QEMU). Backend: **Apple Virtualization Framework (`vmType: vz`)**. VM in **plain mode**: no mounts, no port forwards, no shared folders, no containerd, no Rosetta, NAT-only, does not import the founder's SSH keys.

## Pinned prior state (verified in preflight, not assumed)
- FounderGate `main`: `e1ca1989d2397297a450893f7890dbe7fc21e494` (clean).
- PR #151 — `audit/opensandbox-phase1@e58632b582c8fe8d59c206afe7d8caefb8f13cf1` (OPEN/DRAFT).
- PR #152 — `spike/opensandbox-phase2@adcb169e0c61948c253aead576cd90727227e455` (OPEN/DRAFT).
- PR #153 — `design/opensandbox-provider-adapter-phase3@3fe19c11a27d00c1773f80608889809cd76ab2fb` (OPEN/DRAFT).
- Evaluated OpenSandbox commit: `192b5bf54a5fd01c7050ba4de9aba48939776cef`.
- **Phase-4 base = PR#153 head `3fe19c1…`** (this branch descends from it).

## Boundaries in force
Disposable-VM rule (VM destroyed after the run) · one-builder · independent-checker · no-WRX90 · no-M1 · no-AKIOR · no-main-modification · no-merge/close/ready of PR #151/#152/#153 · no-customer-code · no-credentials · exact image digests (no `:latest`) · native Linux proxy required (no direct published-execd fallback) · no `0.0.0.0` control/execd/lifecycle exposure · no macOS port forward · workload Docker-socket blocked · default-deny egress tested · sandbox teardown proven · VM destruction proven · no adoption/production claim. UNKNOWN over inference; no PASS without durable evidence; the builder may not approve its own work.

## Allowed files (exactly eleven)
`docs/lanes/OPEN_SANDBOX_PHASE4_LINUX_ADAPTER_SPIKE_LANE.md` · `docs/research/opensandbox/phase4/OPEN_SANDBOX_PHASE4_COMMAND_TRANSCRIPT.md` · `docs/research/opensandbox/phase4/OPEN_SANDBOX_PHASE4_RUNTIME_EVIDENCE.json` · `docs/research/opensandbox/phase4/OPEN_SANDBOX_PHASE4_RESULT.md` · `docs/research/opensandbox/phase4/OPEN_SANDBOX_PHASE4_CHECKER_REPORT.md` · `docs/status/OPEN_SANDBOX_PHASE4_DECISION_PACKET.md` · `prototypes/sandbox_provider_adapter/{README.md,contract.py,opensandbox_provider.py,test_contract.py,linux_spike_driver.py}`.

## Evidence & teardown requirements
Durable: command transcript, runtime-evidence JSON, result, checker report, decision packet, plus the hardened prototype + Linux driver. Evidence exported from the VM and hashed **before** VM destruction. Teardown must prove: session gone, workload+sidecar+network+volume gone, server down/8090 closed, then VM shut down + deleted + disk removed + key deleted + no forward/shared-folder ever existed. VM destruction proves removal under Lima's observable state, **not** forensic erasure.

## Stop conditions
Stop (preserve evidence, teardown, classify appropriately) if: any preflight fact is contradictory; no authorized VM manager (resolved — Lima installed); unsafe Lima config (mount/forward/bridged/socket); host disk <28 GiB at VM start or VM disk <10 GiB during the run (→ INSUFFICIENT_EVIDENCE); the native proxy seam fails (record `LINUX_PROXY_SEAM_FAILED`, do not use the Mac workaround); Docker authority reachable inside the workload (→ REJECT); or the independent checker returns REJECT/INSUFFICIENT-EVIDENCE uncorrectable in scope.
