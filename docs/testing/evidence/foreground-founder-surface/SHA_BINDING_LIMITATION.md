# Foreground SHA-binding limitation (Advisor finding A — disclosed, not corrected)
The foreground run's `candidate_sha` is a **declarative label** set from FG_CAND, not a cryptographic
git-HEAD binding, and the capture ran against the WORKING TREE (the completion-invariant edits to
service.mjs/safety.js were uncommitted at capture time; that tree became commit 0af5f0c). Therefore:
- The earlier "bytes identical a103f2e↔head" framing was WRONG for service.mjs/safety.js — those files
  DID change (the completion-invariant fix) between a103f2e and 0af5f0c. Only the foreground evidence
  artifacts + the committed pack zip are byte-identical.
- Strong-but-circumstantial binding: the exact COMMITTED pack zip (sha 472e2ec…) was downloaded via a
  real DOM control, and the served UI contract matched phase7.1-neutral-first-v1.
- A fully cryptographic foreground↔commit binding would require re-capturing against a clean committed
  tree, i.e. **a new authorized run** — which is NOT authorized. This limitation is disclosed, not hidden.
