# STACK-1E Final Closure Status
**STACK1D_MERGE_READINESS: STALE** (revoked). Reasons: the prior STACK1D checker verdict was FINDINGS
and the Advisor verdict was HOLD-CORRECTABLE-FINDINGS; corrections were applied AFTER those reviews, so
no fresh clean independent verdict existed; and the empty-`.log` exemption was over-broad. Historical
verdicts are preserved (not rewritten as clean).

**Correction:** the blanket empty-`.log` exemption is REMOVED. Empty evidence is INVALID BY DEFAULT;
a zero-byte artifact passes ONLY when its exact repo-relative path is declared in the governed
empty-artifact manifest (`.foundergate/evidence/empty_artifact_manifest.json`, schema
`.foundergate/schemas/empty_artifact_manifest.schema.json`) with allow_empty:true + empty_reason +
producer + producer_exit_status + required NON-EMPTY companions whose hashes verify and whose content
binds evaluated_sha + qualification_run_id. No wildcard / extension-only / directory exemption
(`src/tools/empty-artifact-policy.mjs`; 18+ mutation proofs in `src/tools/empty-artifact-policy.selftest.mjs`).
The historical M1 `sentinel-watch.log` is the ONLY declared empty artifact; the M1 evidence file was
NOT modified. A fresh checker + fresh final Advisor are commissioned at the frozen candidate.
