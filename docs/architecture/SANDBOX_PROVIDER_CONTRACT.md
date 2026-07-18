# FounderGate Sandbox Provider Contract (provider-neutral)

**Status:** DESIGN · Phase 3 · no runtime executed. This contract is **FounderGate-owned**. No OpenSandbox (or any provider) type, field name, error, or assumption may leak across it into the rest of FounderGate. OpenSandbox is **one possible implementation**, never mandatory.

## Purpose & principles
- **Provider-neutral**: FounderGate code depends only on the types defined here. Swapping OpenSandbox for another provider (or a fake) must require **zero** changes to FounderGate gate, ledger, or founder-facing contracts.
- **Fail-closed**: every operation defaults to refusal/UNKNOWN when a required field, digest, timeout, or evidence element is absent. Absence never silently degrades to PASS.
- **Evidence-first**: the provider returns *observations*; it never returns a verdict. FounderGate (and ultimately the founder) decide acceptance.
- **Least authority**: the contract exposes only the calls a governed run needs; it carries no merge/signature/gate authority.

## Common types (shared across operations)
- `SessionId` (opaque string, provider-scoped). `RunId` (FounderGate-scoped, provider-independent).
- `Timestamps`: every response carries `requested_at`, `responded_at` (UTC ISO-8601, `Z`). Long operations also carry provider-side `started_at`/`ended_at` when available (else `UNKNOWN`).
- `Digest`: `sha256:<hex>`; recorded for every uploaded and downloaded artifact.
- `ProviderMeta`: `{provider_name, provider_version, workload_image_ref (exact, digest-preferred), runtime_kind ("standard-container"|"secure-runtime"|"UNKNOWN"), host_kind, api_contract_version}`. `provider_version` and `workload_image_ref` are **mandatory**; a missing exact image ref is a fail-closed condition for governed mode.
- `EvidenceRef`: `{kind, digest, captured_at, bytes}` pointing at durably-stored evidence (stdout/stderr blobs, inspect JSON, egress logs, teardown proof).
- `Confidence`: one of `VERIFIED`, `PARTIAL`, `UNKNOWN` (never `PASS`).

## Error classes (provider-neutral; providers must translate into these)
`ValidationError` (request violates an invariant — fail closed, nothing created) · `AuthorityError` (a forbidden authority/mount/credential was requested) · `ProviderUnavailable` (transport/endpoint down) · `ProviderProtocolError` (malformed/unschema'd provider response) · `TimeoutError` (deadline exceeded) · `Cancelled` (caller cancelled) · `TerminationUnproven` (teardown could not be confirmed → UNKNOWN) · `EvidenceIncomplete` (required evidence missing → not-passed). No provider-specific error may escape.

## Cross-cutting behavior (applies to all 10 operations)
- **Timeout**: every operation requires an explicit `timeout_s` (no implicit/default infinite). On breach → `TimeoutError`, and the caller must be able to drive `terminate_session` + `prove_termination`.
- **Cancellation**: operations accept a cancel signal; a cancelled call returns `Cancelled` and leaves the session in a queryable state (never a silent partial success).
- **Idempotency**: mutating calls accept an `idempotency_key`; a ret=> with the same key must not double-create/double-charge; `terminate_session` is idempotent (terminating an already-gone session is success, not error).
- **Redaction**: no credential, token, env secret, or absolute host path outside the run is ever placed in requests, responses, evidence, or logs; provider auth material (if any, under a later gate) is redacted to `****` in all recorded evidence.
- **Fail-closed**: missing required field / missing digest / missing image identity / non-default-deny egress in governed mode / unproven termination → refuse or return UNKNOWN; never PASS.

## The ten operations

### 1. create_session
- **Request**: `run_id`, `workload_image_ref` (exact, digest-preferred), `entrypoint`, `timeout_s`, `resource_limits`, `egress_policy` (see #5; governed mode requires default-deny), `mounts` (must be empty of host source/home/docker.sock — see invariants), `env` (no secrets unless later-gated), `idempotency_key`.
- **Response**: `session_id`, `provider_meta`, `status`, `timestamps`, `confidence`.
- **Errors**: `ValidationError` (missing image/timeout), `AuthorityError` (forbidden mount/socket/credential), `ProviderUnavailable`, `TimeoutError`.
- **Fail-closed**: no image ⇒ refuse; no timeout ⇒ refuse; any host-source/home/docker.sock mount ⇒ `AuthorityError`.

### 2. upload_artifact
- **Request**: `session_id`, `dest_path`, `content_ref`, `expected_sha256`, `timeout_s`, `idempotency_key`.
- **Response**: `stored_path`, `stored_sha256`, `timestamps`, `confidence`. **Evidence**: uploaded `Digest` retained.
- **Fail-closed**: `stored_sha256 != expected_sha256` ⇒ `EvidenceIncomplete`/reject.

### 3. execute_command
- **Request**: `session_id`, `command`, `cwd`, `timeout_ms`, `env` (no secrets), `idempotency_key`.
- **Response**: `exit_code`, `stdout_ref`, `stderr_ref`, `started_at`, `ended_at`, `duration`, `timestamps`, `confidence`. **Evidence**: stdout, stderr, exit code, timestamps all **mandatory-retained**; if any is absent ⇒ `EvidenceIncomplete` (not PASS).
- **Timeout/cancel**: breach ⇒ `TimeoutError` with partial stdout/stderr refs retained.

### 4. download_artifact
- **Request**: `session_id`, `src_path`, `expected_sha256` (optional), `timeout_s`.
- **Response**: `content_ref`, `downloaded_sha256`, `bytes`, `timestamps`, `confidence`. **Evidence**: downloaded `Digest` retained; export must not require a host mount.
- **Fail-closed**: if `expected_sha256` given and mismatched ⇒ reject.

### 5. apply_egress_policy
- **Request**: `session_id`, `default_action` (`deny`|`allow`), `rules` (ordered `{action, target}`), `mode_hint` (`dns`|`dns+nft`), `timeout_s`.
- **Response**: `effective_default`, `effective_rules`, `enforcement_mode`, `evidence_ref` (sidecar/policy observation), `timestamps`, `confidence`.
- **Invariant**: **governed mode requires `default_action=deny`**; a non-default-deny request in governed mode ⇒ `ValidationError`. The contract must *support* deny-by-default; it does not by itself *prove* enforcement (that is a runtime-evidence question).

### 6. inspect_session
- **Request**: `session_id`, `timeout_s`.
- **Response**: `provider_meta`, `mounts` (list; must be free of host source/home/docker.sock), `capabilities`, `privileged` (bool), `network_mode`, `security_options`, `user` (records root-in-container as a risk flag), `published_endpoints` (with bind scope), `timestamps`, `confidence`. **Evidence**: inspect JSON retained.

### 7. terminate_session
- **Request**: `session_id`, `timeout_s`, `idempotency_key`.
- **Response**: `accepted` (bool), `timestamps`, `confidence`. Idempotent: terminating an absent session ⇒ success.

### 8. prove_termination
- **Request**: `session_id`, `timeout_s`.
- **Response**: `session_absent` (bool), `container_absent` (bool|UNKNOWN), `sidecar_absent` (bool|UNKNOWN), `volume_absent` (bool|UNKNOWN), `evidence_ref`, `confidence`. **Independently queryable**: teardown truth comes from a *query after* terminate, not from terminate's own return. If it cannot be confirmed ⇒ `confidence=UNKNOWN` / `TerminationUnproven` (never assume gone).

### 9. collect_evidence
- **Request**: `run_id`, `session_id`, `timeout_s`.
- **Response**: `evidence[]` (`EvidenceRef` list: stdout/stderr/exit, inspect, egress, upload/download digests, teardown proof), `provider_meta`, `completeness` (`COMPLETE`|`INCOMPLETE`), `confidence`. Evidence is exported/hashed **before** any host destruction. `INCOMPLETE` ⇒ downstream must treat the run as not-passed/UNKNOWN.

### 10. health_check
- **Request**: `endpoint`, `timeout_s`.
- **Response**: `reachable` (bool), `provider_version` (if exposed), `api_contract_version`, `timestamps`, `confidence`. Used to gate whether governed operations may proceed; unreachable ⇒ operations fail closed.

## Mandatory FounderGate invariants (enforced by any conforming provider)
1. **No source-code host mounts by default.** 2. **No home-directory mounts.** 3. **No Docker-socket exposure to workloads.** 4. **No credentials** unless a later gate explicitly authorizes (then redacted in evidence). 5. **Deny-by-default egress capability** (governed mode requires it). 6. **Exact workload-image identity** (digest-preferred; `latest` unacceptable for governed/qualification runs). 7. **Exact provider version** recorded. 8. **stdout, stderr, exit code, timestamps retained.** 9. **Uploaded & downloaded artifact digests retained.** 10. **Teardown independently queryable.** 11. **UNKNOWN if termination cannot be proven.** 12. **No provider may self-certify acceptance.** 13. **Provider evidence is input to FounderGate checking, not final authority.** 14. **Founder acceptance remains separate from runtime execution.**

## What this contract deliberately does NOT do
- It does not mandate OpenSandbox, Docker, Kubernetes, or any transport.
- It does not claim isolation strength; `runtime_kind` may be `standard-container` or `UNKNOWN` and the contract still functions.
- It does not grant merge/signature/gate authority to any provider.
- It does not turn provider observations into a verdict — that is FounderGate's, and finally the founder's.
