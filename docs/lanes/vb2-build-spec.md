# VB2 Build Spec (DRAFT — authorizes nothing)

> **STATUS: DRAFT · PENDING FOUNDER RELEASE.** This spec resolves the three W2 must-fix items as concrete,
> buildable spec text and states the founder-decided integrated-soak acceptance criterion. **It authorizes no
> build.** VB2 BUILD remains a frozen founder gate; nothing here starts code. Merged ≠ accepted; DRAFT ≠ authority.
>
> **Base:** main `e1cee56` · **Scaffold under test:** `src/v8b2/{cto-queue.mjs, queue-view.mjs, schemas/cto_queue.schema.json}` (NON-executing data model + read-only shell, already merged; no act/approval/execute edge — that stays VB3).
> **Authority basis:** VB2 amendment (EVIDENCE_LEDGER `LANE-B/VB2` #91) + the W2 independent re-check findings (three must-fix-before-build items).

---

## Resolution of W2 must-fix item 1 — ID entropy (quantified)

**Problem:** the scaffold ID is `^q[0-9a-f]{12}$` = **48 bits** of entropy. 48 bits (2^48 ≈ 2.8×10^14) may NOT be treated as "infeasible to enumerate" — at scale a determined enumerator can walk that space.

**Spec decision (defense in depth — do BOTH):**
1. **Raise the width to ≥128 bits.** Build IDs as `"q" + hex(32)` → pattern `^q[0-9a-f]{32}$` (128 bits, 2^128 ≈ 3.4×10^38), generated from a **CSPRNG** (`crypto.randomBytes(16)`), never from a counter/timestamp/`Math.random`. `maxLength` for `id` becomes 33. Collision probability stays negligible below ~2^64 live items (birthday bound); enumeration is infeasible.
2. **State the real boundary explicitly:** ID entropy is **not** the authorization boundary and must never be relied on as one. Holding an ID grants nothing — every content read is gated by the data-class boundary (`validateItem` refuses SECRET/blocked at ingress; PUBLIC/INTERNAL only) and, at VB3, the content authorization grant. So even a fully-enumerated ID space leaks no content. **Acceptance test:** a build proof that (a) IDs are 128-bit CSPRNG-generated and schema-pinned to `^q[0-9a-f]{32}$`, and (b) an enumeration test holding every ID still returns no INTERNAL content without the content grant.

## Resolution of W2 must-fix item 2 — pin the hash function + canonical serialization

**Problem:** the amendment named an append-only hash-chained `QueueEvent` and content-addressed snapshots but pinned neither the hash function nor the serialization — leaving the chain/`snapshot_id` non-reproducible.

**Spec decision:**
- **Hash function: SHA-256** (Node built-in `crypto.createHash("sha256")`), everywhere a hash is taken. No other algorithm; no truncation below 256 bits for stored hashes.
- **Canonical serialization (pinned):** a deterministic canonical JSON — recursively **sort object keys** (UTF-8 code-point order), **no insignificant whitespace**, arrays keep insertion order, strings UTF-8, numbers emitted as the shortest round-tripping decimal (integers with no exponent; reject NaN/±Infinity). (Equivalent to RFC 8785 / JCS; the build MUST include a `canonicalize()` with a selftest proving two key-orderings of the same object hash-identically.)
- **QueueEvent chain:** `event_hash = SHA-256( canonicalize(event_without_event_hash) + "\n" + previous_hash )`; genesis `previous_hash` = 64 zeros; the chain verifier returns `intact` | `broken-at-<id>` (first index whose recomputed `event_hash` or `previous_hash` linkage fails), fail-closed. Same threat-model disclosure as L2 run-attestation (`src/run-attestation/`): content-addressed integrity, not a security boundary against a same-user full-rewrite; an external anchor may pin the head.
- **Content-addressed snapshot:** `snapshot_id = "s" + SHA-256(canonicalize(content))`; identical content ⇒ identical id (immutable, dedupe-safe). **Acceptance test:** selftests proving (i) canonical hashing is order-independent, (ii) a tampered middle event yields `broken-at-<id>`, (iii) two identical snapshots share an id and a byte-changed one does not.

## Resolution of W2 must-fix item 3 — explicit scaffold-status ↔ lifecycle-state mapping

**Problem:** the scaffold status enum is `queued | blocked | done | UNKNOWN`, but the amendment described a richer lifecycle (pending/dismissed/expired) with no explicit mapping — ambiguous.

**Spec decision — the full lifecycle and its exact mapping (every state defined; no guessing, Law 54):**

| Lifecycle state | Meaning | Scaffold `status` | Entry / transition rule |
|---|---|---|---|
| **PENDING** | awaiting a CTO/founder decision | `queued` | on create (valid item), or on un-block |
| **BLOCKED** | a gate/precondition prevents progress | `blocked` | when a named blocker is recorded; must carry the blocker reason |
| **DISMISSED** | explicitly declined by the founder/CTO | `done` + `resolution:"dismissed"` (build adds `resolution`) | founder/CTO action; logged with actor + timestamp (DATA) |
| **EXPIRED** | aged past its retention window without resolution | `done` + `resolution:"expired"` | retention job marks it; explicit + logged (never silent deletion) |
| **RESOLVED** | acted upon / recorded-complete | `done` + `resolution:"resolved"` | when the underlying work is recorded done |
| **UNKNOWN** | evidence does not show a status (Law 54) | `UNKNOWN` | never inferred; said out loud |

The build adds a `resolution` sub-field (enum `resolved | dismissed | expired`) to disambiguate the three terminal `done` variants; transitions are append-only `QueueEvent`s (item 2 chain). DISMISSED and EXPIRED are **distinct and first-class** (the amendment's requirement), never collapsed into a bare `done`. **Acceptance test:** a state-transition selftest asserting every legal transition, rejecting illegal ones, and proving EXPIRED is reachable only via the retention job with a logged event.

## Founder-decided acceptance criterion — INTEGRATED SOAK

VB2 acceptance requires, in addition to the build + independent adversarial checker, an **integrated soak on the established §29 pattern**:
- **VB1 launching through VB2 storage:** the accepted VB1 run launcher (`src/v8b1`, accepted at G4-B-VB1) drives work whose queue items are written/read through the VB2 store — exercising the two subsystems together, not in isolation.
- **8h minimum**, on the §29 machinery: freeze-manifest of the frozen scope, L2 run-attestation (sealed, head-anchored), SHWL lease + quiet-host guard, caffeinate-pinned, AND-gate verdict (availability SLO AND QUIET_HOST eligibility AND frozen-code integrity). Independently re-derived by the Harvest Terminal before any acceptance, exactly as the VB1 legs were.
- The integrated-soak PASS is a **precondition** of VB2 acceptance, not a substitute for the independent checker or the founder signature.

## What this DRAFT does NOT do
Authorizes no build; starts no code; changes no scaffold file. VB2 BUILD stays a frozen founder gate. The three resolutions above become binding only when the founder releases the VB2 build with the queued signature sentence below.

## Queued founder-gate sentence (queued — NOT executed)
> "I release the VB2 build per docs/lanes/vb2-build-spec.md @ main <SHA>, with the three W2 must-fix items resolved as specified (128-bit CSPRNG IDs + content-grant boundary; SHA-256 + pinned canonical JSON for the QueueEvent chain and content-addressed snapshots; the explicit lifecycle↔status mapping incl. distinct DISMISSED/EXPIRED) and the integrated-soak (VB1-through-VB2, 8h minimum, §29 pattern) as a hard acceptance precondition. One builder + one independent adversarial checker; act/approval/execute edge remains frozen to VB3."
