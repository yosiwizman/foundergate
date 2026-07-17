# OpenSandbox Phase 2 — Bounded Runtime Spike Lane (NARROW-SENSITIVE)

**Status:** EXECUTED · evidence-only · **[HOLD]** · **NO ADOPTION / NO MERGE AUTHORIZED**
**Lane class:** NARROW-SENSITIVE runtime spike (one builder + one independent checker).
**Host:** Apple M4 Pro Mac Mini (`Mac16,11`) — HOST-PROVEN-NOT-M1. **M1 qualification host and its soak were never contacted. AKIOR was never contacted. FounderGate `main` was never modified.**

## What this lane authorizes (execution-only)
Prove a minimal OpenSandbox lifecycle runs on the M4 Pro and record honest, durable evidence of:
host-boundary behavior, Docker-socket non-exposure to the workload, egress behavior under `dns+nft`, and teardown.

## What this lane explicitly does NOT authorize
Adoption · merge · production use · customer use · a security claim · a hardened-isolation claim · a commercial-readiness claim. The founder remains the sole acceptance authority; a later gate is required for anything beyond this spike.

## Standing hard-safety rules honored (verbatim intent)
1. Work only on the M4 Pro Mac Mini. 2–3. No contact with the M1 host or its soak. 4. No AKIOR. 5. No `main` modification. 6. No PR merge. 7. No ledger/gate/acceptance/soak/frozen-candidate/Advisor-Registry edits. 8. No customer code. 9. No production data. 10. No secrets/keys/credentials inside a sandbox. 11. No forbidden mounts (foundergate, worktrees, home, `~/.ssh`, `~/.config`, `~/.aws`, `~/.docker`, `.env`, `/var/run/docker.sock`) into a workload sandbox. 12. Server's Docker-socket access = control-plane authority, recorded; never exposed to the workload sandbox. 13. Bind services to `127.0.0.1`. 14. No LAN/public exposure of the server. 15. Isolated temp env (no global installs). 16–17. Pin images by digest; record any unpinned limitation. 18. No parallel Docker-writing builders. 19. UNKNOWN over inference. 20. No PASS without durable evidence.

## Known limitation that MUST remain visible
The default Docker runtime uses **runc / standard container isolation** (the server logged "Secure runtime is not configured"). This spike does **not** prove kernel-level or microVM isolation, does not equate runc with gVisor/Kata/Firecracker, and does not prove the host was theoretically unreachable. It proves only the observed, configuration-specific behaviors recorded in the evidence artifacts.

## Structure
- **Builder:** this terminal (one builder). Performed create → upload → exec → boundary → socket → egress → teardown via the OpenSandbox REST + execd seam.
- **Independent checker:** separate context, read-only, adversarial; may not be the builder. Verdict recorded in the checker report.
- **Merge sheriff:** Terminal-0 only (not this lane).

## Allowed files (exactly six)
- `docs/lanes/OPEN_SANDBOX_PHASE2_RUNTIME_SPIKE_LANE.md` (this file)
- `docs/research/opensandbox/phase2/OPEN_SANDBOX_PHASE2_COMMAND_TRANSCRIPT.md`
- `docs/research/opensandbox/phase2/OPEN_SANDBOX_PHASE2_RUNTIME_EVIDENCE.json`
- `docs/research/opensandbox/phase2/OPEN_SANDBOX_PHASE2_RESULT.md`
- `docs/research/opensandbox/phase2/OPEN_SANDBOX_PHASE2_CHECKER_REPORT.md`
- `docs/status/OPEN_SANDBOX_PHASE2_DECISION_PACKET.md`

## Pinned references
- FounderGate `main`: `e1ca1989d2397297a450893f7890dbe7fc21e494`
- Phase-2 branch base / PR#151 head: `e58632b582c8fe8d59c206afe7d8caefb8f13cf1`
- OpenSandbox evaluated commit: `192b5bf54a5fd01c7050ba4de9aba48939776cef`
- `opensandbox-server==0.2.1` (Python 3.11.15) · `opensandbox/execd:v1.0.21` · `opensandbox/egress@sha256:973130e0…` (v1.1.4)
- Workload image: `python@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93` (`python:3.11-slim`)
