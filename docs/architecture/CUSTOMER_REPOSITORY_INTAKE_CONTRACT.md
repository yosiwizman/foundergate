# Customer Repository Intake Contract (provider-neutral)

**Status:** DESIGN · Phase 5 · no runtime, no customer code executed. FounderGate-owned interface. No source-provider (GitHub) or sandbox-provider (OpenSandbox) type leaks across it. **First supported path: PUBLIC GITHUB REPOSITORY URL, READ-ONLY, EXACT-COMMIT SNAPSHOT.** No private-repository credentials are designed into the first path.

## Principles
- **Exact-commit identity:** a URL or ref is *not* execution identity — the resolved **exact commit SHA** is. A ref (branch/tag) is resolved to one immutable commit before anything else.
- **Immutable snapshot + digest:** the acquired snapshot is hashed (SHA-256); no execution or analysis proceeds without a digest bound to the exact commit.
- **Untrusted input:** repository metadata, README, build scripts, and package-manager lifecycle scripts are untrusted data — never executed or trusted during intake.
- **Fail-closed:** any ambiguity, over-limit, unsafe entry, credential, or missing digest ⇒ refuse or HOLD. Never "safe"/"secure"/"accepted".
- **Separation of authority:** the source provider and sandbox provider return *observations*; only FounderGate policy decides intake status, and only the **founder** accepts.

## The twelve operations
1. **intake_request** — accept a founder request (fields below); assign `founder_request_id`.
2. **validate_repository_url** — normalize + verify an allowed public GitHub HTTPS URL; reject everything in the fail-closed list.
3. **resolve_default_or_requested_ref** — pick the requested ref or the repo default branch (metadata is untrusted; used only to name a ref).
4. **resolve_exact_commit** — bind the ref to one exact commit SHA (the execution identity). No exact commit ⇒ reject.
5. **acquire_repository_snapshot** — fetch an immutable archive/shallow snapshot **of that exact commit** into a temporary acquisition workspace (never the FounderGate home/source tree).
6. **verify_snapshot_digest** — compute SHA-256 of the snapshot; bind it to the exact commit. No digest ⇒ reject.
7. **classify_repository** — scan **only for intake-risk indicators** (languages, package managers, license files, secret-like files, large files, submodules, LFS, unsafe archive entries) — no execution.
8. **generate_intake_manifest** — produce a deterministic manifest of resolved fields + classifications + policy decisions.
9. **submit_snapshot_to_sandbox_provider** — hand the **immutable** snapshot (by digest) to the provider-neutral sandbox adapter (a later, separately-gated runtime stage — not run here).
10. **retrieve_evidence** — collect provider-neutral evidence (a later stage).
11. **delete_intake_snapshot** — remove the temporary snapshot.
12. **prove_deletion** — independently confirm the temporary snapshot is gone; unprovable ⇒ UNKNOWN.

## Required request fields
`repository_url` · `requested_ref?` · `declared_license?` · `declared_project_type` · `declared_data_class` · `declared_build_command?` · `declared_test_command?` · `maximum_snapshot_size` · `maximum_file_count` · `maximum_runtime` · `network_policy` · `founder_request_id`.

## Required resolved fields
normalized host · normalized owner · normalized repository · **exact commit SHA** · acquisition timestamp · **snapshot SHA-256** · file count · byte count · archive format · detected languages · detected package managers · detected license files · detected secret-like files · detected large files · detected submodules · detected Git LFS · intake status · refusal reasons.

## Fail-closed rejects
non-GitHub hosts (first version) · local filesystem paths · `file://` URLs · SSH URLs · embedded username/password · embedded token · query-string credentials · private-repository responses · mutable snapshot without an exact resolved commit · archive without digest · repository over size/file-count limits · path traversal · symlink escape · unsafe archive entry · submodule recursion · Git LFS download unless separately authorized · secret-bearing repository · unknown data classification · acquisition ambiguity.

## Intake statuses (the only outputs)
`ACCEPTED_FOR_ANALYSIS` · `REJECTED` · `HELD_FOR_FOUNDER_REVIEW` · `UNKNOWN`.
**May NOT produce:** safe · secure · production-ready · accepted-by-founder · release-approved. Provider evidence is input to FounderGate checking; founder acceptance is a separate authority no provider may write.
