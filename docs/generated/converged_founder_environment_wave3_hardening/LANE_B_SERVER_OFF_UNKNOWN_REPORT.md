# Lane B — Server-Off / UNKNOWN Behavior

When `/api/health` fails: `applyHealth(false)` shows "not reachable — UNKNOWN" (server-state) and
"UNAVAILABLE (UNKNOWN)" (backend chip), **disables Run**, keeps Export disabled, and sets an
honest next-step ("open it from FounderGate_Start_Here, or ask ChatGPT"). No prior success is shown
as current (a run always resets to UNKNOWN first). Preview/Evidence reflect UNKNOWN. No terminal
instruction is given to the founder.

A lightweight health poll (every 4s) and an on-click recheck mean a **late-started** backend is
picked up automatically — Run re-enables when the local server becomes reachable.

Verified (Lane K E2E, scenario 2): backend UNAVAILABLE, Run disabled, tests UNKNOWN, Export disabled.
