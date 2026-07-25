# LRCQ V4 test-migration ledger (FG-LRCQ-ACT-029)

Every test family the V4 production migration affected, what changed, and where the property is now proven.

The migration's structural cause: a genuine `SUPERVISOR_EXECUTION` capability can be minted **only** inside a
process that received the per-activation ephemeral private key over the governed inherited anonymous
descriptor. Any family that must cross the real provider spawn boundary, or drive `runHarness` in
`RUNTIME_KIND.REAL`, therefore cannot assert in the test's own process. Those families were split into a thin
driver plus a **body module** executed inside `test-support/v4-execution-child.mjs`.

## New test-support surfaces (structurally test-only; no production module imports them)

| Module | Purpose |
| --- | --- |
| `test-support/v4-fixture.mjs` | disposable founder key, disposable public-key authority, disposable authorization text, real git repo + real git-common-dir, lifecycle root, genuinely signed V4 activation |
| `test-support/v4-run-world.mjs` | the above **plus** a complete digest-verified run manifest, every file it references, a disposable versioned provider target, and a real candidate git repository whose HEAD is the signed `reviewed_runtime_sha` |
| `test-support/v4-execution-child.mjs` | models the detached supervisor: independent V4 re-verification → attach over the inherited descriptor → dynamic import of a body module → JSON result |
| `test-support/v4-run-body.mjs` | driver: build world → consume → launch intent → ONE governed key transfer → collect the body's checks |
| `test-support/v4-supervisor-child.mjs` | minimal supervisor model used by the containment/transfer matrices |
| `test-support/bodies/*.body.mjs` | the migrated assertion bodies |

## Migrated families

| Family | Before | After |
| --- | --- | --- |
| `provider-tests/real-provider` | 64 assertions, hand-written V2 records, spawned directly | 80 assertions. Pure schema/argv/env/git-identity/controller checks stay in-process and gain 7 **V4 spawn-boundary negatives** (no capability, forged brand, field-copy, stage-A object, stage-B object, null, string). The process/outcome/containment matrix moved to `bodies/real-provider-exec.body.mjs` under a genuine capability, using the production projection. Refusal cases now additionally assert `started === false` and `provider_invocation === "PROVIDER_NOT_ATTEMPTED"`, so none can pass vacuously. |
| `protocol-route` | 8, in-process | 8, `bodies/protocol-route.body.mjs` |
| `productive-rehearsal` | 18, in-process | 18, `bodies/productive-rehearsal.body.mjs` |
| `full-rehearsal` (25 jobs) | 13, in-process | 13, `bodies/full-rehearsal.body.mjs` |
| `activation-path` | 36, REAL harness with a V3 record | 45, `bodies/activation-path.body.mjs`, plus 9 new V4 authority-gate negatives (no capability, shallow-copied capability, V3 record, unbound projection, candidate/provider/run-id binding mismatch, checker route with and without the capability) |
| `real-launch` | 66, REAL harness with a V3 record | 70. The REAL-mode matrix moved to `bodies/real-launch.body.mjs`; the pure layers (manifest loader, projection, real machine verifier, checker route, packet/disclosure) stay in-process. The V3→V2 composer block was replaced by projection assertions, and the packet checks now assert the **V4** payload template. |
| `launcher-integration` | 10, `executeSignedRun` (V3) | 13, `bodies/launcher-integration.body.mjs` driving `executeSignedRunV4`, plus assertions that the cfg carries the capability as authority and the record as a non-authoritative projection |
| `detached-supervisor` | 22, V3 activation, seam-free CLI | 31. Full V4 chain through the **real production CLI** over a disposable clone that carries a disposable public key in its **own** governance file. Adds: one-use key transfer recorded SPENT, the governed entrypoint + digest in the receipt, all three ephemeral-signed lifecycle records, the supervisor's own claim ownership, no key material in any durable record, and a final assertion that the **real** repository's launcher still refuses with the `KEY_ENROLLMENT` gate. |
| `detached-supervisor-failure` | 5, V3 refusals | 12 V4 refusals: V3 record, unsigned V4, no enrolled key, tampered payload, wrong authorization bytes, manifest drift, provider drift, missing entrypoint, symlinked entrypoint, no RUN_ACTIVE, replay, elapsed deadline |
| `preflight` | 5, V3 packet + template | 14. V3 packet → BINDING-DEFECT; a V4 template bound to the exact HEAD + manifest + installed target → SIGNATURE-REQUIRED with `founder_gate: KEY_ENROLLMENT` and zero invocation; and four proofs that a pending founder act never masks a binding defect (candidate SHA, provider identity, manifest digest, symlinked provider target, unbound manifest) |
| `production-seam-closure` | 24 | 30: adds V4 seam closure (empty `life` object at the CLI, manifest from the signed digest only, no authority-path/env override, transfer only via the governed module, independent supervisor re-verification, public-only supervisor config) |
| `provider-binding` | 17 | 19: the wiring guards now target the projection and the V4 launch route, and prove provider verification precedes consumption **and** the launch intent **and** the key transfer |
| `capsule-generator` / `capsule-deps` | red at baseline (`PROVIDER_TARGET_MISSING`) | 35 / 17 green: re-frozen onto the installed immutable target; the capsule verifier now checks the V4 template shape |
| `authority-route` | 14 | 15: the single-provider-spawn check distinguishes the provider spawn route from the governed supervisor spawn (`process.execPath` only) |
| `lifecycle-authority-v4` | 19 | 16: the in-process attach assertions moved out (attach is no longer reachable in-process — that is the point); `Z1` became "a planted marker BLOCKS, never mints" |
| `lifecycle-fd-transfer` | 4 | 18: positive attach, foreign-key `KEY_MISMATCH`, one-shot consume/intent/transfer, copied claim, copied marker, leak proofs |
| `lifecycle-key-containment` | — | **new**, 39: static export-surface proofs, every governed-transfer negative, one-time transfer + permanent spend, the full supervisor-side frame matrix, and leak proofs across argv, environment, config JSON, disk, git, receipts, stdout and stderr |
| `v3-retirement` | — | **new**, 22 (replaces `launcher-supervised`) |

## Retired subjects

| Retired | Why | Where its properties are proven now |
| --- | --- | --- |
| `run-harness/compose-adapter-activation.mjs` | produced a V2 adapter record from a **V3** record, i.e. a second authority path | `run-harness/v4-legacy-projection.mjs` — a projection of a genuine capability, `authoritative: false`, bound to the capability's claim digest |
| `test-support/supervised-run.mjs` (`executeSupervisedRun`) | modelled a V3 in-process supervised lifecycle | `detached-supervisor` + `detached-supervisor-failure` prove one-time consumption, durable replay blocking, single-supervisor ownership, the immutable deadline, durable terminal state and the read-only witness with **real processes** |
| `launcher-supervised.selftest.mjs` | its subject was the module above | replaced by `v3-retirement.selftest.mjs`, which proves the retirement itself: no V3 route or export on the launcher, no V3 mutating consumer in the production import graph, the V3 validator reachable only under `DETERMINISTIC_TEST`, and a V3 record refused at **every** new production entrypoint |
| `launchDetachedSupervisor`, `executeSignedRun`, `buildRealCfg` | V3 entry points | `launchDetachedSupervisorV4`, `executeSignedRunV4`, `buildRealCfgV4` |
| `__testEphemeralKeyOf`, `sendEphemeralKeyToStream`, `receiveEphemeralKeyFromFd` | exported lifecycle private-key material or accepted an arbitrary sink | `spawnGovernedSupervisorV4` + `attachSupervisorFromInheritedFdV4`; no export returns a private key or DER |

`validateActivationV3`, `attack-refusal.mjs` and `activation-consumer.mjs`'s read-only helpers are retained
deliberately: historical V3 records must stay readable for evidence and incident reconstruction. They are
unreachable from any new production execution path, which `v3-retirement` asserts mechanically.

## Disposability

Every migrated family uses disposable founder keys, a disposable public-key authority injected through
`keyDeps` (or, for the clone-based end-to-end test, the **clone's own** governance file), disposable
authorization text, disposable git repositories and git-common-directories, disposable lifecycle roots,
disposable inherited descriptors, and deterministic provider stubs. No test enrolls a real founder key,
creates a real signature, consumes a real activation, or invokes a real provider. The repository's
`docs/governance/FOUNDER_KEY_AUTHORITY.json` keeps `active_keys: []`, which `detached-supervisor` asserts
before and after its run.
