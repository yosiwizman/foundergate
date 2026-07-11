# Run 6 — ABORTED at pre-flight. Live-session diagnosis (no fixes; diagnosis only).

**Date:** 2026-07-11 · **Decision:** Founder aborted Run 6 before the stranger began.
**Founder finding:** on the live session, L0 is not visibly fixed, and L1/L2/L4 are not visible on the dashboard,
while L3 and the Run-4 fixes ARE live — i.e. the product does not match what the founder believed a
"VA-REPAIR-5" review had verdicted.

Method: diagnosed against the **live servers** (Dashboard :4173, Preview Bay :4300) in a real browser plus the
committed source — not the test harness. Screenshots + DOM measurements taken live.

---

## Per-lane verdict (live)

| Lane | Verdict | What the founder sees / why |
|------|---------|------------------------------|
| **L0 — Preview Bay "Send order" below the embed frame** | **BUILT+BROKEN (fix never built)** | The café runs inside a **fixed-height 420px** sandboxed `<iframe>` (src = an ephemeral café port, `sandbox="allow-scripts allow-forms"`). The café's Send button is at the bottom of the café page → clipped by the 420px frame; reachable only by scrolling *inside* the frame or "Open Full Screen." This is the exact Luran/Run-5 defect and it was **never fixed** — every visual review *parked* it. (Additional live symptom this session: the embed rendered **blank white** — the café did not paint inside the sandbox here — so Send was not merely below the fold but absent.) |
| **L1 — active / "is it running?" signal** | **BUILT+CONDITIONAL** | The Status chip (`statusStrip[0]`) is always rendered and leads the strip. It shows green **🟢 Running** *only* when `state === "active"`. The demo model derives **`state = "blocked"`** (an open gate — `reader.selftest` asserts this), so the chip **always** shows amber **🟡 Waiting on you.** Condition for a green running signal: `run_state` active AND no open gate — the demo fixture can never meet it. So there is a status chip, but never an *active* signal. |
| **L2 — in-card pause** | **BUILT+CONDITIONAL** | The in-card pause button (`#pause-button-2`, inside the "Is it safe? & what it costs" card) lives inside a **collapsed `<details>`** in Layer 3 → hidden until the founder expands that accordion. (A pause DOES show in the top bar — `#pause-button` — so a pause exists, but the *in-card* one is collapsed by default.) |
| **L3 — Finder-style File Cabinet** | **BUILT+VISIBLE** | Matches the founder: list/reading toggle, sort, search, dim prefix, calm purple locks — live on :4400. |
| **Run-4 fixes (J0/J1/J2/J4/J5/J6)** | **BUILT+VISIBLE** | Shared dark design, PROJECT label, amber needs-you trim, calm File Cabinet, warm Guide — confirmed live. |
| **L4 — "What's-Next panel" with honest absence wording** | **NOT ACTUALLY BUILT** | No such panel exists in the HTML, the JS, or any commit/branch/PR (`hasWhatsNextPanel = false` live; grep finds nothing). The nearest existing element is a **single line** `#next-note` ("Nothing will happen until you decide."). There is **no VA-REPAIR-5 bundle** — L1/L2/L4 as a repair set were never commissioned or built. Only **L3** was built after VA-REPAIR-4. |

---

## Why the self-review AND the L0 bounds guard passed while the live embed cuts the button off

Four distinct causes — none of them "the guard lied":

1. **There was no VA-REPAIR-5 to verdict.** The only visual review on file is titled **"VA-REPAIR-4 + L3."** It (a) **explicitly parked L0** ("Send order still sits below the embed's frame… disclosed again") and (b) **never claimed** an L1 active-signal, a visible L2 pause, or an L4 panel. So the review did not falsely pass L0/L1/L2/L4 — those lanes were simply **never built**. The gap is between what the founder believed was reviewed and what was actually commissioned.

2. **The self-review harness cannot reproduce the founder's fold (real defect).** Requesting a **1366×768** window in this environment yields an actual page viewport of **~1593×1166** (Retina / window-manager scaling). Every "above the fold / no void" verdict in the Visual Self-Review Law was therefore measured at a viewport **much taller** than a real laptop, so those *spatial* verdicts are **not trustworthy for the founder's screen.** The law verdicts geometry at a viewport it cannot pin to the founder's — that is a genuine machine-accountability defect in the law's enforcement.

3. **The L0 guard checks the wrong document (real blind spot).** The Preview Bay smoke screenshots the **parent** page at `fullPage:true` and asserts only the status chip ("running") and the "sends: off" label. `fullPage` does **not** expand an `<iframe>`'s internal scroll, and the café is a **separate sandboxed origin**, so a Send button clipped by the 420px frame is **invisible to the guard by construction.** The guard passes on a defect it cannot see.

4. **The "no parked defect on the script's critical path" pre-session gate is not enforced.** The launcher only asserts per-app identity. L0 is a parked defect **on step-2's critical path** ("try to Send → see it refused"), so that gate should have blocked the run — but nothing mechanically checks it; it relied on human memory.

Not a stale build (apps serve source directly — no build step) and not a fixture mutation. It is un-built lanes + a viewport/embed-height blind spot.

---

## Recorded consequences (per founder instruction)
- Logged in `FOUNDER_GATE_LEDGER.md` as a **machine-accountability defect** (the self-review verdicted spatial "above-the-fold/no-void" claims at a viewport it could not tie to the founder's; the L0 guard cannot see inside the embed; L4 was believed-reviewed but never built).
- **No fixes applied.** Product frozen. Design control moves to the founder: the next UI work implements a
  **founder-provided mockup pixel-faithfully**; no CTO-initiated design iteration until further notice.
- All honesty / no-leak / Law-54 guards remain in force regardless of design.
