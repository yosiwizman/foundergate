# SHWL amendment — Independent Checker Report (SHA 9ef4fa0)

> **Provenance:** produced by an INDEPENDENT, READ-ONLY checker (not the author lane) resumed to verify the amended
> Shared Host Workload Lease authority against the founder's release amendments a–h + self-certification removal.
> The checker edited nothing. Committed verbatim as evidence on a SEPARATE branch so PR #97's head stays at the
> exact independently-checked SHA the founder signs. Target: `docs/lanes/shared-host-workload-lease.md` @
> `9ef4fa0ffdff3fbcfa61fe620371baee19d9f8b1`.

**VERDICT: CLEAN — all amendments verified**

**Provenance:** `git rev-parse HEAD` = `9ef4fa0ffdff3fbcfa61fe620371baee19d9f8b1` (matches required SHA exactly); branch = `shwl-authority`. File read read-only; nothing edited, committed, or pushed.

## a. Safety-not-security — PASS
- Zero occurrences of "unforgeable" (case-insensitive: NONE).
- L7: "It is **not** a security boundary against a malicious process. It is a **cooperative safety interlock** … A determined manual command outside the harness can still start heavy work."
- L24: "**High-entropy cooperative capability** … It is a safety-coordination mechanism, **not a security boundary**; a hostile or non-cooperating process may ignore or bypass it."
- L151: "a **high-entropy, run-specific cooperative capability** (≥ 256 bits of entropy). It is a **safety coordination mechanism, not a security boundary**: a **hostile or non-cooperating process may ignore or bypass it.**"

## b. Single-user NORMATIVE boundary — PASS
- L53 ("**Normative scope boundary — single interactive user (this version).**"): "one interactive operating-system user … **another operating-system account is explicitly outside this version's protection** … **true multi-user, whole-machine enforcement would require a privileged system-level service and is a separate future authority decision** … Do not describe this version as machine-wide."
- Stated as a normative boundary, not a buried residual (§11 item 4 cross-references §1 as normative). "machine-wide" appears only in the prohibition.

## c. Override consequence — PASS
- §5.1: "**immediately and permanently removes that run's `QUIET_HOST` eligibility**"; "**append-only override event**"; "**interval is entered into the soak-run attestation**"; "**downgraded classification is preserved for the remainder of the run**"; "`QUIET_HOST` is **never automatically restored.**"
- §6 override message ends "Heavy work is now permitted**, with that run permanently downgraded.**" — carries the disqualification.
- Matrix row 12: "explicit + append-only event + entered into attestation; permanently removes QUIET_HOST eligibility (never auto-restored)".

## d. Capability storage/inheritance NORMATIVE — PASS
§4.5, labeled "(normative)" / "requirements, not suggestions": owner-only dir + owner-readable-only; never in argv/logs/git/evidence/env; controlled inherited fd / broker handle / equivalently scoped mechanism; ordinary same-project builds do NOT inherit; access ends when the run ends; leakage/mismatch → refusal not fallback; and "**A `0600` file permission alone is NOT sufficient inheritance protection**."

## e. Host/boot/PID-reuse/recovery — PASS (no regression)
Stable host id; boot id changes across reboots (mismatch handled); PID paired with a start-marker; PID match without correct marker ≠ ownership; prior-boot lease → RECOVERY_REQUIRED; orphaned lock → RECOVERY_REQUIRED; neither silently unlocks ("no auto-unlock" / "heavy work stays refused"); recovery requires mechanical dead-proof OR explicit founder-authorized recovery (§4.3).

## f. VB1 maturity language — PASS
Zero "already proven"/"proven VB1" (remaining "proven" = "can't be proven"/"the guard is proven"/"provenance"). L22: "**tested and independently checker-reviewed VB1 patterns or components whose final acceptance and qualifying soak remain HELD**" + "(VB1 has not completed §29 or founder acceptance)".

## g. Status line EXACT — PASS
L3 carries verbatim: `DRAFT — PENDING INDEPENDENT CHECK AND FOUNDER APPROVAL`. (Non-blocking: embedded as `STATUS: <phrase>` + contextual suffix; mandated phrase appears exactly.)

## h. Mandatory gate chain + self-certification removal — PASS
§12: author revises → separate independent read-only checker verifies the **exact amended SHA**, edits nothing → founder signs only the independently-checked SHA → execution HELD until signature (and AKIOR sealing). Explicit: "**No lane self-certifies.**" and "**Author is not checker; checker is not founder.**" Self-cert removed: no "Advisor verdict"/"sound and coherent"/"Authority-ready? Yes"; L3 + §12 state the author lane makes no readiness/approval/acceptance claim. §13 execution prompt present and marked HELD.

## Required-content retention — PASS
Nine deliverables present (items 1–9 + supplementary list); §13 HELD execution prompt present and still HELD.

**Summary:** Every item a–h is PASS (e no regression); all self-certification / author-lane readiness content fully removed. No FAIL or PARTIAL. The founder may sign this exact SHA (`9ef4fa0…`) per §12; execution remains HELD until signature and AKIOR evidence sealing.
