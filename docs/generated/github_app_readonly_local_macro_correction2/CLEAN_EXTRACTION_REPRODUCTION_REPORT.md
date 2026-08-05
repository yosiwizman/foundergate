# Clean-Extraction Reproduction Report
Inner code payload (repo-relative src/+tests/+packaged_ui/ + SHA256SUMS) copied to a fresh temp dir OUTSIDE the original worktree, then verified there:
1. **Internal hashes verified** (SHA256SUMS): **PASS**.
2. **All 6 self-tests ran from the clean dir with ZERO third-party runtime dependencies** (pure Node): **6/6**. This is the key self-containment property of the DELIVERABLE.
3. **Packaged UI headed browser verification from the clean dir**: **PASS**. The browser engine (Playwright) is EXTERNAL TEST TOOLING, not part of the deliverable; it was supplied by symlinking a `node_modules` into the clean dir (equivalent to a reviewer running `npm i playwright`). Node's ESM loader does not honor NODE_PATH for bare imports, so a real `node_modules` resolution path is required for the browser test only — never for the deliverable's own modules.
- Relative imports resolve because src/ and tests/ share the package root; no absolute $HOME paths, no worktree dependency.
**Result: hashes PASS · self-tests 6/6 · headed-UI PASS → PASS.**
