# UI Location Report (Lane A)
- Canonical founder/operator dashboard (accepted, reused — NOT new): demo/founder_operator_dashboard/index.html
- How it starts: served by the local loopback run-server (src/operator_console/run-server.mjs) on http://127.0.0.1:4880; the dashboard's app.mjs calls /api/session, /api/start, /api/export.
- Needs a server: YES (loopback only, 127.0.0.1). The launcher starts it automatically.
- Launcher already exists: tools/launcher/foundergate-local-dashboard.command (this run also places a Desktop copy in FounderGate_Start_Here).
- Can Yossi open it with NO terminal: YES — double-click the Desktop launcher; it starts the server and opens the dashboard in his browser.
