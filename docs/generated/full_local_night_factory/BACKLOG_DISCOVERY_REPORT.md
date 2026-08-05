# Backlog Discovery Report (A–I mechanical scan)

**A. Governing/planning:** roadmap, Project Knowledge (V12.1/V13/V14/V15 candidate), claim/limit registers, credential-route ladder inspected. The credential-route workstream (public repo → deploy key → least-privilege → fine-grained PAT → GitHub App local route) is the active program; each stage is sealed with independent Checker + Gate Advisor.

**B. Repository implementation scan:** grep for TODO/FIXME (1 file, unrelated legacy), "not implemented" (0), skipped/disabled tests (72 files — pre-existing legacy across the whole repo, outside this night's safe delta; not introduced here). No stub/placeholder in the credential-route family. **Genuine gap found: no standalone offline capsule verifier tool** (evidence category E).

**C. User-journey scan:** founder-facing dashboard (`demo/founder_operating_environment`) with per-route panels (deploy key, least-privilege, credential-route matrix, fine-grained PAT, GitHub App) + UNKNOWN-on-missing + headed proofs — all proven in their respective sealed runs.

**D. Observability/recovery:** `src/ui/command-center`, `src/ui/founder-view` (+ live server + no-invented-state selftest), `src/ui/dashboard/status-cards` present and self-tested; recovery exercised (github-app correction2 executed a real resumed action).

**E. Evidence/assurance:** exact-SHA binding, non-recursive two-level external seals, replay falsification, independent Checker separation, Gate Advisor binding, secret scanning, offline capsule verification — all present. **The one missing piece was a STANDALONE verifier a reviewer/founder can run on any capsule → built this run (`tools/evidence/verify_capsule.mjs`).**

**F. Installation/Doctor/portability:** `tools/doctor/claim-blocker.mjs` present; launch command present; clean-extraction proven for the credential-route capsules.

**G. Local repo-intake family:** `src/repo_intake/{github_app_readonly, private_repo_readonly}` on this base; the deploy-key/least-privilege/fine-grained-PAT modules live on their own sealed branches. Sandbox-only boundaries, secret handling, target/permission allowlists, refusal matrices, UI status — all proven per route.

**H. Open branch/PR reuse (read-only):** 10 route-family run branches (public-repo readiness, sandbox proof, deploy-key, least-privilege reseal, credential-route matrix, fine-grained-PAT ×3, github-app ×3). Each is its own sealed evidence candidate; none is contaminated; none re-homed (no merge/import). PR #200 read-only, untouched.

**I. Documentation/SSOT:** Project Knowledge candidates (V12.1–V15) consistent with sealed evidence; no current-state overclaim; claim boundaries intact.

**Net eligible WIDE_SAFE un-proven item discovered: 1 — the standalone offline capsule verifier (built + proven this run).** All other route-family work is ALREADY_PROVEN_CURRENT; remaining program items are true founder gates or lack authority.
