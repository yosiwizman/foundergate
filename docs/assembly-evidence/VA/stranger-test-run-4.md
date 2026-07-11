# Stranger Test — Run 4 Capture Sheet (ACCEPTANCE CANDIDATE · AWAITING A REAL RUN)

> **Status: AWAITING REAL-PERSON RUN (Run 4 — official acceptance candidate).** Blank capture sheet. Holds
> **no results yet** — filled in only when the real person runs it (Law 54: we never invent a PASS).
> **Pass bar: all 7 steps unaided.** If all 7 pass, this run is the basis for V8-A acceptance.

## Who & when
- **Stranger (a true non-developer):** "Jimmy", **11 years old** — first exposure to FounderGate.
- **Relationship / background (why they qualify as a stranger):** son of the Run-3 stranger; he was **NOT present
  during Run 3** (playing elsewhere in the house), so this is a genuine first-time run. Observed by the founder.
- **Observer:** the founder  · **Date:** 2026-07-10  · **Start time:** ______  · **End time:** ______
- **Setup:** one command — `npm run stranger-test` — Dashboard :4173, Preview Bay :4300, File Cabinet :4400, Guide :4500 (loopback, **throwaway copy** of the mock data); walkthrough on :4600. VA-REPAIR-3 rebuild live (Luna Café identity, three layers, realistic demo).

## Pre-test session defect (found by the founder BEFORE the stranger began)
- **What:** two ports appeared to show the same page — the Project Guide was not visibly served on :4500 (Preview
  Bay appeared on both :4300 and :4500). Caught by the founder before Jimmy started; **product frozen**.
- **Diagnosis (raw):** at the server level both were actually correct — :4300 served "FounderGate — Preview Bay
  (V8-A2)" and :4500 served "Project Guide — FounderGate" (the Guide-only `/api/guide/capabilities` endpoint
  responded on :4500), with two distinct node processes. The visible duplicate was a **stale/cached browser tab**.
- **Real weakness (fixed):** the stranger-test **launcher** declared "ready" after any 200 on each port — it never
  verified each port served its **own** app, so a genuine crash-and-port-steal would have slipped through silently.
- **Fix (launcher-only; no product code):** the launcher now **health-checks each port by a per-app identity
  marker** (page title) and only declares ready if every port serves its own app; on a mismatch it prints
  "SESSION DEFECT" and refuses to declare a stranger-ready session.
- **Anti-repeat guard (committed):** `src/tools/launcher-health.selftest.mjs` — distinct ports, distinct port env
  vars, distinct identity markers, each marker present in its UI page, and the launcher matches on the marker (not
  just a 200).
- **After the fix (raw curls):** :4173 Truth Dashboard · :4300 Preview Bay · :4400 File Cabinet · :4500 Project
  Guide — four DISTINCT pages. Session restarted clean on the throwaway fixture. Run 4 then proceeded.


### Pre-test event 2 — tall-viewport VOID defect + doctrine amendment (VA-VISUAL-LAW)
- **Defect (founder-caught):** on a tall viewport the dashboard's Layer 1 had `min-height: calc(100vh - 210px)`,
  stretching to fill the screen and leaving a large empty **void** between "Read the Decision" and the Layer-2
  cards. The smoke's old "Layer 2 below the fold" rule *rewarded* the void. **Fixed** (natural height; Layer 2
  flows immediately; guard corrected to run at 1366×768 AND 1440×900 with a new anti-void ≤120px-gap check).
- **Doctrine amendment (founder-mandated):** adopted **THE VISUAL SELF-REVIEW LAW** (Assembly Manual §23; mirrored
  in Where-Am-I standing rules) — before any witness/stranger/gallery handoff the CTO must screenshot every screen
  at both viewports, actually LOOK, fix-or-disclose, and record a per-screen verdict; enforced by
  `src/tools/visual-review.selftest.mjs`.
- **First review recorded:** `docs/assembly-evidence/visual-review/VISUAL_REVIEW.md` — Dashboard/File Cabinet PASS;
  Preview Bay + Project Guide PASS with two minor parked/disclosed notes (café "Send order" below the embed fold;
  sparse empty Guide chat before first question). Neither blocks Run 4.

## Evidence-interpretation rule for this run (pre-declared, same as Run 2)
- An **unaided PASS counts fully** toward V8-A acceptance.
- Any **FAIL is interpreted finding-by-finding** to separate genuine **product confusion** (a real defect → fix +
  guard) from **age-related reading load** (an 11-year-old's reading pace/vocabulary, not a product flaw). Only
  product-confusion findings become defects.

## Rules for the observer
- **Do not help.** If they get stuck, note it — that's the finding.
- Capture their **verbatim words**, especially every confusion ("huh?", "where's…?", "what does this mean?").
- Mark each step **PASS** only if they did it **unaided** — no terminal, no copy/paste to outside tools, no code,
  no developer translation.

## Per-step capture (verbatim from the founder's dictation)

| # | Step | Result | Verbatim quote / confusion |
|---|------|--------|-----------------------------|
| 1 | See what's going on (Dashboard) | **PARTIAL** | Found the name in seconds ("I think the project name is Luna Cafe, but there is nowhere that it says project"); cost instantly ("costing is right on the top… up to fifty dollars a month"); pause yes; decision waiting yes. **FAIL component:** "there is no time clock… nothing that will tell me if the project is running. **How do I know if the project is running?**" — correct: the status strip has NO running-state chip. His fix: the card "should highlight… a trim from the outside… **green for running, yellow for pause, red for stop**." |
| 2 | Look at the actual app (Preview Bay) | **PASS** | "The actual app and preview look cool, I can see the restaurant, even inside when I click the menu it's scrolling down, so it feels like it's working. I can click stop and everything stops. I can click start and preview it starts." Style note: "it's not the same as the front dashboard… a little bit off." |
| 3 | Report a problem (Bug Collector) | **PASS** | "I can click report the problem, then send report, and it's working." |
| 4 | Look through the files (File Cabinet) | **PARTIAL / NOT VERIFIED** | Safe-doc / secret-hidden / unknown-blocked checks **not dictated** (Law 54 — not scored). Reaction: "very crowded and doesn't match the other style… It looked very scary, honestly… **very red, very scary**, like something I don't wanna get around… it looked like I'm gonna destroy something." Suggests dashboard-style cubes/consistency. |
| 5 | Ask in plain English (Project Guide) | **NOT VERIFIED** | Q&A / trick / draft checks **not dictated** (Law 54). Reaction: "the project guide page AI is **very dull** compared to everything else." |
| 6 | Read a decision card (view-only gate) | **PARTIAL** | Saw "waiting on decision, decision needed, but it's **not as clear**… the box is next to the other box." |
| 7 | Pause & protect (Dashboard) | **PASS (component)** | "Yes, they can pause it." |

**Injection-refusal check (step 5):** NOT VERIFIED — not dictated this run.

## Overall
- **Could they run it entirely on their own?** Not fully — **best run yet: ZERO comprehension failures.** All
  findings are on the visual-coherence layer (consistency, a missing running-state signal, calm-vs-scary colour).
  Willing to re-test: "I'd be happy to try again when you guys done."
- **Pass bar:** all 7 steps PASS and unaided, fully dictated. → **Overall: NOT PASSED** (Step 1 partial; Steps 4/5
  NOT VERIFIED). V8-A acceptance stays PENDING.

## ✅ Validations for the record (confirmed working on a fresh stranger after 3 failed runs)
- **R1 name-findability** — found the name in seconds. **F2 cost-findability** — found the $50 instantly.
- **R3 realistic demo** — "I can see the restaurant… it feels like it's working." **D2/D3 preview controls** —
  start/stop/report all worked.

## Finding-by-finding interpretation (product confusion vs age; pre-declared rule)
| Observation | Verdict | Becomes |
|-------------|---------|---------|
| "How do I know if the project is running?" — no running-state chip (Step 1) | **PRODUCT** | **J1** running-state chip (traffic-light, model-derived) |
| Decision card "not as clear… box next to the other box" (Step 6) | **PRODUCT** | **J2** amber highlight/trim on the needs-you card |
| File Cabinet "very red, very scary… I'm gonna destroy something" (Step 4) | **PRODUCT** | **J4** calm the File Cabinet (red = problem only) |
| "doesn't match the other style" (Files); "a little bit off" (Preview); "very dull" (Guide) | **PRODUCT — root cause** | **J0** shared design system + **J6** Guide liveliness |
| "nowhere that it says project" (name has no label) | **PRODUCT** | **J5** "Project:" label |

## 🔒 Anti-repeat law — confusions → permanent automated checks (VA-REPAIR-4)
| # | Confusion | Fix | Committed check |
|---|-----------|-----|------------------|
| J0 | four apps, four divergent styles | shared design-token stylesheet, all four apps load + use it | consistency check: every page loads shared tokens + uses component classes; smoke kinship markers |
| J1 | no running-state signal | traffic-light STATE chip (green/amber/red/gray), model-derived | state chip present + tone-per-state in home-model guard |
| J2 | decision not prominent | amber highlight/trim on the needs-you card when pending | smoke asserts highlight class iff a decision is pending |
| J4 | File Cabinet "very red / scary" | calm lock treatment; red reserved for genuine problems | D4 badge-visibility updated: distinct AND calm (no red-class on routine blocked rows); "red=problem only" UI-language rule |
| J5 | name has no "project" label | small "Project:" label near identity | label present near the identity element |
| J6 | Guide reads dull | Guide adopts the shared design system (shell/chips/warmth) | consistency check covers the Guide too |

## What happens next
- **All 7 PASS, unaided** → the run is committed as evidence under `docs/assembly-evidence/VA/`, each confusion
  turned into a committed check, then the **final V8-A ACCEPTANCE** gate card is presented.
- **Any FAIL** → it's a V8-A defect; we fix it (and add the guard) and re-run before acceptance.
