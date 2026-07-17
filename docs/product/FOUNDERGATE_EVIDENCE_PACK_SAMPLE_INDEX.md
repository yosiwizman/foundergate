# FounderGate Evidence Pack — Sample Index (Phase 7.1, Lane B)

A generated packet for the fixed fixture contains, under `EVIDENCE_PACK/`:
- `evidence-pack.json` — canonical packet (authority).
- `evidence-pack.md` — plain-English render.
- `evidence-pack.html` — styled render.
- `evidence-pack.pdf` — PDF from HTML (Chrome headless), or `evidence-pack.pdf.UNKNOWN.txt` if the renderer is unavailable (honest).
- `evidence-pack.sha256` — SHA-256 manifest of the packet files.
- `evidence-pack.zip` — all of the above bundled.
Run-scoped source (per run) under `var/foundergate/safety-check/runs/<run_id>/`: RUN_REQUEST, RUN_LEDGER.jsonl, RUN_RESULT, RUN_LIMITATIONS, RUN_ACQUISITION, RUN_VERIFIER. The sealed witness copy lives under `docs/assembly-evidence/SAFETY_CHECK/<run_id>/`.
