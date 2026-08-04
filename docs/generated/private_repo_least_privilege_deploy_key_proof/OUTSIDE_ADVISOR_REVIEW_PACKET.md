# Outside-Advisor Review Packet — Least-Privilege Read-Only Deploy Key Proof (W8)

## Scope
One founder-owned **private** sandbox repo (synthetic files only). One temporary **repo-scoped read-only deploy key**. Read-only intake. No existing/customer repo, no code execution, no provider call, no write/merge.

## Independently checkable artifacts
- `DEPLOY_KEY_CREATION_RECORD.json/.md` — key id, title, public fingerprint, `read_only:true`, `private_key_recorded:false`.
- `REVOCATION_PROOF.json/.md` — `deleted:true`, `key_still_in_repo:0`, `post_revocation_access_failed:true`, `private_key_destroyed:true`.
- `PRIVATE_REPO_MANIFEST.json`, `SNAPSHOT_DIGESTS.json` — exact commit `fb54698d5cbba4b55ef5aac2b189615154efc76e`, file manifest + digests.
- `REDACTION_SUMMARY.json` — 5 fake secrets held; no secret content in evidence.
- `WRITE_REFUSAL_RESULTS.json` — 25/25 refused.
- `CREDENTIAL_LIFECYCLE_EVIDENCE.json`, `ACTUAL_LEAST_PRIVILEGE_EVIDENCE.json` — sealed record + digest.
- `ui_proof/` — 8 screenshots + video from the headed browser proof.

## Adversarial questions this packet answers
1. **Did the intake really use the narrow key, not the broad token?** Yes — SSH with `IdentitiesOnly=yes` (broad token is HTTPS-only and was excluded); route recorded as `ssh_deploy_key_identities_only`.
2. **Is revocation real or asserted?** Real — the deleted key returns **Permission denied (publickey)** on `git ls-remote` after deletion (`post_revocation_access_failed:true`).
3. **Was any private key material stored/packaged/printed?** No — ephemeral root outside repo/ZIP; private key destroyed before sealing; `private_key_packaged:false`.
4. **Could this write anything?** No — read-only key + read-only path; 25/25 refusals; no real mutation attempted.
5. **Does the dashboard ever fake success?** No — missing evidence renders **UNKNOWN**.

## What the advisor should NOT read into this
Not fine-grained-PAT / GitHub-App / customer-repo / private-repo-support-complete / production readiness. Those remain separate, unopened founder gates.
