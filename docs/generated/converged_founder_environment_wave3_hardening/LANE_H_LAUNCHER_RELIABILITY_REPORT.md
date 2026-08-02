# Lane H — Launcher Reliability / No-Terminal Start

`~/Desktop/FounderGate_Start_Here/Open_FounderGate_Converged_Demo.command`:
- reuses an already-running local server, or starts one if needed;
- waits (up to ~10s) for `/api/health` to be ok before opening the browser;
- opens the converged demo automatically; requires **no** terminal interaction;
- prints no command-line instructions to the founder;
- `README_FIRST.txt` explains, in plain English, the one-time macOS Gatekeeper "Open" step and that
  nothing connects to the internet or any account.

If the folder is missing it says so in plain English and points to ChatGPT (honest HOLD), rather
than failing silently.
