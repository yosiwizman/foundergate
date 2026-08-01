# Step-by-Step Operator Runbook (concierge phase)

> Audience: whoever operates the run (currently the founder-with-assistant, or the assistant gate-to-gate). Assumes a public, non-sensitive repo already qualified.

1. **Create isolated workspace.** New git worktree/branch off the target repo copy. Never work in the prospect's live repo; never push to it.
2. **Write the scope line.** `objective + allowed paths + cost cap (USD) + provider on/off`. Save to the run root.
3. **Preflight.** Confirm: repo is public, no secrets present (secret scan), tools available, disk ok. If secret scan hits anything real → STOP, decline, tell the prospect.
4. **Run the governed check.**
   - No-provider rehearsal: run the deterministic evidence-note generator + full pure suite.
   - OR founder-authorized bounded real-provider run: `claude -p` under `--max-turns N`, hard cost cap, path allowlist, `--disallowedTools Bash WebFetch WebSearch`. Founder must authorize the exact cap per run. Stop at the cap or first provider failure.
5. **Capture evidence.** Exact SHA, changed files (git diff --stat), test results (pass/fail counts), duration from disk logs, cost (if any).
6. **Run independent review.** Checker (read-only) then Gate Advisor (read-only, separate). Record both verdicts.
7. **Classify honestly.** Missing signal → UNKNOWN. Stale → STALE. Never fabricate PASS/SHIP.
8. **Assemble the evidence note** (see SAMPLE_EVIDENCE_NOTE for the exact shape).
9. **Seal + checksum** the run package (SHA256SUMS, unzip -t).
10. **Handback.** Deliver only the evidence note (+ optional sealed package). Nothing else leaves the machine.
11. **Debrief + log** in CALL_NOTES_TEMPLATE and FOLLOW_UP_TRACKER.

**If any stop rule trips (see STOP_RULES): stop, package what exists honestly, and tell the prospect the truth.**
