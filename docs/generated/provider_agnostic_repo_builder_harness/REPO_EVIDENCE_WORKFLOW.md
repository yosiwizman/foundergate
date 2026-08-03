# Repo Evidence Workflow (src/repo_evidence/repo_check.mjs)
- Accepts LOCAL, allowlisted, self-owned/synthetic folders only (tests/generated_apps, publish_candidates/self_owned_demo_repo, provider_runs, /demo/). No network, no private repos, no customer data.
- Denies remote/git/github URLs, "private"/"customer"/"production" paths, and path traversal → HELD_UNSUPPORTED_OR_PRIVATE.
- Produces: classification, project type (node-esm/static-esm-app/js), available tests, missing tests, risk flags (NO_TESTS_FOUND, NO_RECOGNIZED_ENTRYPOINT), safe next action, evidence (entrypoints).
- Verified by tests/repo_evidence/repo-check.selftest.mjs (6/6). Private/remote/customer/traversal all HELD.
