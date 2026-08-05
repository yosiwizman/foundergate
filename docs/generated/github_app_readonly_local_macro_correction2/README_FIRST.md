# README FIRST — FounderGate GitHub App Local Route (final narrow correction)

**What this is:** a corrected, independently-reproducible LOCAL-ONLY evidence capsule for the GitHub App read-only route. It fixes five newly-identified defects (replay live-proof leak, envelope gaps, raw-Boolean authority, contract wording, placeholder seal, print-only recovery).

**What it is NOT:** NOT a live GitHub App proof. No real app/installation/token; no key exists or was exposed. Live proof requires a separate founder-gated pipeline that does not exist here.

**How to verify offline (outside reviewer):**
1. This capsule contains an inner payload ZIP + FINAL_EXTERNAL_SEAL.json + an outer manifest. Verify FINAL_EXTERNAL_SEAL.json's SHA-256 matches the sidecar; verify the inner payload ZIP's SHA-256 matches the seal.
2. Unzip the inner payload; from that folder run each `tests/repo_intake/github_app_readonly/*.selftest.mjs` with Node (zero third-party deps) and check SHA256SUMS.
3. The browser test additionally needs Playwright (`npm i playwright`) — external tooling, not part of the deliverable.

**Never SHIP. Project Knowledge V15 is a CANDIDATE only — do not paste until outside ChatAdvisor review.**
