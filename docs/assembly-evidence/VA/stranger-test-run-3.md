# Stranger Test — Run 3 Capture Sheet (ACCEPTANCE CANDIDATE · AWAITING A REAL RUN)

> **Status: AWAITING REAL-PERSON RUN (Run 3 — official acceptance candidate).** Blank capture sheet. It holds
> **no results yet** — filled in only when the real person actually runs it (Law 54: we never invent a PASS).
> **Pass bar: all 7 steps unaided.** If all 7 pass, this run is the basis for the V8-A acceptance gate.

## Who & when
- **Stranger (a true non-developer):** "Dana" — adult non-developer, first exposure to FounderGate.
- **Relationship / background (why they qualify as a stranger):** the founder's girlfriend; a genuine first-time,
  non-developer user, observed by the founder.
- **Observer:** the founder  · **Date:** 2026-07-10  · **Start time:** ______  · **End time:** ______
- **Setup:** one command — `npm run stranger-test` — launched Dashboard :4173, Preview Bay :4300, File Cabinet :4400, Guide :4500 (loopback, **throwaway copy** of the mock data); walkthrough on :4600. D1–D5, F1/F2/F3, and the restored honesty all live.

## Rules for the observer
- **Do not help.** If they get stuck, note it — that's the finding.
- Capture their **verbatim words**, especially every confusion ("huh?", "where's…?", "what does this mean?").
- Mark each step **PASS** only if they did it **unaided** — no terminal, no copy/paste to outside tools, no code,
  no developer translation.

## Per-step capture (verbatim from the founder's dictation)

| # | Step | Result | Verbatim quote / confusion |
|---|------|--------|-----------------------------|
| 1 | See what's going on (Dashboard) | **FAIL** | Over **20 minutes** on the first question; **could not find the name of the project**; could not settle "is it working / is it safe." Founder verbatim: "This test is a fail… we need to make it more clear, more user friendly, more understandable." **ADVISOR-CAUGHT REGRESSION:** the friendly redesign removed the project name from the header — only the greeting remains. |
| 2 | Look at the actual app (Preview Bay) | **FAIL** | "It doesn't look like a real app because it looked like a broken app." Founder concurs: the mock demo content is too skeletal to read as real. |
| 3 | Report a problem (Bug Collector) | **NOT VERIFIED** | Partially observed, not clearly dictated (Law 54 — not scored). |
| 4 | Look through the files (File Cabinet) | **NOT VERIFIED** | Not clearly dictated. Session screenshots show the blocked-filter working. |
| 5 | Ask in plain English (Project Guide) | **NOT VERIFIED** | Not clearly dictated. Session screenshots show the Guide working (cited answers, injection refusal, draft card). |
| 6 | Read a decision card (view-only gate) | **NOT VERIFIED** | Not clearly dictated. |
| 7 | Pause & protect (Dashboard) | **NOT VERIFIED** | Not clearly dictated. |

**Injection-refusal check (step 5):** observed working in session screenshots (cited answers + injection refusal + draft card), but **not clearly dictated** — recorded as observed-not-scored (Law 54).

## Overall
- **Could they run it entirely on their own?** No. Founder verbatim: "This test is a fail."
- **Dana's words, verbatim:** "If it's simple things like what I see, yes. But if something I have to do behind it, probably not."
- **Layout, verbatim:** too "condensed in the front… overwhelming… needs to be more spaced"; use the sidebar/header empty space; move status/quick actions up; "more symmetrical." Shown the run-2 concept (design input, not evidence): "less organized… lighter color is nice but harder reading — on dark it's easier to read… something in between."
- **Pass bar:** all 7 steps PASS and unaided. → **Overall: FAIL** (Steps 1 & 2 FAIL; 3–7 NOT VERIFIED). V8-A acceptance stays PENDING.

## Finding-by-finding interpretation (product confusion vs age/other; pre-declared rule)
| Observation | Verdict | Becomes |
|-------------|---------|---------|
| Couldn't find the project **name** (Step 1) | **PRODUCT — regression** (redesign dropped project name from header) | **R1** identity-first (name + description + summary), guard so it can't return |
| 20+ min, front is "condensed / overwhelming" (Step 1 + layout notes) | **PRODUCT** — too dense, no visual hierarchy / breathing room | **R2** three-layer decompression (5-second rule, progressive disclosure, 8pt grid) |
| Preview "looked like a broken app" (Step 2) | **PRODUCT** — mock demo content too skeletal to read as real | **R3** realistic demo fixture (a believable small product) |
| "lighter color harder, dark easier — something in between" | Design preference (keep dark theme, more air) | folded into R2 |

## 🔒 Anti-repeat law — confusions → permanent automated checks (VA-REPAIR-3)
| # | Confusion | Fix | Committed check |
|---|-----------|-----|------------------|
| R1 | Project name missing from header | Identity-first header (name from project.json + description + summary) | model project name renders in header (guard + smoke) |
| R2 | Front too condensed/overwhelming | Three disclosure layers; ≤6 elements above the fold | hard fold budget in smoke (≤6 role-labelled) + 8 answers preserved |
| R3 | Preview "looked broken" | Realistic static demo product (Luna Café one-pager) | smoke asserts realistic-app elements render + send-refusal still fires |

## What happens next
Repair bundle **VA-REPAIR-3** (research-grounded dashboard redesign + realistic demo fixture) runs now; each fix
guard-locked. Then **G-VA-REWITNESS-3** (founder witness of before/after) → authorize **Run 4** with a fresh
stranger. **V8-A acceptance fires only after a run passes all 7 steps unaided.**
