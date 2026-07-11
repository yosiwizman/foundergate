# AKIOR project advisor — soak / honest-duration guidance (verbatim)

> **Provenance:** founder-supplied, from the **AKIOR project advisor**, 2026-07-11. Committed verbatim by the
> FounderGate CTO as the AUTHORITY for the HONEST-DURATION & SOAK-PROOF LAW (Assembly Manual §29), per the
> Written-Authority Law (§28). Read-only evidence — reproduced exactly as supplied.

---

Expect days, not hours.
A credible timing range for that combined prompt is:
* Best case: 36–48 hours — only if most local features already work, few defects appear, parallel lanes run cleanly, and both the 8–9-hour and 24-hour soaks run without interruption.
* Realistic: 4–7 days — enough time for full browser workflows, screenshots, visual reviews, fixes, CI/merges, fault injection, concurrency testing, and both soak runs.
* Defect-heavy: 1–2 weeks — likely if Notes, Reminders, Contacts, or Calendar are missing safe local CRUD/undo paths, or stress testing exposes deeper harness problems.
The absolute minimum is already roughly 33 hours because the plan includes an 8–9-hour soak followed by a 24-hour soak. That excludes implementation, debugging, screenshots, reviewers, CI queues, and merge work.
Do not trust a "complete" return in 6–12 hours. That could be a progress checkpoint, but it cannot honestly include the full soak program. A proper early response should say what is still running, not claim the final gate.
What you should expect operationally:
1. During the first 6–12 hours, the CTO may inventory features, clean evidence, run initial workflows, identify missing local functionality, and launch parallel lanes.
2. During day 1–3, it should build/fix local workflows, run headed-browser evidence, execute checkers, and perform controlled failure testing.
3. During day 2–5, it should complete concurrency and recovery testing plus the 8–9-hour soak.
4. The final 24-hour soak then creates a hard additional day before the complete gate package can honestly return.
My planning estimate would be five days, with a reasonable tolerance of three to ten days.
One important limitation: autonomous does not guarantee uninterrupted execution. Tool rate limits, CI delays, browser failures, context/session termination, or a real safety gate can pause the run. The CTO should recover automatically where allowed and involve you only for a genuine irreversible or privacy-sensitive gate.
If it returns early, inspect the report for these two lines:
* FOUNDERGATE HARNESS 8-HOUR SOAK PASS
* FOUNDERGATE HARNESS 24-HOUR SOAK PASS
They must include actual start/end timestamps, exact SHA, monitoring evidence, failures, and interventions. Without that, the full prompt was not completed.
