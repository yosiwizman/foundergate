# Founder Safety Check — One-Click Local Launcher (Phase 7.1, Lane E)

The founder double-clicks **FounderGate Safety Check** — no Terminal, no Node command, no localhost URL, no PID handling.

## Build (operator, once)
`bash tools/macos/build-founder-safety-check-launcher.sh` → produces `~/Desktop/FounderGate Safety Check.app` (unsigned local prototype via macOS `osacompile`; **not committed**; `.gitignore`d).

## Behavior (proven)
1. Starts the loopback service (`src/safety_check/service.mjs`) from the Phase-7.1 worktree without opening Terminal. 2. Waits for `/api/health`. 3. Opens the browser to `http://127.0.0.1:4700/`. 4. Shows a failure dialog if launch fails. 5. Avoids a duplicate server (reuses a live one). 6. Records the PID at `/tmp/foundergate-safety-check.pid`. 7. Loopback only — never LAN-exposed. 8. No admin, no daemon, no M1 contact.

## Stop path
Quit the app or run the safe stop (`kill $(cat /tmp/foundergate-safety-check.pid)`); evidence under `var/foundergate/safety-check/runs/` and sealed runs under `docs/assembly-evidence/SAFETY_CHECK/` are preserved.

## Founder instruction (verbatim)
> Double-click **"FounderGate Safety Check."**  (No terminal command.)
