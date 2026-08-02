# Lane C — Preview Panel (local wiring)

Preview is a **local, safe run preview for the synthetic / self-owned demo only** — NOT a live
customer app.

- Shares the Truth Dashboard's **real** local run state (no separate/fake state).
- Shows: local demo objective, current run status, last result.
- Persistent labels: `PREVIEW — LOCAL DEMO ONLY / NO SENDS / NO PAYMENTS / NO DEPLOY`, plus
  `NO REAL CUSTOMER DATA` and `SYNTHETIC / SELF-OWNED ONLY`.
- Does not preview a customer application, does not send anything, uses no external network, does
  not bill or deploy.

Verified by Lane K: after a real run, Preview's "Last result" reflects `30/30` + `never SHIP`.
