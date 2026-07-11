# VISUAL SELF-REVIEW — verdict (THE VISUAL SELF-REVIEW LAW §23 + HARNESS-TRUTH LAW §27)

> **Bundle:** FD-IMPLEMENT (founder design package v2 — pixel-faithful implementation of the four mockups).
> **Date:** 2026-07-11 · **Reviewer:** FounderGate CTO (looked at each true-viewport capture next to the founder
> mockup and reasoned as a first-time human). **Scope:** all four founder-facing screens at a **TRUE 1366×768 and
> 1440×900** (deviceScaleFactor pinned to 1; the capture harness `src/tools/visual-capture.mjs` FAILS if the page's
> reported viewport ≠ the requested one — so these "matches / no-void" verdicts are trustworthy for a real laptop).
> Screenshots in this folder (`<screen>-<vp>-full.png` / `-fold.png`), plus in-embed captures `preview-embed-*.png`.
>
> **Honest scope note (from the law):** this review *reduces, not eliminates,* human catches. The founder witness
> gate remains the final filter. Mockups compared: 01_Dashboard, 02_PreviewBay, 03_FileCabinet, 04_ProjectGuide.

## One-line verdict per screen — "matches mockup: yes/no + differences"

| Screen | 1366×768 | 1440×900 | Matches mockup? |
|--------|----------|----------|-----------------|
| **Truth Dashboard** | clean | clean | **YES — PASS.** Identity eyebrow + name + description; the new **ALIVE line** (green health dot + "Project healthy — connected, all files in place." + amber "Waiting on you:"); six chips exactly as drawn (STATUS green *Healthy · waiting on you*, CHECKS green, DECISION amber, SAFETY blue, EVIDENCE neutral, SPENDING neutral *· display only*); honesty line; amber-trim Waiting card **with "Pause instead"**; What's Next; recent; five quick tiles; footnotes strip. **NO accordions.** No void at either viewport. |
| **Preview Bay** | clean | clean | **YES — PASS.** Eyebrow *PREVIEW · NOT LIVE*, labels row (sends **off** green), controls (Start/Stop/Restart/Refresh/Full Screen/Report), **the embed GROWS to the café's content (625px)** so "Send order (practice)" is fully visible with no inner scroll — **L0, finally** (verified by the in-embed harness at both viewports); "Save report" wording; café keeps its honest refusal line. |
| **File Cabinet** | clean | clean | **YES — PASS.** Eyebrow *READ-ONLY*, "Files"; **do-not-touch banner pinned at top** (calm purple, data-driven from the project's locks — the FULL list relocated from the dashboard); List/Reading toggle · Sort · Search · Only-protected filter; grouped list with **dim directory prefix / bright tail**, green SAFE badges, calm purple locks; the **reading pane dominates**. All read-only; existing no-leak enforcement unchanged. |
| **Project Guide** | clean | clean | **YES — PASS.** Eyebrow *READ-ONLY HELPER*, "Ask Guide"; suggested-question chips; chat with cited **Source** lines; the amber-trim **refusal** style on an injection attempt; draft card labelled **"draft only, not sent"** + Copy. Pure reskin — every honesty behaviour identical to before. |

## Deviations from the mockups (per the contract: where a mockup conflicts with a law, follow the law and list it)
1. **STATUS chip + ALIVE dot are HEALTH-derived, not run_state** (Law 54). Green = connected + files-found (the Run-6
   diagnosis proved a green run-state is impossible on the fixture). This is what the mockup draws (green STATUS on a
   waiting demo); the honest "waiting" signal is carried by the chip text and the amber DECISION chip. Guard J1
   relocated in the same PR.
2. **Clear Cache control removed** from the Preview Bay control row (the mockup omits it). Removing a control also
   satisfies the "no dead control" anti-repeat; `no-dead-controls.selftest` updated to require the remaining wired
   controls (Restart + Refresh).
3. **EVIDENCE chip is neutral** ("2 items · 1 stale"), matching the drawn design — the staleness is stated in the
   text rather than coloured amber.
4. **Preview embed capture:** the café runs in a **cross-origin sandboxed iframe**, so a parent-page screenshot
   cannot capture the café's pixels (browser security) — it can look blank in a screenshot tool even though it
   paints for the user. Verified two ways: the café renders fully when its own URL is opened directly, and the
   in-embed harness measures the café Send **inside** the frame (frame 625px ≥ Send bottom 521px → VISIBLE).

No screen reads as "broken," "off," "dull," or "scary." The four apps are one coherent product in the founder's v2
design language. Surfaced for the founder witness gate.

## Addendum — M1 / M2 refinements (Run-7 notes), true 1366×768 + 1440×900

Before/after full-page stills committed: `before-m1m2/` (pre) vs `dashboard-*-full.png` + `filecabinet-*-full.png` (post).

| Refinement | Screen | Before | After | Matches intent? |
|---|---|---|---|---|
| **M1** "stuck" → "On Hold" | Truth Dashboard | STATUS chip read *"Healthy · waiting on you"* | STATUS chip reads **"Healthy · on hold"** (green); the *"Waiting on you: one decision to read"* call-to-action stays in the alive line | **YES** — the held state now reads as deliberate, not stuck (Mike: "it doesn't look stuck if it's working"). Honesty/friendly-copy guards green. |
| **M2** distinct SECRET vs UNKNOWN | File Cabinet | SECRET and UNKNOWN badges both purple | **SECRET** badge + row rail are **teal** (`--secret`); **UNKNOWN** keeps **purple** (`--lock`) — two calm, distinct hues; **red still reserved for problems** | **YES** — SECRET has its own colour tag; UNKNOWN sticks out separately (Mike's two notes). Calm-colour + badge-visibility guards updated and green. |

Both verdicts at both viewports: **matches intent — yes.** No red for routine states. Founder to witness on the next card.
