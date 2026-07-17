# Component Classification Doctrine (D3 — KEYSTONE · DRAFT, authorizes nothing)

> **STATUS: DRAFT · PENDING FOUNDER SIGNATURE.** This doctrine is the keystone that D1/D2/D5 enforcement are
> instances of. It defines the two component classes, the change-control each requires, and enumerates the
> current evaluation-class inventory by exact path. **This document is itself evaluation-class** — it may be
> amended only under the evaluation-class change-control below (independent check + mutation proof + founder
> signature). Merged ≠ accepted; DRAFT ≠ authority. **Base:** main `e1cee56`.

---

## 1. The two classes

- **Guidance-class** — components whose failure produces *worse advice or worse ergonomics*, not a false
  verdict: proposals, lane packets, dashboards' cosmetic copy, roadmaps, most docs, UI polish. Change control:
  ordinary builder + review + green CI. No founder signature required to change.

- **Evaluation-class** — components that **decide, gate, attest, or measure truth**: anything whose bug can turn
  a NOT-PASS into a PASS, mask a defect, fabricate or fail to catch false evidence, or let a held thing act. A
  bug here is a *false verdict*, which is categorically worse than bad advice. Evaluation-class components carry
  **oracle-anchored change control** (§3).

**Litmus test (apply to any component):** *"If this silently returned the wrong answer, could a human or a
downstream gate wrongly believe something unsafe/untrue is safe/true?"* If yes → evaluation-class.

## 2. Side-effect-certification principle (from H2)

**"Read-only by instruction" is a claim, not a property.** A prompt or comment saying a component is read-only
does not make it so. Evaluation-class components that assert read-only / no-side-effect behavior must **prove**
it mechanically (no fs/net/child_process/clock imports; injectable IO; selftests asserting zero writes), and
audits of "read-only" prompts must verify the property from the code/behavior, not from the instruction. A
control that *could* mutate state is treated as mutating until proven otherwise.

## 3. Oracle-anchored change control (evaluation-class ONLY)

An evaluation-class component may change only through all four, in order:
1. **Independent check** — a checker ≠ the author reviews the exact changed SHA, read-only, verdict committed.
2. **Mutation proof that the guard FIRES** — a committed test that *breaks the thing the component is supposed
   to catch* and proves the component (or its selftest) goes RED. A guard that cannot be shown to fail on a
   real defect is vacuous and is rejected. (The "oracle" is this adversarial proof, external to the component.)
3. **Green CI** at the exact SHA (the required `selftests` check).
4. **Founder signature** for changes to the *classification itself* or to any component's *class* (adding/
   removing evaluation-class status). Routine bug-fixes within an already-evaluation-class component need 1–3;
   re-classifying a component, or amending THIS doctrine, needs 1–4.

Terminal-0 is the sole merge sheriff; author ≠ checker ≠ signer throughout (§12 separation).

## 4. Current evaluation-class inventory (by exact path)

**Mechanical criterion (authoritative, not a hand-curated closed set):** a component is evaluation-class iff it
**decides/gates/attests/measures truth** — operationally, **every `*.selftest.mjs` run by the `selftests` CI gate**
(`scripts/run-selftests.mjs` discovers and runs all of them on every PR) **plus the modules those selftests
guard**. The enumeration below is the current inventory *derived from* that criterion and kept in sync with it; it
is **illustrative of the rule, not a competing closed list** — if a truth-deciding, CI-gated component is not yet
named here, the criterion still governs it and this §4 is amended (per §3) to name it. Each listed component is
evaluation-class and governed by §3.

**Evidence-integrity infrastructure (L1–L4):**
- `src/freeze-manifest/` — L1: pins code state (per-file sha256+mode+manifest_hash); catches drift.
- `src/run-attestation/` (incl. `attestation.mjs`) — L2: append-only hash-chained run record; `verifyAttestation` (intact | broken-at | broken-anchor); `isSoakEligible`. Head-anchoring defeats full-rewrite forgery.
- `src/environment-provenance/` — L3: allowlist-only capture + `verifyNoSecrets` (no value leak).
- `src/quiet-host-monitor/` — L4: §8/§10 detection + §4.2 preflight + §5.1 permanent QUIET_HOST downgrade.

**Soak verdict + measurement:**
- `src/tools/reliability-soak.mjs` — the availability+duration accumulator; `passed()`/`slo()` feed the AND-gate; emits a LABELED sub-result, never the gate token (W1-H1).
- `src/tools/soak-driver.mjs` — `computeVerdict` (the AND-gate: availability SLO AND QUIET_HOST eligibility AND frozen-code integrity), the sole emitter of the gate-pass token; freeze/attestation/lease orchestration; SD-1 sentinel intervention log.
- `src/tools/soak-monitor.mjs` — resource-trend/liveness observability accumulator (emits no soak-pass string).

**CI guards (block merge on false/tampered evidence):**
- `src/tools/evidence-integrity.selftest.mjs` — rejects 0-byte evidence, unstamped placeholders, malformed stamped SHAs.
- `src/tools/report-provenance.mjs` (+ `.selftest.mjs`) — `validateSoakClaims` (a SOAK PASS line needs real timestamps spanning the claim), `validateReport` (claims cite resolving PR+SHA).

**Standing instructions & harnesses that gate correctness:**
- Checker standing instructions (the adversarial-checker prompt contract used in every builder+checker lane) — evaluation-class as *doctrine*; D1 (Checker Shortcut Catalog) hardens them.
- The mechanical floor (D2) deny-lists/hooks and the **future RC Documentation Integrity Gate** (harvest H1) — evaluation-class when built.
- **This doctrine document** (`docs/contracts/component-classification.md`) — evaluation-class; amend only per §3 incl. founder signature.

**Independent-check enforcement (the code that gates §3 step 1):**
- `src/checker/validate.mjs` — rejects self-approval / dirty-but-clean / nonzero-writes checker reports.
- `src/checker/prepush-checker.mjs` — pre-push read-only checker.
- `src/checker/metrics/score.mjs` — anti-trust VETO deciding if a checker's result is trustworthy.
- `src/checker/swarm/swarm-coordinator.mjs` — checker-swarm coordination.
- Checker standing instructions (the adversarial-checker prompt contract) — evaluation-class doctrine (D1 hardens it).

**Refuse-to-act / held-action / lease gates (the "let a held thing act" clause):**
- `src/shwl/guard.mjs` (+ the `src/shwl/*` selftests) — the shared heavy-op lease guard that REFUSES (not warns), fail-safe default-to-HEAVY; soak-driver lease orchestration depends on it.
- `src/held-actions/hold-action.mjs` (+selftest) — enforces a HELD action is never sent (`transport_call_count:0`).
- `src/v8b2/no-act-edge.selftest.mjs` — proves there is NO act/approve/execute path in the VB2 scaffold.
- `src/cage/escape-tests/escape-harness.selftest.mjs` — deny-by-default containment attestation (routes only to HELD, never live); `src/evidence/cage-evidence-ledger.mjs`.

**Fail-closed schema / descriptor / fixture / launcher guards:**
- `src/v8a1/schema-first-gate.mjs` (+ `src/v8a1/dashboard/view-model.selftest.mjs` and related) — Law-53 gate: no schema, no UI (fails closed).
- `src/adapters/interface/validate.mjs` + `src/adapters/registry/validate-registry.mjs` — descriptor validators (reject self-merge / privileged-execution / planned-but-installed).
- `src/tools/fixture-write-safety.selftest.mjs` — mechanizes the §2 side-effect-certification principle (committed-fixture writes impossible).
- `src/tools/critical-path-gate.selftest.mjs` — launcher gate that refuses to start on a parked-defect-on-critical-path match.

**Product-boundary proof guards (each decides a truth about a shipped app; CI-gated):**
- `src/v8a2/preview/{no-live-path,no-dead-controls,mock-send-refusal}.selftest.mjs`; `src/v8a3/filecabinet/no-secret-leak.selftest.mjs`; `src/v8a4/guide/{injection,no-blocked-content-leak}.selftest.mjs`; the `cannot-invent-state.selftest.mjs` family (Law-54 UNKNOWN honesty).

*(VB1 `src/v8b1` run launcher/executor is a sensitive PRODUCT component with its own gate chain, already accepted at G4-B-VB1; it is act-capable, not truth-measuring — governed by its build-contract + VB3 gating rather than this measurement doctrine. Listed here for boundary clarity, not as a measurement oracle.)*

**Test-Before-Founder policy engine (TBF-1 — decides founder-witness + merge readiness):**
- `.foundergate/policies/test_before_founder.json` (+ `.foundergate/state/test_before_founder_policy_pointer.json`, `.foundergate/schemas/*.json`) — the versioned, digest-pinned governance policy.
- `tools/policy/tbf_lib.py` — the engine that derives witness-readiness and merge-readiness from disk evidence; carries the **non-weakenable invariant floor** (UI/RUNTIME/GATE/SECURITY minimums, UNKNOWN=FAIL_CLOSED, STALE≠current, derived-only readiness) that fails closed on any policy weakening even if the digest is re-stamped.
- `tools/policy/validate_{policy_integrity,lane_test_obligations,test_evidence,witness_readiness,merge_readiness}.py` — the five CI-gated validators.
- `tools/policy/test_tbf_policy.py` (30 selftests) + `tools/policy/test_tbf_mutation.py` (11 mutation proofs the guard fires) — the oracle. Governed by §3; founder-authorized at `docs/status/TEST_BEFORE_FOUNDER_FOUNDER_AUTHORIZATION.md`; constitution at `docs/contracts/TEST_BEFORE_FOUNDER_CONSTITUTION.md`.

## 5. Enforcement relationship
- **D1** (Checker Shortcut Catalog) = evaluation-class change-control applied to the checker standing instructions.
- **D2** (Mechanical Floor) = evaluation-class change-control applied to deny-lists + write-time hooks.
- **D5** (Context Hygiene line-count check) = an evaluation-class RC-gate-family guard.
Each is an *instance* of this keystone; this doctrine is the shared definition they inherit.

## Queued founder-gate sentence (queued — NOT executed)
> "I sign the Component Classification Doctrine (docs/contracts/component-classification.md @ main <SHA>) as independently checked CLEAN: evaluation-class components change only under oracle-anchored control (independent check + mutation proof the guard fires + green CI + founder signature to re-classify or amend this doctrine); the enumerated evaluation-class inventory is adopted; the side-effect-certification principle ('read-only by instruction' is a claim, not a property) is binding. This doctrine is itself evaluation-class."
