# customer_repository_intake — isolated Phase 5 prototype

**Design prototype only. Not integrated. No customer execution. No network, no GitHub API, no repository cloning, no OpenSandbox.** Not imported by FounderGate production code.

## Scope
First intake path only: **public GitHub repository URL, read-only, exact-commit snapshot.** Private-repository intake is PLANNED / NOT AUTHORIZED (see `docs/architecture/GITHUB_URL_INTAKE_DESIGN.md`).

## Files
- `contract.py` — public-GitHub-HTTPS URL normalizer/validator; exact-commit validator; archive-entry validator (path-traversal / absolute-path / unsafe-symlink / size rejection); size & file-count limits; observation / manifest / evidence structures; error classes; `decide_intake` (fail-closed policy → one of four intake statuses) and `evaluate_evidence_completeness`. Stdlib only; no GitHub/OpenSandbox dependency.
- `fake_source_provider.py` — deterministic in-memory public-repo simulator with injectable faults (path traversal, unsafe symlink, absolute path, oversized, too-many-files, ref mismatch, secret file, submodule, LFS, private, no-commit, no-digest). Returns observations, never acceptance.
- `test_contract.py` — 22 isolated tests.

## Run
```
cd prototypes/customer_repository_intake
python3 -m unittest test_contract -v
```

## Guarantees encoded
- A URL is not identity; the **exact commit SHA** is; an **immutable snapshot digest** is required.
- Fail-closed: SSH/`file://`/non-GitHub/`http`/embedded-or-query credentials, path traversal, absolute paths, unsafe symlinks, over-limit size/count, mutable-ref mismatch, and missing digest are all rejected; secret-like files / submodules / LFS are HELD for founder review; private repos are rejected in the public path.
- The only outputs are `ACCEPTED_FOR_ANALYSIS` / `REJECTED` / `HELD_FOR_FOUNDER_REVIEW` / `UNKNOWN` — never safe/secure/production-ready/accepted.
- No source provider may issue a founder acceptance (`Acceptance` requires `issued_by="founder"`).
- Incomplete evidence ⇒ UNKNOWN or REJECTED, never a pass.

## Not in scope here
No repository is fetched or executed; `submit_snapshot_to_sandbox_provider` / `retrieve_evidence` are a later, separately-gated runtime stage behind the provider-neutral sandbox adapter.
