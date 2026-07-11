# INDEPENDENT PRE-ACCEPTANCE DISK/GIT AUDIT — FounderGate V8-A gate
Repo: `/Users/yosiwizman/Projects/foundergate` · main @ `689eb44` (Merge PR #55) · Auditor: independent, read-only · Date: 2026-07-10

Method note: verified from disk + git only. `npm test` was NOT executed (would run product code) — live self-test/CI green status is therefore UNKNOWN and treated as such. `gh` is installed and authenticated (account `yosiwizman`); read-only `gh api` was used for live branch protection.

---

## ITEM 1 — STRANGER EVIDENCE CHAIN — **PASS** (with one precise note)

Commands:
- `wc -c docs/assembly-evidence/VA/stranger-test-run-1.md run-2.md` → 4444 and 6902 bytes (both non-empty)
- `Read` of both sheets; `grep -n "G-VA-REWITNESS" FOUNDER_GATE_LEDGER.md`

Findings:
- run-1.md title line 1: `# Stranger Test — Run 1 (RESULT: FAILED)`; line 30 `→ Overall: FAIL`. Verbatim quotes present (e.g. line 17 "You get lost in all the letters"; line 18 "There is no send button for the user to try to send.").
- run-2.md line 44: `→ NOT PASSED (Steps 1 & 6 partial). V8-A acceptance stays PENDING.` Verbatim quotes present (lines 31-37).
- Pre-declared evidence rule: run-2.md lines 14-19 ("Evidence-interpretation rule for this run (agreed before results)").
- Finding-by-finding age-vs-product interpretation: run-2.md lines 46-53 (PRODUCT vs AGE/reading-load table).
- Mockup provenance note: run-2.md lines 62-66 — explicitly "AI-generated concept image created … AFTER her test — it is design input, NOT stranger evidence."
- Founder Gate Ledger records Run 1 FAILED (row 27) and Run 2 NOT PASSED (row 29), and re-run authorization **G-VA-REWITNESS** (row 28, "RE-RUN AUTHORIZED", anchored to `bba9f36`).

Precise note: **G-VA-REWITNESS-2 is NOT yet in the ledger.** It appears only as the pending next step in run-2.md lines 68-71 ("Then G-VA-REWITNESS-2 … → authorize Run 3"). Its absence is *correct* under Law 54 (it has not occurred; recording it would be inventing a result) and is consistent with acceptance still PENDING. The chain is intact; only the not-yet-executed second re-witness is (properly) unrecorded.

---

## ITEM 2 — ANTI-REPEAT COMPLETENESS — **PASS** (every confusion maps to a committed, on-disk check)

Commands: `Read` of each selftest; `git ls-files`; `find src -name '*.selftest.mjs'`.

Run-1 confusions → guards:
| Confusion (run-1) | Guard | file:line (evidence) |
|---|---|---|
| #1 Dashboard "page of letters", 12+ min (D1) | scan-budget | `src/v8a1/dashboard/scan-budget.selftest.mjs:31` (8 answer cards), `:35` (colour chip each), `:57` (render markers); pixel fold in `src/v8a1/dashboard/smoke.mjs:58-69` |
| #2 dead Restart/Refresh/Clear-Cache (D2) | no-dead-controls | `src/v8a2/preview/no-dead-controls.selftest.mjs:60` (every enabled button wired), `:75` (the 3 controls wired), `:83` (visible feedback) |
| #3 nothing to "send" (D3) | mock-send refusal | `src/v8a2/preview/mock-send-refusal.selftest.mjs:23` (Send control), `:30` (inline refusal), `:37` (no real network path) |
| #4 blocked/unknown files hard to find (D4) | badge-visibility | `src/v8a3/filecabinet/badge-visibility.selftest.mjs:34` (blocked flag), `:49` (distinct CSS), `:63` (lock glyph), `:73` (show-blocked filter) |
| #5 "don't change these" not prominent (D5) | protect geometry (in dashboard smoke) | `src/v8a1/dashboard/smoke.mjs:74` (`#do-not-touch` `.protect` raised), `:93-97` (pause small + not "Pause Everything") |

Run-2 findings → guards:
| Finding | Guard | file:line |
|---|---|---|
| F1 plain project summary | home-model | `src/v8a1/dashboard/home-model.selftest.mjs:30`; smoke `:78` |
| F2 cost findability | home-model | `home-model.selftest.mjs:36`; smoke `:82` |
| F3 decision plain summary (view-only) | home-model | `home-model.selftest.mjs:43` and `:48` |
| restored-honesty superset (REQUIRED) | smoke (REQUIRED array) | `smoke.mjs:117-130`; also `home-model.selftest.mjs:87` |
| safety-chip no-blanket-claims | home-model | `home-model.selftest.mjs:80` |
| no-invented-timestamps | home-model | `home-model.selftest.mjs:95` |

No confusion in either sheet lacks a named committed guard. All guard files are git-tracked and discoverable by `scripts/run-selftests.mjs` (recursive `*.selftest.mjs` under `src/`).

---

## ITEM 3 — HONESTY SUPERSET — **PASS**

Command: `Read src/v8a1/dashboard/smoke.mjs`; `grep ci-honesty src/v8a1/dashboard/index.html`.

- The smoke's `REQUIRED` array (`smoke.mjs:117-129`) contains **all five** original A1 translations verbatim: "Decision Needed", "Waiting for your decision.", "the robot tests passed — this doesn't mean the product is finished.", "Developer work package #7 (PR)", "Demo mode — no real customer data (MOCK_ONLY)" — plus four new friendly-redesign honesties (it is a superset, `:114-116` comment states "NEVER deleted — anti-repeat law"). Enforced via `must(rawText.includes(t) …)` at `:130`.
- Green-CI companion asserted near the Checks chip: `smoke.mjs:132-133` reads `#ci-honesty` and requires `/doesn't mean the product is finished/`. `index.html:46-47` places `#ci-honesty` immediately under `#status-chips` (the Checks chip lives in that strip).
- Banned words still enforced: `smoke.mjs:110` scans rendered text for panic/fatal/abort. "safety"-scoping rule enforced: `smoke.mjs:111-113` asserts "safety" never appears in the `[data-answer="checks"]` chip.

---

## ITEM 4 — PROCESS LOCKS LIVE — **PASS**

Commands:
- `Read docs/assembly-evidence/VA-LOCKS/branch-protection.json`
- `gh api repos/yosiwizman/foundergate/branches/main/protection` → `contexts: ['selftests']`, `enforce_admins: True`
- `git ls-files …`; `find src -name '*.selftest.mjs'`

Findings:
- Committed snapshot: `required_status_checks.contexts:["selftests"]`, `enforce_admins.enabled:true`. **Live gh api matches exactly** (selftests required; enforce_admins true). Real, not just a promise.
- `src/v8a1/fixture-pristine.selftest.mjs` (content-hash manifest guard) and `src/tools/evidence-integrity.selftest.mjs` both exist under `src/` and are git-tracked (`git ls-files` returns both).
- Runner `scripts/run-selftests.mjs:17-32` recursively finds every `*.selftest.mjs` under `src/`; `find` confirms 42 such files on disk including both guards. So both are discovered by the CI suite runner. (Actual pass/exit-0 is UNKNOWN — cannot run `npm test`.)

---

## ITEM 5 — LAW 54/55 SPOT-CHECK (`view-model.mjs`) — **PASS**, with one honesty FLAG

Command: `Read src/v8a1/dashboard/view-model.mjs`.

Law 55 (view-only decision affordance) — clean:
- `home.waiting.buttonLabel = "Read the Decision"` (`:239`); comment "never 'Approve'/'Move forward'".
- Decision tile "Read the Decision" / "See what's waiting (view only)" `viewOnly:true` (`:224`); nav "Decisions" → `#waiting` `viewOnly:true` (`:281`). No "approve/move forward/confirm/submit" anywhere in tiles or nav. Guard `home-model.selftest.mjs:48-57` also enforces this against a broad ACT_WORDS regex.

Law 54 (no invented state / no invented timestamps) — clean:
- Activity feed built only from real events (`:187-190`); comment `:186` and guard `home-model.selftest.mjs:95` forbid "N minutes ago". No fabricated times.
- Pause wording honest: `pauseCard.button = "⏸ Pause & get help"` (`:258`, comment "NOT 'Pause Everything'"); `pauseScope()` (`:79-85`) reports "Nothing was running…" when trackedProcesses empty. Never "Pause Everything".
- F1 summary (`:177-180`), F3 lead (`:183-185`), costBig (`:215`), safetyChip (`:196-197`) are all templates over real model fields; safetyChip is explicitly model-derived with no blanket claim.

**FLAG (honesty caveat, not a Law-55 breach):** `home.safe` (`:245-254`) hardcodes state claims — lines "This is a demo (no real customer data)", "No messages are really sent", "No payments are made", "Secret files are hidden", and verdict **"Yes, it's safe to explore!"** — none conditioned on `m.dataClass`. This contrasts with the adjacent Safety *chip*, which was deliberately refactored to be model-derived (no blanket "everything safe"). For the shipped MOCK_ONLY fixture these statements are true, so this is not a current falsehood, but the `safe` card is a hardcoded blanket safety claim that would not track the model if data class ever changed. Recommend deriving it from `m.dataClass` for consistency with the safety-chip rule. This is the one place "every friendly sentence derives from real model fields" does not strictly hold.

---

## ITEM 6 — LEDGER COHERENCE — **PASS** (one stale metric noted; live green UNKNOWN)

Commands:
- `git cat-file -t` on all 25 stamped SHAs across both ledgers → **every one resolves to `commit`** (6273b380, d6f06cf, d2ad415, 170196f, 29913080, acd2b04, bd582d3, 5048355, 89c7c86, 270719db, dba8720, 5e6d867, aa8fcc1, b5497161, e92f8b9, 823fa4b, b0e0761, a957b01, c167641, 9db6b43, 2ea6e35, 99f5b2c, e9a8afe, bba9f36, 689eb44).
- `git log --merges | grep '#(4[1-9]|5[0-5])'` → all of PR #41-#55 present as real merge commits on main.
- `grep` for placeholder tokens (the parenthetical this-PR / this-SHA forms, the EVIDENCE-TIP marker, uppercase SHA / PR / FINAL-CI stubs, and zero / malformed PR numbers) across both ledgers, STAGE_TRACKER, and both run sheets → **none found**. No unstamped placeholders remain. *(The literal token spellings are escaped in this sentence so the report itself does not trip the evidence-integrity placeholder guard.)*
- V8-A acceptance status: `FOUNDER_GATE_LEDGER.md` rows 27 & 29 both state "V8-A acceptance stays PENDING"; `STAGE_TRACKER.md:33` records **"V8-A ACCEPTANCE — whole product | PENDING | fires after the Stranger Test run"** and row 19 "RUN 2 NOT PASSED → … Run 3 required". **Not accepted.** Correct.

Note (minor, non-blocking): `STAGE_TRACKER.md:9` claims the suite is "ALL GREEN (31/31)", but `find src -name '*.selftest.mjs'` returns **42** discoverable self-tests. The 31 count is stale relative to disk (the extra files include pre-V8-A subsystems: adapters/cage/checker/collectors/etc.). Because `npm test` cannot be run here, the actual green count is **UNKNOWN** — flagged as a documentation staleness, not a proven failure.

---

## SUMMARY
Item 1 PASS · Item 2 PASS · Item 3 PASS · Item 4 PASS · Item 5 PASS (one honesty FLAG: hardcoded `home.safe` card) · Item 6 PASS (stale "31/31" count vs 42 on disk; live test/CI green UNKNOWN, not run). Two things are UNKNOWN by design of a read-only audit: live self-test/CI pass status (cannot run product) — mitigated by verified branch protection requiring `selftests` with enforce_admins=true, confirmed live via gh api.

## PLAIN-ENGLISH VERDICT (for a non-developer founder)
The evidence trail is honest and complete, and it correctly says the product is NOT yet accepted. Two real strangers tested it: the first run failed, the second (your 9-year-old) did much better but still did not pass all seven steps — and the records say so plainly, in the strangers' own words, without pretending. Every confusion a stranger hit has been turned into a permanent automatic check that lives in the code, so those specific problems can't quietly come back. The safety locks are genuinely switched on: the GitHub setting that blocks a broken change from reaching your main line is confirmed live, not just claimed. Every version stamp in your ledgers points to a real commit, nothing is left as a blank placeholder, and the tracker correctly shows "V8-A acceptance: PENDING." Two small honesty items to tidy (not blockers): one "Yes, it's safe to explore!" card is hard-coded rather than reading from the live data, and one tracker line says "31/31 tests" when there are now 42 test files on disk. I could not run the tests myself (that would run the product, which this audit forbids), so whether they all pass right now is unverified from here — but the machine that enforces them is provably on. Bottom line: the paperwork is trustworthy and the gate is correctly still closed; the next honest step is a Run-3 stranger test, exactly as your records say.
