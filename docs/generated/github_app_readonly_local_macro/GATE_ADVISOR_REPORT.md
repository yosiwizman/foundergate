# Independent Gate Advisor Report — GitHub App Read-Only Local Macro

**Binding**
- Reviewer: independent read-only Gate Advisor (agent `a818b62b4d41b782c`, "Independent Terminal Advisor"), separate from the Checker.
- Branch: `run/github-app-readonly-local-macro-20260804T1740ET`, head `4657966`.
- Posture: read-only; no live GitHub App / provider action.

**Verdict: LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS** (local deliverable certified; live action remains a true founder gate).

---

All six self-tests pass live (13+11+8+7+34+6 = 79), the 34/34 refusal matrix holds, no live secret or installation appears anywhere, and the local/live honesty boundary is drawn cleanly.

**Gate Advisor Adjudication — GitHub App Read-Only Local Macro**
Head `4657966` · read-only, separate from Checker. `origin/main` = `65fd01669f80…` (unchanged); PR #200 OPEN, untouched.

**1. Inside authority (no live GitHub App/account/permission action) — YES.** `live_action_authority:false`, `live_github_app_created/installed/token_generated:false`. N1 found no six-lock signature, so it stopped before any live action; everything ran as `mode: local_simulation`. Scan for a live installation token (`ghs_…`), private key, or real installation id returned nothing.

**2. Strongest local GitHub App route proof currently authorized — YES.** Re-ran green: authority 13/13 (all live actions gated), secret/key/token guard 11/11 (fails closed), fake local token simulator 8/8, read-only intake contract 7/7 (overclaim refusal), refusal matrix **34/34 all_held**, evidence replay 6/6 (`REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY`), UI 16/16 (8 screenshots), local e2e 18/18. Maximum local prep without crossing into live action.

**3. Avoided existing/customer/production repos and providers — YES.** All corresponding flags false; also avoided the other credential routes (broad_gh_auth/fine_grained_pat/deploy_key all false).

**4. UI honestly distinguished LOCAL readiness from LIVE proof — YES, no false green.** Dual label — primary `TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED` with `(Local route: LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS)`; evidence `github_app_proven:false`, `claims_live_proof:false`. Token simulator explicitly clearly-fake; replay labeled local-simulation-only. GitHub App never claimed "proven."

**5. Blocked claims still blocked — YES.** CLAIMS forbids and does not assert GitHub-App-proven, private-repo-support-complete, customer/existing-repo-proven, read-only-scope-independently-verified, production/SaaS/etc. Existing/customer/production repo, write/provider/code-exec, deploy/bill/merge all blocked; PR #200 + protected `main` untouched.

**6. Next decision is a true founder gate — YES.** The live GitHub App read-only proof requires a separate six-lock signature; the run correctly halts there.

**7. Exact six-lock package for live proof.** (1) one temporary GitHub App; (2) install on the sandbox repo only; (3) Contents:Read + Metadata:Read, no other permissions; (4) short-lived installation token; (5) prove read-only intake, then uninstall/cleanup/removal; (6) exclusions — no existing/customer/production repos, no provider/Codex, no deploy/billing, no protected main, no PR #200. FounderGate never sees a real private key value in chat.

No overclaim, no false-green, no live secret exposure, no required corrections. A clean, complete local preparation that draws the honest boundary — strongest authorized local proof built, live action correctly deferred to a true founder gate with a precise six-lock package.

**GATE_ADVISOR_VERDICT: LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS**
