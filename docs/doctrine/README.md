# FounderGate Doctrine

> **Plain English — read this first.**
>
> 1. **What this is.** The doctrine layer of FounderGate: the shipped product docs that state how the harness operates, where it stops for a human, and how work is proven and handed off.
> 2. **Why it matters.** Doctrine is the contract between a non-developer founder and an autonomous harness. It's what lets the harness run wide without the founder having to watch every step, and what guarantees it stops at the lines that genuinely need a human owner.
> 3. **What can go wrong.** If these docs drift into developer jargon, overclaim shipped capabilities, or blur the human gates, the product promise breaks. Every doc here leads with plain English and is honest about what is doctrine (a target) versus what is automated today.
> 4. **What you can test now.** Open any doc below and read only its top lines. If you know what it is and what to do after a few sentences, doctrine is being kept.
> 5. **One next action.** Start with `OPERATING_DOCTRINE.md` — its one-sentence rule in Section 0 is the whole system in a line.

---

## What doctrine is

Doctrine is the written operating standard for the harness: the rules a harness-run project follows to run **wide and autonomously** on harmless work while stopping **hard** at the handful of decisions that carry real-world authority. Some rules describe a **target** the harness is operated toward (enforced today by role discipline and founder gates); each doc is honest about which parts are automated and which are not. Two docs here are explicitly marked **TEMPLATES** — a judgment layer that is designed but not yet runnable.

## The one-way import rule

This repository owns **shipped product doctrine**. The source harness repo owns the **source material and evidence** these docs were adapted from. The flow is one-way: source material and run evidence live in the source harness; the adapted, genericized, founder-readable product docs live here. These docs are **adaptations, not verbatim copies** — customer-specific names, absolute paths, and progress/status banners have been scrubbed, and the reusable rules kept. Do not backport product edits into the source harness, and do not treat this repo as the store of raw evidence.

## The docs

| Doc | What it is |
|---|---|
| [`OPERATING_DOCTRINE.md`](./OPERATING_DOCTRINE.md) | The core operating rules: run wide, stop only at true founder gates, one builder/checker/sheriff/PR at a time, evidence before the founder, no overclaim. |
| [`PARALLEL_RUN_CONTRACT.md`](./PARALLEL_RUN_CONTRACT.md) | How a single autonomous run is scoped, fanned out, and stopped — dual-track advance, park gates, and the six enumerated stop conditions. |
| [`SAFETY_DOCTRINE.md`](./SAFETY_DOCTRINE.md) | The safety floor: read wide/write narrow, the human-gate list, proof rules, and what the harness must never read. Wins over every other doctrine doc. |
| [`FOUNDER_GATES.md`](./FOUNDER_GATES.md) | Gate handling: park most gates and keep safe work moving; stop immediately for a ready merge or real/private data; the three return conditions. |
| [`OPERATOR_HANDOFF.md`](./OPERATOR_HANDOFF.md) | The founder's day-to-day operating flow: Advisor-first proposals, approved-prompt handoff with minimal typing, and where handoff artifacts live. |
| [`JUDGMENT_PANELS.md`](./JUDGMENT_PANELS.md) | **TEMPLATE** — spec for an evidence bus and founder-facing judgment panels (complexity, false-green risk, security, tech-debt). Not yet built. |
| [`CHECKER_REPORT_TEMPLATE.md`](./CHECKER_REPORT_TEMPLATE.md) | **TEMPLATE** — the fill-in form the independent Checker uses to record an evidence-grounded verdict on a completed task. |
