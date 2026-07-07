# Checker Report — TEMPLATE

> **TEMPLATE — NOT YET RUNNABLE.** This is a fill-in template for the independent Checker's verdict report. It is a document shape, not an automated system. Copy it per task, fill it in, and (when the machine-readable twin is wired) emit a matching JSON report alongside it.

> **Plain English — read this first.**
>
> 1. **What this is.** The standard form the independent Checker fills in to record whether a completed task's **evidence** actually proves it was done correctly and in scope.
> 2. **Why it matters.** The builder never gets to declare its own work proven. This report is how a separate, read-only Checker gives an honest verdict the founder and sheriff can trust — grounded in artifacts, not in the builder's confidence.
> 3. **What can go wrong.** A vague "looks good" that hides missing proof. A verdict that quotes secret material (never allowed). A PASS on work that actually needs the founder. The template's sections exist to force each of those into the open.
> 4. **What you can test now.** A filled-in report should let you answer, from the top: what was proven, what was not, and the single next action. If it doesn't, it isn't done.
> 5. **One next action.** When reviewing a Checker report, read the **Verdict**, the **What is NOT proven** list, and the **Exact next action**. Those three tell you where things stand.

> **Status: TEMPLATE / SKELETON.** Copy this template per task and fill it in. When the machine-readable twin is wired, emit a matching JSON report alongside the filled Markdown.

---

**Task ID:** `{task_id}`
**Checker identity:** `{local_checker | reviewer label}`
**Date:** `{YYYY-MM-DD}`

## Summary

One short paragraph: what the task was, and whether the evidence proves it was completed correctly and in scope.

## Verdict

> Choose exactly one:

- [ ] `PASS`
- [ ] `PASS_WITH_WARNINGS`
- [ ] `FAIL_FIX_REQUIRED`
- [ ] `BLOCKED_NEEDS_FOUNDER`
- [ ] `BLOCKED_NEEDS_STRONGER_REVIEWER`

## What was reviewed

List the exact artifacts read (paths):

- task contract: `...`
- proof profile: `...`
- git diff: `...`
- local CI log: `...`
- local container CI log: `...`
- evidence packet: `...`
- builder report: `...`
- allowed source files: `...`

## What IS proven

Bullet the claims the evidence actually supports.

## What is NOT proven

Bullet the claims the evidence does **not** support (missing/weak/mismatched proof). If empty, write "None."

## Bugs found

Concrete defects, each actionable. If none, write "None."

## Scope violations

Changes outside the allowed/leased scope. If none, write "None."

## Safety issues

Real-world boundary or safety concerns. If none, write "None."

## Forbidden-access risks

Any sign forbidden paths or secret/private data were touched or exposed. If none, write "None." **Never quote secret material here.**

## Required builder fixes

Numbered, exact fixes the builder must make before re-review. If none, write "None."

1. ...
2. ...

## Founder gate required: **YES / NO**

If YES, state the specific gate (real-world action, safety boundary, unresolved disagreement) and why it needs the founder.

## Exact next action

One sentence: the single next step (e.g. "Return to builder to add the missing local container CI log and re-submit," or "Raise founder gate for deploy approval," or "PASS — ready for Sheriff/Advisor to accept").

## Confidence: **low / medium / high**
