# PR #197 — PRODUCTION-SEAM ACKNOWLEDGMENT-CLASSIFICATION FRESH INDEPENDENT CHECKER PACKET

**FG-CHK5-197.** The fifth fresh independent Checker returned exactly one **LOW** finding and passed the
authority core. This packet asks a **sixth** fresh independent Checker to accept or reject the narrow
correction of that finding.

You did not build this candidate. Five previous independent Checkers returned FINDINGS. Treat every Builder
artifact — commit messages, tests, ledgers, matrices, freeze records, this packet — as a **claim to
reproduce mechanically**. Builder self-tests are not acceptance.

You are not the Builder. You are not the sequential Advisor. You have no repository mutation authority.

---

## Authoritative state

| Item | Value |
| --- | --- |
| Repository | `yosiwizman/foundergate` |
| Worktree | `/Users/yosiwizman/Projects/foundergate-wt-lrcq-founder-signature-authority-8d1899f` |
| Branch | `lane/lrcq-founder-signature-authority-8d1899f` |
| **Executable candidate** | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` |
| **Executable tree** | `012e0560fd21f7328088ec290f30f9eac84dc1ef` |
| Predecessor candidate (reviewed by the fifth Checker) | `9d87afa18fe0e63f770d68901e408ac328906167` / tree `10acfe9bcb35fdf169a3b165b12fbb43824f424a` |
| Base PR #196 | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| Protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| Fifth Checker report | `.foundergate/evidence/lrcq-assurance-factory/CHK5_197_FIFTH_CHECKER_REPORT_HISTORICAL.json` |
| Fifth Checker report SHA-256 | `34d4054a04b3a0720d568c8db086c4ce3aece6203709b6175edd2323b4d1f2b1` |
| Expected `active_keys` | `[]` |
| Suite | `npm test` — **154/154**, twice consecutively |

The evidence-only HEAD and tail are the commit(s) after `ebd4ff56`; resolve them with
`git log --oneline ebd4ff5672ba657b039521a8b377a094a2ea67ea..HEAD` and require that
`git diff --stat ebd4ff5672ba657b039521a8b377a094a2ea67ea HEAD -- src tools package.json package-lock.json`
is **empty**.

---

## What was wrong, and what changed

`FG-FFIN4-197-01` added a **fourth** acknowledgment-stage lifecycle code,
`SUPERVISOR_START_IDENTITY_UNAVAILABLE`, raised when the parent cannot **independently** observe the spawned
supervisor's OS process-start identity. The production launcher's classification was an inline three-code OR
expression and was not extended, so that refusal was recorded as:

```
stage:       governed_key_transfer          final_state: SUPERVISOR_SPAWN_FAILED
```

which is **false** — the spawn succeeded, the one-use key transfer completed, and the supervisor really did
mint a correctly ephemeral-signed claim bound to the exact spawned PID. Required:

```
stage:       supervisor_acknowledgment      final_state: SUPERVISOR_NEVER_ACKNOWLEDGED
```

**Authority impact: none.** The transfer was already fail-closed. Only the recorded label was wrong.

The correction, in `tools/terminal0/lrcq/run-five-hour.mjs` only:

- one named immutable collection `SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES` (frozen, static `LC_CODES`
  references, exactly four codes, not configurable);
- one pure predicate `isSupervisorAcknowledgmentFailure(code)`;
- one record builder `classifyGovernedTransferRefusal(g)`, which the launcher's branch returns verbatim;
- a source-derived drift guard in the new `production-ack-classification` family.

No authority-core file changed.

---

## Required review

### Phase 1 — freeze

Verify mechanically: correct host, worktree, branch; clean worktree; no active git operation; no competing
writable Builder; local == upstream == GitHub; exact candidate SHA/tree; the commits after the candidate
change **only** `.foundergate/evidence/` and `docs/`; zero `src`/`tools`/`package` drift after the candidate;
PR #197 open, draft, unmerged; PR #196 and protected main unchanged; `active_keys == []`; no founder key,
signature, activation, supervisor or productive-provider process. Return **STATE_DRIFT** on any unexplained
mismatch.

### Phase 2 — direct execution of the real production launcher classification

**This is the core of the review.** Do not accept the assertion names; execute the production code.

Import from `tools/terminal0/lrcq/run-five-hour.mjs` and call:
`SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES`, `isSupervisorAcknowledgmentFailure`,
`classifyGovernedTransferRefusal`, `launchDetachedSupervisorV4`.

Satisfy yourself that the Builder's regression is **not** a copy of the expression tested against itself:
confirm the launcher's refusal branch is literally `if (!g.ok) return classifyGovernedTransferRefusal(g);`,
that the inline three-code OR expression is gone, and that the strings `"supervisor_acknowledgment"` and
`"SUPERVISOR_NEVER_ACKNOWLEDGED"` each occur exactly **once** in the launcher source.

### Phase 3 — all four acknowledgment codes

For each of `SUPERVISOR_TERMINATED_BEFORE_CLAIM`, `SUPERVISOR_CLAIM_TIMEOUT`, `SUPERVISOR_CLAIM_INVALID`,
`SUPERVISOR_START_IDENTITY_UNAVAILABLE` require:

- `ready === false`
- `refused.stage === "supervisor_acknowledgment"`
- `final_state === "SUPERVISOR_NEVER_ACKNOWLEDGED"`
- `consumed === true`
- `launched === false`
- `supervisor_acknowledged === false`
- the exact lifecycle code (and its detail) still present in `refused.reasons`

### Phase 4 — negative controls

Require `SUPERVISOR_SPAWN_FAILED`, `TRANSFER_WRITE_FAILED` and `DESCRIPTOR_UNAVAILABLE` to remain:

- `refused.stage === "governed_key_transfer"`
- `final_state === "SUPERVISOR_SPAWN_FAILED"`

A correction that swept genuine transfer failures into the acknowledgment stage is a **finding**. Also
confirm unrelated and unknown codes are not classified as acknowledgment failures, and that the collection
cannot be widened at runtime or sourced from any environment variable, config field, activation field or CLI
flag.

### Phase 5 — start-identity authority regression

Reconfirm the `FG-FFIN4-197-01` authority behaviour is intact and unchanged:

- a correctly signed claim carrying the **exact spawned PID** with only the start identity forged is refused
  **at the comparison** (`SUPERVISOR_CLAIM_INVALID`, detail naming the comparison);
- with the parent's fixed `/bin/ps` observation genuinely unavailable through **external OS resource
  pressure** (no production hook, no flag, no substitute executable), the transfer returns `ok === false`,
  `code === SUPERVISOR_START_IDENTITY_UNAVAILABLE`, `supervisor_acknowledged !== true`,
  `start_identity_independently_observed !== true`, `TRANSFERRED_SPENT`, retry `ALREADY_TRANSFERRED`, zero
  provider spawn, no residual process;
- every `OK` carries `supervisor_acknowledged === true` **and**
  `start_identity_independently_observed === true`, with the claim identity equal to the independently
  observed `/bin/ps` identity;
- the first successful observation is cached; a transient failure that recovers does not condemn a healthy
  transfer; the self-reported identity is never trusted before recovery.

Note: the fifth Checker documented that forcing `SUPERVISOR_START_IDENTITY_UNAVAILABLE` **through the
launcher** is expensive, because the launcher passes explicit `stdoutFd`/`stderrFd` and so retains enough
descriptors for `/bin/ps` to succeed. Reproducing it at the **authority boundary**
(`spawnGovernedSupervisorV4`) is straightforward. Judge the classification by direct execution of the
exported production classifier plus the structural delegation proof; if you do drive it end to end through
the launcher, that is stronger evidence and worth recording.

### Phase 6 — provider matrix

- 26/26 invalid provider routes refused, with **counted** zero provider spawns;
- the one legitimate narrowed route spawns exactly **one** deterministic stub;
- signed ceilings and all ten exclusions still enforced.

### Phase 7 — standing regressions

Immediate-death refusal; read-without-claim refusal; malformed and copied claim refusal; fast claim-and-exit;
concurrent transfer with one winner and one pre-spawn loser; lifecycle-root object continuity; deep
immutability and dangerous-key rejection; fixed `/usr/bin/git` and `/bin/ps`; V3 refusal before side effects;
replay blocked; the real repository refusing at `KEY_ENROLLMENT`. Do not reopen unrelated architecture.

### Phase 8 — evidence accuracy

Verify: the fifth Checker report is preserved **verbatim** at digest
`34d4054a04b3a0720d568c8db086c4ce3aece6203709b6175edd2323b4d1f2b1`; no earlier historical Checker report was
rewritten (each should be touched by exactly one commit); the ledger states authority impact **none** and
does not overstate the correction; the contract's superseded block records the old behaviour rather than
silently editing it; the matrix's `FN-P1-*` rows cite evidence that **reaches** the control claimed; runtime
claims cite DYNAMIC assertions and structural claims are labelled as such; the suite and family counts in
the matrix and freeze record reproduce mechanically (this wave also corrected three stale counts inherited
from the previous wave — verify the corrected values, not the old ones).

### Phase 9 — full suite twice

`npm test` twice. Require 154/154 green both times, zero failures, zero skipped failures, identical family
totals, no weakened assertion, no real provider or model invocation, `active_keys` still `[]`, no residual
process, worktree clean after.

### Phase 10 — post-review immutability

Exact HEAD/tree unchanged; worktree clean; no repository content or timestamp mutation attributable to the
review; no key or real signature created; no real activation consumed; no productive provider or model
invoked; no residual process; PR state unchanged.

---

## Read-only boundary

**Permitted:** inspect files, Git and GitHub; hash evidence; run tests; create automatically removed
disposable fixtures outside Git; run the frozen provider only with `--version`; write your report under
`/tmp`.

**Prohibited:** any repository file creation, edit, deletion, chmod or touch; checkout, reset, restore,
stash, commit, push or merge; PR metadata changes; founder-key enrollment; passphrase handling; real founder
signature or activation; productive provider or model invocation; the five-hour run; an Advisor verdict;
AKIOR or M1 access.

Any repository mutation invalidates the review.

---

## Provider state (report separately from authority correctness)

| Item | Value |
| --- | --- |
| Target | `/Users/yosiwizman/.local/share/claude/versions/2.1.220` |
| Version | `2.1.220` |
| SHA-256 | `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` |

Require two matching hashes, a regular non-symlink target, stable device/inode/size/mtime, and no active
updater. The **provider re-freeze remains an outstanding procedural obligation** of this lane and is not
discharged by this wave.

---

## Verdict

End with exactly one:

```
FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED
FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: FINDINGS
FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: INSUFFICIENT_EVIDENCE
FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: STATE_DRIFT
FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: REVIEW_INVALIDATED
```

Every finding must include severity, exact file/line, mechanism, reproduction, observed result, required
result, provider-spawn count and narrow correction scope.

---

## Standing lesson for this lane

Five of the six findings in this lane have been **evidence-accuracy** defects, not authority defects:
`FG-FCHK-197-E`, `FG-FFIN-197-F2`, `FG-FFIN-197-F3`, `FG-FFIN4-197-02`, and now `FG-CHK5-197-01`. The
pattern is always the same — a record, a citation or a label that claims or implies more, or something
different, than what the code actually does. `FG-CHK5-197-01` is the second instance of the specific
sub-pattern where **an authority change added a code or state and a consumer was not updated with it**
(the first was `FG-FFIN-197-F1`). That is why this correction replaced an expression with a single named
collection plus a drift guard, rather than simply adding the missing code. Check consumers, not only the
authority.
