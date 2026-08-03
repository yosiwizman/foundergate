# Lane H — FounderGate UI Integration
Added a deck-style **Idea Builder** panel (`nav-idea`): editable idea (default prefilled), a
"Classify idea (safety)" control (SAFE_LOCAL_SYNTHETIC / HOLD_PROTECTED_GATE / REFUSED_NEEDS_
AUTHORIZATION), a "Load build status" table (idea→spec→build→tests PASS 13/13→preview→evidence→
decision), an "Open generated app preview" link, and a forbidden-request warning. Decision shown as
INTERNAL_DEMO_ONLY (never SHIP). fg.css unchanged (no third UI). Verified by the Wave 9 E2E.
