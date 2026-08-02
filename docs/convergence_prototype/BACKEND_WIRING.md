# Backend Wiring — deck-style UI ↔ real loopback runner

The prototype is served by `src/operator_console/run-server.mjs` (127.0.0.1 only, default
`OP_PORT=4880`). All state on the page comes from real HTTP calls to that server — there is no
mock data path in `app.mjs`.

| UI action | Real backend call | Server behavior |
| --- | --- | --- |
| page load | `GET /api/health` | server-state row shows "reachable (127.0.0.1)" or "UNKNOWN" |
| page load | `GET /api/session` | fetches the per-process `x-fg-token` (loopback + Origin gated) |
| "Run safe demo check" | `POST /api/start` `{target:'self-owned demo target', objective:'…'}` | runs the **allowlisted real runner** (execFile array-args, no shell) against the self-owned demo target; returns real tests result + decision + commit |
| "Export evidence package" | `POST /api/export` | seals a **real** ZIP and verifies it (`unzip -t`); returns `SEALED_EXPORT_LOCAL` + path |

Safety already enforced by the server (unchanged by this prototype):
- 127.0.0.1 bind only; `x-fg-token` header + loopback `Origin` required on POST routes.
- `ALLOWLIST_TARGETS` restricts `/api/start` to the self-owned demo / local fixture targets.
- `action-gate.mjs` `FORBIDDEN_ACTIONS` blocks delete/rm/deploy/push/publish/exec/chmod/network.
- No provider call, no external network, no spend in any path exercised here.

**Display-only areas** are honestly labeled in the sidebar (Preview App / Files / Ask Guide =
`display-only`; Decisions = `view only`). Only the Truth Dashboard is wired live in this prototype.
