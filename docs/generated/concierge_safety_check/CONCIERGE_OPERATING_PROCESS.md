# Concierge Safety Check — Operating Process

**What it is:** a human-operated (concierge) pilot. A prospect gives you ONE public, non-sensitive repository and a small bounded objective. You (the operator) run FounderGate's governed check locally and hand back a plain-English **evidence note**: what changed (exact SHA), what tests ran, an honest ship / do-not-ship / insufficient decision, and the limitations. You operate the tool; the prospect receives the evidence.

**What it is NOT:** not a production audit, not a security or compliance certification, not a deployment, not a merge into anyone's repo, not customer/private/production data handling.

## The 9 stages
1. **Qualify** — confirm the prospect fits (see QUALIFICATION_CHECKLIST). Public repo, non-sensitive, small objective, willing to receive an honest "do-not-ship" or "insufficient."
2. **Intake** — collect the 7 intake answers (repo URL, one-sentence objective, paths to avoid, no-secrets confirmation, decision wanted, time window, who receives the note).
3. **Repo suitability screen** — verify the repo is public and non-sensitive (see PUBLIC_REPO_SCREENING_CHECKLIST). If anything sensitive appears, STOP and decline.
4. **Scope lock** — write the bounded objective + path limits + hard cost cap in one line. No scope creep.
5. **Governed run** — run FounderGate locally in an isolated worktree: focused + full pure test suite, cost cap, path allowlist, evidence capture. (During the concierge phase this may be a no-provider deterministic rehearsal, or a founder-authorized bounded real-provider run — the founder authorizes provider spend explicitly per run; it is never assumed.)
6. **Independent review** — the independent Checker + separate Gate Advisor read the run read-only and produce verdicts.
7. **Evidence note** — assemble the plain-English note (SHA, changed files, tests, verdicts, honest decision, limitations).
8. **Conservative decision** — label INTERNAL_DEMO_ONLY or SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS. Never SHIP. Never certify.
9. **Handback + debrief** — deliver the note, walk the prospect through it, and ask the one honest question: "would a governed evidence note like this be worth paying for eventually, and what would make it a yes?"

## Non-negotiable properties
- Public repos only; no secrets; no private/customer/production data.
- Nothing leaves the machine except the evidence note.
- No deployment; no merge into the client repo; no production changes.
- No security/compliance certification; no production-readiness claim.
- Every spend is capped and founder-authorized per run, or the run is no-provider.
