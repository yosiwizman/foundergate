# V8-A1 Lane Packet — Truth Dashboard MVP

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page scope for the *first* thing FounderGate will actually build (V8-A1, the
>    "Truth Dashboard MVP"). Every line of scope below is **quoted from Roadmap V8.11 Section 16.0** — the sole
>    authoritative V8-A1 Build Contract — and nothing beyond it.
> 2. **Why it matters.** This packet is what gate **G1** asks you to approve. It fixes exactly what V8-A1 may and
>    may not do, so the build can run autonomously without scope creep.
> 3. **What can go wrong.** The main risk is building *more* than V8-A1 (a schema not on the list, a real Run
>    Launcher, a wired gate approval). Law 69 forbids that: V8-A1 is the only active build contract until it
>    passes and you approve the next stage.
> 4. **What you can test now.** Nothing is built yet — this is docs-only. You can read the Allowed / Not-Allowed /
>    Acceptance lists below and confirm they match Roadmap §16.0.
> 5. **One next action.** At gate G1, record: *"I approve starting V8-A1 implementation per the approved V8-A1
>    lane packet."* No implementation code starts before that sentence is recorded.

---

## Authority and provenance

- **Controlling authority:** Roadmap V8.11 **Section 16.0 — V8-A1 Build Contract** is the *only* authoritative
  V8-A1 scope. This packet **quotes §16.0 only**; where it summarizes, §16.0 wins.
- **Landed at:** `docs/ROADMAP.md` (Roadmap V8.11, byte-identical) · §16.0 is the one-page contract inside it.
- **Companion:** `docs/ASSEMBLY_MANUAL.md` (Assembly Manual V1.2). If the manual and the roadmap conflict, the
  roadmap wins.
- **Law 69 (quoted, §16.0):** *"V8-A1 is the only build contract in force. No one builds beyond V8-A1 until V8-A1
  passes its acceptance criteria. The build contract is one page. It lists what is allowed and what is not
  allowed. It is CTO-executable and founder-readable."*

---

## 1. Schema subset — the `.foundergate` schemas (quoted from §16.0)

The V8-A1 minimum `.foundergate` schema subset that V8-A1 is authorized to define (and nothing beyond it):

> * `.foundergate` schemas (`project.json`, `status.json`, `locks.json`, `run_state.json`,
>   `gates`/`witnesses`/`evidence` folder definitions, `data-classification`, `release-label`, `cost-budget`
>   fields)
> * Schema validator
> * Fixture project that passes validation
> * Cannot-invent-state test (runs in CI)

## 2. Component subsets — the Truth Dashboard MVP (quoted from §16.0, "Allowed")

The V8-A1 allowed components (frontend + backend readers), quoted from §16.0:

> * Attach one repo
> * Read `project.json` and `status.json`
> * Display current state
> * Display current gate/blocker
> * Display branch/PR/CI if available; UNKNOWN if not
> * Display "what founder should do now"
> * Display "what must not be touched"
> * Failure-modes reminder (permanently visible)
> * Panic/stop card — V8-A1 Panic Card creates a local halt/incident request, preserves evidence, and may stop
>   only tracked preview/worker processes if such tracked processes exist. If no tracked process exists, it must
>   plainly say what it did not stop. Full worker-kill, token revoke, integration disable, and recovery
>   automation belong to V8-B/V8-D. The Panic Card must display its current real scope. It must never imply
>   stopping power it does not have.
> * Basic Doctor version/health panel
> * View-only gate cards (no approve buttons)
> * Minimal Playwright smoke screenshots (proving each screen renders + primary action works)
> * Stranger-test checklist
> * Cost guard [V8-A1 = schema/config, visible limits, paid-service block in UI/policy, and same-failure loop
>   policy definition. Runtime enforcement against worker runs begins in V8-B when Run Launcher / worker
>   execution exists.]
> * Basic data classification (schema, badges, secret hiding, unknown-file blocking)

## 3. What this packet FORBIDS (quoted from §16.0, "Not allowed in V8-A1")

> * Live gate approval
> * Real Run Launcher
> * CTO queue
> * Project Guide action routing
> * Live preview control (if not safely isolated per Section 4.5.1)
> * Bug Collector beyond placeholder (V8-A2)
> * File Cabinet beyond placeholder (V8-A3)
> * Open-source worker trials
> * Multi-project autonomous execution
> * External provider/send/payment actions
> * Production deploy
> * Public/buyer/investor room
> * Pilot/commercial claims

## 4. Acceptance (quoted from §16.0, "Acceptance"; cf. Roadmap §20.A / Manual §19 Definition of Done)

> * Schema-first gate passes
> * Fixture project validates
> * Dashboard cannot invent state (CI test passes)
> * Missing CI shows CI UNKNOWN
> * Missing PR shows PR UNKNOWN
> * Stale evidence shows STALE
> * Stranger test passes
> * Founder can answer the 8 dashboard priority questions
> * No terminal copy/paste needed for status review
> * Founder Hand-Burden targets met (zero terminal copy, 30-second do-not-touch identification)
> * Exact-SHA CI green before merge

## 5. Evidence plan

V8-A1 is built as parent bundle **B12** (phases B1 Schema Foundation + B2 Truth Dashboard UI), which runs only
**after gate G1**. Evidence that will be required before G2 (per the Assembly Manual):

- **Schema-first machine gate** report with a CI link at an exact SHA (Roadmap Law 53 / §16.0 "Schema-first gate
  passes").
- **Validator self-tests in both directions** — proving a valid fixture passes AND an invalid one fails.
- **Cannot-invent-state CI test** green (Law 54): missing CI → CI UNKNOWN, missing PR → PR UNKNOWN, stale → STALE.
- **Playwright smoke screenshots** for every V8-A1 screen (each screen renders + primary action works).
- **Honest-scope Panic Card** evidence: pressing it in the fixture shows what it did *not* stop.
- **Per-substep evidence folders** (A4–A24) plus a **machine-capacity-profile.json** per bundle/phase.
- **Exact-SHA CI green** on the final commit, recorded, before merge.
- All of the above assembled into the **V8-A1 acceptance packet** and checked against the Definition of Done.

Evidence is recorded by the FounderGate CTO in the Evidence Ledger
(`docs/assembly-evidence/EVIDENCE_LEDGER.md`) and reflected in the Where-Am-I table
(`docs/assembly-evidence/WHERE_AM_I.md`). No DONE row may exist without an evidence path and an exact SHA;
anything not checked in the current run is UNKNOWN.

---

**Scope discipline:** Everything in this packet is quoted from Roadmap V8.11 §16.0. Target-state inventory
elsewhere in the roadmap (full Section 5 schema catalog, full Section 18 module inventory, later sections) is
**not** V8-A1 implementation authority. Only §16.0 authorizes V8-A1 work.
