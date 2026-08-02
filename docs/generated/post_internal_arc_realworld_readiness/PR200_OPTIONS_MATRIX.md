# PR #200 — Options Matrix (read-only planning)
| Option | What it means | Gate? | Recommendation |
|--------|---------------|-------|----------------|
| Park (leave OPEN draft) | do nothing; keep as-is | none | DEFAULT — safe |
| Revalidate later | read-only re-preview diff vs current main + re-run copy-truth checks | founder gate (read-only prep ok) | reasonable before any merge |
| Supersede | open a fresh PR later that replaces it | true founder gate | only if content is stale |
| Close | close the draft | true founder gate | only if abandoned |
| Merge | merge into protected main | true founder gate | NOT recommended now ("do not merge") |
