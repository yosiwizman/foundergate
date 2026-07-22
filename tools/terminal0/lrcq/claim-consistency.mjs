// FounderGate LRCQ — claim-surface consistency verifier (FG-LRCQ-ACT-024). Checks a claim-bearing text
// (PR body, founder summary, ...) against DURABLE run truth. A section is exempt only when it (or its
// nearest preceding heading) is mechanically labeled HISTORICAL; every other ("current") line must not
// contradict the recorded activation/replay/run/provider/witness/terminal facts. Read-only.

// truth: { activation_consumed, replay_blocked, run_active_reached, controlled_hold, provider_spawned,
//          witness_reached, five_hour_passed, activation_spent }
export function checkClaimConsistency(text, truth = {}) {
  const lines = String(text || "").split("\n");
  const problems = [];
  let historical = false; // sticky per-heading
  const isHeading = (l) => /^#{1,6}\s/.test(l) || /^_.*_\s*$/.test(l);
  const marksHistorical = (l) => /HISTORICAL|PRE-FIRST-RUN|superseded|no longer current/i.test(l);

  // Current-status contradictions: [regex over a CURRENT line, condition under which it is a contradiction, label]
  const RULES = [
    [/activation\s+\**NOT\s+consumed/i, () => truth.activation_consumed === true, "current text says 'activation NOT consumed' but the activation was consumed"],
    [/founder\s+signature\s+\**NOT\s+provided/i, () => truth.activation_consumed === true, "current text says 'founder signature NOT provided' but an authorization was provided + consumed"],
    [/(five-hour run|real run)\s+\**NOT\s+performed/i, () => truth.run_active_reached === true, "current text says the run was not performed but a real run reached RUN_ACTIVE"],
    [/real provider\s+\**NOT\s+invoked/i, () => truth.run_active_reached === true, "current text says 'real provider NOT invoked' as if no attempt occurred, but a real run was launched (provider refused pre-spawn)"],
    [/(real claude|provider).{0,40}(was|is)\s+(spawned|exercised|invoked successfully)/i, () => truth.provider_spawned === false, "current text claims real Claude was spawned/exercised but zero provider spawn occurred"],
    [/(run|five-hour).{0,30}(passed|completed successfully|clean (success|completion))/i, () => truth.controlled_hold === true, "current text claims a clean completion but the run was a CONTROLLED_HOLD"],
    [/HEALTHY_CONTINUE\s+was\s+(achieved|reached|returned|reported)|(witness|run)\b[^.]{0,40}\b(achieved|reached)\b[^.]{0,25}HEALTHY_CONTINUE/i, () => truth.witness_reached === false, "current text claims HEALTHY_CONTINUE was achieved but the production witness was not reached"],
    [/same activation.{0,40}(remains available|can be reused|reusable)/i, () => truth.activation_spent === true, "current text says the same activation remains available but it is spent"],
    [/awaiting (a |its )?(first )?(founder )?activation/i, () => truth.activation_consumed === true, "current text says 'awaiting first activation' but an activation was already consumed"],
  ];

  for (const raw of lines) {
    const l = raw.trim();
    if (isHeading(raw)) historical = marksHistorical(raw);
    if (historical || marksHistorical(l)) continue; // exempt: historical section or an inline-labeled line
    for (const [re, cond, label] of RULES) if (re.test(l) && cond()) problems.push({ line: l.slice(0, 120), problem: label });
  }
  return { ok: problems.length === 0, problems };
}
