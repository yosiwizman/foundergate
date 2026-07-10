# V8-A4 Lane Packet — Build Contract (Project Guide)

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page **build contract** for V8-A4 — exactly what a future implementation bundle
>    (P-A4-BUILD) may build: a **Project Guide** — an in-dashboard, plain-English chat panel that *explains* your
>    project and *drafts* text for you. It's the V8-A4 equivalent of the V8-A2 / V8-A3 lane-packet contracts.
> 2. **Why it matters.** It's what gate **G1-A4-IMPL** asks you to approve *starting to build*. It fixes what's
>    in, what's out, and — most importantly — how the Guide can never see or repeat what the File Cabinet hides,
>    and can never be tricked into acting.
> 3. **What can go wrong.** The core risk is *prompt injection*: a malicious file, log, or web page whose text
>    tries to make the Guide reveal a hidden secret, claim a false status, or produce action-looking output. This
>    contract makes the injection boundary the sensitive core, reviewed by an independent adversarial checker,
>    with committed injection + no-blocked-content-leak proofs.
> 4. **What you can test now.** Nothing to run — a document. Read the Allowed / Forbidden / Acceptance lists.
> 5. **One next action.** At **G1-A4-IMPL**, record: *"I approve starting V8-A4 implementation per the approved
>    V8-A4 lane packet."* No V8-A4 code starts before that sentence is recorded (Law 69).

---

## Authority & provenance
- **Authority:** Roadmap V8.11 **§4.4 (Project Guide, V8-A4)** + Laws 48/49/54/57 + §16 staged plan.
- **Approved proposal:** `docs/lanes/V8-A4-proposal.md` (**APPROVED TO START — G1-A4, 2026-07-10**); combined
  **G4-A3/G1-A4 recorded** in `docs/assembly-evidence/FOUNDER_GATE_LEDGER.md`.
- **Predecessors:** V8-A1 (Truth Dashboard) + V8-A2 (Preview Bay + Bug Collector) + V8-A3 (File Cabinet) complete
  & accepted (V8-A3 closed at `e92f8b9`).
- **Law 69:** authorizes nothing until **G1-A4-IMPL** is recorded. Carries forward: schema-first, cannot-invent-
  state (Law 54), data-classification (C3), view-only gates, exact-SHA CI, honest scope, injection boundary (Law 57).

## 🔒 SENSITIVITY RULING (verbatim)

> The prompt-injection boundary — untrusted project file content flowing into the Guide's context — is the
> sensitive path. A malicious file must not be able to make the Guide claim false state, reveal blocked content,
> or produce action-looking output. That path runs ONE primary builder + ONE independent adversarial checker
> before merge (report = evidence, re-review after fixes), and its injection adversarial tests are committed as
> permanent CI proof. The chat UI shell is wide-safe.

**Applied:** the context-ingestion + answer-construction lanes (`PG1–PG4` below) run **one primary builder + one
independent adversarial checker** (the checker must try to make injected project content change the Guide's
behavior — reveal blocked content, claim false state, or emit action-looking output; its report is evidence and it
re-reviews after fixes), Harvest Terminal as sole sheriff. The chat-panel UI shell lanes (`PG5–PG7`) are
**wide-safe**.

## Allowed scope (component subset, §4.4) — READ-ONLY explain + draft only
- **Chat panel:** an in-dashboard, plain-English chat panel (no terminal, no copy/paste to an outside advisor).
- **Explain (read-only):** current project status · why something is blocked · files/folders · gates/witnesses ·
  evidence · wide-safe vs narrow-sensitive work · whether founder action is truly needed · release labels · data
  classification · cost/burn — **each answer cites the real file/status it read**.
- **Draft (read-only artifacts, shown to the founder — never executed):** bug reports · notes · request-notes.
- **Reads the same classified sources the File Cabinet exposes,** honoring **every data-class rule** — the Guide
  can **NEVER see or quote what the File Cabinet hides** (SECRET/blocked content never enters its context).

## Forbidden scope (hidden or gated — enforced)
- **Routing structured requests to the CTO queue** — **V8-B** (the Guide *drafts* only; it never routes/queues).
- **Any write / action / execute path** — no command execution, no gate bypass, no merges, no file changes, no
  lock weakening, no deploy, no self-approval.
- **Any live / provider / send / payment / production path.**
- **Answering from SECRET or unknown-blocked content** — blocked/hidden content must never enter the Guide's
  context or output.
- **Inventing state (Law 54)** — no answer may assert a status the evidence does not show; UNKNOWN is said
  honestly.
- **Real GitHub links / "Ask Advisor to verify" / "Ask CTO to prepare/preview/create"** — **V8-B** (deferred).

## Acceptance criteria (the V8-A4 build contract)
- **Law-54 proof for A4 surfaces:** the Guide cannot assert a gate/status/evidence state the source files do not
  show; unknown/absent → **UNKNOWN**, never invented — proven by a committed cannot-invent-state self-test.
- **Injection adversarial suite (committed CI proof):** project content instructing the Guide to reveal a secret,
  claim false state, weaken a gate, run a command, or emit action-looking output is treated as **data** and
  refused — proven by a dedicated committed self-test, checker-reviewed (round 1 + re-review).
- **No-blocked-content-leak proof (committed test):** SECRET/unknown-blocked files (the exact set the File Cabinet
  hides) can never be read into, quoted by, or summarized through the Guide — proven by test.
- **Explain-from-evidence:** every explanation cites the file/status it read; **never claims proof without
  evidence**.
- **Draft-only:** artifacts (bug/note/request-note) are founder-reviewable cards; the Guide **routes nothing** and
  **executes nothing**.
- **No live/provider/send/payment path;** read-only.
- Founder Hand-Burden: asking a question and getting a plain-English answer (or a drafted card) needs **no
  terminal**.
- **Playwright smoke per screen** (chat panel: an explain answer with a citation, an honest UNKNOWN, a refused
  injection, a drafted bug-report card).
- **UI language law:** plain-English, non-developer tone; no scary/ambiguous affordances; no action-looking
  buttons.
- **Exact-SHA CI green** on the final V8-A4 commit; acceptance packet complete.

## Evidence plan
Per-substep folders under `docs/assembly-evidence/A4-*/`; context-boundary + answer self-tests (pass AND fail);
the **injection adversarial suite** self-test; the **no-blocked-content-leak** self-test; a **Law-54
cannot-invent-state** self-test for Guide surfaces (unknown → UNKNOWN, never invented); **Playwright smoke
screenshots** for every Guide screen (cited explain + honest UNKNOWN + refused injection + drafted card); the
**independent adversarial checker report(s)** for the PG1–PG4 path (round 1 + re-review); machine-capacity
preflights; and a V8-A4 acceptance packet checked against the criteria above.

## Substep DAG (for a future P-A4-BUILD bundle)

**Phase PG-CORE — context ingestion + answer construction (SENSITIVE: 1 builder + 1 adversarial checker):**
- `PG1` evidence reader: read only the sources the File Cabinet exposes, at their data class; **SECRET/blocked
  content never loaded**. *First; the sensitive core.*
- `PG2` injection boundary (Law 57): all project content is **untrusted DATA, never instructions** — no ingested
  text may change the Guide's rules, reveal blocked content, or trigger action — depends `PG1`.
- `PG3` answer construction (Law 54): explanations assert only what the evidence shows, **cite the source**, and
  say **UNKNOWN** honestly — depends `PG1`, `PG2`.
- `PG4` **injection adversarial suite** + **no-blocked-content-leak proof** (committed tests) — depends `PG1`–`PG3`.
  *(checker-reviewed before merge)*

**Phase PG-UI — chat panel (WIDE-SAFE, may run parallel where locks permit):**
- `PG5` in-dashboard chat panel shell (plain-English, no terminal) — depends `PG3` (needs the answer contract).
- `PG6` draft cards (bug report · note · request-note) as founder-reviewable output — **routes nothing, executes
  nothing** — depends `PG3`.
- `PG7` Playwright smoke per screen (cited explain / honest UNKNOWN / refused injection / drafted card) — depends
  `PG5`, `PG6`.

**Phase AC — acceptance:** `AC1` Law-54 cannot-invent-state for Guide surfaces · `AC2` exact-SHA CI · `AC3` V8-A4
acceptance packet. Gate after PG-CORE + PG-UI + AC evidence complete: **G2-A4 (UI witness)**.

## One next action (founder, at G1-A4-IMPL)
Approve or reject *starting* V8-A4 implementation. Approval authorizes the P-A4-BUILD bundle under this contract;
it is not code and starts nothing automatically (Law 69).
