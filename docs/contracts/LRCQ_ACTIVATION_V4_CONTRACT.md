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
