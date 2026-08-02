# Local Operator Loop — Architecture
End-to-end, local-only, no-terminal loop in the deck-style environment:
1. **Intake** — founder picks a Source (default: Safe local demo, self-owned) and an Objective
   (default pre-filled; typing optional). Optional local path accepted only if it is a known safe
   demo path.
2. **Safety classification** (client-side, shown before Run): Source → SAFE_LOCAL_DEMO /
   HOLD_NEEDS_AUTHORIZATION / REFUSED; Objective → SAFE / REFUSED; Eligibility → READY_LOCAL_DEMO /
   HOLD_NEEDS_AUTHORIZATION / REFUSED / UNKNOWN. Run is disabled unless READY_LOCAL_DEMO.
3. **Governed run** — Run calls the real local backend `/api/start` with the allowlisted safe demo
   target and the (safe) objective. The server independently enforces its target allowlist and
   converts any SHIP to ERROR. Honest COMPLETE / UNKNOWN / HOLD / ERROR.
4. **Result** — deck-style Truth Dashboard + Preview show the real result; decision never SHIP.
5. **Evidence** — `/api/export` seals a real ZIP (unzip-verified). The founder-facing receipt lists
   source, objective, safety classification, tests, decision, limitations, and what was NOT proven.
6. **Refusal paths** — unknown/private/customer/production sources and forbidden objectives are
   held/refused and never run. Defense in depth: client governance + server allowlist.
Deck visual language reused (fg.css byte-identical). No third UI. Founder Mode remains fallback.
