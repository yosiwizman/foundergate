# Founder Safety Check — One-Click Local Launcher (Phase 7.1, Lane E)

The founder double-clicks **FounderGate Safety Check** — no Terminal, no Node command, no localhost URL, no PID handling.

## Build (operator, once)
`bash tools/macos/build-founder-safety-check-launcher.sh` → produces `~/Desktop/FounderGate Safety Check.app` (unsigned local prototype via macOS `osacompile`; **not committed**; `.gitignore`d). The build **discovers and verifies a Node ≥20 absolute path and embeds it** into the app so it works from Finder.

## Node discovery (Finder-safe) — corrects FOUNDER-CAUGHT-BUG: MAC-LAUNCHER-CANNOT-LOCATE-EXISTING-NODE-FROM-FINDER
Finder-launched apps do **not** inherit the interactive shell PATH or a version manager's init (nvm/fnm/asdf). The launcher therefore resolves Node deterministically via `tools/macos/resolve-node.sh`: (1) embedded verified path → (2) `/opt/homebrew/bin/node` → (3) `/usr/local/bin/node` → (4) `~/.volta/bin/node` → (5) highest valid nvm/fnm/asdf install → (6) bounded non-interactive login-shell lookup. Every candidate must exist, be executable, and be **Node ≥20**. It never uses a project-local `./node`, never prepends the repo to PATH, never sources arbitrary project files, needs no admin, and installs nothing. If no valid Node is found the app shows only: *"FounderGate could not start its local engine. No project or evidence was changed. Close this message and report the problem."* — it never tells the founder to install software and never exposes commands/ports/URLs.

## Behavior (proven — see docs/testing/evidence/launcher/FINDER_LAUNCH_EVIDENCE.md)
1. Starts the loopback service (`src/safety_check/service.mjs`) from the Phase-7.1 worktree without opening Terminal. 2. Waits for `/api/health`. 3. Opens the browser to `http://127.0.0.1:4700/`. 4. Shows the honest no-install failure dialog if launch fails. 5. Avoids a duplicate server (reuses a live one). 6. Records the PID under `~/Library/Logs/FounderGate/`. 7. Loopback only — never LAN-exposed. 8. No admin, no daemon, no M1 contact. 9. Opening the app starts **no** sandbox VM (a VM only starts on a Safety Check run).

## Stop path
Quit the app or run the safe stop: `sh tools/macos/launch-foundergate-safety-check.sh --stop`. Evidence under `var/foundergate/safety-check/runs/` and sealed runs under `docs/assembly-evidence/SAFETY_CHECK/` are preserved.

## Anti-repeat test
`sh tools/macos/launcher.test.sh` runs the launcher under a clean Finder-like PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) and proves Node is found without the terminal PATH (12 cases). Wired into exact-SHA CI.

## Founder instruction (verbatim)
> Double-click **"FounderGate Safety Check."**  (No terminal command.)
