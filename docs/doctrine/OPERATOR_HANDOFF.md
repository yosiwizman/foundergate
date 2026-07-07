# Operator Handoff — Advisor-First Flow, Approved-Prompt Handoff, and Handoff Conventions

> **Plain English — read this first.**
>
> 1. **What this is.** How the founder actually operates the harness day to day: the founder talks to one screen (the Advisor), the Advisor proposes work, the founder approves it, and only then does a writer start — with the least possible typing and copy/paste.
> 2. **Why it matters.** The founder is post-surgery with both hands affected, so accessibility is a P0 requirement. Today the founder is often the manual transport layer, copying prompts between tools by hand. This flow is designed to cut that typing and copy/paste while keeping the founder firmly as the approval gate.
> 3. **What can go wrong.** A writer gets launched without the founder's approval. A prompt meant for one project gets applied to another. A prompt gets auto-submitted or a keystroke gets injected without the founder pressing Enter. Harness bookkeeping pollutes the target project's git history. Each is a boundary this doc forbids.
> 4. **What you can test now.** The safe pattern is: **Advisor proposes → Founder approves → (later) launch broker opens the writer.** If a writer ever starts without your approval, the flow is broken. Check that every task file names both a project and a target repo path — one without both is invalid.
> 5. **One next action.** Remember: the harness may prepare, copy, and open a prompt for you, but **you** press Enter. It never pastes and never submits on your behalf.

> **Status: OPERATOR DOC / BLUEPRINT.** This defines the design, rules, and hand-off shapes for the operator flow. Some pieces (notably the desktop launch broker) are future/not-yet-built and are marked as such. The founder remains the final gate throughout.

This document synthesizes three operator conventions: the **Advisor-first operator layer**, the **approved-prompt handoff flow**, and the **project handoff conventions**.

---

## Part 1 — The Advisor-first operator layer

### Why this layer exists

The founder should not be the manual transport layer between Advisor, Builder, Checker, and any second-opinion tool. The Advisor-first layer makes the **Advisor** the single screen the founder talks to first. The Advisor reviews the project, checks harness health, asks low-typing questions, and produces **prompt packs** and **launch requests** to disk — but it never silently launches a writer.

### The safe pattern (non-negotiable)

```
Advisor proposes  →  Founder approves  →  launch broker opens Builder + Checker (future, not yet built)
```

- The Advisor **proposes**. It writes prompt packs and launch requests to disk.
- The **Founder approves**. Founder review (optionally with a second-opinion tool) is required before any builder work begins.
- The **launch broker** (future, not built) is the only component that may open a project-bound Builder + Checker, and only for a launch request the founder has explicitly approved.

The Advisor must **never silently control the builder** and must **never silently launch a writer**. There is no background launch automation in this design.

### Founder starts with the Advisor

1. The founder opens **one** screen: the Advisor.
2. The Advisor confirms which **project** and **target repo path** are selected. The harness is never assumed to be the target project.
3. The Advisor reviews the selected project (read-only, non-secret paths only).

### Advisor checks harness health before blaming the project

Before concluding "the project is broken," the Advisor must run a **harness health check** — confirm the harness's own state is sane (clean git state where expected, validators available, role launchers present, registry readable). A broken harness must never be misdiagnosed as a broken project. If the harness itself is unhealthy, the Advisor reports that to the founder first and proposes fixing the harness before touching the project.

### Advisor asks low-typing, numbered questions

All founder-facing questions use **numbered choices** so the founder can answer with a single digit instead of typing sentences. The Advisor ends every interaction with **one exact next action**.

### Advisor creates prompt packs / task contracts

The Advisor may generate **prompt packs** and task contracts to disk. A prompt pack is a founder-readable document that bundles the exact builder prompt, the exact Checker prompt, allowed/forbidden files, proof requirements, and the safety-cage summary. **A prompt pack is not execution** — writing one does not start the builder. No secrets are ever included in a prompt pack, so it is safe to share for a second opinion.

### Founder approval is required before builder work

No builder work begins until the founder approves. Approval is recorded on the launch request (`founder_approved` / `status: approved_for_launch`).

### Builder and Checker are bound to the same project

When the launch broker exists, the Builder and Checker it opens **must be bound to the same project and the same target repo path** carried by the approved launch request. A builder pointed at one project and a Checker pointed at another is a forbidden state.

### What this layer does NOT do yet

- **No background launch automation.** No watcher, no daemon, no poller.
- **The desktop launch broker is future work and is not implemented.**
- **No-copy-paste execution is not implemented.** This blueprint reduces the design risk for it; it does not deliver it.
- The Advisor cannot open a Builder or Checker. It only writes proposals to disk for the founder.

---

## Part 2 — The approved-prompt handoff flow

Once a launch request is approved, this is how an approved prompt moves from disk to the correct bound terminal with minimal founder typing. **Nothing here auto-submits a prompt or sends keystrokes.**

1. **Validate the launch request.** Refuse it if it is not approved (`status=approved_for_launch`, `founder_approved=true`), if the project is disabled, if the binding is mismatched, or if it is malformed.
2. **Render the launch bundle** — the project-bound Builder and Checker openers and one-screen context files.
3. **Verify the prompt files exist.** Confirm the builder-prompt and Checker-prompt paths resolve to real files on disk.
4. **Show a one-screen founder summary** — the binding (project, target repo path, task), approval status, and which prompt is which.
5. **Optionally copy** the builder *or* Checker prompt to the clipboard — only when the founder explicitly asks.
6. **Optionally open** the prompt text in a plain editor — only when the founder explicitly asks.
7. **Founder manually pastes / submits** into the correct bound terminal **if and when ready.** The harness never pastes and never submits.

### Roles stay separate

- The **builder prompt** is handed off only to the **builder-bound** terminal.
- The **Checker prompt** is handed off only to the **Checker-bound** terminal.
- The handoff helpers take an explicit role (`builder` or `checker`); the founder chooses which prompt to stage for which terminal.

### What the handoff never does

- **No auto-submit.** The founder presses Enter, never the harness.
- **No keystroke injection.** No synthetic typing, no simulated key events.
- **No approval bypass.** The handoff starts only from a validated, founder-approved launch request.
- **No secret leakage.** Prompt bodies contain no secrets; the copy helper refuses secret-shaped content.

The founder can drive the whole handoff from one low-typing menu — but it never auto-submits and never pastes. The founder remains the final gate.

---

## Part 3 — Handoff conventions (where files live, how identity travels)

### Every handoff artifact carries project identity

Every **task contract**, **checker job**, and **evidence packet** must include:

- **project identifier** — which registered project this belongs to.
- **target repo path** — the path of the target repo.

An artifact without both is **invalid** and must be refused by the Builder and the Checker. This prevents work from being applied to the wrong project.

### Where handoff lives

- **Central (default):** under the harness, in a per-project handoff tree. This keeps all bookkeeping in the control layer and **avoids contaminating the target repo** with job/report/evidence files.
- **Local (only if the adapter allows it):** under the target project itself — permitted **only** when the project adapter explicitly opts in. Default is central.

A per-project handoff tree typically holds: an advisor outbox, a builder inbox, builder reports, a checker inbox, checker reports, proof packets, and a founder-gate area.

### Keep target repos clean

- Target repo changes must be limited to **actual product/code changes** for the approved task.
- **Harness bookkeeping** (job files, reports, evidence packets, status, registry data) does **not** go into the target repo unless the adapter explicitly authorizes local handoff.
- This keeps each target project's git history about the product, not about the harness.

### Routing summary

| Artifact | Must include | Default location |
|---|---|---|
| Task contract | project id, target repo path | per-project handoff → builder inbox |
| Checker job | project id, target repo path | per-project handoff → checker inbox |
| Evidence packet | project id, target repo path | per-project handoff → proof packets |
| Checker report | project id | per-project handoff → checker reports |

---

## The whole flow in one line

The founder opens the Advisor, answers a few numbered questions, and approves a prompt pack. The harness validates the approval, stages the right prompt for the right terminal, and hands it to the founder to submit. Every artifact names its project and target repo, and harness bookkeeping stays out of the product's git history. **The founder is removed from being the manual transport layer — never from being the approval gate.**
