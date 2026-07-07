# Bug evidence — G2 witness attempt #1 (FAILED visual review)

- **Date:** 2026-07-07
- **Gate:** G2 — Founder UI Witness + Low-Hand Checks
- **Result:** **Visual review FAILED by founder.** Stranger Test and Hand-Burden checks deferred to re-witness.
- **Bundle:** B12 (V8-A1), UX repair lane (layout/copy/styling of existing A11–A24 only).

## Founder-caught defects (verbatim)

1. Layout is a long scroll wall — not friendly for a non-developer.
2. Tone is developer-scary, not human.
3. The large red glowing "Panic" button is intimidating and mislabeled for a human user.
4. Founder supplied a target layout direction: left sidebar app shell, welcome header, compact card grid,
   assistant-style polish.

## Repair intent (this lane)

Rebuild the dashboard as an app shell — left sidebar with active (Dashboard / My Project / Settings) and
DISABLED future items carrying stage labels; a warm welcome header using the founder's name from project config;
a compact card grid with questions 1–4 + current status **above the fold at 1366×768**; a friendly-human copy
pass on all visible text (UNKNOWN/STALE stay verbatim per Law 54, explained gently); and the red "Panic" button
replaced with a small, calm, always-visible **"Pause & get help"** control (identical function, honest scope in
friendly words). Every one of the four defects becomes an automated anti-repeat check.

**No new capability** is added — layout, copy, and styling of the existing A11–A24 capabilities only.

## Resolution (UX repair lane, same B12 scope)

**RESOLVED.** All four defects fixed as layout/copy/styling of existing A11–A24 (no new capability), and each is
now an automated anti-repeat check (view-model self-test + Playwright geometry). Evidence: refreshed screenshots +
`../hand-burden.json`; full suite 19/19 GREEN. Awaiting G2 re-witness.
