# Customer Intake Evidence Model (design)

**Status:** DESIGN · Phase 5 · no runtime. Defines the durable intake-evidence record and the strict separation between observations, policy, checking, and founder acceptance.

## Durable intake-evidence record (fields)
- `request_id` (founder_request_id) · `normalized_url` · `exact_commit` (SHA) · `source_provider_version`
- `acquisition_method` (e.g. archive / shallow snapshot) · `acquisition_timestamp`
- `snapshot_digest` (SHA-256) · `snapshot_size` (bytes) · `file_count`
- `archive_entry_validation` (pass/fail + rejected entries) · `symlink_results` · `submodule_results` · `lfs_results`
- `secret_indicator_results` · `license_indicators` · `data_classification`
- `policy_decisions` (per-rule allow/deny/hold) · `refusal_reasons`
- `temporary_path_identity` (the disposable acquisition dir) · `deletion_timestamp` · `deletion_proof`
- `checker_identity` · `final_intake_status` (`ACCEPTED_FOR_ANALYSIS` | `REJECTED` | `HELD_FOR_FOUNDER_REVIEW` | `UNKNOWN`)

## Four separated layers (never merged)
1. **Source observations** — what the source provider *saw* (resolved commit, digest, file/entry facts, indicator hits). Provider-neutral; no verdict.
2. **Policy decisions** — what FounderGate *decided* from the observations against the fail-closed rules (accept-for-analysis / reject / hold). FounderGate-owned; not a founder acceptance.
3. **Checker verdict** — what an *independent checker* concluded about the observations + decisions (`CHECKER-CLEAN` / `FINDINGS` / `REJECT` / `INSUFFICIENT-EVIDENCE`).
4. **Founder acceptance** — the founder's separate, final decision. **No provider (source or sandbox) and no automated layer may write this field.**

## Integrity rules
- Evidence is **hashed** before it informs any decision; the ledger is **append-only**.
- **Missing digest ⇒ UNVERIFIED**; missing deletion proof ⇒ deletion not proven (UNKNOWN); missing observation ⇒ the claim it supports is unsupported.
- Incomplete evidence ⇒ `UNKNOWN` or `REJECTED`, never a pass.
- A provider returning "safe"/"secure"/"accepted" is itself a rejectable protocol violation — those are not provider outputs.
- The evidence model produces no "PASS" and no "production-ready" state; only the four intake statuses above, feeding founder review.
