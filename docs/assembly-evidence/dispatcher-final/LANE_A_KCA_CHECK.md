# Lane A — dispatcher KCA disjointness clause — Independent Re-Check

> Independent adversarial checker (checker ≠ the Lane A builder). READ-ONLY re-check of the HR-4 amendment. Report = evidence. Committed verbatim.

**VERDICT: CLEAN.** The HR-4 "separate, out-of-scope artifact" punt is gone; existence + §28-citation + provable-disjointness are now binding in-doc build preconditions. No regression, docs-only, all §28 SHAs resolve, `STATUS: DRAFT`, authorizes nothing, no soak-pass line. Two non-blocking adversarial residuals land downstream (on the future KCA-authorization artifact's own check) and do NOT reopen the closed gap. Ready for the founder to sign, with the KCA requirement now in-doc.

Target: branch `lane-a-kca-clause` @ `332d3979b49e3d824feeefc3b45877559f51a32f`; amended file blob `8b3459005e242cee0bc9dc7fb71d5411238282fd`.

## 1 — HR-4 closes the gap ✅
New HR-4 heading: "Key-Custody Authority: existence + provable disjointness (hard build precondition)." Binding text:
- **(a) Existence + §28 citation before build** (L143–149): a dispatcher build lane must not be authorized until the KCA exists AND its authorization artifact is committed and §28-cited by `path @ full-40-char-SHA`, resolvable in-worktree; until it resolves the precondition is unmet; the draft states the requirement and cannot self-satisfy it.
- **(b) Provable disjointness** (L150–158): no entity may simultaneously be the KCA and any of CTO/Advisor/dispatcher/founder; disjointness must be provable from committed evidence (not asserted); a KCA coinciding with any attested role is rejected as a self-custody seam ("collapses HR-1 forgery resistance"); hard build precondition. Reinforced (L159–163): the KCA's own SoD + `key→role` attestations must be independently verifiable/auditable from committed record.
- **(c) "No agent mints its own key"** retained (L164–168), explicitly marked necessary-but-not-sufficient.
- The old "separate, out-of-scope artifact" wording is DELETED (full-doc grep for "out-of-scope" → nothing).

## 2 — No regression ✅
Three-dot diff vs merge-base `0a48a14` touches exactly two files (the doc + `LANE_A_KCA_REPORT.md`); docs-only. HR-1/HR-2/HR-3/HR-5/HR-6 and CF-1…CF-5 byte-identical; F2–F7 dispositions unchanged (F1 additively strengthened). §28 citations resolve (proposal `3200874d`, checker-report `6436eadf`, separation-of-duties `1817cf2b`). `STATUS: DRAFT — PENDING INDEPENDENT CHECK`; "AUTHORIZES NOTHING"; no soak-pass line.

## 3 — Adversarial residuals (non-blocking; downstream of THIS precondition)
Neither reopens the closed gap — both are caught by the precondition this amendment installs (any real KCA artifact must be committed, §28-cited, and independently checked before build):
- **Entity vs principal-level common control:** the clause forbids one *entity* being both KCA and a role but has no anti-common-control test; a single principal could hold a KCA identity + a distinct role identity ("disjoint in name"). Recommend the future KCA-authorization artifact define disjointness at the principal level and assert no common control/collusion.
- **Delegation/proxy not named:** forbids coincidence with a role and requires auditable custody acts, but does not explicitly forbid the KCA delegating attestation/signing to a role. Recommend the KCA artifact state "no role may proxy or be delegated KCA attestation authority."

Read-only throughout; nothing committed/edited/pushed; M1/lease/live-soak/`~/.cldh`/`akior` untouched.
