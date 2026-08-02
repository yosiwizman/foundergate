# Loopback Server Integration Report
The real src/operator_console/run-server.mjs was started on 127.0.0.1 (loopback only) and driven end-to-end (tests/no-terminal-loop/server-drive.mjs): 8/8 checks.
- GET /api/health -> {status:ok, loopback:true, auth:true}
- GET /api/session (loopback) -> per-process session token
- POST /api/start requires x-fg-token + loopback Origin; runs the REAL allowlisted runner (execFile array-args, no shell)
- POST /api/export seals a REAL ZIP and verifies unzip -t
No external network, no provider, no deploy. Auth + Origin + allowlist all enforced live.
