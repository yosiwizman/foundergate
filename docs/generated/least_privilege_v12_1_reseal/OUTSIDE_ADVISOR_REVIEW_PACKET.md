# Outside-Advisor Review Packet — Least-Privilege V12.1 Reseal

## What changed since V12
The V12 witness ZIP was sealed one step early. V12.1 adds the two independent reviewer reports and reconciles the seal head. Nothing about the underlying least-privilege proof changed; **no new live/private/customer/provider/merge action was taken** to produce V12.1 (evidence reconciliation only).

## Independently checkable in this package
- `UPLOADED_ZIP_REVIEW.(md|json)` — mechanical review of the prior ZIP (SHA, integrity, present/absent, secret scan).
- `CANDIDATE_IDENTITY_RECONCILIATION.(md|json)` — the two-SHA seal and the benign root cause of the `19f280e` vs `931dd5314f373e22d717561daaf64c25a460f972` mismatch.
- `CHECKER_REPORT.md` / `GATE_ADVISOR_REPORT.md` — the two reviewer verdicts, each citing `sealing head 931dd53`.
- `SEAL.json` — evaluated_sha + evidence_commit_sha.

## Adversarial questions answered
1. **Were the reviewer reports fabricated after the fact?** No — both were produced by the independent reviewer agents and each independently cites the same evaluated head `931dd5314f373e22d717561daaf64c25a460f972`; the Gate Advisor additionally confirmed the deploy key is gone via a live read-only `gh api` GET.
2. **Does the seal-head mismatch indicate a swapped candidate?** No — the pushed remote head, local head, and reviewed tree are all `931dd5314f373e22d717561daaf64c25a460f972`; `19f280e` is the pre-amend intermediate that the file text captured too early.
3. **Did reconciliation touch any live boundary?** No — read-only inspection + doc/evidence writes on a non-main branch only.

## Not to be read into this
Not fine-grained-PAT / GitHub-App / existing-founder-repo / customer-repo / private-repo-support-complete / production readiness — all remain separate, unopened founder gates.
