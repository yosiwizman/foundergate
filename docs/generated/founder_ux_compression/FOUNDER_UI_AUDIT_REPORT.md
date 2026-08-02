# Founder UI Audit Report (Phase 1)
Audited the 3 surfaces for a non-developer founder.
- **Decision Room** — honest but a REGISTER (8 gate cards), no recommendation; a non-developer sees data, not advice. FIXED: added a "Recommended next gate" panel.
- **Dashboard** — CONTRADICTORY copy: intro/footer said "Start/Export work via LOCAL_SIMULATION" and described a simulation fallback, but the app actually runs a REAL check via the loopback server (fallback is UNKNOWN when the server is off). FIXED: rewrote the stale copy to plain English + prominent "never ship / not production/secure".
- **Reviewer Console** — too technical (package list + manifests); a founder can't tell what to look at. FIXED: added a plain-English founder-summary layer above the technical detail (kept the detail).
