# OpenSandbox Phase 3 — Decision Packet (provider-neutral adapter design + isolated prototype)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, HOST-PROVEN-NOT-M1). **DESIGN + ISOLATED PROTOTYPE ONLY — no runtime executed.** **Independent checker verdict: CHECKER-CLEAN (20/20 checks; 17/17 prototype tests OK; no material findings).** M1 and its soak never contacted · AKIOR never contacted · FounderGate `main` never modified (`e1ca1989…`, clean) · PR #151 and #152 untouched (open drafts).

**Pinned state:** main `e1ca1989…` · PR#151 `audit/opensandbox-phase1@e58632b…` (OPEN/DRAFT) · PR#152 `spike/opensandbox-phase2@adcb169e0c61948c253aead576cd90727227e455` (OPEN/DRAFT) · evaluated OpenSandbox `192b5bf5…` · Phase-3 branch `design/opensandbox-provider-adapter-phase3` (from `adcb169…`).

## Determinations
| Determination | Value | Basis |
|---|---|---|
| PROVIDER_CONTRACT_CONFIRMED | **YES** | `SANDBOX_PROVIDER_CONTRACT.md` + `contract.py` define 10 neutral ops, error classes, evidence records, fail-closed validation; no provider type crosses the boundary (checker-confirmed no leak). |
| OPENSANDBOX_ADAPTER_SEAM_CONFIRMED | **YES** | `OPEN_SANDBOX_ADAPTER_DESIGN.md` maps every op onto Phase-2-proven REST/execd seams; `opensandbox_provider.py` serializes/parses them deterministically (test 11/12/15). |
| PROVIDER_REPLACEABILITY_PRESERVED | **YES** | callers see only neutral types; `fake_provider.py` satisfies the same interface; swapping providers needs no gate/ledger/founder-facing change. |
| FAIL_CLOSED_BEHAVIOR_PROVEN_IN_PROTOTYPE | **YES** | missing image/timeout, host/socket mounts, non-default-deny egress, missing exec evidence, digest mismatch, unproven termination, malformed responses all refuse or return NOT_PASSED/UNKNOWN (tests 2–9,12,16,17; checker's own injections). |
| MAC_PORT_EXPOSURE_ACCEPTED_FOR_PRODUCTION | **NO** | adapter rejects `0.0.0.0` client targets and non-loopback endpoints in local-dev; design forbids `0.0.0.0`-published control/exec ports for production (Phase-2 F3). |
| EPHEMERAL_LINUX_VM_SELECTED_FOR_NEXT_SPIKE | **YES** | native Docker bridge (no macOS proxy failure F2), disposable per-run host, host-destruction teardown, no idle fleet — follows from Phase-2 evidence. |
| PRODUCTION_INTEGRATION_AUTHORIZED | **NO** | design + prototype only; founder gate required. |
| OPENSANDBOX_ADOPTION_AUTHORIZED | **NO** | OpenSandbox remains one replaceable candidate behind the adapter. |
| MAIN_MERGE_AUTHORIZED | **NO** | evidence-only [HOLD]; Terminal-0 is sole merge sheriff. |

## Checker notes carried forward (cosmetic; not blocking)
- **N1** — `test_01` includes a tautological download-digest assertion; the real digest logic is covered by tests 8 & 16. Cosmetic.
- **N2** — governed mode rejects a `:latest` tag but does not yet *strictly mandate* a `sha256:` digest (consistent with the contract's "digest-preferred"). **Hardening item for the Linux spike:** require an exact digest for qualification runs.

## Recommendation: **PROCEED_TO_LINUX_ADAPTER_SPIKE**
The provider-neutral contract is clean, replaceability is preserved, and the prototype fails closed under every injected fault; the checker found no material issue. The next bounded runtime test should occur on an **ephemeral or spare Linux host**, without integrating into FounderGate production, and must: re-verify direct-IP egress denial on Linux; confirm the server↔execd proxy works natively (retiring the macOS published-port workaround); enforce loopback/private-only control endpoints; require an exact image digest; and treat root-in-container and secure-runtime (gVisor/Kata/Firecracker) as explicit, separately-gated evaluations. **No adoption, no production integration, no merge is authorized by this packet — the founder gate remains.**

## Claim classes
VERIFIED-PROTOTYPE (tests) · VERIFIED-DESIGN (docs) · PARTIALLY-VERIFIED · UNVERIFIED · UNKNOWN (no "PASS"; no runtime evidence produced this phase).
