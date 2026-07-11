# VISUAL SELF-REVIEW — verdict (first review under THE VISUAL SELF-REVIEW LAW)

> **Bundle:** VA-VISUAL-LAW · **Date:** 2026-07-10 · **Reviewer:** FounderGate CTO (looked at each image and reasoned
> as a first-time human would). **Scope:** all four founder-facing screens at **1366×768** and **1440×900**, full-page
> and above-the-fold. Screenshots in this folder (`<screen>-<viewport>-{full,fold}.png`).
>
> **Honest scope note (from the law):** this review *reduces, not eliminates,* human catches. The founder witness
> gate remains the final filter.

## One-line verdict per screen

| Screen | 1366×768 | 1440×900 | Verdict |
|--------|----------|----------|---------|
| **Truth Dashboard** | clean | clean | **PASS** — the tall-viewport VOID is fixed: Layer 1 (identity + 5 chips + "Read the Decision") sits above the fold, Layer 2 flows immediately after with even spacing, no dead space; reads as a real product. |
| **Preview Bay** | good | good | **PASS (note)** — the embedded **Luna Café** app reads as a believable site (logo, menu, prices). *Minor, parked:* the café is embedded in a fixed-height frame, so the practice **"Send order"** button is below the frame's visible area — reachable by scrolling the embed or via **Open Full Screen**. Not broken; disclosed. |
| **File Cabinet** | clean | clean | **PASS** — clear categories; PUBLIC_SAFE (green "safe to read") vs SECRET/UNKNOWN (red "protected / not sorted") badges with lock glyphs; one-click "show protected & blocked" filter; empty preview panel shows the expected "Pick a file…" prompt. No voids/overlaps. |
| **Project Guide** | functional | functional | **PASS (note)** — chat works (prompt chips, input, honest read-only note). *Minor, parked:* before the first question the chat area looks **sparse** (empty space between chips and input). Functional and fills on first answer; a friendly placeholder line would improve it. V8-A4 is accepted — not fixed in this bundle; disclosed. |

## Defect fixed in this bundle
**Dashboard tall-viewport void** — `.layer1` had `min-height: calc(100vh - 210px)` (plus a scroll cue), which stretched Layer 1 to fill the screen and left a large empty gap before Layer 2 on tall viewports. The smoke's old "Layer 2 must start BELOW the fold" rule *rewarded* that void. **Fixed:** removed the artificial min-height/spacer/scroll-cue; Layer 1 takes natural height and Layer 2 flows right after. **Guard corrected (not deleted):** (a) all Layer-1 elements fully above the fold; (b) Layer 1 presents ≤6 role-labelled answers, all above the fold; (c) NEW anti-void — no vertical gap >120px between consecutive sections; and all geometry now runs at **both** 1366×768 and 1440×900.

## Parked / disclosed (not blockers for Run 4)
1. Preview Bay embed: café "Send order" below the frame fold (Open Full Screen works).
2. Project Guide: sparse empty chat before first question.

Both are minor and do not read as "broken." Neither blocks the Run-4 stranger session; surfaced here per the law's disclosure requirement for the founder to weigh.
