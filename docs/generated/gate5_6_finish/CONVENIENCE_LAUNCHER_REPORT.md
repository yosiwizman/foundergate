# Convenience Launcher Report
Launcher: tools/launcher/foundergate-local-dashboard.command (double-clickable on macOS). It:
- starts the loopback run-server on 127.0.0.1 if not already up (health-polled),
- opens the canonical founder dashboard in the default browser.
- NO provider, NO deploy, NO billing, NO external network egress. Local synthetic demo only.
Syntax-validated (bash -n). A pre-existing launcher (demo/founder_operator_dashboard/launch-foundergate.command) is retained; the tools/launcher/ copy is the maintained one going forward.
## Honest macOS limitation
macOS Gatekeeper may prompt on first double-click of a .command downloaded/copied from elsewhere (right-click → Open, or clear quarantine). True zero-interaction one-click is not guaranteed by the OS; this is the safest local launcher, not a signed/notarized app. No workaround that weakens Gatekeeper is used.
