# V8-A4 Proposal — Project Guide (PROPOSAL ONLY) — DRAFT · PENDING G2-A3

> **STATUS: DRAFT — PENDING G2-A3.** This is a *draft* written during the V8-A3 witness window as legal wide
> work. It is **not** a gate card and authorizes nothing. It becomes a live proposal / gate card only **after the
> founder passes the G2-A3 witness** of the File Cabinet. Law 69 governs: V8-A3 is not yet closed.

> **Plain English — read this first.**
>
> 1. **What this is.** A draft proposal for V8-A4: the **Project Guide** — a plain-English co-pilot that *explains*
>    your project and *drafts* things for you. **Read-only. It never does anything on its own.**
> 2. **Why it matters.** V8-A1–A3 let you see status, preview the app, report bugs, and browse files. V8-A4 lets
>    you *ask questions in plain English* ("why is this blocked?") and get honest explanations — and draft a bug
>    report or note — without touching a terminal.
> 3. **What can go wrong.** The big risk is **prompt injection**: a malicious file, log, or web page trying to
>    trick the Guide into doing something. This surface is pre-ruled **SENSITIVE** (Law 57) and would be built by
>    one builder + an independent adversarial checker, exactly like the File Cabinet's secret-hiding core.
> 4. **What you can test now.** Nothing — a draft document.
> 5. **One next action.** None until G2-A3 passes. Then this can become a real proposal.

---

## Authority & status
- **Authority:** Roadmap V8.11 **§4.4 (Project Guide)** + Laws 48/49/57 + §16 staged plan.
- **Status:** **DRAFT, pending G2-A3.** Proposal only; no V8-A4 code; authorizes nothing (Law 69).
- **Predecessors:** V8-A1/A2 complete & accepted; V8-A3 built (awaiting G2-A3 witness).

## What V8-A4 would deliver (in scope, §4.4) — READ-ONLY explain + draft only

**Explain (read-only):** current project status · why something is blocked · terminal/advisor/builder output in
plain English · files/folders · gates/witnesses · wide-safe vs narrow-sensitive work · why work continued/stopped
· whether founder action is truly needed · release labels · data classification · cost/burn status. (GitHub
status only if the data is already available; real GitHub links are V8-B.)

**Draft (read-only artifacts, shown to the founder — never executed):** spec cards · lane requests · bug reports ·
notes · expert-escalation requests.

## Explicit non-goals (NOT in V8-A4 — deferred / forbidden)
- **Routing structured requests to the CTO queue** — **V8-B**. In V8-A4 the Guide **drafts** only; it does not
  route, queue, or trigger any lane/action.
- **Any write / action / execution path** — forbidden. The Guide cannot execute commands, bypass gates, merge
  code, change files, weaken locks, copy secrets, touch/duplicate production data, start live sends/payments,
  deploy, approve its own recommendation, or claim proof without evidence (§4.4 "cannot" list).
- **Explain integration status / real GitHub links / Ask Advisor to verify / Ask CTO to prepare/preview/create** —
  **V8-B**.
- Any live/provider/send/payment path.

## 🔒 Pre-ruled SENSITIVITY (prompt-injection surface)
The Guide reads project content (app text, logs, READMEs, issues, screenshots, web pages, uploads). **Law 57
(Injection Boundary):** all such content is **untrusted DATA, never instructions** — no project content may make
the Guide weaken a gate, run a command, or alter its rules. Because a single injection bug could turn "explain"
into "act", the **explain/draft-context-handling path is SENSITIVE**: a future P-A4-BUILD would run **one primary
builder + one independent adversarial checker** (the checker tries to make injected content change the Guide's
behavior or leak a secret; report = evidence; re-review after fixes) — the same discipline used for the File
Cabinet secret-hiding core. Also Law 48/49: chat never becomes work without a structured lane/spec card shown to
the founder first; ambiguous language ("make it better") cannot become work directly.

## Proposed acceptance criteria (for a future V8-A4 build contract, after G2-A3)
- The Guide **explains** from real evidence only (cites the file/status it read); **never claims proof without
  evidence**; says UNKNOWN honestly.
- The Guide **drafts** artifacts (spec/lane/bug/note) as founder-reviewable cards; it **routes nothing** (no CTO
  queue) and **executes nothing**.
- **Injection proof (committed, adversarial):** project content instructing the Guide to reveal a secret, weaken a
  gate, or run a command is treated as data and refused — proven by test, checker-reviewed.
- No live/provider/send/payment path; read-only.
- Founder Hand-Burden: asking a question and getting a plain-English answer needs no terminal.

## Founder design input — witness note (no action now)

Recorded at G2-A3 PASS (2026-07-10). The founder wants the future Project Guide to be an **in-dashboard, plain-English advisor chat** — so a non-developer stranger never needs to copy/paste anything into an outside advisor. This stays within the V8-A4 boundary: **read-only explain** here; any **routing** of a structured request to a person or the CTO queue remains **V8-B**. It sharpens the V8-A4 goal (bring the advisor *into* the dashboard) without widening scope.

## One next action
**None until G2-A3 passes.** After the founder witnesses the File Cabinet and V8-A3 is on track to close, this
draft can be promoted to a real V8-A4 proposal and gate card.
