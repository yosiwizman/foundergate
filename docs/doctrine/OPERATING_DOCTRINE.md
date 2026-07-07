# FounderGate Operating Doctrine

> **Plain English — read this first.**
>
> 1. **What this is.** The core operating rules for FounderGate: how the harness runs **wide and autonomously** on harmless work, while stopping **hard** at the small set of decisions that genuinely need a human owner.
> 2. **Why it matters.** The whole product promise is that a non-developer founder can run senior-quality development without being dragged into every step. This doctrine is how that promise is kept: the founder is interrupted rarely, and never for something trivial — but also never bypassed on something real.
> 3. **What can go wrong.** Two failure modes. The harness becomes a nag that pings the founder between every harmless step (defeating the point), or it quietly crosses a real-world line — a send, a payment, a deploy — without the founder witnessing it (a safety failure).
> 4. **What you can test now.** Read Section 3 (the founder-gate list). If the harness ever interrupts you for something **not** on that list, it is out of doctrine. If it ever crosses something **on** that list without asking you, that is a serious violation.
> 5. **One next action.** Skim the eight rules below once. You only need to remember the one-sentence doctrine in Section 0 — the rest is how it is enforced.

> **Status: DOCTRINE / OPERATING STANDARD.** This is a written operating standard, not a claim that every mechanism below is fully automated today. Where a rule describes an automated mechanism (a merge sheriff, a checker bus, exact-SHA remote CI), read it as the **target behavior the harness is operated toward** — enforced today by role discipline and founder gates. This document does not weaken the Safety Doctrine; where they appear to disagree, the Safety Doctrine wins.

---

## 0. The one-sentence doctrine

**Run wide and autonomously on everything harmless; stop the world for the small, enumerated set of decisions that carry real-world authority; and never let the founder become a message relay between two harmless steps.**

The founder is the **director and the last-inch witness**, not the operator of each step. The value of the harness is measured in **how few times the founder is interrupted** — without ever crossing a real gate unwitnessed.

---

## 1. Run wide until the next true founder gate

**Rule.** Once a task is founder-approved, the writing lane runs the task **to completion** — including every harmless intermediate step — without returning to the founder between steps. The founder is re-engaged only when the work reaches the **next true gate** (Section 3), or the task is finished and ready for independent verification.

**What is forbidden.** *Prompt-relay between harmless waves* — pausing to ask the founder to read a report, paste it forward, then ask the next harmless question — is a doctrine violation even though each individual message looks polite. It converts the founder into a message bus and defeats the accessibility goal. The founder should mostly only need to say **go**, **review**, or handle a **real gate**.

**How to apply it.** After **go**, the lane keeps going through reads, builds, local proofs, evidence capture, and report drafting. It surfaces to the founder only at a Section-3 gate or at "ready for the Checker."

---

## 2. One builder, one checker, one sheriff, one PR at a time

This is the **separation-of-duties spine**. For each sensitive change:

1. **Exactly ONE builder.** A single writing lane (the builder/CTO role) makes the change, inside one allowed scope / file lease / branch / worktree, for one approved task. No two writers touch the same surface.
2. **Exactly ONE independent read-only checker.** A separate lane (the Checker role) verifies the **evidence**, not the builder's claims, and writes only a verdict report. The builder never self-certifies.
3. **A single merge sheriff.** One authority is the *only* place a lane's branch is integrated. Shadow or parallel lanes never merge themselves. One lane is landed at a time.
4. **One PR at a time.** Integration is serialized. Parallel writer lanes may *produce* work concurrently, but they are *landed* one after another through the single sheriff, never fanned directly into the shared branch.
5. **Merge commits, not squash.** Land each lane as a **merge commit**. (This also sidesteps a known reviewer-gate false-positive where a single-parent squashed HEAD yields an empty review diff.)
6. **Exact-SHA CI green after every runtime merge, and again at closeout.** After each sensitive-runtime merge, CI must be green **on the exact merged HEAD SHA** — not on "a recent green," not on the branch name, and not on a superseded commit — and green again on the final closeout SHA.

**Honest note.** Where the merge sheriff, the verification bus, or exact-SHA remote CI are not yet automated, items 3–6 are enforced **by the human Founder/Sheriff role and by role discipline**. The doctrine is the target; the founder is currently the serializer. Do not report these steps as "automated" when they are not.

---

## 3. The founder-gate list — what actually stops the world

**Rule.** The founder is interrupted **only** for a decision that carries real-world authority. Everything else runs autonomously under Sections 1 and 2. A gate is required for, and reserved to, these categories:

- **Live authority / write to a real system** — any change that leaves the sandbox and mutates real, external state.
- **Secrets and tokens** — reading, writing, or handling credentials, API keys, or any secret material. (These are additionally *never read at all* by any lane — see the Safety Doctrine.)
- **Privacy** — touching private messages, personal data, or anyone's identifiable information.
- **Device and physical hardware** — any smart-home or on-device action, including a phone or tablet handset.
- **Sends and providers** — outbound messages of any kind and any mutation of a provider or external account.
- **Fire / dispatch** — actually *triggering* a queued action, as distinct from preparing or previewing it.
- **Destructive operations** — delete, cleanup, teardown, or anything not cheaply reversible.
- **Public / legal / payment** — anything publicly visible, legally binding, or involving money or billing.
- **Memory migration** — moving, rewriting, or restructuring persistent memory or long-lived state stores.

**Everything else runs autonomously.** Reading, mapping, drafting, building inside the sandbox, local proofs, evidence capture, previews, dry-runs, and report writing do **not** require a gate. If a step is cheaply reversible and takes no real-world action, it is not a gate — running wide through it is *required*, not merely allowed.

---

## 4. The merge gate — a SHA-bound review, not a PR-number wave-through

**Rule.** A sensitive change is not integrable until it clears a **review gate bound to a specific commit SHA**, with every finding addressed. Concretely:

1. **The gate consumes a SHA, not a PR number.** Review approval is recorded against the exact commit under review. A later commit invalidates the prior approval; a green review on an earlier SHA does not authorize a newer HEAD. This avoids a stale-approval class of bug where a PR stays "approved" while its HEAD moves.
2. **All findings replied — fix-or-justify.** Every review finding is either **fixed** or **explicitly justified** in a reply on record. No finding is left silently unaddressed.
3. **Reply-justify-at-gate for non-defect nits past two fix rounds.** Genuine defects are fixed. But **non-defect nits** (style preferences, opinions, "could also") do **not** get to spin the lane forever: after **two** fix rounds, a remaining non-defect nit is answered by a **justification reply at the gate**, not another edit cycle. This bounds review thrash while keeping every point answered.
4. **Docs-exempt.** A **docs-only** change is exempt from the deep runtime review gate — there is no runtime behavior to verify — but it still passes the applicable static and safety checks.

**Honest note.** Where an external code-review service is unavailable, the equivalent gate is the independent **Checker verdict**: a Checker report is required before any PR or merge candidate. Read "SHA-bound review" as "SHA-bound Checker verdict," and "docs-exempt" as "docs-only changes still need the static safety pass but not the deep evidence verdict."

---

## 5. Evidence before the founder — prove it, then witness it

**Rule.** By the time the founder is asked to witness a gate crossing, the machine has **already** produced the evidence that makes the crossing safe. The founder's hands are the **last resort, not the first**. Required evidence discipline:

1. **Before/after fingerprints.** Capture a fingerprint (checksum, count, snapshot) of the relevant state **before** and **after** the change, so the delta is provable and not merely asserted.
2. **Net-zero proofs for reversible ceremonies.** When a step is meant to leave the world unchanged (a dry-run, a create-then-undo, a self-only test), prove **net-zero**: the after-fingerprint returns to the before-fingerprint. A half-completed round-trip is **never** reported green.
3. **Honest flake handling.** A red CI result is investigated, not reflexively re-run. **Verify a clean local pass first**; only then consider a rerun, and never mid-flight (a branch re-push during an in-flight run commonly self-cancels the prior run — that is not a real failure). **Never claim green until the exact HEAD SHA is observed green.** "It passed earlier" and "it usually passes" are not green.
4. **No artifact = no completion.** A task is not done without its required evidence artifacts on disk.

---

## 6. Post-surgery low-hand / zero-tech-helper operating mode

**Rule.** The harness is built for a **non-developer founder with limited hand mobility and no technical helper on call**. Every gate crossing must be operable in that mode:

1. **Founder = director + last-inch witness.** The founder decides *whether* to cross a gate and *watches* the crossing; the founder does not perform the preparatory engineering.
2. **Copy-paste steps, one at a time.** When the founder must run something at a real gate, hand them a **single** copy-paste-ready step, one at a time, with zero typing required. Never hand a multi-step script that assumes fluent hands, and never make the next step depend on the founder re-typing output.
3. **Never make the founder a prompt bus.** Do not ask the founder to ferry text between lanes. If two lanes need to exchange information, the harness routes it; the founder's channel is reserved for **decisions and witnessing**, not transport. (This is the operational teeth behind Section 1.)

---

## 7. Honest posture — no overclaim, and the agent cannot self-cross a gate

**Rule.** The harness reports **only what was actually proven**, at the exact altitude it was proven, and the writing lane is **structurally barred** from crossing a live/gate action on its own.

1. **Preview is not live.** A previewed, drafted, or dry-run action is **not** a completed real-world action. "Prepared" ≠ "performed."
2. **"Ready to proceed to a gate" is not "crossed the gate."** Reaching the point where a founder *could* approve a crossing is a real milestone — but it must be reported as *ready*, never as *done*. Reporting readiness as completion is an overclaim.
3. **The agent is structurally barred from self-driving a live/gate action.** The writing lane does not — and by design cannot — perform a Section-3 crossing itself. When an agent attempts a barred crossing it should capture the exact refusal and **stop**, handing the founder the copy-paste step; it must not route around the bar.
4. **Verdict from evidence, not from confidence.** Completion language is earned by artifacts and an independent verdict (Sections 4–5), never by the writing lane's own assurance.

---

## Applying this doctrine to a newly onboarded project

For **any** project the harness registers, operate it by this checklist:

1. Register the project; keep write authority off until the founder explicitly turns it on.
2. After **go**, run **wide** to the next true gate (Section 1) — no prompt-relay.
3. Structure each sensitive change as **one builder + one checker + one sheriff + one PR at a time**, merge-commit, exact-SHA CI green (Section 2) — enforced by the human Sheriff role until automated.
4. Interrupt the founder **only** for a Section-3 gate.
5. Gate integration on a **SHA-bound** review/verdict with all findings fix-or-justified; docs-only is review-exempt but still static-checked (Section 4).
6. Bring **evidence before the founder** — before/after fingerprints, net-zero proofs, honest flake handling, no-artifact-no-completion (Section 5).
7. Deliver gate crossings as **one copy-paste step at a time**; never a prompt bus (Section 6).
8. Report **only what was proven**; never let the writing lane self-cross a live action (Section 7).

---

*Doctrine document. It states a target operating standard; it does not claim the harness automates the merge sheriff, the verification bus, or exact-SHA remote CI where those remain human-gated and manual today.*
