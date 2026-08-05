# PREFLIGHT — GitHub App Read-Only Local Macro CORRECTION (read-only)
- Machine: yosi's Mac Studio · Playwright OK · Terminal-0 qualified · no active operation (no leases/locks/build procs).
- Protected main (origin): `65fd01669f80…` — untouched; it is the merge-base of the prior macro branch. PR #200 OPEN — untouched.
- Prior macro branch `run/github-app-readonly-local-macro-20260804T1740ET` head `5b885fd` (build `4657966`, seal `5b885fd`); prior ZIP + reviewer reports located.
- **Inherited unrelated changes:** the prior macro branch is a long linear chain of earlier sealed FounderGate runs (deploy-key, credential-route matrix, fine-grained PAT, …) on top of `65fd0166`. Per requirement G, the correction is isolated onto a **clean exact base (origin/main)** carrying ONLY the github-app route files.
- No real secret material detected. No GitHub App private-key / installation-token files in the workspace.
- claim-blocker note: the claim-blocker tool is absent at origin/main (added in a later commit), so this correction uses an explicit manual forbidden-claims scan instead.
- Decision: proceed with the bounded local correction; no live GitHub App action (N1: no six-lock signature).
