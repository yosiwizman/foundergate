# Project Knowledge Update Bundle V15 — CANDIDATE (GitHub App Read-Only Local Route, corrected)

> **NOT ACCEPTED PROJECT KNOWLEDGE. DO NOT PASTE UNTIL OUTSIDE CHATADVISOR REVIEW. NOT EXECUTION AUTHORITY. NOT FOUNDER ACCEPTANCE. NEVER SHIP.**

**Status (must match the final Gate Advisor result):** LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS — local route prepared, corrected, and independently reproduced; live GitHub App proof remains a TRUE FOUNDER GATE.

## What the correction fixed
- **Authority model** now fail-closed with semantic install-spec validation (missing/wrong repo, all/multi-repo, missing/extra/unknown/forbidden permissions, malformed → refusal/UNKNOWN).
- **Evidence replay** now validates 26 prohibited safety fields and fails closed on true/missing/malformed; a digest-valid-but-unsafe record never verifies; simulation can never become live proof.
- **Live-proof contract** now validates semantics (40-hex commit, digest formats, non-negative integer counts + agreement, exact enums, exact permission allowlist) — presence alone is insufficient.
- **Refusal matrix** now reports **39 executable refusal paths** (each invoking a real enforcement function) separately from **2 catalog-only policy assertions**.
- **Clean-extraction reproduction** PASS (self-tests + replay + refusal + headed UI from a clean temp dir).
- **Recovery** mechanically exercised (fresh-subprocess resume from disk, no founder involvement).
- **Isolation** onto a clean exact base (origin/main), only github-app files; non-recursive two-SHA review seal.

## Still blocked / not claimed
GitHub-App-proven · private-repo-support-complete · customer/existing-repo · read-only-scope-independently-verified · production/SaaS · merge-ready · Gate-8. PR #200 + protected main untouched.

## Next true founder gate
Live GitHub App read-only proof (six-lock signature): ONE temporary app · sandbox-only install · Contents:Read + Metadata:Read · short-lived installation token · prove read-only intake · uninstall/cleanup.
