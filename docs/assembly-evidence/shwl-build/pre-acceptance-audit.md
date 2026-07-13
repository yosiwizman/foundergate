# SHWL PRE-ACCEPTANCE AUDIT

> FRESH, INDEPENDENT pre-acceptance auditor for the Shared Host Workload Lease (SHWL) build.
> Not the builder, not either adversarial checker. This report certifies nothing on anyone's
> behalf — it verifies from disk and reports facts. Acceptance remains a PENDING founder gate.
> Read-only toward the repo except this single report commit. No merge (the sheriff merges),
> no soak, no steps I/J, no AKIOR access, no service start.
>
> Worktree: `/Users/yosiwizman/Projects/foundergate-lanes/AUDIT` — branch
> `shwl-pre-acceptance-audit`, based on main `29411ddb9b2173b7e49111c0fc0b48329dedcbfa`.
> All local execution and scratch files were confined to an OS-temp / scratchpad area; the
> real `~/.cldh` was never created, read, or written.

---

## Item 1 — INTEGRITY — **PASS**

Lineage on main contains both required SHAs:

```
$ git merge-base --is-ancestor 628bb11bc4bd62665881e3c8a944f237954920d0 HEAD ; echo $?
0                      # PASS: 628bb11 (build merge, PR #106) is an ancestor of HEAD
$ git merge-base --is-ancestor 29411ddb9b2173b7e49111c0fc0b48329dedcbfa HEAD ; echo $?
0                      # PASS: 29411dd (stamp) is an ancestor of HEAD
$ git rev-parse HEAD
29411ddb9b2173b7e49111c0fc0b48329dedcbfa   # HEAD == the stamp SHA
```

Every code file under `src/shwl/` on main is blob-identical to the checker-verified SHA
`5a9cea49f7ab30bb19c6da71a525434bd6f554b4`:

```
$ git diff 5a9cea49f7ab30bb19c6da71a525434bd6f554b4..5779bb6c989c264752ec47f98eaf87ea4c5083ad -- src/
                       # (empty) — ZERO src changes: the 5779bb6c head added docs only
$ diff <(git ls-tree -r 5a9cea49 -- src/shwl | awk '{print $3,$4}' | sort) \
       <(git ls-tree -r HEAD      -- src/shwl | awk '{print $3,$4}' | sort)
                       # (empty) — all 31 src/shwl blob hashes identical checker-SHA vs HEAD
$ git ls-tree -r HEAD -- src/shwl | wc -l
31
```

Every one of the 31 `src/shwl` blobs on today's main is byte-for-byte the object the round-2
checker verified. No source drift.

## Item 2 — INDEPENDENT RE-EXECUTION — **PASS**

Ran the FULL selftest suite ONCE on today's main, in OS-temp roots exactly as the build does
(`_testkit.mkRoot()` → `mkdtempSync(tmpdir())`, `guardHome()`-refused from the real `~/.cldh`).
This was the single permitted local execution; NO soak was run.

```
$ npm test    # node scripts/run-selftests.mjs   (exit code 0)
...
ALL GREEN: 76/76 self-test(s) passed.
```

The §8.1 cross-project matrix, from the actual run output:

```
== SHWL §8.1 cross-project matrix (14 rows) ==
  ROW 1 GREEN … ROW 14 GREEN         (all 14 rows GREEN — quoted individually below)
SHWL-CROSS-PROJECT-MATRIX-SELFTEST: ALL 14/14 ROWS GREEN
```

All 14 matrix rows GREEN from the run (row 1 AKIOR-soak→FG build REFUSE; row 4 authorized
fd-delivered subprocess ALLOW; row 6 concurrent-acquire exactly-one-winner; rows 7/8 stale /
expiry do NOT unlock; row 12 override → PERMANENT QUIET_HOST disqualification; row 14 no
capability inherit/leak). Confirmed from the run, not from any prior report.

## Item 3 — SPOT-ADVERSARIAL RE-VERIFICATION — **PASS**

Own scripts, OS-temp roots only, repo unmodified (`scratchpad/audit_adv.mjs`). Full output:
all 17 checks PASS. Highlights:

**(a) §5.1 irreversibility.** In a temp root: launched an ACTIVE soak, drove a founder override
(guard `override:{founder:true}` while another run requested heavy work) → `§5.1` consequence
applied and `isQuietHostEligible(run) === false`. Then:
- **DELETED** the owner-only attestation file → still ineligible; reconstructed from the
  append-only `events.log` (`disqualified_reason = RECONSTRUCTED_FROM_EVENTS_LOG`).
- **TAMPERED** the file to `quiet_host_eligible:true` → `events.log` WINS → still ineligible.
- file missing AND `events.log` unreadable → fail-CLOSED ineligible (never eligible-by-default).
- `events.log` carries the `OVERRIDE` / `QUIET_HOST_PERMANENTLY_DISQUALIFIED` record.
- **NO** `restore` / `re-enable` / `grant` / `reset` export exists on the attestation surface
  (`Object.keys(attestation.mjs)` filtered for those verbs → `[]`); a second override never
  re-grants. Fail-closed reconstruction from `events.log` is the authority.

**(b) Capability hygiene.** During a full lifecycle run (acquire → activate → `declareSubprocess`
→ override): the owner capability and the declared-subprocess capability appear in NO argv, NO
guard message, and NO `events.log` entry. Static confirmation over git-tracked files:
```
$ git grep -nE "shwl(cap|sub)_[0-9a-f]{64}" -- .
                       # (no match) — NO minted capability value in any tracked file
$ git grep -nE "shwlcap_|shwlsub_" -- .
                       # only the PREFIX constant in capability.mjs + a regex assertion +
                       # a descriptive mention in the checker report — never a real value
```

**(c) Real-root hygiene.** `~/.cldh` did not exist before, during, or after the run
(`ls ~/.cldh` → "No such file or directory" at start and end); every root used was under the
OS tmpdir. No `akior` filesystem path was read or written: the only `akior` tokens in the code
are `owner_project:"akior"` LABEL strings inside temp-root selftest lease records (the documented
SIMULATION), never a filesystem path. The auditor read/wrote no `akior` path.

## Item 4 — EVIDENCE TRAIL — **PASS**

Both checker reports exist on main verbatim (git-tracked blobs):
```
$ git rev-parse HEAD:docs/assembly-evidence/shwl-build/checker-report-round1.md
eb1abc11c4819bf02c7750c2ed25aca3b06940a4
$ git rev-parse HEAD:docs/assembly-evidence/shwl-build/checker-report-round2.md
b7e22f1b0a7477b64bc2d3140d455b6804507e5e
```
Round 1: VERDICT CLEAN (14/14 matrix mutation-verified, capability no-leak, no `~/.cldh`/AKIOR
writes), two LOW observations. Round 2: OBS-1 (fixture split) + OBS-2 (`events.log`
reconstruction) CLOSED, no regression, 76/76 GREEN.

Evidence Ledger `SHWL-BUILD` row (EVIDENCE_LEDGER.md line 103) matches reality: build merged
**PR #106 / `628bb11`**; state "DONE (build merged; **ACCEPTANCE pending founder gate**)"; "no
real soak ran; steps **I/J untouched**; **AKIOR untouched**." Accurate.

Founder Gate Ledger contains **NO** SHWL-build acceptance row — the only SHWL row is the
authority signature `G-SHWL-AUTHORITY` (FOUNDER_GATE_LEDGER.md line 42, "APPROVED (authority;
BUILD HELD)"). A `grep -i shwl` over that ledger returns that one row and no build-acceptance
row. Correct — acceptance has not been signed.

Zero self-certification / readiness language in `BUILD_REPORT.md` (the author/builder lane):
every occurrence of "ready/readiness/approved/accepted" is a DISCLAIMER — "This lane makes **no
acceptance / readiness claim**", "the builder does not self-accept", "builder makes no
acceptance, readiness, or approval claim (§12)". The acceptance-card section is titled "DRAFT
acceptance card — facts only (builder does NOT accept)" and defers to the founder gate. (The
phrase "ready for merge" appears only inside the two INDEPENDENT checker reports — the checker
lane's own verdict — not as an author-lane readiness/acceptance claim.)

## Item 5 — RESIDUAL HONESTY — **PASS**

The disclosed residual is recorded accurately. `checker-report-round2.md` (line 18) and
`attestation.mjs` (header OBS-2 note) state: eligibility can return to `true` only by
destroying/truncating/rewriting the append-only `events.log` itself — same-user filesystem
tampering against the audit authority, explicitly OUTSIDE the cooperative-not-security model
(§5, §11.5) and forbidden by contract (§7.5, "no project truncates or rewrites it"). This is a
genuine, honestly-scoped residual, not a defect: an absent `events.log` is correctly read as
"fresh system, nothing disqualified", so wiping BOTH the append-only authority AND the
attestation cache is what re-grants QUIET_HOST — and that is destroying the audit authority
itself, the disclosed cooperative-model boundary.

I actively searched for a SECOND, UNDISCLOSED silent-widening-on-loss residual of the same
class across `attestation.mjs`, `lease-store.mjs`, `state-machine.mjs`, `guard.mjs`,
`recovery.mjs`, `capability.mjs`. **None found.** Every other load path fails CLOSED on
single-file loss:

- **lease.json missing under a live lock** → `deriveDecision` → `RECOVERY_REQUIRED` / REFUSE
  (`LOCK_ORPHAN`), never "no lease".
- **lock-dir missing while an ACTIVE lease + live owner remain** → `ACTIVE_HELD` / REFUSE
  (the lease.json + liveness still hold the host); the lock and lease cross-check.
- **heartbeat.json missing on an ACTIVE lease** → `heartbeatStale` returns true →
  `RECOVERY_REQUIRED` / REFUSE.
- **capability `.cap` file missing** → `readStoredCapability` → null; `authorizes()` requires an
  exact match against `lease_capability_id` (which lives in the owner-only lease.json, not the
  cap file) → false → REFUSE. Deleting it grants nothing.
- **attestation file missing / corrupt** → disqualification reconstructed from `events.log`;
  `events.log` unreadable → fail-CLOSED ineligible; corrupt attestation → fail-CLOSED ineligible.

The only load path that returns "free/allow" on missing input is `deriveDecision` step 1
(no lock AND no lease → `NO_LEASE` / `MAY_ACQUIRE`). This is **not** a residual of the same
class: it requires losing BOTH the lock-dir AND the lease (each single-file loss above fails
closed), it yields the neutral "free host" state that still requires a fresh atomic acquire, and
it restores no prior authorization or disqualification — a wiped host is a released host, and any
per-run disqualification survives independently in `events.log`. There is exactly ONE
silent-widening-on-loss residual, and it is the one disclosed (`events.log` destruction).

---

## OVERALL VERDICT: **PASS**

All five audit items verified from disk with evidence: (1) integrity — main's lineage contains
`628bb11` and `29411dd`, and all 31 `src/shwl` blobs are identical to the checker-verified SHA
`5a9cea49`; (2) independent re-execution — `npm test` → 76/76 GREEN with all 14 §8.1 matrix rows
GREEN from the actual run; (3) spot-adversarial — §5.1 disqualification is irreversible and
fail-closed (delete + tamper both defeated, no restore API), capability never leaks
(argv/log/events.log/git), no real `~/.cldh` and no `akior` path touched; (4) evidence trail —
both checker reports present verbatim, Evidence Ledger `SHWL-BUILD` accurate (merged #106/
`628bb11`, acceptance PENDING, I/J + AKIOR untouched), Founder Gate Ledger holds NO build
acceptance row, BUILD_REPORT is facts-only with zero author-lane self-cert; (5) residual honesty
— the one `events.log`-destruction residual is recorded accurately and is genuinely outside the
signed cooperative-not-security scope, and no SECOND undisclosed silent-widening-on-loss residual
exists.

This auditor makes no readiness claim of its own beyond this factual verdict. ACCEPTANCE remains
a PENDING founder gate.
