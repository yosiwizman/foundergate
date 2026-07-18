# OpenSandbox Phase 5 — Customer-Intake Independent Checker Report

**Role & independence:** I am the INDEPENDENT CHECKER for OpenSandbox Phase 5 (customer-intake DESIGN + isolated prototype + cross-machine lane contract). I did NOT build any of this material. This review is adversarial and read-only except for this single report file. No runtime, no network, no customer repository, no M1/AKIOR/WRX90 contact, no Docker/OpenSandbox/Lima, no merge/close/ready of any PR, no start of the VB2 soak. The only execution performed was the isolated stdlib-only Python prototype (tests + throwaway attack one-liners, none saved).

**Date:** 2026-07-17 · **Host:** Apple M4 Pro Mac Mini (Mac16,11), arm64.

---

## Verification checks

| # | Check | Result | Command / artifact |
|---|-------|--------|--------------------|
| 1 | Host is Mac16,11 / Apple M4 Pro | **PASS** | `sysctl hw.model`→`Mac16,11`; `machdep.cpu.brand_string`→`Apple M4 Pro`; `uname -m`→`arm64` |
| 2 | Phase-5 branch descends from 900fa8f | **PASS** | `git merge-base --is-ancestor 900fa8f… HEAD` → exit 0 (HEAD **equals** 900fa8f; see F2) |
| 3 | main unchanged (e1ca1989, clean) | **PASS** | `git -C /Users/yosiwizman/Projects/foundergate rev-parse HEAD`→`e1ca1989…`; `status --porcelain` empty |
| 4 | PR #151–155 OPEN/DRAFT | **PASS** | `gh pr view` → all five `state=OPEN draft=true` |
| 5 | Only allowed files changed | **PASS** (see F2/F3/F4) | `git status --porcelain` shows only untracked files within the 13-allowed set: 2 coordination, lane doc, 4 architecture docs, 4 prototype files. No tracked-file modifications. Decision packet absent (F3); `__pycache__/*.pyc` build artifacts present (F4). |
| 6 | No network/customer-repo access possible in prototype | **PASS** | `grep -nE 'urllib|requests|socket|http|subprocess|urlopen|Popen|os.system|import os|open('` → only `from urllib.parse import urlsplit` (string parsing). No `urlopen`, no sockets, no subprocess, no `os`, no `open()`. Imports are stdlib only: `re, dataclasses, enum, typing, urllib.parse, hashlib, unittest`. |
| 7 | No M1 contact anywhere in prototype/docs | **PASS** | `grep -niE 'ssh|scp|caffeinate|paramiko|fabric|\.local|192.168|10.0.'` over prototype → no hits |
| 8 | URL normalization correct | **PASS** | Direct attack (see below); canonicalizes host/owner/repo, strips `.git`, extracts `/tree|/commit` ref |
| 9–13 | Validator attacks (normalize/decide/archive) | **PASS** | See "Direct validator attacks" |
| 14 | Missing digest rejected | **PASS** | `decide_intake(snapshot_sha256=None)` → `REJECTED`; `evaluate_evidence_completeness` → `UNKNOWN` |
| 15 | Provider self-acceptance blocked | **PASS** | `Acceptance(issued_by='provider')` and `FakeSourceProvider().attempt_self_acceptance()` both raise `AuthorityError`; `issued_by='automation'` also raises; only `'founder'` succeeds |
| 16 | Source-provider fields don't leak into manifest | **PASS** | `dataclasses.fields(IntakeManifest)` = `request_id, normalized_url, exact_commit, snapshot_sha256, file_count, byte_count, status, refusal_reasons, policy_decisions` — no github/octokit/raw/provider field. (`source_provider_name` lives only on `SourceObservation`, not the neutral manifest.) |
| 17 | Incomplete evidence → UNKNOWN/REJECTED | **PASS** | `evaluate_evidence_completeness(None)`→`REJECTED`; missing commit/digest→`UNKNOWN`; never a pass |
| 18 | Cross-machine lane contract sound | **PASS** | See "Cross-machine contract" |
| 19 | Self-hosted-runner risk | **PASS** | `gh api repos/yosiwizman/foundergate/actions/runners` → `total_count=0`; only workflow `selftests.yml` is `runs-on: ubuntu-latest`; `push: branches:[main]` only; `pull_request` also GitHub-hosted; no non-sample git hooks. **M1_PUSH_TRIGGER_RISK: NONE.** |
| 20 | Isolated tests | **PASS** | `python3 -m unittest test_contract -v` → **Ran 22 tests … OK** |
| 21 | No adoption/production/"secure"/"safe" claim in Phase-5 docs | **PASS** | Every `safe/secure/production/accepted` hit inside the 4 Phase-5 architecture docs + lane doc is a **prohibition/negation** ("May NOT produce: safe·secure·production-ready·accepted", "a provider returning 'safe'/'secure'/'accepted' is a rejectable protocol violation"). Positive uses of the words are only in pre-existing, out-of-scope tracked files (V8-*, MACHINE_CAPACITY, SANDBOX_DEPLOYMENT) that are **not** part of this phase's changed set. |

### Direct validator attacks (throwaway `python3 -c`, importing from the prototype dir)

**`normalize_github_url` — REJECTS** (all raised `ValidationError`): `git@github.com:o/r` (ssh), `ssh://git@github.com/o/r`, `file:///etc/passwd`, `https://gitlab.com/o/r` (non-github), `http://github.com/o/r` (non-https), `https://user:pass@github.com/o/r` (embedded creds), `https://github.com/o/r?token=abc` and `?access_token=x` (query creds), `/etc/passwd` and `C:\…` (local paths), `https://github.com.evil.com/o/r` (look-alike host). **ACCEPTS** valid `https://github.com/octocat/Hello-World` and `…/commit/<40-hex>` (ref retained).

**`decide_intake` — REJECTS** (fail-closed): `private`, `no exact commit`, short/uppercase SHA, `no_digest`, `ref_mismatch`, `oversized`, `too_many_files`, `unsafe_entries`. **HOLDS_FOR_FOUNDER_REVIEW**: `secret_file`, `submodule`, `lfs`. **ACCEPTS_FOR_ANALYSIS** only a fully-clean observation with a 40/64-hex commit + sha256 digest. Uppercase SHA (`A*40`) correctly REJECTED (regex is lowercase-only).

**`validate_archive_entry` — REJECTS**: `repo/../x` (traversal), `/abs` (absolute), `repo\..\x` (windows-sep traversal), symlink→`/etc/passwd` (absolute target), symlink→`../../../../etc/passwd` (escapes snapshot root). Correctly **allows** in-bounds relatives (`repo/deep/link`→`../ok`, `repo/link3`→`a/b/../../../out` which resolves to snapshot root, not an escape). Depth accounting is sound.

## Cross-machine contract (`CROSS_MACHINE_PARALLEL_LANE_CONTRACT.md` + STATE.json)

Coherent and complete. It explicitly **supersedes** the prior global "Pro read-only during M1 soak" rule in favor of cross-machine lane + ref isolation. States: M1 uses a **detached** exact SHA `b9af1def60009ac9dae69bf519b5e0a2680d4600` with **no git-write** during the active run (commit/push/fetch/pull/checkout/branch/tag/merge/rebase/reset all forbidden); a Pro-branch commit **cannot move** the M1's detached HEAD (git refs are per-worktree; a detached HEAD tracks a fixed SHA, not a branch — independently correct); `main` **must not merge** during the soak; the **collision rule + 5 cases** (Pro commit / Pro push / M1 active soak / M1 release-after-seal / post-run audit) are present and mutually consistent. STATE.json mirrors this: `m1_active=false`, `m1_git_write_allowed=false`, `shared_resources=[]`, `merge_state="main UNMERGED"`, `runner_trigger_risk="NONE"`.

## Falsification attempts (all failed to break the model)

- **Can a private repo slip to ACCEPTED?** No — `is_private` is a hard fail-closed reject before any accept path.
- **Can a mutable ref reach acceptance without an exact commit?** No — `is_exact_commit` requires 40/64 lowercase hex; `ref_matches_commit=False` is a hard reject; `no_commit` → REJECTED.
- **Can a symlink escape be classified safe?** No — absolute targets and any target whose upward depth exceeds the entry directory depth raise `ValidationError`; observed unsafe entries force `decide_intake`→REJECTED.
- **Can a provider write a founder acceptance?** No — `Acceptance.__post_init__` raises `AuthorityError` for any `issued_by != 'founder'`; the fake provider's self-accept attempt raises.
- **Does `contract.py` import github/opensandbox or make a network call?** No — stdlib only; `urllib.parse.urlsplit` is used purely for string parsing; no `urlopen`/socket/subprocess.
- **Can a Pro commit be shown to move another ref?** No — refs are per-worktree; the M1 detached HEAD tracks a fixed SHA. Contract and git semantics agree.

## Findings

- **F1 — LOW / informational (strictness gap, not a vulnerability):** `normalize_github_url("https://github.com/o/r/../../../x")` is **accepted** rather than rejected; it returns a clean `owner='o', repository='r'` (trailing `../` segments are discarded, `requested_ref=None`). No traversal propagates — owner/repo are regex-validated and `..` inside owner/repo is separately rejected — so the normalized output is a benign canonical repo reference. Cosmetic: the function tolerates junk path tails instead of rejecting them.
- **F2 — LOW / informational:** All Phase-5 deliverables are **untracked working-tree files**; the branch HEAD equals the base `900fa8f` (no Phase-5 commit exists yet). The `is-ancestor` check passes trivially (equal). A PR opened at this instant would be empty until the work is committed. No hard rule violated; `main` is untouched.
- **F3 — LOW / informational:** The decision packet `docs/status/OPEN_SANDBOX_PHASE5_INTAKE_DECISION_PACKET.md` (an allowed file) **does not yet exist** — deliverable incomplete.
- **F4 — informational:** `prototypes/customer_repository_intake/__pycache__/*.pyc` build artifacts are present (generated by test runs, including this checker's). They are outside the 13 named source files and are ordinarily git-ignored; not a source-content change.

None of F1–F4 contradict any CHECKER-CLEAN criterion: exact-commit binding + immutable digest are required; traversal/symlink/size/count fail closed; secret/submodule/lfs are held; private is rejected; provider acceptance is blocked; the prototype makes no network/customer-repo access; only allowed files are (un)changed; `main` is untouched; the cross-machine contract is sound; M1_PUSH_TRIGGER_RISK is NONE; tests are 22 OK; and no Phase-5 doc makes an adoption/production/safe/secure claim. F2/F3 are completeness gaps for a later gate, not security defects.

## VERDICT: CHECKER-CLEAN
