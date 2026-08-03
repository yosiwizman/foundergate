# Lane H1 — Toolchain & Sandbox Map (harmless read-only version checks)
- Node: v22.23.1 (present) · Python: 3.9.6 (present) · Java/javac: 21.0.12 (present)
- Go: MISSING · Rust/cargo: MISSING → their adapters return UNKNOWN_RUNTIME_MISSING (never fake pass)
- Playwright: present (node_modules) · axe-core: present
- zip/unzip/shasum/ditto: present · Git: 2.50.1 (read-only used) · GitHub CLI: 2.96.0 (read-only only)
- Local run-server: 127.0.0.1:4880 (loopback only, token+Origin auth) — reachable
- Desktop launcher: present (~/Desktop/FounderGate_Start_Here)
- Writable run roots: ~/.foundergate/runs, worktree, allowed src/tests/docs paths
- Non-writable/protected (not touched): protected main, PR #200, public/reviewer/frozen repos,
  real accounts/APIs, customer/private/production data. No installs, no account access, no provider.
