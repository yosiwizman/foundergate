# OpenSandbox Phase 3 — Independent Checker Report

**Subject:** Provider-neutral sandbox adapter DESIGN + isolated prototype
**Branch:** `design/opensandbox-provider-adapter-phase3`
**Worktree:** `/Users/yosiwizman/Projects/foundergate-wt-opensandbox-phase3`
**Date:** 2026-07-17

## Role & Independence Statement

I am the INDEPENDENT CHECKER. I did not design, write, or build any part of Phase 3.
This review is adversarial and read-only except for this single report file. During this
review I did NOT: modify FounderGate main; merge/close/ready any PR; contact/query/SSH any
M1 host or AKIOR system; run Docker, OpenSandbox, Kubernetes, or Playwright; or install
anything. The only runtime I executed is the isolated stdlib-only Python prototype
(`test_contract`) plus throwaway `python3 -c` injections, neither of which touches a network,
Docker, or any provider. No file was created or modified other than this report.

---

## The 20 Mandated Checks

### 1. Read Phase 1 & Phase 2 evidence — PASS
Phase 1 docs present: `OPEN_SANDBOX_ARCHITECTURE_AUDIT.md`, `..._INTEGRATION_SEAM_ANALYSIS.md`,
`..._LICENSE_COMPATIBILITY.md`, `..._PHASE1_CHECKER_REPORT.md`. Phase 2 evidence present:
`OPEN_SANDBOX_PHASE2_RUNTIME_EVIDENCE.json`, `..._RESULT.md`, `..._CHECKER_REPORT.md`,
`..._COMMAND_TRANSCRIPT.md`, `..._DECISION_PACKET.md`. Read F2 (macOS Docker Desktop proxy
returned HTTP 000; execd reached via published host port) and F3 (control/execd ports
published on `HostIp 0.0.0.0`, not `127.0.0.1` — loopback gap).

### 2. Verify base SHAs — PASS
- Main worktree HEAD: `git rev-parse HEAD` → `e1ca1989d2397297a450893f7890dbe7fc21e494` (matches required).
- `git -C <wt3> log --oneline -3` → `adcb169`, `e58632b`, `e1ca198`.
- `git -C <wt3> merge-base --is-ancestor adcb169e0c61948c253aead576cd90727227e455 HEAD` → exit 0 (ANCESTOR_OK). Phase-3 tree descends from PR#152 head `adcb169`.

### 3. Inspect every Phase-3 file — PASS
Read in full: `contract.py`, `opensandbox_provider.py`, `fake_provider.py`, `test_contract.py`,
and grepped the four design docs (`SANDBOX_PROVIDER_CONTRACT.md`, `OPEN_SANDBOX_ADAPTER_DESIGN.md`,
`SANDBOX_DEPLOYMENT_AND_TRUST_BOUNDARIES.md`, `OPEN_SANDBOX_PHASE3_ADAPTER_DESIGN_LANE.md`) plus
the prototype `README.md`.

### 4. Verify only allowed files changed — PASS
`git status --porcelain --untracked-files=all` and `git diff --name-only adcb169…` show exactly
9 new files, all inside the allowed set (4 docs + `prototypes/sandbox_provider_adapter/{README,contract,fake_provider,opensandbox_provider,test_contract}`).
No file outside the allowed set was touched; no tracked file modified. (Note: the mandate cited
"11 allowed files"; the change set is 9, a strict subset of what is permitted — fewer, all allowed,
none disallowed. Not a violation.)

### 5. No Docker/OpenSandbox runtime executed — PASS
Grep for `socket|urllib|requests|docker|subprocess|http.client|httpx|kubernetes` over the prototype
returns only: benign identifiers (`docker_meta`), forbidden-mount string checks (`docker.sock`,
`FORBIDDEN_MOUNT_KINDS`), test names, and README prose. There is NO network/subprocess call.
The OpenSandbox provider's default transport is `_DisabledTransport`, whose `request()` raises
`ProviderUnavailable`; `enabled=False` by default and every live method calls `_ensure_enabled()`
before any (non-existent) I/O. Confirmed by `test_17` and my own injection (below).

### 6. No M1/AKIOR contact — PASS
No hostname, IP, SSH, or credential referencing any M1/AKIOR system appears in the code or docs.
The only endpoints are configurable, default-disabled, and loopback-guarded in LOCAL_DEV.

### 7. Adapter is provider-neutral — PASS
`contract.py` imports only stdlib (`re`, `abc`, `dataclasses`, `enum`, `typing`) — grep for any
`opensandbox` import returns nothing. All neutral result types are frozen dataclasses with fixed
field sets. Providers translate into these; the contract has zero provider-specific type/field/error.

### 8. OpenSandbox-specific leak hunt — PASS (no leak found)
`parse_*` methods in `opensandbox_provider.py` return only neutral dataclasses. `test_15` asserts
the `ExecResult` field set is exactly `{exit_code, stdout_ref, stderr_ref, started_at, ended_at,
timestamps, confidence}` and that provider event-type tokens (`execution_complete`, `jupyter`,
`init`, `ping`) do not appear in the object's repr. Provider JSON keys (`networkPolicy`,
`resourceLimits`, `_provider_version`) live only in the serialization body/parse inputs, never in
a neutral result. `translate_error` maps provider `code` strings to neutral error classes.

### 9. Fail-closed behavior — PASS
`validate_create_request` raises on: missing image, missing/`None`/non-positive timeout, forbidden
mount kind (`AuthorityError`), unknown mount kind, `docker.sock` dest, secret-like env keys, and
(governed) non-default-deny egress or `:latest`. `evaluate_run` returns `NOT_PASSED` on `None` exec
or any missing exec-evidence field or digest-mismatch, and `UNKNOWN` on missing/unconfident/
non-absent termination proof. `Confidence` never includes `PASS`.

### 10. Endpoint-binding assumptions — PASS
`is_loopback_endpoint` treats only `127.0.0.1|localhost|::1|[::1]` as loopback; `0.0.0.0` is never
loopback. `_check_target` rejects any endpoint containing `0.0.0.0` (`ValidationError`) and, in
LOCAL_DEV, any non-loopback endpoint. Guard runs at construction (for configured endpoints) and in
`health_check`. Verified by `test_13`, `test_14`, and my injections.

### 11. Root-in-container handling — PASS
`InspectResult.user` records the container user; `parse_inspect` defaults it to `"root"` when
absent. `SANDBOX_PROVIDER_CONTRACT.md` §inspect states `user` "records root-in-container as a risk
flag"; `OPEN_SANDBOX_ADAPTER_DESIGN.md` lists root-in-container as "a risk to mitigate, not ignore"
and a gate for the Linux spike. Recorded as a risk, not silently accepted.

### 12. Image-digest requirements — PASS
Governed mode rejects a `:latest` tag: `':latest' image tag is not permitted for governed runs`
(verified by injection). `ProviderMeta.workload_image_ref` is mandatory and digest-preferred.
Note (cosmetic, §Findings): governed mode rejects `:latest` but does not *strictly require* a
`sha256:` digest — a pinned non-digest tag (e.g. `python:3.11`) is accepted. Docs say
"digest-preferred," so this is consistent with stated design intent; flagged as a hardening
opportunity for the Linux spike, not a defect.

### 13. Egress assumptions — PASS
Governed mode requires `egress_policy` present with `default_action == "deny"`; otherwise
`ValidationError("governed mode requires default-deny egress")` (both in `validate_create_request`
and `apply_egress_policy`). Verified by `test_06` and injection.

### 14. Teardown-proof semantics — PASS
Teardown truth is independent of `terminate_session`'s return: `prove_termination` is a separate
operation querying absence. `evaluate_run` returns `UNKNOWN` when the proof is missing, has
`Confidence.UNKNOWN`, or `session_absent` is False. `terminate_session` returning `accepted=True`
does NOT by itself yield `EVIDENCE_SUFFICIENT` — a valid proof is still required. Contract §7/§8
states teardown "comes from a query after terminate, not from terminate's own return." Verified by
`test_09`, `test_16`.

### 15. Ephemeral-Linux-VM recommendation follows from Phase-2 evidence — PASS
`SANDBOX_DEPLOYMENT_AND_TRUST_BOUNDARIES.md` recommends a disposable ephemeral run host and: "No
control or exec endpoint exposed publicly by default — directly rejects the Phase-2 F3 `0.0.0.0`
publish"; and notes egress denial "proved on macOS Docker Desktop … must be re-proven" on Linux.
`OPEN_SANDBOX_ADAPTER_DESIGN.md` cites the macOS proxy failure (F2) and `0.0.0.0` publish (F3) as
open gates. Phase-2 `RESULT.md` independently recommends running the server on Linux and forcing
loopback publishing. Recommendation is grounded in F2/F3.

### 16. Run the isolated prototype tests — PASS
`cd prototypes/sandbox_provider_adapter && python3 -m unittest test_contract -v`
→ **Ran 17 tests … OK** (0 failures, 0 errors, 0.001s). All 17 named tests passed.

### 17. Self-injected malformed responses & missing evidence — PASS
Throwaway `python3 -c` (no file saved). Results:
- `parse_command_stream("garbage")` → RAISED `ProviderProtocolError: malformed NDJSON event`.
- `parse_create_response({})` → RAISED `ProviderProtocolError: create response missing id/status`.
- `parse_create_response({"id":1,"status":"weird"})` → RAISED `ProviderProtocolError: missing status.state`.
- `parse_command_stream("   ")` → RAISED `ProviderProtocolError: empty command stream`.
- `parse_command_stream("{not json}")` → RAISED `ProviderProtocolError: malformed NDJSON event`.
- `evaluate_run(missing-evidence ExecResult, …)` → `RunOutcome.NOT_PASSED`.
- `evaluate_run(None exec, …)` → `RunOutcome.NOT_PASSED`.
- `health_check("http://0.0.0.0:8090")` → `ValidationError: '0.0.0.0' is not a valid client target`.
- `health_check("http://8.8.8.8:8090")` (LOCAL_DEV public IP) → `ValidationError: requires a loopback endpoint`.
- Governed `python:latest` → `ValidationError`; governed allow-egress → `ValidationError`; governed digest+deny → accepted.
All malformed/missing-evidence inputs fail closed (raise or NOT_PASSED/UNKNOWN). None silently degrades to PASS.

### 18. No provider can declare founder acceptance — PASS
`Acceptance.__post_init__` raises `AuthorityError` for any `issued_by != "founder"`. Injected
`Acceptance("run-1","provider",True)` and `Acceptance("run-1","attacker",True)` both raised
`AuthorityError`. `fake_provider.attempt_self_acceptance` (which constructs with `issued_by="provider"`)
raises. Verified by `test_10` and injection.

### 19. No production FounderGate code imports the prototype — PASS
`grep -rn "sandbox_provider_adapter" /Users/yosiwizman/Projects/foundergate --include="*.py"` → no
matches (exit 1). The prototype is referenced only within its own worktree directory.

### 20. Verdict — issued below (exactly one).

---

## Findings

No material findings. All keystone claims hold. Two cosmetic, non-blocking notes:

- **N1 (cosmetic, low):** `test_01` asserts the download digest with the tautology
  `dl.downloaded_sha256 == dl.downloaded_sha256` (always True). The real fail-closed digest logic
  is genuinely exercised by `test_08` and `test_16`, so coverage is not actually lost — but the
  Phase-1 assertion is vacuous and should be tightened to compare against an expected digest.
- **N2 (cosmetic, low / hardening):** Governed mode rejects the `:latest` tag but does not *require*
  a `sha256:` digest; a pinned non-digest tag is accepted. Consistent with the "digest-preferred"
  wording in the docs, but the Linux spike should decide whether governed/qualification runs must
  mandate a digest.

**Keystones all verified:** provider-neutral contract (no leak), fail-closed holds, endpoints
loopback-guarded with `0.0.0.0` rejected, teardown-unproven ⇒ UNKNOWN (independent of terminate),
no provider self-acceptance, only allowed files changed, no Docker/OpenSandbox/network runtime
executed, and all 17 tests pass.

---

## VERDICT: CHECKER-CLEAN
