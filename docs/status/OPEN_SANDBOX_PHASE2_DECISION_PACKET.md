# OpenSandbox Phase 2 — Decision Packet (bounded runtime spike)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, HOST-PROVEN-NOT-M1). **Runtime:** default Docker = **runc / standard container isolation** ("Secure runtime is not configured" — NOT a microVM/kernel boundary). **Independent checker verdict: CHECKER-CLEAN (36/36 verifications; all five keystones survived falsification).** M1 and its soak never contacted · AKIOR never contacted · FounderGate `main` never modified (`e1ca1989…`, clean) · no PR merged.

**Pins:** OpenSandbox `192b5bf5…` · `opensandbox-server==0.2.1` · `opensandbox/execd:v1.0.21` (git `34653f7a…`; tag+commit pinned, not OCI-digest — recorded per lane rule 17) · `opensandbox/egress@sha256:973130e0…` · workload `python@sha256:db3ff2e1…`.

## Determinations (each from durable evidence; checker-confirmed)
| Determination | Value | Basis |
|---|---|---|
| RUNTIME_LIFECYCLE_PROVEN | **YES** | create→upload→digest-match→`builder.sh` exit 0→export digest-match (`68c15306…` in-sandbox == exported) [VERIFIED-RUNTIME] |
| HOST_PATH_NON-EXPOSURE_PROVEN_FOR_THIS_CONFIGURATION | **YES** | container-local write succeeded while host sentinel stayed ABSENT; core sandbox `Mounts=[]` [VERIFIED-RUNTIME + DOCKER-METADATA] |
| WORKLOAD_DOCKER_SOCKET_BLOCKED | **YES** | `/var/run/docker.sock` absent inside (`SOCKET_ABSENT`); `Mounts=[]`; server held socket as control-plane authority only [VERIFIED-RUNTIME] |
| EGRESS_BEHAVIOR_PROVEN_FOR_THIS_CONFIGURATION | **YES (strict)** | `dns+nft` default-deny; example.com 200; example.org DNS-denied; 1.1.1.1:443 nft-denied; nft chain `policy drop` → EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-SPIKE [VERIFIED-RUNTIME] |
| TEARDOWN_PROVEN | **YES** | both sandboxes DELETE→204/GET→404; workload+sidecar+volume gone; containers 17==baseline, networks 5==baseline; server down, 8090 closed [VERIFIED-RUNTIME + DOCKER-METADATA] |
| RENDERED_UI_FEASIBILITY_PROVEN | **NOT-RUN** | optional Phase 8 (Playwright) skipped [UNKNOWN] |
| ADAPTER_SEAM_CONFIRMED | **YES** | REST `/v1/sandboxes` + execd (`/command`, `/files/*`) is a clean, structured seam FounderGate can hide behind its own adapter [VERIFIED-RUNTIME] |
| PRODUCTION_ADOPTION_AUTHORIZED | **NO** | founder gate required; this spike authorizes nothing beyond itself |
| MAIN_MERGE_AUTHORIZED | **NO** | evidence-only [HOLD]; Terminal-0 is sole merge sheriff |

## Honest caveats carried forward (F1–F7 + checker notes)
- **F1** default runc (not microVM/kernel); no host-unreachability claim. **F3** execd/control ports published on `0.0.0.0` (not loopback-restricted; LAN-reachability untested from a 2nd host). **F4** workload ran as root-in-container. **F2** macOS Docker Desktop breaks the server-internal proxy seam (used published ports). **F6** pre-1.0 SDK create/upload contract mismatch. **F5** execd-staging named volume (not a host path/socket). **F7** rendered-UI not exercised. **Note:** execd tag-pinned, not OCI-digest pinned.
- These are the questions an adapter-design phase must answer; none is a disqualifier, and none is overturned by the spike's positive results.

## Recommendation: **PROCEED_TO_ADAPTER_DESIGN**
The bounded lifecycle, host-path non-exposure, docker-socket non-exposure, strict `dns+nft` egress, and clean teardown all behaved as observed on the M4 Pro, and an independent adversarial checker found no material overclaim. The correct next step is a **FounderGate-owned adapter design** against the pinned REST/execd contract — enforcing loopback-only publishing (F3), non-root workloads (F4), mandatory per-sandbox `dns+nft` egress, and a **separate** secure-runtime evaluation (gVisor/Kata/Firecracker) before any isolation claim. **No adoption, no production use, no merge is authorized by this packet — the founder gate remains.**

## Claim classes
VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN (no "PASS").
