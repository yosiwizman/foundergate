# Deck vs Current UI — Gap Analysis (Lane B)
## Are they the same UI? NO.
They are two DIFFERENT surfaces at two DIFFERENT fidelities.

## Truthful relationship
- The PITCH DECK workspace UI (dark: Truth Dashboard, Preview Bay, Protected Files) is realized in the DESIGN-LANE MOCKUPS (docs/lanes/founder-design-v2/ + src/v8a1-v8a4). These are DISPLAY_ONLY: static screens with NO backend (0 /api/ calls), and they are self-labeled in the deck as "Demo mode / MOCK_ONLY / not production-ready controls / current workspace screens."
- The CURRENT LIVE-LOCAL dashboard (demo/founder_operator_dashboard/) is a SIMPLER, REAL evidence runner: it calls the loopback run-server (5 real /api/ calls), runs a real local check, and produces a real sealed export. It is the surface accepted in Gates 5/6.
- So: the deck shows the BROADER intended owner workspace (design, mock-only); Founder Mode is a WORKING SLICE with a real backend for the accepted evidence path. Founder Mode is NOT a replacement for the deck workspace, and the deck workspace is NOT the current live backend.

## Naming (to prevent confusion)
- Call the deck/dark workspace UI: **"Founder operating environment (design concept — mock/display-only)."**
- Call the current live dashboard: **"Founder Mode local dashboard (live-local evidence runner)."**

## Wording that prevents confusion
"The deck shows the broader founder operating environment as a design concept (mock/display-only). The working demo you can run today is the Founder Mode local dashboard — a real, local evidence runner. Both are internal/pre-launch and not production; they are different surfaces, not the same product screen."

## Honesty note
Both surfaces are already honestly labeled (deck: MOCK_ONLY/not production-ready; Founder Mode: local/not production). No overclaim was found requiring a UI code change.
