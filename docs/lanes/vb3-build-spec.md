# VB3 Build Spec + Acceptance Criteria (DRAFT — authorizes nothing)

> **STATUS: DRAFT · PENDING FOUNDER SIGNATURE.** VB3 is the **Gate & Witness Engine** — the wired act edge.
> This spec **authorizes no build and unlocks no act edge.** VB3 remains a FROZEN founder gate; nothing here
> starts code or arms `VB3_VERIFIER`. Merged ≠ accepted; DRAFT ≠ authority. **Base:** main `068276e`.
> **Authority basis:** V8-B build contract (`docs/lanes/V8-B-build-contract.md`), the VB1 hardening amendment
> (`docs/lanes/vb1-hardening-amendment.md`, EC-1…EC-5), the D3 doctrine (signed), and the registered H3/H4/FS1 items.

## 0. What VB3 is (and the one thing it unlocks)
VB3 wires the **act edge**: a founder-witnessed gate that lets an approved run actually execute. Today the edge is
machine-gated inert (`VB3_VERIFIER = null` ⇒ no approval can execute). **The act edge is unlocked ONLY by VB3
acceptance itself** (§5) — not by this spec, not by the build merging, not by any soak. Until then, everything VB3
builds must be provably still-inert (EC-5).

## 1. Binding entry criteria — EC-1…EC-5 (verified AT BUILD TIME, each with a mechanical proof)
Inherited as hard build preconditions from the VB1 hardening amendment; the VB3 build must carry a committed
mutation-verified proof for each:
- **EC-1 — rollback TOCTOU / `O_NOFOLLOW`:** the commit/rollback path opens with `O_NOFOLLOW` and is free of
  time-of-check/time-of-use races; proof: a symlink/rug-pull fixture that the guard refuses.
- **EC-2 — immutable approval provenance:** an approval is bound to `path@SHA` + a one-time nonce, tamper-evident,
  non-replayable; proof: a replayed/edited approval is rejected.
- **EC-3 — mechanical single-writer:** exactly one gated writer (cross-process `O_EXCL`/lockdir); proof: a 2nd
  concurrent writer loses under a real race.
- **EC-4 — module-private verifier:** the gate verifier is module-private (no external monkeypatch surface);
  proof: an out-of-module attempt to substitute the verifier fails.
- **EC-5 — proven-still-inert-at-freeze:** with `VB3_VERIFIER = null`, NO approval can cause a real side effect;
  proof: the freeze-time inertness test (the act edge is dead until acceptance).

## 2. Binding transient-UI law — H4 CURRENT RUN SUPERSEDES PRIOR TRANSIENT UI STATE
All VB3 transient operation UI (gate cards, run receipts, witness screens) MUST implement the split-brain contract
(registry H4, `AKIOR_CLDH_NO_SPLIT_BRAIN_UI`):
- Every transient operation result carries **provenance**: producing `runId`, lifecycle **generation**, `producedAt`.
- A transient result may render as **current guidance only when bound to the authoritative current lifecycle**.
- **Mutual exclusion:** active-run guidance and another run's terminal/done/revoke guidance are never shown as
  co-current. A prior run's completion/revoke can never render during a different active run.
- **Historical display** permitted only when **labeled, visually separated, and machine-checked non-actionable**
  (an escape-hatch fixture is required in the build seal — a stale prior-run result must be provably inert).
- Proof: seeded fixtures reproducing `STALE_PRIOR_RUN_COMPLETION_DURING_ACTIVE_RUN` that the build must catch —
  automated check, not advisor eyeballing (the founder-caught 2026-07-18 miss is the anti-test).

## 3. Binding acceptance PROCEDURE — H3 founder-driven witness ceremony
VB3 acceptance is **founder-driven**, not builder-driven (registry H3):
- The **founder clicks**; the terminal instructs and **observes read-only**. The tested actions must be
  founder-performed, not machine-performed.
- The witness contract **rejects** any witness packet whose automation logs show the tested actions were
  machine-performed. "It works" is a recorded founder observation, not a builder claim.
- The ceremony exercises: an approval that executes for real (edge armed under witness), a refusal that holds, the
  split-brain transient-UI behavior (§2), and the panic/stop path.

## 4. Binding endurance requirement — the 48h SIGNED soak
- VB3 acceptance requires a **48-hour** qualifying soak on the established §29 pattern (freeze-manifest + L2
  attestation sealed/head-anchored + SHWL lease + quiet-host guard + caffeinate-pinned + AND-gate verdict),
  independently re-derived by the Harvest Terminal. **The 48h duration is a SIGNED acceptance requirement** — it
  is not satisfied by the VB1 8-9h/24h legs; VB3 is act-capable and earns the longer bar.
- **Endurance-evidence gate-card field (FS1 reserved slot):** each VB3 gate card carries an endurance-evidence
  field (present / absent / stale) sourced from the ledger — the first live use of FS1's V8.11-native slot (2).

## 5. Acceptance criteria (all required; each an independent gate)
VB3 is accepted only when ALL hold, in the §12 separation (author ≠ checker ≠ signer):
1. Build complete with EC-1…EC-5 mutation-verified proofs (§1) + the H4 split-brain proofs (§2), one builder + one
   independent adversarial checker looped to CLEAN.
2. The 48h §29 soak PASSED and ledgered, independently re-derived (§4).
3. The H3 founder-driven witness ceremony PASSED, founder-performed (§3).
4. An advisor pre-signature audit + two independent acceptance audits (the VB1 acceptance pattern).
5. **Founder signature.** The signature is what arms the act edge (`VB3_VERIFIER` becomes non-null) — acceptance
   IS the unlock; nothing else unlocks it.

## What this DRAFT does NOT do
No build; no code; no act-edge unlock; `VB3_VERIFIER` stays null. VB3 stays frozen. The criteria bind only when the
founder signs the release below.

## Queued founder-gate sentence (queued — NOT executed)
> "I sign the VB3 build spec + acceptance criteria (docs/lanes/vb3-build-spec.md @ main <SHA>) as independently checked CLEAN, binding: EC-1…EC-5 verified at build time with mutation proofs; the H4 CURRENT-RUN-SUPERSEDES split-brain contract for all transient operation UI (escape-hatch fixture required); the H3 founder-driven witness ceremony as the acceptance procedure; a 48h §29 soak as a hard acceptance requirement; the FS1 endurance-evidence gate-card field. The act edge is unlocked ONLY by VB3 acceptance itself. This authorizes the VB3 build lane (one builder + one independent adversarial checker); it does not accept VB3 or arm the act edge."
