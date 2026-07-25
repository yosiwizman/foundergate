# LRCQ Activation V4 — Ed25519 Founder Signature Contract (FG-LRCQ-ACT-028)

## Why V4 exists
V3 (`lrcq-activation-3`) checked only that `founder_signature` was **present** (non-empty). Any non-empty
string authorized execution — there was no signer, no key, and no binding to the founder's authorization.
This is the defect that produced `SIGNATURE_SCHEMA_UNRESOLVED`: a genuine founder authorization could not be
mechanically encoded, and a fabricated string would have "passed." V4 replaces presence with a real,
verified Ed25519 signature.

## Schema `lrcq-activation-4`
Authority-bearing fields (all covered by the signature): schema, `signature_payload_version`,
`founder_signature_algorithm` (=`ed25519`), `signer_key_fingerprint`, `authorization_text_digest`,
`activation_nonce`, evidence commit sha/tree, reviewed runtime sha/tree, `run_id`, `backlog_digest`,
provider path/target/version/identity, capability-lease + blast-budget digests, issued/expiry/hard-deadline
epochs, budget/duration/timeout/width/output/grace limits, and all `no_*` exclusions (incl. `no_deploy`,
`no_external_comms`). `founder_signature` (base64 Ed25519) is **excluded** from the signed payload, as are
derived receipts and the derived activation identity.

## Signature domain + canonical payload
The signed message is `UTF8("FOUNDERGATE-LRCQ-ACTIVATION-V4\0") + UTF8(canonicalPayload)`. The canonical
payload is produced by the ONE production canonicalizer (`src/v8b/lrcq/assurance/canonical-json.mjs`):
recursively key-sorted objects, order-preserving arrays, exact UTF-8, **no** Unicode/line-ending/whitespace
normalization; undefined/NaN/Infinity/functions/non-plain-objects are rejected. `signature_payload_version`
= `lrcq-activation-v4-signature-payload-1`.

## Exact authorization-byte binding
`authorization_text_digest = sha256:<hex over the exact founder-authorization file bytes>`. No normalization.
A one-byte / LF↔CRLF / Unicode change breaks verification (`AUTHORIZATION_DIGEST_MISMATCH`).

## Verifier + verified capability
`verifyActivation(activation, bindings, {keyDeps})` resolves the signer fingerprint against the governed
authority (current, known, non-revoked), verifies Ed25519 over the domain-separated canonical payload,
cross-checks the authorization digest + all candidate/provider/backlog/lease/budget bindings + limits +
exclusions + (optionally) temporal epochs, and returns a **non-forgeable verified capability** (a frozen,
module-private-`WeakSet`-branded object). A plain `{verified:true}` object is never accepted. `runJob`,
consumption, launcher dispatch, adapter composition, and provider eligibility require this capability.

## V3 is evidence-only
V3 records remain parseable for historical evidence, but `verifyActivation` returns
`V3_REFUSED_FOR_EXECUTION` for any V3 schema. An arbitrary non-empty V3 `founder_signature` never authorizes
new signing, preflight authorization, consumption, launch, supervisor execution, or provider eligibility.

## Consumption
`consumeVerifiedActivation(capability, opts)` requires a genuine verified capability (a raw activation or a
forged object is refused **before** any consumed-marker is written), derives the activation identity from
`sha256(payloadDigest || detached-signature-bytes)`, atomically creates one durable marker, and blocks
replay. Markers record only safe digests + fingerprints — never authorization text, private key, or
passphrase. Historical consumed markers remain unchanged and readable.

## Requalification
A genuine founder key must be enrolled (see the enrollment/signing doc) into the governed authority BEFORE a
final runtime freeze + package generation; changing the runtime or the authority requires a fresh review.

---

# FG-LRCQ-ACT-029 — production migration + lifecycle-key containment

## The one production execution route
```
signed V4 activation
  -> governed founder public-key authority (docs/governance/FOUNDER_KEY_AUTHORITY.json, fail-closed)
  -> VERIFIED capability                       (Ed25519 over canonical payload + exact authorization bytes)
  -> preflight with ZERO provider invocation
  -> governed one-time consumption             (ephemeral-key-signed marker in the SIGNED lifecycle root)
  -> opaque CONSUMED capability
  -> signed atomic launch intent               (names + digests the supervisor entrypoint)
  -> one-use inherited-descriptor key transfer (the authority module creates the descriptor itself)
  -> detached supervisor OS process
  -> INDEPENDENT V4 re-verification in that process
  -> signed atomic supervisor claim            (bound to pid + observed process-start identity)
  -> opaque SUPERVISOR_EXECUTION capability
  -> non-authoritative legacy projection       (run-harness/v4-legacy-projection.mjs)
  -> deterministic execution machinery         (run-harness/harness.mjs, RUNTIME_KIND.REAL)
  -> provider eligibility                      (providerEligibilityV4)
  -> spawn boundary                            (provider/real-provider.mjs requires the capability)
```
There is no synchronous, in-process, or alternate route. `tools/terminal0/lrcq/run-five-hour.mjs
--activation <signed-v4.json> --authorization <file>` is the only production launcher, and it passes an
**empty** options object: nothing about the manifest, bindings, provider, candidate, repository, lifecycle
root, supervisor entrypoint, or timing can be supplied by a caller.

## Newly SIGNED payload fields
`run_manifest_path`, `run_manifest_digest`, `lrcq_base_sha`, `lrcq_base_tree`, `provider_candidate_sha`,
`provider_candidate_tree`.

Without them the V4 record bound no manifest, so the legacy projection would have had to read execution
boundaries (repository/branch/worktree/evidence roots, tool sets, timeouts) from an unsigned file, and the
legacy candidate-stack fields would have been launcher-supplied rather than founder-signed.
`run_manifest_digest` is the digest of the manifest **file bytes** — exactly what the launcher re-reads.

## Lifecycle-private-key containment
The V4 authority module exports **no** function that returns a lifecycle private `KeyObject` or its DER
bytes — not for production, not for tests. The key leaves the launcher through exactly one operation,
`spawnGovernedSupervisorV4`, which:

* requires a genuine opaque CONSUMED capability;
* requires an already-created, ephemeral-**signed** launch intent bound to this marker and this key;
* requires transfer state `NOT_TRANSFERRED`;
* **creates the inherited anonymous descriptor itself** (child-process pipe stdio), so a caller can never
  supply the sink — the key cannot be written to a file, socket, stdout/stderr, or log;
* spawns exactly the entrypoint the signed intent recorded (non-symlink regular realpath file whose sha256
  matches the intent digest);
* writes the framed key once, zeroes every temporary buffer, closes the writer;
* deletes the private key from module-private storage;
* marks the capability permanently `TRANSFERRED_SPENT`, so every second transfer fails.

The supervisor side has one exported entry, `attachSupervisorFromInheritedFdV4`, which reads the governed
frame (`"FGV4KEY1" || uint32be(derLen) || der || sha256(header||der)`) off the inherited descriptor. Empty,
malformed, too-short, truncated, oversized and wrong-algorithm input each fail closed with a distinct code.
The reconstructed key never crosses back out to supervisor code, and the attach additionally proves the
running program **is** the intent's entrypoint (same realpath, same content digest), so a different program
holding a transferred key cannot mint a claim.

The key bytes exist only: briefly in the launcher's memory, in the kernel pipe buffer, and in the
supervisor's memory inside the attach call. Never argv, environment, config JSON, disk, git, logs, receipts,
stdout, or stderr.

## The legacy projection is not an authority
The reviewed provider adapter validates a V2 record. `projectLegacyActivationV4` is the only producer of one
for new execution. It is a pure projection of SIGNED facts carried on the SUPERVISOR_EXECUTION capability
plus the manifest that capability's signed digest binds. It is stamped `authoritative: false`, its
`founder_signature` is the literal string `NON_AUTHORITATIVE_V4_PROJECTION`, and it carries
`v4_supervisor_claim_digest`. Both the harness and the spawn boundary require that digest to equal the digest
on the genuine capability they were handed — and check the capability's module brand first, so a fabricated
projection opens nothing. A manifest may **narrow** a signed limit but never widen one.

## V3 retirement
V3/V2 records are refused, before any side effect, at: the verification gate (`verifyActivationFile`), the
detached launch route (`launchDetachedSupervisorV4`), the production CLI, the REAL harness route
(stage `v4_execution_authority`), and the provider spawn boundary. `validateActivationV3` remains reachable
only under `RUNTIME_KIND.DETERMINISTIC_TEST`; the V3 mutating consumer is absent from the production import
graph. Both facts are asserted mechanically by `v3-retirement.selftest.mjs`.

## Founder gate classification
With `active_keys: []`, verification stops at the governed key authority. The preflight distinguishes the two
founder acts: `founder_gate: "KEY_ENROLLMENT"` when no current key exists, `"SIGNATURE"` when a key is
enrolled but the signature is absent or invalid. A pending founder act never masks a binding defect — the
preflight cross-checks the candidate stack, the manifest file digest, and the reviewed provider target
(digest only; the provider is never executed) independently of the signature.

---

# FG-CHK-197 — independent-Checker finding correction

An independent read-only Checker (report sha256 `caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f`)
returned FINDINGS. The corrections below change the contract; that report is historical evidence only.

## The one-use transfer is atomic
`TRANSFER_STATES` is `NOT_TRANSFERRED -> TRANSFERRING -> TRANSFERRED_SPENT`, held in a module-private WeakMap.
The transition to `TRANSFERRING` happens **synchronously in the same microtask as the one-use guard**, before
any child creation, spawn, key export, pipe write or asynchronous yield, so a concurrent caller is refused
`ALREADY_TRANSFERRED` before spawn. Input-validation refusals return the capability to `NOT_TRANSFERRED`
(nothing was materialized). Past the point of no return the key is exported, the frame encoded, the key
**deleted from module storage** and the state set `TRANSFERRED_SPENT` — all before the first await — so a
failed or ambiguous transfer can never be retried with the same key. A partially launched child is killed
**and reaped**.

## Fixed authority executables
Every authority-bearing process observation runs a fixed absolute executable — `/usr/bin/git`, `/bin/ps` —
verified to be a regular non-symlink executable immediately before use, in a minimal environment that also
drops `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR` and pins `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` to
`/dev/null`. No environment variable, activation field, config field, CLI flag or fixture can replace them,
and a missing, symlinked, non-regular or non-executable binary fails closed.

Correction to an earlier claim in this document: an **alternate worktree shares the common dir**. The binding
holds via the toplevel check — `git -C <SIGNED repository_root> rev-parse --show-toplevel` must equal the
signed root exactly — not via a common-dir difference.

## The supervisor config carries no authority
`SUPERVISOR_CONFIG_KEYS` is an exhaustive allow-list. `exec` and `now` are refused explicitly, and any unknown
key is refused too, **before** the lifecycle claim and before any provider access. Production time is the
system clock. The executor receives an empty `exec` object, so nothing in a config can select an execution
function, a git runner, a repository root, a candidate ref or a clock. The config file itself must be an
owner-matching 0600 regular file. Deterministic clock and execution substitution live only in the test
families, which pass them as function parameters — never through a config.

## Filesystem authority guards
Three permission classes, enforced at every authority-bearing use:

| Class | Objects | Rule |
| --- | --- | --- |
| `SECRET_OR_MUTABLE` | consumed marker, launch intent, supervisor claim, supervisor config, authorization bytes | owner == running uid; **no** group/other permission (`mode & 0o077`) |
| `PUBLIC_SIGNED` | the signed activation | owner; no group/other **write** (`mode & 0o022`) — it is signature-protected and meant to be readable |
| `DIRECTORY` | the lifecycle root | owner; no group/other **write** — 0755 stays traversable |

The security property for path identity is **exact canonical filesystem OBJECT identity (device + inode)**, not
case-sensitive string identity. `lifecycle_root_digest` derives from that identity, so one physical directory
has exactly one digest regardless of spelling, while a different filesystem object is refused even when its
path string looks similar. Records carry `lifecycle_root_object_id`.

## No mutable state on a capability
Launch and transfer state live in a module-private WeakMap alongside the ephemeral key. The capability has no
`__state`, `Object.freeze` is not defeated by a nested object, `JSON.stringify` exposes no lifecycle state, and
`Reflect.ownKeys`/prototype inspection reveal nothing writable. `lifecycleStateV4()` returns a frozen read-only
snapshot for tests and evidence and `null` for a non-capability.

## The supervisor entrypoint is mandatory
`createLaunchIntentV4` refuses an absent or null `supervisorEntrypoint`, and the attach-side "this program IS
the entrypoint" proof is unconditional: an intent recording no entrypoint is refused outright. No production
flag disables it.
