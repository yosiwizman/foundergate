# V8-B Build Contract — Making It Real (BUILD CONTRACT) — LIVE · V8-A ACCEPTED 2026-07-11

> **STATUS: LIVE — V8-A ACCEPTED 2026-07-11.** V8-A whole-product acceptance passed (Stranger Test Run 7 PASSED;
> product-final `85a59f9`), so this build contract is now LIVE. It still **authorizes nothing by itself** (Law 69):
> work begins only when the founder records a sub-system's own `G1-B-*` implementation-start gate sentence — and
> **every `G1-B-*` gate remains UNFIRED**. No V8-B code has begun under this document.

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page **build contract** for V8-B — the stage where the safe, read-only V8-A product
>    starts to *actually do things* (start a run, act on a real approval, route a request, enforce a budget) under
>    the same gates and proofs. It fixes, per sub-system, what may be built, what may not, how each sensitive path
>    is checked, and what proofs must be committed before merge.
> 2. **Why it matters.** This is the step from "a trustworthy window" to "a trustworthy operator." It is where the
>    real power — and the real risk — lives: running code, real approvals, session tokens, rollbacks, spending
>    money. This contract makes every one of those an independently-checked, adversarially-proven surface.
> 3. **What can go wrong.** A surface that *acts without a valid, recorded approval*, *escapes a gate*, *leaks or
>    misuses a session token*, *skips a rollback*, or *exceeds the budget*. Each is pre-ruled SENSITIVE below and
>    gets one builder + one independent adversarial checker whose whole job is to make exactly those failures
>    happen; the report is committed as evidence and re-reviewed after fixes.
> 4. **What you can test now.** Nothing yet — the contract is LIVE (V8-A accepted), but every `G1-B-*` gate is
>    unfired, so no V8-B code exists.
> 5. **One next action.** Per sub-system, the founder records the matching `G1-B-*` sentence; only then does that
>    sub-system's build start (Law 69). The first is `G1-B-VB1` (Run Launcher), with `VB0` (Attached Projects
>    Registry) as its foundation.

---

## Authority & provenance
- **Authority:** Roadmap V8.11 **§16.2 (V8-B — Real Harness Operation)** + Laws 44/53/54/55/57/64/68/69.
- **Approved proposal:** `docs/lanes/V8-B-proposal.md` (**DRAFT — pending V8-A acceptance**). This contract carries
  that proposal's pre-ruled sensitivity, non-goals, and staged plan into build-contract form; it does not widen
  scope beyond the proposal or beyond §16.2.
- **Predecessor / precondition:** V8-A1 (Truth Dashboard) · V8-A2 (Preview Bay + Bug Collector) · V8-A3 (File
  Cabinet) · V8-A4 (Project Guide) **built and accepted**, and **V8-A whole-product acceptance via the Stranger
  Test PASSED** (`docs/lanes/V8-A-acceptance-plan.md`). That acceptance is the sole precondition for promoting this
  draft to a live contract.
- **Law 69:** authorizes nothing until each sub-system's `G1-B-*` implementation-start gate is recorded. Carries
  forward: schema-first (53), cannot-invent-state (54), view-only-until-wired (55), injection boundary (57),
  Founder Hand-Burden (64), source-of-truth precedence (68).

## 🔒 SENSITIVITY RULING (verbatim — applies throughout V8-B)

> The gate/approval/witness-engine, executor, session-token, rollback, and cost-enforcement paths are ALL
> SENSITIVE — one builder + one independent adversarial checker each, throughout V8-B.

**Applied — per pre-ruled path (each: ONE primary builder + ONE independent adversarial checker before merge;
checker report = evidence; re-review after fixes; findings CLOSED before merge; Harvest Terminal as sole sheriff):**

| Pre-ruled sensitive path | The independent adversarial checker must try to… |
| --- | --- |
| **Gate / approval / Witness Engine** | make the surface act on an approval that was never recorded, replay or forge an approval, unblock work a gate did not clear, or self-approve — verifiably fail every attempt. |
| **Executor** | run work with no valid, wired approval behind it; escape the gate; execute something the approval did not authorize; or leave no evidence. |
| **Session token** | leak, over-scope, reuse after revocation, or escalate a session token; act after the token is revoked. |
| **Rollback** | leave an executor action that cannot be rolled back; skip or fake a rollback; lose the pre-action evidence needed to reverse. |
| **Cost enforcement** | drive a paid action over the budget; bypass the runtime block; race the check so a charge lands before enforcement sees it. |

Each checker's report is committed as evidence, the finding is re-reviewed after fixes, and the adversarial tests
become **permanent committed CI proof**. Any UI shells around these paths are **wide-safe**.

## Allowed scope (per §16.2 — under gates, with real approvals wired)
- **Run Launcher + executor** — start / stop / pause / resume a **safe** run from the dashboard (not just preview);
  tracked, pausable, and **rollback-able**; every action leaves evidence.
- **CTO queue** — the Project Guide's *drafts* may be **routed** to a real, founder-visible work queue (the routing
  V8-A4 deliberately deferred). A queued request is a founder-visible item, **never an auto-action**.
- **Wired Gate / Witness Engine** — recording an approval **actually unblocks** the specific gated work (V8-A gates
  were view-only records; V8-B connects them to execution), superseding Law-55 view-only **only** once the engine
  is wired and proven.
- **Runtime cost enforcement** — the budget stops being display-only and **actually blocks** paid actions over the
  limit at runtime.
- **Guide routing** — the in-dashboard Guide may hand a **structured request** to the queue / an expert, only with
  the founder's explicit go-ahead.

## Forbidden scope (carried forward from V8-A — hidden or gated, enforced)
- **No action of any kind without a real, recorded founder approval wired to that specific work** — no self-
  approval, no gate bypass, no lock weakening, no implicit continuation.
- **No live / provider / send / payment / production path** until **its own explicitly gated activation** — no
  live send, no provider call, no payment, no deploy fires under this contract; each such path activates only at a
  later, dedicated gate, never as a side effect of Run Launcher, queue, gate-wiring, cost, or routing work.
- **No paid / live action without passing runtime cost enforcement and its gate.**
- **No secret / blocked content ever exposed** — the File Cabinet + Project Guide data-class boundaries stand
  unchanged; SECRET/unknown-blocked content never enters queue items, executor context, or routed requests.
- **No inventing state (Law 54)** — no surface may assert a run/gate/cost/queue status the evidence does not show;
  UNKNOWN / STALE / CONFLICT are said honestly.
- **No un-revocable session tokens and no non-rollback-able executor actions** — tokens are least-privilege and
  revocable; every executor action is reversible and leaves evidence.

## Acceptance-criteria pattern (committed adversarial proofs per sensitive path)
Each sensitive sub-system merges **only** when, for its path, all of the following are on file:
- **Committed adversarial proof suite (permanent CI):** the checker's attack cases (above) are committed as self-
  tests that must stay green — approval-without-record refused, gate-escape refused, token leak/over-scope/post-
  revocation refused, missing-rollback refused, over-budget paid action blocked.
- **Independent adversarial checker report (round 1 + re-review):** a separate builder-from-the-implementer report,
  committed as evidence, with all findings CLOSED after re-review.
- **Law-54 cannot-invent-state proof:** the surface reports UNKNOWN/STALE/CONFLICT rather than inventing run,
  gate, cost, token, or queue state — proven by a committed self-test.
- **Wiring-integrity proof:** an approval verifiably unblocks *only* the specific work it names; no other work is
  unblocked (guards against Law-55 fake-safety regressions).
- **Rollback + evidence proof:** every executor action is shown reversible and leaves committed evidence.
- **Exact-SHA CI green** on the final commit; a per-sub-system acceptance packet checked against these criteria;
  repo private, secret-clean; **no live/provider/send/payment path** present anywhere at the acceptance SHA.
- **Founder Hand-Burden (Law 64):** starting/pausing a run, reading a queued item, or approving a wired gate needs
  **no terminal**.

## Substep DAG (for a future set of V8-B build bundles)
Spine order per this contract: **Attached Projects Registry (persistent attach) → Run Launcher → CTO queue →
Gate/Witness Engine wiring → cost enforcement → Guide routing.** Safety dependency overriding the spine: **no executor action, queue-driven action, or routed request
may actually execute until the Wired Gate/Witness Engine (VB3) is landed and proven** — earlier sub-systems may
build their scaffolding and evidence, but their *act* edge depends on VB3. Each `VBn` phase is SENSITIVE: one
builder + one independent adversarial checker.

- **`VB0` Attached Projects Registry (persistent attach)** (BOUNDARY: cross-project isolation) — persist the attach
  configuration and maintain a registry of attached projects (roadmap V8-B: attach-with-persistent-config),
  superseding V8-A1's single in-memory attach. Boundary rules, enforced: **never auto-attach**; the founder chooses
  the active project; **no project's SECRET/blocked content or state ever bleeds into another** (the File Cabinet /
  Guide data-class boundaries apply per project); Law-54 honest UNKNOWN when a project can't be read. This is the
  **foundation** the rest of V8-B runs on — VB1 operates against the founder-selected attached project.
- **`VB1` Run Launcher + executor** (SENSITIVE: executor · rollback · session-token) — start/stop/pause/resume a
  safe run; every action rollback-able and evidence-leaving; least-privilege, revocable session tokens. The
  executor's *act* edge is **gated on `VB3`**; launcher scaffolding + rollback/token proofs may land first —
  depends `VB0` (runs against the attached project).
- **`VB2` CTO queue** (SENSITIVE routing boundary) — Guide drafts become **founder-visible queued items**, never
  auto-actions; queue items carry data class and never contain SECRET/blocked content — depends `VB1` (needs the
  run/executor model to queue against). Queued items **act** only once `VB3` wires approvals.
- **`VB3` Gate / Witness Engine wiring** (SENSITIVE: gate/approval/witness-engine) — a recorded approval unblocks
  **only** the specific gated work it names; supersedes Law-55 view-only for wired gates; approval-without-record,
  gate-escape, replay, and self-approval all refused — depends `VB1`, `VB2`. **This is the sensitive core; it is
  the gate that all execution edges depend on.**
- **`VB4` Runtime cost enforcement** (SENSITIVE: cost-enforcement) — the budget **blocks** over-limit paid actions
  at runtime; no bypass, no race — depends `VB3` (a blocked action is a gated action). No paid action executes
  before this path is proven.
- **`VB5` Guide routing** (SENSITIVE routing boundary) — the Guide hands a structured request to the queue / an
  expert **only** with explicit founder go-ahead; still never reveals blocked content; routes nothing without the
  go-ahead — depends `VB2` (the queue) and `VB3` (wired approval).

**Wide-safe shells (may run parallel where locks permit):** the dashboard UI shells around Run Launcher, the queue
view, wired-gate cards, the cost dashboard, and the routing prompt are wide-safe once their sensitive core is
merged and proven — plain-English, no scary/ambiguous affordances, no action-looking buttons that are not wired.

## Staged gate plan (`G1-B-*` per sub-system — each its own gate)
Each sub-system is its own build contract instance with its own implementation-start gate; **none fires until V8-A
is accepted** (Law 69). No sub-system auto-follows the previous one; the founder records each sentence explicitly.

| Gate | Authorizes starting… | Prefilled start sentence (finalized at the gate) |
| --- | --- | --- |
| **`G1-B-VB0`** | Attached Projects Registry (persistent attach) | *"I approve starting V8-B Attached Projects Registry (persistent attach) per this contract."* |
| **`G1-B-VB1`** | Run Launcher + executor | *"I approve starting V8-B Run Launcher + executor per this contract."* |
| **`G1-B-VB2`** | CTO queue | *"I approve starting V8-B CTO queue per this contract."* |
| **`G1-B-VB3`** | Gate/Witness Engine wiring | *"I approve starting V8-B Gate/Witness Engine wiring per this contract."* |
| **`G1-B-VB4`** | Runtime cost enforcement | *"I approve starting V8-B runtime cost enforcement per this contract."* |
| **`G1-B-VB5`** | Guide routing | *"I approve starting V8-B Guide routing per this contract."* |

Each sub-system then follows the same rhythm as V8-A: schema-first (53), builder + independent adversarial checker,
committed adversarial proofs, exact-SHA CI, UI witness (`G2-B-*`), accept gate (`G3-B-*`). A final **V8-B whole-
stage acceptance** (with its own Stranger Test at the V8-B gate, per §16.2) accepts the wired product as one whole.

## Evidence plan
Per-substep folders under `docs/assembly-evidence/B-*/`: for each sensitive path — the **committed adversarial
proof suite** (attack cases as permanent CI self-tests, pass AND fail); the **independent adversarial checker
report(s)** (round 1 + re-review, findings CLOSED); a **Law-54 cannot-invent-state** self-test; a **wiring-
integrity** proof (approval unblocks only its named work); a **rollback + evidence** proof (executor actions
reversible); **session-token** least-privilege/revocation proof; **cost-enforcement** over-budget-blocked proof;
**Playwright smoke** per screen; machine-capacity preflights; and a per-sub-system V8-B acceptance packet checked
against the acceptance-criteria pattern above. Ledger stamping for this bundle is handled by the primary terminal
as merge sheriff after this PR merges.

## One next action
**None until the Stranger Test passes and V8-A is accepted.** Then, per sub-system, the founder records the
matching `G1-B-*` sentence; approval authorizes only that sub-system's build under this contract. It is not code
and starts nothing automatically (Law 69).
