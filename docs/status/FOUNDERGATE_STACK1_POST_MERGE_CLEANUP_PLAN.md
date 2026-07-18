# STACK-1 Post-Merge Cleanup Plan (DO NOT EXECUTE until an authorized merge is verified)
After a later founder-authorized cumulative merge to main is completed + verified:
1. Confirm main contains the cumulative merge commit.
2. Confirm every phase SHA (e58632b…20136202) remains in main ancestry.
3. Confirm exact-SHA post-merge CI green.
4. Close earlier phase PRs **#151–#161** as "SUPERSEDED BY CUMULATIVE INTEGRATION PR #162"; close #162 as INTEGRATED. (Range resolved mechanically at cleanup time; do not assume if GitHub changes.)
5. Preserve links to each earlier PR in the cumulative PR + acceptance records.
6. Delete obsolete remote branches ONLY after ancestry verification.
7. Remove obsolete local worktrees ONLY after confirming no unique uncommitted files.
8. Prune stale local branches.
9. Preserve governed evidence directories (docs/assembly-evidence, docs/testing/evidence, docs/witness).
10. Start SCL-1 from the clean updated main (a NEW branch, not an extension of this stack).
