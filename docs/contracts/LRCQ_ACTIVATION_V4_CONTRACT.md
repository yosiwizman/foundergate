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

## Immutable authority (FG-FCHK-197-C)

`Object.freeze` is **shallow**. Every capability stage is therefore published as a **deep-frozen copy** built
by `assurance/deep-freeze-authority.mjs`, which accepts only plain JSON authority data (string, boolean, null,
finite number, plain array, plain object) and refuses functions, non-plain prototypes, accessor properties,
symbol keys and values, `undefined`, `NaN`, `Infinity`, `BigInt` and reference cycles. It **copies before
freezing** and freezes only the copy, so a caller-owned source object is never frozen in place and the
authority retains no reference to the parsed activation document.

The invariant, for VERIFIED, CONSUMED and SUPERVISOR_EXECUTION alike: `mutableAuthorityPaths(cap)` is empty.
No caller can modify budget, timeout, width, output limit, grace period, duration, deadlines, exclusions,
provider identity, candidate identity, backlog or job authority through a capability reference, and a
projection derived after an attempted mutation is byte-identical to one derived before it.

`cap.limits` and `cap.exclusions` are **projected mechanically from the signed payload** — the six limits of
`V4_SIGNED_LIMITS` and all ten exclusions of `V4_SIGNED_EXCLUSIONS`. `exclusions` was previously a hardcoded
three-field constant, i.e. a redundant copy of signed authority that did not track the payload.

## The provider spawn boundary (FG-FCHK-197-B)

`provider/authority-boundary.mjs` is the one authoritative validator at the productive-provider spawn. It
receives the genuine branded `SUPERVISOR_EXECUTION` capability, the proposed non-authoritative projection, the
job and the fixed runtime bindings, and it is called both after provider eligibility and again as the **last
statement before `spawn()`**.

It must not trust a hand-written V2-shaped projection, a projection merely because its claim digest matches, a
mutable capability property, or a validator that only checks "positive and finite". Concretely:

* it first requires the authority it derives ceilings **from** to be immutable — deriving a ceiling from a
  writable object is not enforcement (this is why FG-FCHK-197-C is corrected first);
* every signed numerical limit is enumerated from `V4_SIGNED_LIMITS`: the projected value must be finite,
  valid for its declared kind, and **≤** the signed ceiling. Zero, negative, `NaN`, `Infinity`, missing and
  wrong-typed all fail. Legitimate **narrowing** remains permitted;
* the run deadline and expiry may be brought **forward** but never pushed out; `run_duration_s` is enforced as
  a ceiling whenever the record carries it. It is a *separate* signed value, **not** a consistency constraint
  between the signed epochs — the founder signs the hard deadline and the duration independently, so deriving
  a duration from the epochs and refusing on it would reject legitimately signed activations;
* every signed exclusion is enumerated from `V4_SIGNED_EXCLUSIONS` and must be exactly `true` in the signed
  authority **and** exactly `true` in the projection. This is signed-exclusion enforcement, **not** a
  deny-list presence test; missing, `false`, `null`, a truthy non-`true` substitute and a differently named
  field all fail before spawn;
* signed identity facts may be restated but never altered, provenance is required, and any unknown `v4_*`
  authority-bearing field is refused.

`projectionMatchesCapability` carries the same contract in boolean form, and the V2 validator's must-be-true
list is the complete ten-exclusion set (`MUST_BE_TRUE_EXCLUSIONS`).

## Lifecycle-root object continuity (FG-FCHK-197-D)

Recording the device/inode identity is not enough — it must be **checked on production reads**. The expected
identity is captured at governed consumption and held in module-private capability state; every later
authority operation re-resolves the signed lifecycle root and requires that exact filesystem object, and
passes the expectation into every marker, intent and claim read. The supervisor side, which has no in-process
consumption state, derives the expectation from the marker and requires the live root to match it **before the
ephemeral signature and before the cryptographic key comparison**. The supervisor claim now records
`lifecycle_root_object_id` and `lifecycle_root_digest` explicitly, so the identity is a recorded property of
all three records rather than only transitively bound through digests. Refusal code:
`ROOT_OBJECT_IDENTITY_MISMATCH`.

## The governed spawn/write race (FG-FCHK-197-A)

`child_process.spawn` reports most failures **asynchronously**, by emitting `error` on the returned
`ChildProcess` — a bad cwd or an unreachable executable yields a `ChildProcess` with no pid and then `ENOENT`.
A `try/catch` around `spawn()` catches only synchronous argument-type throws, and a listener on the stdio
stream is a *different* EventEmitter.

`spawnGovernedSupervisorV4` therefore registers `child.once("error")` **synchronously, before the key frame is
written and before the first `await`**, together with the writer error observer, and races them: child spawn
error → `SUPERVISOR_SPAWN_FAILED`; descriptor write failure → `TRANSFER_WRITE_FAILED`; write completion →
proceed to the acknowledgment gate below.

> **Superseded in part by FG-FFIN-197-F1.** This section originally also declared *premature child termination
> → `TRANSFER_WRITE_FAILED`*, decided by a 250 ms timer. That arm was **never reachable**: the governed key
> frame is 92 bytes and the inherited descriptor is an ordinary kernel pipe with a 64 KiB buffer, so the write
> callback always settled the race within microseconds. Worse, write completion was treated as success, so a
> supervisor whose entrypoint was simply `process.exit(9)` produced `ok: true` with a dead `supervisor_pid`
> (reproduced 6/6). The timer is gone; the gate below replaces it.

Past the point of no return every outcome leaves the authority `TRANSFERRED_SPENT`, the private key deleted
from module storage, all temporary buffers zeroed, the writer closed and any partially created child killed and
reaped. A failure returns **one structured fail-closed result**, never an uncaught exception, so the caller can
record truthful failure evidence and exit normally.

## Evidence classes (FG-FCHK-197-E)

Assurance evidence in this lane states what was actually observed:

* **DYNAMIC** — the attack was executed and its refusal or behaviour observed;
* **COUNTED** — a real process count read from a recording stub's own log;
* **SOURCE-PROVEN / STRUCTURAL** — a property of the source text, never presented as runtime proof.

Zero-provider-spawn claims are **counted**, never inferred from key-frame receipts or refusal strings. A
property that cannot be reproduced without root (e.g. a foreign-owned authority record) is recorded as
source-proven and is not claimed as an achieved runtime result.


## The deterministic supervisor acknowledgment (FG-FFIN-197-F1)

**Pipe-write completion is not success.** It proves only that the bytes entered the kernel buffer, never that
the supervisor read them. No timing heuristic can repair this — any elapsed-time arm loses the race to the
write callback deterministically — so elapsed time is never the authority decision.

A governed transfer reports `OK` only after the **exact spawned process** produces a verified, ephemeral-signed
**supervisor claim**. Verifying that one artifact proves, together, that the supervisor:

1. read and decoded the inherited key frame;
2. matched the ephemeral key to the consumed marker;
3. independently reverified the signed V4 activation;
4. proved its entrypoint identity;
5. minted a valid signed claim;
6. bound that claim to the spawned PID and its OS-observed start identity.

None of the following is accepted as proof: the pipe-write callback, the writer `end` callback, elapsed time,
the existence of a child PID, or the child merely staying alive for some number of milliseconds.

### The start-identity observation is mandatory and fails closed (FG-FFIN4-197-01)

Point 6 is the only binding a key-holding supervisor could otherwise forge. It legitimately holds the
transferred ephemeral key once it has read the frame, so it can sign **any** body it likes: activation
identity, payload digest, marker digest, intent digest, launch nonce, entrypoint digest, lifecycle-root
object identity and even its own real PID all still pass. `supervisor_start_identity` is the one field it
fully controls, and the only thing that checks it is the parent's **independent** observation of the
process's start time through the fixed absolute `/bin/ps` in the minimal controlled environment.

That comparison is therefore **unconditional**. If the parent cannot obtain the observation, the governed
transfer refuses with `SUPERVISOR_START_IDENTITY_UNAVAILABLE`; it never falls back to the claim's own word.
A process's start time is immutable for its lifetime, so the first successful observation is cached and
re-used, and while none has been obtained the parent keeps retrying — a single transient `ps` failure must
not condemn a healthy transfer — but an observation that is still missing at the decision point is a refusal,
**not degraded assurance**. Every `OK` result therefore carries both `supervisor_acknowledged === true` and
`start_identity_independently_observed === true`.

> **Superseded.** In candidate `4014d91b` this comparison ran only `if (observedStart !== null)`. Under
> genuine file-descriptor pressure — reachable exactly as a long multi-process run creates it — the parent's
> `ps` failed, the check silently disabled itself, and a supervisor that forged only its start identity was
> **accepted**, returning `ok: true` with `start_identity_independently_observed: false`. The fourth
> independent Checker reproduced this end to end, and this Builder reproduced it again before correcting.
> The supervisor side of the identical observation had always failed closed
> (`START_IDENTITY_MISMATCH` on a null observation); the parent side now matches it.

The wait is **exit-driven, not timing-driven**: when the child is gone we perform one final classification and
decide immediately, so a dying supervisor is refused as fast as it dies. Failure codes:

| Outcome | Code |
| --- | --- |
| child exited without a verified claim | `SUPERVISOR_TERMINATED_BEFORE_CLAIM` |
| no verified claim within the bound | `SUPERVISOR_CLAIM_TIMEOUT` |
| a claim exists but is malformed, copied, stale, wrong-PID or wrong-start-identity | `SUPERVISOR_CLAIM_INVALID` |
| the parent could not independently observe the process start identity | `SUPERVISOR_START_IDENTITY_UNAVAILABLE` |

A torn read of a half-written record is retried; a **complete** record that fails any binding is refused
immediately, because claims are created `wx`-once and can never become valid later. Every failure here is
*after* key materialisation, so the authority stays `TRANSFERRED_SPENT`, the private key stays deleted, the
buffers stay zeroed, the writer stays closed, a still-live child is killed and reaped, and a retry returns
`ALREADY_TRANSFERRED`. `SUPERVISOR_CLAIM_WAIT_MS` is a fixed module constant — there is deliberately **no**
caller-configurable claim path, clock, timeout or verification bypass.

One consequence worth naming: a supervisor handed a *foreign* activation's key can never mint a valid claim,
so the launcher now **detects a key swap** that it previously could not.

## Setter-safe authority copying (FG-FFIN-197-F4)

`deepFreezeAuthority` builds its copy with `Object.create(null)` and `Object.defineProperty`, never with
property assignment, and refuses the structural keys `__proto__`, `constructor` and `prototype` at every depth
with `AUTHORITY_DANGEROUS_KEY`. The standard prototype is restored only after every key has been materialised
as an own data property, so ordinary plain-object behaviour (`JSON.stringify`, `Object.keys`, spread, `in`)
is preserved.

This matters because `JSON.parse` produces exactly the dangerous shape — an own, enumerable, writable
`__proto__` data property. Under plain assignment `out[k] = v` invoked `Object.prototype`'s `__proto__`
**setter**, so the copy silently dropped the key, inherited the attacker's fields through the prototype chain,
still reported `Object.isFrozen === true` and an empty `mutableAuthorityPaths`, and was then refused by this
very module on round-trip as `AUTHORITY_NON_PLAIN_PROTOTYPE` — a self-inconsistency proving the copy was not
the plain JSON authority data the contract promises. No production call site could reach it (all three pass
object literals with hard-coded key sets), so this was a latent contract gap, not an authority escape.
