# FounderGate Parallel-Run Contract

> **Plain English — read this first.**
>
> 1. **What this is.** The standing rule for how a single full autonomous run is scoped, fanned out, and stopped — so one approved run advances the work broadly while stopping **hard** at the small set of decisions that carry real-world authority.
> 2. **Why it matters.** Without a contract, a run either stalls at the first obstacle (wasting the founder's approval) or wanders off scope. This contract keeps every run productive and predictable: it covers as much safe ground as possible per founder interruption, with zero un-witnessed gate crossings.
> 3. **What can go wrong.** A run stops at the first founder gate instead of parking it and continuing safe work. Or it advances only one track and lets the rest rot. Or it turns the founder into a message relay between harmless steps.
> 4. **What you can test now.** Read Section 5 (stop conditions). Those six reasons are the **only** legitimate reasons a run halts. If a run stops for any other reason — a report you "might want to see," a single parked gate, convenience — it is out of contract.
> 5. **One next action.** Remember one line: *run wide, park gates, keep the safe lanes moving, and stop only for one of six enumerated reasons.*

> **Status: OPERATING STANDARD.** This is a design/operating standard, not an automated guarantee. Every "sheriff," "checker bus," or "exact-SHA CI" mechanism named below is the **target behavior a run is operated toward** — enforced today by role discipline and founder gates wherever it is not yet automated. This contract does not weaken the Safety Doctrine or the Operating Doctrine; where it appears to disagree with either, those files win. It builds directly on `OPERATING_DOCTRINE.md`, which it operationalizes into a single run-scoping rule.

---

## 0. The permanent rule (one sentence)

**Every full autonomous run advances the work it was scoped to, running wide on all harmless work, parking founder gates without stalling, and stopping only for the small enumerated set of true stop conditions — never turning the founder into a message relay.**

The founder is the **director and the last-inch witness**, not the operator of each step. The quality of a run is measured by **how much safe ground it covers per founder interruption**, with zero un-witnessed gate crossings.

---

## 1. Dual-advance scope — every run moves both tracks

**Rule.** Unless the founder **explicitly scopes the run otherwise**, every full autonomous run advances **both** of these tracks:

1. **The project under focus** — the product currently in the harness's focus (the customer or flagship project).
2. **The reusable harness itself** — its doctrine, contracts, proof/validator cascade, status inventory, tests, and productization.

**Why both, always.** A run that only ships product features lets the reusable harness rot; a run that only polishes the harness starves the product. The harness earns its keep only when each product lesson is **extracted back** into reusable doctrine/proof/productization. So the default is dual-advance.

**The only exception.** The founder may **explicitly** scope a run to a single track ("this run is project-only" / "this run is harness-productization-only"). Absent that explicit narrowing, a run that touched only one track is **out of contract** and should be reported as such.

---

## 2. Separation of duties — one builder, one checker, one sheriff, one PR

This is the harness's separation-of-duties spine ("read wide, write narrow"). For **each sensitive path** touched in a run:

1. **Exactly ONE builder per sensitive path.** A single writing lane makes the change, inside one allowed scope / file lease / branch / worktree, for one founder-approved task. **No two writer lanes touch the same sensitive path.** Parallel writers are allowed only on **disjoint** paths.
2. **Exactly ONE independent read-only checker.** A separate lane verifies the **evidence**, not the builder's claims, and writes only a verdict. The builder never self-certifies.
3. **One sole merge sheriff.** One authority is the *only* place a lane's branch is integrated. Shadow and parallel lanes never merge themselves.
4. **One PR merged at a time.** Integration is serialized: parallel lanes may *produce* work concurrently, but they are *landed* one after another through the single sheriff, never fanned directly into the shared branch.
5. **Merge commits, not squash.** Land each lane as a **merge commit**. (This also sidesteps a reviewer-gate false-positive where a single-parent squashed HEAD yields an empty review diff.)
6. **Exact-SHA CI green after every sensitive merge and at closeout.** "Green" means observed green on the **exact merged HEAD SHA** — not "a recent green," not the branch name, not a superseded commit — and green again on the final closeout SHA.

**Honest note.** Wherever the merge sheriff, the checker bus, or remote CI are not yet automated, items 2–6 are enforced **by the human Founder/Sheriff role and by role discipline**, and the founder is currently the serializer. Do not report these steps as "automated" when they are not.

---

## 3. Run wide on the harmless track

**Rule.** Between founder gates, a run goes **wide** on everything harmless and cheaply reversible. The safe surfaces a run should keep advancing are:

- **Docs** — doctrine, contracts, README/front-matter reconciliation, plain-language founder cards.
- **Proof** — the validator/proof cascade, new phase validators, net-zero and before/after evidence capture.
- **Status** — the current-state inventory, per-project dashboards, run reports.
- **Test** — fast-CI smoke, static loaders, schema checks, role-guard self-checks.
- **Productization** — closing concrete gaps (unify registration paths, make disable/rollback path-agnostic, parameterize any hard-coded roots, etc.).

Reading, mapping, drafting, building inside the sandbox, local proofs, evidence capture, previews, dry-runs, and report writing **do not** require a gate. If a step is cheaply reversible and takes no real-world action, running wide through it is **required**, not merely permitted.

**No prompt-relay between harmless waves.** Pausing to ask the founder to read a report, paste it forward, then ask the next harmless question is a contract violation even though each message looks polite — it converts the founder into a message bus and defeats the accessibility promise. The founder channel is reserved for **decisions and witnessing**, not transport.

---

## 4. Park the gate, keep the safe lanes moving

**Rule.** When a lane reaches a **true founder gate** (Section 5), the run does **not** stall the whole world. It:

1. **Parks the gate** — records the exact gate, the exact copy-paste step the founder will run, and the evidence already captured, and
2. **Continues every unrelated safe lane** — the run keeps advancing all harmless work on **disjoint** paths (docs / proof / status / test / productization) that does not depend on the parked gate's outcome, on both tracks per Section 1.

A single parked gate is **never** an excuse to stop the run. The run only surfaces to the founder to **witness the parked gate** or when a Section-5 stop condition is truly hit. Gate crossings are delivered as **one copy-paste step at a time**, with zero typing required; the agent is **structurally barred** from self-crossing a gate and must capture the exact refusal and stop, handing the founder the step.

---

## 5. Stop conditions — the only reasons a run halts

A run runs wide and parks gates until it hits one of these **enumerated** stop conditions. Nothing else halts a run.

1. **A true founder gate is the only remaining work** — every safe lane is parked or done and the run cannot advance without a founder decision. The gate categories are: live authority / write to a real external system; secrets and credential material (never even read by any lane); privacy / personal data; device or physical-hardware actions; outbound sends and any provider/account mutation; firing/dispatching a queued action; destructive / non-reversible operations; public / legal / payment / billing exposure; and persistent-memory migration.
2. **A safety incident** — a lane hit, or is about to hit, a real-world action it must not self-cross, or a guard/gate fired. Default posture when uncertain: **stop and raise a gate**.
3. **An exact-SHA blocker** — the run cannot proceed on the precise commit it must build on (a required base SHA is missing, diverged, or a review/verdict is bound to a stale SHA). "It passed earlier" and "it usually passes" are not green.
4. **PR / CI congestion beyond cap** — the serialized integration queue or the CI/verdict backlog has grown past the run's agreed concurrency cap; the run stops opening new lanes until the sheriff drains the queue one merge at a time.
5. **A dirty or stale repo** — the working tree carries un-reconciled tracked modifications, or HEAD has diverged from the base the run assumed. (Untracked build artifacts are benign and must never be committed; the **tracked** tree is what must be clean.)
6. **Exhausted safe backlog** — there is genuinely no remaining harmless work on either track, and everything left is a founder gate. This is the healthy terminal state of a good run.

If none of 1–6 holds, the run **keeps going**. Stopping for any other reason — convenience, a harmless report the founder "might want to see," or a single parked gate — is out of contract.

---

## 6. Honest posture — prove it, then witness it; never overclaim

1. **Evidence before the founder.** By the time the founder witnesses a crossing, the machine has already produced before/after fingerprints and, for reversible ceremonies, a **net-zero** proof (the after-fingerprint returns to the before). A half-completed round-trip is **never** reported green. The founder's hands are the last resort, not the first.
2. **Preview is not live; ready is not done.** A previewed, drafted, or dry-run action is not a completed real-world action, and "ready to proceed to a gate" is not "crossed the gate." Reporting readiness as completion is an overclaim.
3. **The agent cannot self-cross a gate.** The writing lane is structurally barred from performing a stop-condition crossing; it captures the exact refusal and **stops**, handing the founder a copy-paste step, and never routes around the bar.
4. **Verdict from evidence, not confidence.** Completion language is earned by artifacts and an **independent** verdict, never by the writing lane's own assurance.
5. **Report only what was proven, at the altitude it was proven.** A run's handback distinguishes previewed/dry-run work from live-witnessed work, names which track(s) advanced (Section 1), and honestly labels harness enforcement as **human-gated / manual today** wherever it is.

---

## 7. Applying this contract to any run

1. Confirm the run advances **both** tracks (Section 1) or that the founder **explicitly** scoped it narrower.
2. After **go**, run **wide** on docs / proof / status / test / productization to the next true gate — no prompt-relay (Sections 1, 3).
3. Structure each sensitive change as **one builder + one checker + one sheriff + one PR at a time**, merge-commit, exact-SHA CI green — enforced by the human Sheriff role until automated (Section 2).
4. When a gate appears, **park it and keep the disjoint safe lanes moving** (Section 4); deliver the crossing as one copy-paste step at a time.
5. **Stop only** for one of the six enumerated conditions (Section 5).
6. Report **only what was proven**, name which tracks advanced, and never let the writing lane self-cross or overclaim (Section 6).

---

*Contract document. It states a target operating standard; it does not claim the harness automates the merge sheriff, the verification bus, or exact-SHA remote CI where those remain human-gated and manual today.*
