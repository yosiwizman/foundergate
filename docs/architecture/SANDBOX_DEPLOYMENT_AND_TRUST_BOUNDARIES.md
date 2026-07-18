# Sandbox Deployment & Trust Boundaries (design)

**Status:** DESIGN · Phase 3 · no runtime executed. Describes the nine boundaries a governed FounderGate sandbox run would cross, the authority/data flow across each, and what remains unproven. Everything here is PLANNED architecture; nothing is deployed.

## Boundary diagram (text)
```
[9 Founder approval authority]
        ▲ (accept / reject — separate from execution)
        │ hashed evidence bundle
[1 FounderGate control plane] ──neutral contract──> [2 Provider adapter]
        │                                                 │ REST/execd (private)
        │ RunId, policy, artifacts (no secrets)           ▼
        │                                        [3 Ephemeral run host]  (disposable)
        │                                           ├── [4 OpenSandbox lifecycle server]  (holds Docker socket = control plane authority, host-local only)
        │                                           ├── [5 Workload sandbox]  (no docker.sock, no host mounts, bridge/shared-sidecar netns)
        │                                           ├── [6 Egress sidecar]   (NET_ADMIN; dns+nft default-deny)
        │                                           └── [7 Evidence collector]  (pulls stdout/stderr/exit/inspect/egress/teardown)
        │                                                 │ export + hash BEFORE host destruction
        └──────────────< durable evidence <──────────────┘
[8 Durable FounderGate evidence store]  (append-only; hashed; input to checking)
```

## Per-boundary specification
| # | Boundary | Authority in | Data in | Data out | Must NEVER cross | Who can terminate | Teardown proof | Unproven |
|---|---|---|---|---|---|---|---|---|
| 1 | FounderGate control plane | Founder-delegated orchestration (no exec authority) | RunId, policy, artifact refs | neutral requests, verdicts (FG-made) | secrets, customer live FS, provider types | operator/founder | n/a (not a sandbox) | that orchestration is bug-free |
| 2 | Provider adapter | none beyond the calls it makes | neutral requests | neutral responses/errors | provider-specific types outward; host mounts/socket inward | caller | n/a | schema drift on provider upgrade |
| 3 | Ephemeral run host | its own OS authority only | provisioning inputs | evidence bundle | FounderGate merge/signature authority | orchestrator (destroys host) | host destroyed + provider absence query | that destruction always completes |
| 4 | OpenSandbox lifecycle server | **Docker socket = control-plane authority** (host-local) | create/delete calls | session state, inspect | **socket must never reach [5]**; no FG merge/signature authority | run host / orchestrator | process gone + port closed | server internal correctness |
| 5 | Workload sandbox | none (root-in-container = risk) | uploaded artifacts, command | stdout/stderr/exit, downloaded artifacts | **docker.sock, host source, home, secrets** | lifecycle server (DELETE) | `GET id`→404 + container absent | in-container root escape (runc-only) |
| 6 | Egress sidecar | CAP_NET_ADMIN (sidecar only) | egress policy | allowed traffic only | workload must not hold NET_ADMIN | lifecycle server | sidecar container absent | full IP-space enforcement completeness |
| 7 | Evidence collector | read-only pull | evidence streams | hashed evidence | ability to alter a verdict | orchestrator | n/a | that it captured everything |
| 8 | Durable FG evidence store | append-only write | hashed evidence | evidence for checking | provider self-certification | FounderGate | n/a | long-term store integrity (separate concern) |
| 9 | Founder approval authority | **final acceptance** | hashed evidence bundle | accept/reject | runtime execution authority (stays out) | founder | n/a | founder judgment (by design human) |

## Mandatory design requirements (each carried into the Linux spike gate)
- **Workload must not receive the Docker socket** (boundary 4→5 forbidden).
- **Lifecycle server must not receive FounderGate merge/signature authority** (boundary 4 holds container authority only).
- **Customer repository must not be mounted from FounderGate's live filesystem** — artifacts are uploaded as content (with digests), never bind-mounted from the FG host.
- **Run host must be disposable** — destroyed after each run (boundary 3).
- **Evidence must be exported before host destruction** (boundary 7 → 8 precedes host teardown).
- **Evidence must be hashed before acceptance** (boundary 8; the founder at boundary 9 sees hashed evidence).
- **Provider failure ⇒ UNKNOWN or NOT-PASSED, never implicit PASS.**
- **No control or exec endpoint exposed publicly by default** — directly rejects the Phase-2 F3 `0.0.0.0` publish; endpoints are host-local/private.
- **Root-in-container is treated as a risk, not ignored** — recorded in `inspect_session.user`; mitigations (non-root, user-ns, secure runtime) are gates for the Linux spike.
- **Exact image digest required for qualification**; **no `latest` tags for accepted runs.**
- **Egress defaults to deny**; a Linux integration spike **must re-verify direct-IP denial** (Phase 2 proved it on macOS Docker Desktop; it must be re-proven where enforcement semantics may differ).
- **microVM / hardened runtime remains a separate future evaluation** — not claimed here.

## What remains unproven at design time (honest UNKNOWNs)
- That an ephemeral Linux VM will reproduce Phase-2 egress denial (must be tested).
- That teardown/host-destruction always completes under failure (needs failure-injection on Linux).
- That runc's standard-container boundary is sufficient for untrusted customer code — it is **not** claimed; a secure runtime evaluation is a separate gate.
- Rendered-UI/Playwright feasibility (never run).
