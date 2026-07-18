# PAES-1 Uninstall / Emergency Stop

- Emergency stop: `tools/terminal0/paes/uninstall-launch-agent` (launchctl bootout + remove plist).
- Or set PANIC: write `{"panic_stop":true}` to `.foundergate/supervisor/stop.json` — the continuation law stops on next cycle.
- The agent is user-level; no root. If never loaded, nothing to stop.
