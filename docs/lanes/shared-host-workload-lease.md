# SHARED HOST WORKLOAD LEASE — Authority Packet

`STATUS: DRAFT — PENDING INDEPENDENT CHECK AND FOUNDER APPROVAL` · authored by the FounderGate **Advisor** (design only; no build authorized; the author lane makes no readiness claim) · project-independent CLDH doctrine

> **What this is, in one sentence.** A shared, machine-level coordination mechanism that stops a non-technical founder (or any harness) from **accidentally** starting heavy local work while a qualifying endurance soak owns the Mac — so a multi-hour soak's evidence is never corrupted by a build, test, browser, or a second soak started by mistake.
>
> **What this is NOT.** It is **not** a security boundary against a malicious process. It is a **cooperative safety interlock** for *harness-controlled* entry points. A determined manual command outside the harness can still start heavy work; the continuous host monitor is the (post-hoc) net that catches that. This limitation is stated honestly throughout and is not "fixed" by pretending otherwise.

This packet contains the nine required deliverables:
1. the doctrine (this document)
2. the lease **state machine** (§2)
3. the lease **JSON schema** (§3)
4. the **acquisition / recovery / release protocol** (§4)
5. the **heavy-operation classification policy** (§5)
6. the **plain-English founder messages** (§6)
7. the **cross-project adoption contract** (§7)
8. the **adversarial checker plan** (§8)
9. the **exact execution order** (§9)

Plus: the cross-project **test matrix** (§8.1), a statement on the **current AKIOR run** (§10), **unresolved risks** (§11), the **authority gate** (§12), and the **HELD execution prompt** (§13).

The design deliberately reuses **tested and independently checker-reviewed VB1 patterns or components whose final acceptance and qualifying soak remain HELD** — their maturity is not overstated (VB1 has not completed §29 or founder acceptance), so this is assembly of reviewed parts, not invention:
- **Atomic O_EXCL / lock-directory** exclusivity — from VB1 `src/v8b1/atomic-store.mjs` (AKIOR #8).
- **High-entropy cooperative capability** (`lease_capability_id`) — the VB1 session-token pattern (short-lived, boot-bound, capability-gated; AKIOR #2). It is a safety-coordination mechanism, **not a security boundary**; a hostile or non-cooperating process may ignore or bypass it.
- **Fail-closed recovery** (a bad state does zero unlocks) — the VB1 rollback discipline (AKIOR #3).
- **Append-only evidence + exact-SHA provenance** — Assembly Manual §26.
- **Honest UNKNOWN** — Law 54: when liveness can't be proven, refuse; never guess "probably dead."
- **Honest-Duration / soak-proof** — Assembly Manual §29: a qualifying soak needs a real quiet-host span; a contended host can't be relabelled as one.

---

## 1. Scope, name, and location

**Name:** `SHARED HOST WORKLOAD LEASE` (SHWL). It governs **both**:
- **exclusive endurance-soak ownership** (a qualifying soak holds the host for its full duration), and
- **heavy local harness operations** (builds, tests, browsers, servers, containers, installs, etc.).

**Project-independent.** The doctrine and the on-disk lease live **outside any repository**, under a stable per-user machine path so AKIOR, FounderGate, and future CLDH-harnessed projects share one host-level interlock:

```
~/.cldh/host-workload-lease/
  lease.lockdir/           # the atomic exclusivity primitive (mkdir-atomic); presence = held
  lease.json               # current lease record (atomic-replace writes only)
  heartbeat.json           # liveness beat (atomic-replace; NEVER changes ownership)
  events.log               # append-only, one JSON object per line (immutable audit trail)
```

- Not repository-local (a repo can be deleted, re-cloned, or switched between branches).
- Not an auto-cleared temp dir (`/tmp`, `$TMPDIR`) — those vanish on reboot/cleanup exactly when recovery reasoning matters most.
- **Permissions:** directory `0700`, all files `0600`, owned by the single interactive user. This prevents *accidental* modification by unrelated tools; it is not a defense against a hostile same-user process (see §11). File permissions alone are **not** the capability-inheritance mechanism — see §4.5.
- **Atomicity:** every state change is (a) guarded by the lock-directory and (b) written via **write-temp-then-`rename`** (atomic replacement) with an `fsync`. No in-place overwrite of `lease.json` is ever the acquisition act.

**Normative scope boundary — single interactive user (this version).** This version coordinates harness workloads for **one interactive operating-system user**, via the per-user path `~/.cldh/host-workload-lease/`. A workload running under **another operating-system account is explicitly outside this version's protection** — the lease neither sees nor blocks it. This is **not** whole-machine coverage: **true multi-user, whole-machine enforcement would require a privileged system-level service and is a separate future authority decision**, out of scope here. Do not describe this version as machine-wide.

---

## 2. Lease state machine

Five states. **Expiry and stale heartbeat are advisory signals, never auto-unlock.** A degraded lease moves to `RECOVERY_REQUIRED` and **keeps refusing** heavy work until liveness is mechanically disproven or the founder explicitly authorizes recovery.

```
                 ┌────────────┐
   (host free)   │  NO_LEASE  │◄───────────────────────────────┐
                 └─────┬──────┘                                 │
   heavy op wins the        │ atomic acquire (win lock.dir)     │ mechanical dead-proof
   lock-dir; writes ACQUIRING│                                  │ (owner gone + boot policy)
                     ▼       │                                  │      OR founder override
                 ┌────────────┐   preflight FAIL           ┌────┴─────────────┐
                 │ ACQUIRING  │──────────────────────────► │ RECOVERY_REQUIRED │
                 └─────┬──────┘  release(reason)           └────┬─────────────┘
        preflight PASS │                                        ▲  (still REFUSES all
        promote same   ▼                                        │   heavy work here)
        lease          ┌────────────┐  heartbeat stale /        │
                       │   ACTIVE   │  expiry passed /          │
                       │ (soak runs)│  boot mismatch /  ────────┘
                       └─────┬──────┘  owner-process gone
        owner seals evidence │
        & releases (lease_id ▼
        match)          ┌────────────┐
                        │  RELEASED  │ → archived to events.log; effective NO_LEASE for the next acquirer
                        └────────────┘
```

**Recorded status vs. derived guard decision.** `lease.json.status` records the owner's declared state. A *reader* (any heavy-op entry point) never trusts that field alone; it derives an **effective decision** from `{status, heartbeat freshness, expires_at, owner_boot_id vs current boot, owner liveness}`:

| Reader observes | Effective state | Heavy-work decision |
|---|---|---|
| no `lease.lockdir` / no `lease.json` / `status=RELEASED` | `NO_LEASE` | **May attempt atomic acquire** |
| `ACQUIRING`/`ACTIVE`, requester **is** the exact owner or a declared subprocess with a matching capability | `ACTIVE` (owned) | **Allow — declared soak activity only** |
| `ACQUIRING`/`ACTIVE`, fresh heartbeat, boot matches, owner alive, requester is **anyone else** | `ACTIVE` (held) | **Refuse** (plain-English message §6) |
| `ACTIVE` but heartbeat stale **or** past `expires_at` **or** `owner_boot_id` ≠ current boot **or** owner pid/start-marker not alive | `RECOVERY_REQUIRED` | **Refuse** — recovery path required; **no auto-unlock** |
| lock-dir present but `lease.json` missing/corrupt/tampered | `RECOVERY_REQUIRED` | **Refuse** — treat as held-and-broken |

The only transition that frees the host for a *different* workload is `RECOVERY_REQUIRED → NO_LEASE`, and it requires §4.3.

---

## 3. Lease JSON schema

Zero-dependency, JSON-Schema-style. Timestamps are DATA (ISO-8601 strings), never read implicitly from a clock inside a comparison. All identity fields are required; a lease missing any is `MALFORMED` → treated as `RECOVERY_REQUIRED`, never as "no lease."

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "shared-host-workload-lease",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version", "lease_id", "status",
    "owner_project", "owner_host_id", "owner_boot_id",
    "owner_pid", "owner_process_start_marker",
    "run_id", "lease_capability_id",
    "acquired_at", "heartbeat_interval_s", "lease_ttl_s"
  ],
  "properties": {
    "schema_version":            { "const": "1.0.0" },
    "lease_id":                  { "type": "string", "minLength": 8, "maxLength": 64 },
    "status":                    { "enum": ["ACQUIRING", "ACTIVE", "RECOVERY_REQUIRED", "RELEASED"] },
    "owner_project":             { "type": "string", "minLength": 1, "maxLength": 64 },
    "owner_host_id":             { "type": "string", "minLength": 1, "maxLength": 128 },
    "owner_boot_id":             { "type": "string", "minLength": 1, "maxLength": 128 },
    "owner_pid":                 { "type": "integer", "minimum": 1 },
    "owner_process_start_marker":{ "type": "string", "minLength": 1, "maxLength": 128 },
    "run_id":                    { "type": "string", "minLength": 1, "maxLength": 128 },
    "lease_capability_id":       { "type": "string", "minLength": 32, "maxLength": 128 },
    "declared_subprocess_capabilities": {
      "type": "array", "items": { "type": "string", "minLength": 32, "maxLength": 128 }, "maxItems": 64
    },
    "acquired_at":               { "type": "string", "format": "date-time" },
    "activated_at":              { "type": ["string", "null"], "format": "date-time" },
    "heartbeat_at":              { "type": ["string", "null"], "format": "date-time" },
    "heartbeat_interval_s":      { "type": "integer", "minimum": 1, "maximum": 3600 },
    "lease_ttl_s":               { "type": "integer", "minimum": 1 },
    "expires_at":                { "type": ["string", "null"], "format": "date-time" },
    "released_at":               { "type": ["string", "null"], "format": "date-time" },
    "release_reason":            { "type": ["string", "null"], "maxLength": 256 },
    "recovery": {
      "type": ["object", "null"], "additionalProperties": false,
      "properties": {
        "reason":       { "enum": ["STALE_HEARTBEAT", "EXPIRED", "BOOT_MISMATCH", "OWNER_DEAD", "MALFORMED", "LOCK_ORPHAN"] },
        "resolved_by":  { "enum": ["MECHANICAL_DEAD_PROOF", "FOUNDER_OVERRIDE"] },
        "proof":        { "type": ["string", "null"], "maxLength": 512 },
        "event_id":     { "type": ["string", "null"] }
      }
    }
  }
}
```

**Field notes.**
- `lease_capability_id` is a **high-entropy, run-specific cooperative capability** (≥ 256 bits of entropy). It is a **safety coordination mechanism, not a security boundary**: a **hostile or non-cooperating process may ignore or bypass it.** Among *cooperating* harness processes it is what distinguishes the exact owning run — only the owner soak and its declared subprocesses hold it, so a cooperating "same project" build cannot present itself as "same run." Subprocesses each get an entry in `declared_subprocess_capabilities`. Custody rules are normative in §4.5.
- `owner_host_id` — stable hardware identity (e.g. macOS hardware UUID; Linux machine-id). `owner_boot_id` — the current boot's identity (macOS `kern.boottime`-derived; Linux `/proc/sys/kernel/random/boot_id`). A cross-platform accessor abstracts these (§11 risk).
- `owner_process_start_marker` — the owner process's start time / boot-relative start, so PID **reuse** is detectable: a live PID whose start-marker differs from the record is **not** the owner.
- `expires_at`/`lease_ttl_s` are **advisory** — used only to *raise* `RECOVERY_REQUIRED`, never to unlock.
- `heartbeat_at` lives in `heartbeat.json` (atomic-replace) so a beat never rewrites the identity record; the guard reads both.

---

## 4. Acquisition / recovery / release protocol

### 4.1 Atomic acquire (closing the double-acquire race)
1. **Attempt the lock** by atomically creating `lease.lockdir` (`mkdir` is atomic on POSIX; equivalently an `O_EXCL|O_CREAT` open). **Exactly one** concurrent attempt wins; all others get `EEXIST` and read the existing lease → refuse or enter recovery reasoning.
2. Winner mints `lease_id`, `lease_capability_id`, captures `owner_host_id / owner_boot_id / owner_pid / owner_process_start_marker / run_id`, sets `status=ACQUIRING`, writes `lease.json` via **write-temp + `rename` + fsync**.
3. Winner starts the heartbeat immediately (even in `ACQUIRING`).

The lock-dir — not an overwrite of `lease.json` — **is** the acquisition act. Heartbeats and status promotions only ever *update within* a held lock; they never re-acquire and never change `lease_id`/ownership.

### 4.2 Close the preflight race (ACQUIRING → ACTIVE)
The qualifying soak's correct sequence — the lock is held the entire time, so nothing can slip in between the quiet-host check and launch:
1. **Atomically acquire** the host lease in `ACQUIRING` (§4.1).
2. Run the **quiet-host preflight** (no other heavy workloads present) *while holding the lock*.
3. Preflight **fails** → transition `ACQUIRING → RELEASED` with a recorded `release_reason`; remove the lock-dir (lease_id-checked); archive to `events.log`.
4. Preflight **passes** → promote the **same** lease `ACQUIRING → ACTIVE` (set `activated_at`), atomic-replace.
5. **Launch** the soak.
6. **Heartbeat** throughout at `heartbeat_interval_s`.
7. **Release** only after the soak's final evidence is sealed.

Because the lock is continuously held from step 1, no other heavy operation can acquire between preflight and launch.

### 4.3 Recovery (RECOVERY_REQUIRED → NO_LEASE) — fail-closed
When a reader derives `RECOVERY_REQUIRED` (stale heartbeat, expiry, boot mismatch, dead owner, malformed record, orphaned lock-dir), heavy work **stays refused**. Unlock requires **one** of:

- **(a) Mechanical dead-proof.** Prove the owner process is gone AND the host boot identity satisfies the recovery policy:
  - `owner_boot_id` ≠ current boot id → the owner from a prior boot **cannot** be running → strong death evidence; still recorded as recovery (never silently trusted); **or**
  - same boot, but no live process matches `owner_pid` **and** `owner_process_start_marker` → owner dead.
  Record `recovery.resolved_by = MECHANICAL_DEAD_PROOF` with the proof string and an `event_id`, then transition to `NO_LEASE`.
- **(b) Explicit founder-authorized recovery.** The founder is shown the §6 recovery warning and explicitly authorizes force-recovery. Record `recovery.resolved_by = FOUNDER_OVERRIDE`, an append-only event, and only then `NO_LEASE`. If any qualifying run is (or may be) affected, the override consequence in §5.1 applies.

If the *original owner* is merely slow (same boot, process still alive, start-marker matches), it may resume heartbeating and the derived state returns to `ACTIVE` — recovery applies to **dead** owners only.

### 4.4 Release (lease_id-checked)
- Release compares `lease_id` **before** removing the lock-dir / archiving the lease. An old or unrelated process whose `lease_id` doesn't match **must refuse to delete** — it can never remove a successor's lease.
- Heartbeat updates likewise compare `lease_id` and never re-establish ownership.
- Every acquire, promote, heartbeat-gap, recovery, override, and release appends one immutable line to `events.log`.

### 4.5 Capability custody and authorized-subprocess inheritance (normative)
The `lease_capability_id` and any `declared_subprocess_capabilities` are handled as follows. These are **requirements**, not suggestions:
- capability material lives inside an **owner-only directory** with restrictive permissions; any capability file is **owner-readable only**;
- the capability **never** appears in command-line arguments, logs, git-tracked files, evidence documents, or general environment dumps;
- authorized subprocesses receive the capability via a **controlled inherited file descriptor, a broker handle, or an equivalently scoped mechanism** — never by broadcasting the value;
- **ordinary same-project builds do not inherit the soak capability** — inheritance is explicit and scoped to the declared subprocesses of the exact run;
- capability **access ends when the run ends**;
- **capability leakage or mismatch causes refusal, not a fallback authorization.**

**A `0600` file permission alone is NOT sufficient inheritance protection** — it bounds *who may read the file*, not *how the value reaches a subprocess*; the controlled-inheritance mechanism above is the requirement. Consistent with §3, this is a *cooperative* safety property, not a defense against a hostile same-user process (§11).

---

## 5. Heavy-operation classification policy

Every **harness-controlled** heavy operation MUST call the shared guard **before** starting. The guard either allows (exact-owner soak activity) or returns a plain-English refusal (§6). Harness entry points **refuse — they do not merely warn.**

Classified as heavy (non-exhaustive; the guard's allow-list is closed — unknown/ambiguous new heavy ops default to *classified-heavy*, Law-54 fail-safe):
- builders;
- independent checkers **that execute code**;
- local tests;
- local CI;
- Playwright / browser automation;
- dev servers;
- dependency installation;
- Docker / containers;
- local model workloads;
- stress tests;
- **another soak**;
- large repository / worktree operations.

Explicitly **not** gated (allowed during a soak): Advisor chat, reading/writing documentation and plans, lightweight git metadata (status/log/branch), and this kind of authority design.

**Honest limitation.** A manual command typed outside the harness bypasses this guard by construction. That is a *known, disclosed* gap, not a defect to hand-wave: the §8/§10 continuous monitor is the complementary detection control, and any manual heavy work during a soak **permanently downgrades** that run's quiet-host claim (§5.1).

### 5.1 Manual override while a qualifying soak is ACTIVE — normative consequence
If the founder explicitly overrides the guard to run heavy work **while an active qualifying soak owns the host**, the override is not a neutral "proceed." It **permanently** changes that run's standing:
- it **immediately and permanently removes that run's `QUIET_HOST` eligibility** — the run can no longer qualify as a quiet-host baseline;
- it writes an **append-only override event** to `events.log`;
- the override **interval is entered into the soak-run attestation**;
- the **downgraded classification is preserved for the remainder of the run** — the run does not "recover" quiet-host standing later;
- `QUIET_HOST` is **never automatically restored**.

An override is therefore **not merely "warned and logged" — it disqualifies the quiet-host claim.**

---

## 6. Plain-English founder messages

**Held by another run (ACTIVE, held):**
> "A qualifying endurance test currently owns this Mac. Heavy work is paused to protect its evidence. You may continue Advisor chat, documentation and planning. The test is expected to finish at **[time]**."

**Recovery required (owner gone / stale / prior boot):**
> "The endurance test that owned this Mac isn't sending heartbeats, and I can't yet prove its process ended cleanly. To avoid corrupting a run, heavy work stays paused until I either mechanically confirm the old test is gone or you explicitly authorize recovery. **Nothing was unlocked automatically.**"

**Founder override (explicit force / run-anyway):**
> "You asked me to override the host lease and run heavy work anyway. **Warning:** if a qualifying endurance run is (or may still be) active, this override **permanently disqualifies that run's quiet-host claim** — it can no longer count as a clean quiet-host baseline, and quiet-host standing is **never** automatically restored. If a previous run were somehow still writing, this could also corrupt its evidence. I've written an append-only override event to the permanent log and entered the override interval into the run's attestation. Heavy work is now permitted, with that run permanently downgraded."

**Preflight refused acquisition (host not quiet for a new soak):**
> "I couldn't start the endurance test because this Mac isn't quiet yet — other heavy work is running. I released the reservation and recorded why. Nothing was started."

Every message is written for a non-developer: what is happening, why heavy work is paused, what they *can* still do, and when it clears. The adversarial checker verifies comprehension (§8.1).

---

## 7. Cross-project adoption contract

Binding on AKIOR, FounderGate, and future CLDH-harnessed projects:

1. **One host, one lease.** All projects read/write the **same** `~/.cldh/host-workload-lease/`. There is no per-project lease file. `owner_project` is a *label*, not an access grant.
2. **Exact-run ownership only.** Belonging to the same project grants **nothing**. Only the process presenting the matching `run_id` + `lease_capability_id` (or a declared subprocess capability) operates under the lease. *A normal AKIOR build is refused while an AKIOR soak owns the host.*
3. **Shared guard library, single source.** Every project's heavy entry points call the same guard implementation (one library, not per-project reimplementations). Divergent copies are prohibited.
4. **Fail-closed everywhere.** No project may treat expiry/staleness as auto-unlock, or delete a lease it doesn't own, or downgrade the guard to a warning.
5. **Append-only evidence.** All state changes are logged to the shared `events.log`; no project truncates or rewrites it.
6. **Honest scope.** Every adopting project documents the cooperative-only limitation (§5) and the single-interactive-user boundary (§1), and pairs the lease with the continuous monitor (§8/§10).
7. **Versioned schema.** `schema_version` is bumped compatibly; a project reading an unknown newer version treats the lease as **held** (`RECOVERY_REQUIRED`), never as absent.

---

## 8. Adversarial checker plan

An **independent** checker (not the builder) attempts to defeat every guarantee. Findings are committed as evidence and **all CLOSED before merge** (the FounderGate SENSITIVITY RULING). The checker specifically tries to:

- start heavy work while a lease is `ACTIVE` under another run (must **refuse**);
- win a **double-acquire** race (two acquirers → exactly one winner; loser refuses/recovers);
- unlock via **expiry alone** (must stay `RECOVERY_REQUIRED`);
- unlock via **stale heartbeat alone** (must stay `RECOVERY_REQUIRED`);
- present a **guessed/forged or same-project different-`run_id` capability** (a *cooperating* guard must refuse a non-matching capability — noting this is cooperative correctness, not a claim to stop a hostile process);
- **PID-reuse** spoof (live PID, wrong start-marker → not the owner);
- **prior-boot** lease silently trusted (must enter recovery, not trust or ignore);
- **old-owner deletes successor** lease (lease_id mismatch → refuse to delete);
- **tamper/delete** `lease.json` under a live lock-dir (must read as held-and-broken → refuse);
- **subprocess without capability** acts under the lease (must refuse);
- **manual override during an ACTIVE qualifying soak** that does not permanently disqualify the quiet-host claim, or that auto-restores it (must be impossible — §5.1);
- **founder recovery** path executes without explicit authorization or without an append-only event (must be impossible);
- **capability leakage** (capability appears in argv/logs/git/evidence/env, or a same-project build inherits it) — must not happen (§4.5);
- **preflight race**: inject a heavy op between preflight and launch (must be excluded by the continuously-held lock);
- **comprehension**: a non-developer reads each refusal/recovery/override message and correctly states what happened and what they may still do.

The checker runs as an independent agent under exact-SHA CI; its verbatim report is committed; re-review continues until **CLEAN**.

### 8.1 Cross-project test matrix (committed, required GREEN before merge)

| # | Scenario | Required outcome |
|---|---|---|
| 1 | AKIOR soak active → FounderGate build attempts | **REFUSE** |
| 2 | FounderGate soak active → AKIOR build attempts | **REFUSE** |
| 3 | AKIOR soak active → a **second** AKIOR build attempts | **REFUSE** |
| 4 | Exact authorized soak **subprocess** (matching capability) | **ALLOW** |
| 5 | Same project, **different run** (no matching capability) | **REFUSE** |
| 6 | Two concurrent acquisitions | **exactly one winner** |
| 7 | Stale heartbeat | enter **RECOVERY_REQUIRED**, not allow |
| 8 | Expiry alone | does **not** unlock |
| 9 | PID reuse (live PID, wrong start-marker) | does **not** authorize |
| 10 | Prior-boot lease | enter **recovery**, not silent trust |
| 11 | Old owner tries to delete successor's lease | **refuse to delete** |
| 12 | Manual override during an ACTIVE qualifying soak | **explicit + append-only event + entered into attestation; permanently removes QUIET_HOST eligibility (never auto-restored)** |
| 13 | Plain-English refusal message | **understandable to a non-developer** |
| 14 | Same-project build inherits the soak capability | **must not inherit; capability never leaks (argv/logs/git/env)** |

---

## 9. Exact implementation order (post-AKIOR-soak; HELD)

Roles: **one primary builder**, **one independent checker**, **Terminal-0 as sole merge sheriff**, exact-SHA CI, committed evidence. **No founder involvement until a true review/signature gate.** The role separation is normative — see §12.

- **A. Approve this authority** (founder gate). ← *nothing below runs until this + the AKIOR soak completing.*
- **B.** Build the shared lease library (state machine, schema, atomic acquire/heartbeat/release, recovery, guard API).
- **C.** Integrate the AKIOR **soak launcher** (acquire→preflight→activate→heartbeat→release).
- **D.** Integrate AKIOR **heavy-operation launchers** (all §5 entry points call the guard).
- **E.** Integrate the FounderGate **soak launcher**.
- **F.** Integrate FounderGate **heavy-operation launchers**.
- **G.** Run the independent **cross-project adversarial checker** (§8, §8.1).
- **H.** **Close all findings.**
- **I.** Run a **clean AKIOR quiet-host rerun** (the first run that can qualify as a full-duration quiet-host baseline).
- **J.** Later, run **FounderGate's own qualifying soak**.

The lease library (B) lands **before** the clean AKIOR rerun (I), so the rerun is the first soak actually protected by the interlock.

---

## 10. The current AKIOR run

Stated explicitly and honestly:

- This mechanism **cannot retroactively repair** the current AKIOR soak — it was launched before the interlock exists.
- The current run **remains useful**: it is valid evidence for **correctness / isolation** behavior and for **contended-host stability** (the harness surviving a busy machine).
- It **cannot qualify** as a full-duration **quiet-host** baseline, because nothing prevented (or recorded the absence of) contending heavy work during it.
- A **clean AKIOR rerun is required** before any production-readiness *quiet-host* claim.
- The **lease mechanism should be implemented before that rerun** (execution step B precedes step I), so the rerun is protected and its quiet-host claim is defensible.

---

## 11. Unresolved risks (tracked, non-blocking for approval)

1. **Cooperative-only boundary.** Manual / non-harness commands bypass the lease by construction; only the monitor catches them post-hoc. *This is the defining scope limit, not a bug — but it must never be overstated as security.*
2. **Host/boot identity portability.** `owner_host_id` / `owner_boot_id` / `owner_process_start_marker` need a reliable cross-platform accessor (macOS `kern.boottime` + hardware UUID; Linux `boot_id` + machine-id). The abstraction is a build-time correctness risk; wrong sourcing → false recovery or false trust. Checker item.
3. **Clock skew.** Heartbeat/expiry use wall-clock; an NTP jump could prematurely age a heartbeat. **Safe-side:** it only ever raises `RECOVERY_REQUIRED` (refuse), never unlocks — so skew degrades to over-caution, acceptable.
4. **Single-interactive-user boundary.** **Now a normative boundary — see §1** (one interactive OS user; other OS accounts explicitly outside this version's protection; whole-machine, multi-user enforcement is a separate future privileged-service authority). The target environment is a single-user founder Mac; this is a scope statement, not merely a residual risk.
5. **Capability custody.** **Now normative — see §4.5** (owner-only storage; never in argv/logs/git/evidence/env; controlled inherited-fd/broker delivery; same-project builds do not inherit; access ends with the run; leakage/mismatch → refusal). `0600` alone is **not** sufficient inheritance protection. Residual: under the *safety-not-security* scope a determined same-user process could still read a leaked value — a checker item, not a claimed security guarantee.
6. **Orphaned lock-dir after a hard crash.** `lease.lockdir` persists across a crash; recovery must treat an orphan lock-dir as `RECOVERY_REQUIRED` (not "stuck forever" and not auto-clear). Covered by §2/§4.3; needs an explicit test.
7. **Founder-override ergonomics.** Override is powerful and aimed at a non-technical user; risk of habitual over-use. Its *consequence* is now normative (§5.1: permanent `QUIET_HOST` disqualification + append-only event + attestation entry). Mitigation: strong plain-English warning + mandatory append-only event + (recommended) requiring the founder to restate intent. Design-level; revisit at the review gate.

None of these blocks *approving the authority*; each is a tracked build-lane / checker obligation.

---

## 12. Authority gate — author, independent checker, founder (mandatory)

This authority becomes effective only through a strict, separated gate. **No lane self-certifies.**

- **Author is not checker; checker is not founder.**
- **The author lane** drafts and revises this document and **makes no readiness, approval, or acceptance claim of any kind** — it may report only that the requested changes were made.
- **A separate, independent, read-only checker** reviews the **exact amended SHA**, verifies each requirement with line evidence (PASS / FAIL / PARTIAL), and **edits nothing**. Any FAIL/PARTIAL returns to the author as a further commit; the checker re-reviews the **new exact SHA**; the loop continues until **CLEAN**.
- **The founder signs only the independently-checked SHA.**
- **Execution remains HELD** until the founder's signature **and** the AKIOR evidence sealing — the §13 prompt stays HELD until both.

Only after that signature does execution order §9 (B→J) begin, under one primary builder + one independent checker + Terminal-0 as sole merge sheriff.

---

## 13. HELD execution prompt (do not release yet)

> **HELD — DO NOT RELEASE UNTIL THE CURRENT AKIOR SOAK COMPLETES AND THE FOUNDER SIGNS THE INDEPENDENTLY-CHECKED AUTHORITY.**
>
> *(Draft of the Harvest Terminal / CTO execution prompt, staged for later release verbatim.)*
>
> ---
> **HARVEST TERMINAL — BUILD THE SHARED HOST WORKLOAD LEASE**
>
> Authority: `docs/lanes/shared-host-workload-lease.md` @ `<SIGNED-CHECKED-SHA>` (independently checked, then founder-signed). Preconditions confirmed: the prior AKIOR soak has completed and its evidence is sealed; the founder has signed the independently-checked authority. The V8-A forbidden list and all standing laws remain in force. Keep foundergate PRIVATE; READ-ONLY toward the AKIOR repo (copy-only, never write/commit/mutate there); never touch the radioactive harness-rebuild repo.
>
> Build, in the exact order B→J of the authority §9, under one primary builder + one INDEPENDENT adversarial checker, Terminal-0 as sole merge sheriff, exact-SHA CI, committed evidence, merge-commits-only, secret-scan every commit:
> 1. **B — shared lease library** at the per-user path `~/.cldh/host-workload-lease/` (never repo-local): the §2 state machine, the §3 schema, atomic lock-dir acquire + `fsync`/rename writes, ownership-preserving heartbeat, lease_id-checked release, §4.3 fail-closed recovery, §4.5 capability custody, and a single closed-allow-list guard API. Reuse the tested, independently checker-reviewed (acceptance + qualifying soak still HELD) VB1 `atomic-store` O_EXCL lock and session-token capability pattern; do not reinvent them.
> 2. **C/D — AKIOR integration** (soak launcher: acquire→preflight→activate→heartbeat→release; then every §5 heavy entry point calls the guard and REFUSES, not warns).
> 3. **E/F — FounderGate integration** (soak launcher, then every §5 heavy entry point).
> 4. **G/H — independent cross-project adversarial checker** per §8: run the full §8.1 test matrix (all 14 rows GREEN, committed), plus the guessed-capability/PID-reuse/prior-boot/old-owner-delete/tamper/override-disqualification/capability-leak/preflight-race attacks and the non-developer comprehension check on every §6 message. Commit the checker's verbatim report; re-review until CLEAN; **close every finding before merge**.
> 5. Address the §11 risks as build-lane obligations (host/boot-id cross-platform accessor; capability custody §4.5; orphaned lock-dir test; override ergonomics).
> 6. **STOP at a review gate** and present the acceptance card. Do **not** run the clean AKIOR quiet-host rerun (step I) or any FounderGate qualifying soak (step J) until the lease library is accepted. Nothing executes a real soak until the guard is proven.
>
> Deliver: the committed library + integrations + the checker report (all findings CLOSED) + the GREEN §8.1 matrix + an Evidence-Ledger stamp (AUTHORITY column citing this doc @ signed-checked SHA), then the acceptance card for the review/signature gate. Do not accept your own work; the checker is independent and the founder signs the gate.
> ---
> **(END HELD PROMPT)**
