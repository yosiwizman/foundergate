# VB2 ClassifiedObjectStore Amendment — design authority (DRAFT)

> **STATUS: DRAFT — PENDING INDEPENDENT CHECK.**
> This is a **design DRAFT**. It **AUTHORIZES NOTHING** and makes **no readiness claim**. It fires no gate, starts
> no build, and merges no code. It specifies an *intended* amendment to the VB2 surface for later independent
> adversarial check; nothing here is accepted, proven, or wired until a separate acceptance record says so.

> **Plain English — read this first.**
>
> 1. **What this is.** A written specification for a *ClassifiedObjectStore* — the storage layer the VB2 CTO queue
>    would sit on if VB2 ever needed to persist items, snapshots, and events. Today VB2 is a pure, non-executing
>    data model held in memory (a queue is a `{ schema_version, items }` object, built and read by pure functions).
>    This doc describes how a **classified, tamper-evident, retention-governed store** *would* back that surface,
>    without leaking meaning, without conflating states, and without ever silently losing or mutating data.
> 2. **Why it matters.** The moment queued records outlive a single process, three risks appear: (a) an object ID
>    or a metadata field leaks content it should not; (b) the record log can be rewritten so history lies; and
>    (c) items vanish or mutate with no trace. This amendment pre-rules each of those out at the storage boundary.
> 3. **What can go wrong.** A guessable ID that hands a stranger the content behind it; SECRET/blocked content
>    riding inside a "harmless" metadata listing; a mutated snapshot or a rewritten event log that no one can
>    detect; a silent deletion; or a UI that shows a firm status it cannot actually read (a Law-54 violation).
> 4. **What you can test now.** Nothing. This is a DRAFT authority doc. No store exists; no code changes here.
> 5. **One next action.** Independent adversarial check of this specification against the cited VB2 scaffold, then
>    (only if accepted, and only under a recorded `G1-B-*` gate) an implementation lane. Not authorized here.

---

## Authority & provenance

- **Authority basis:** Roadmap V8.11 **§16.2 (V8-B — Real Harness Operation)** and the V8-B Build Contract, as the
  document that fixes per-sub-system scope. This amendment does **not** widen scope beyond that contract; it
  narrows and hardens the *storage* posture of an existing read-only surface.
- **Build contract (LIVE, authorizes nothing by itself — Law 69):**
  `docs/lanes/V8-B-build-contract.md @ 670046b74b805790de785daa3f14cb0c7f5bad12`
- **Surface amended (VB2 scaffold — DO NOT EDIT; cited by path @ full 40-char SHA per §28):**
  - `src/v8b2/cto-queue.mjs @ 44d6a6d3ab86e9a9716f0676aa5023dc252daad1` — the pure data model + accessors
    (`emptyQueue`, `validateItem`, `addItem`, `listItems`, `getItem`; `STATUS`, `DATA_CLASS`,
    `FORBIDDEN_DATA_CLASS`, `UNKNOWN`).
  - `src/v8b2/queue-view.mjs @ 7e4d5eb78e2ec9605cb022d110da61a80f951285` — the read-only display shell
    (`renderQueueText`, `renderQueueHtml`; `displaySafe` redaction).
  - `src/v8b2/schemas/cto_queue.schema.json @ 37c42c1ad2a10b4b51c4b832e8deba788929a040` — the committed queue
    schema (`additionalProperties:false`, item id pattern `^q[0-9a-f]{12}$`, `data_class` ∈ {PUBLIC, INTERNAL}).
- **Laws carried forward:** schema-first (53), **cannot-invent-state / honest UNKNOWN (54)**, view-only-until-wired
  (55), injection boundary (57), Law 69 (nothing authorized until a recorded gate). No `G1-B-*` gate is fired by
  this doc.
- **Relationship to VB3:** the *act* edge for anything stored here still depends on VB3 (Gate/Witness Engine
  wiring), which does not exist under this scaffold. A stored object is a **record**, never an auto-action. This
  amendment adds storage; it adds **no** act edge.

> **§28 provenance note.** Every VB2/contract citation above is by `path @ <full-40-char-SHA>`, resolvable via
> `git -C <worktree> rev-parse HEAD:<path>`. No soak-pass line is asserted; this is a DRAFT, not an acceptance.

---

## 0. Scope boundary (what this amendment does and does not do)

**In scope (specification only):** the persistence contract for VB2 records — object identity, the metadata/content
authorization split, the append-only event log, immutable content-addressed snapshots, retention/deletion, and the
first-class lifecycle states. All expressed as *requirements a future store must satisfy*.

**Out of scope (explicitly):** any executor, approval, dispatch, or act path; any mutation of the cited scaffold
files; any clock read (time remains caller-supplied **DATA**, mirroring `cto-queue.mjs`'s `created_at` rule —
the store never invents a timestamp); any network or child-process capability. The store is a **record keeper**,
not an actor.

**Invariant preserved from the scaffold:** the data-class boundary stands unchanged. A stored object's data class
may be **PUBLIC** or **INTERNAL** only; **SECRET / BLOCKED / UNKNOWN-blocked** content is refused at ingress
exactly as `validateItem` refuses it today (`FORBIDDEN_DATA_CLASS = [SECRET, BLOCKED, UNKNOWN]`). This amendment
**tightens** that boundary into the storage and metadata layers; it never relaxes it.

---

## 1. Opaque object IDs

**Requirement.** Every stored object (queue item, snapshot, event) is addressed by an **opaque ID** that leaks
**no** meaning and **no** ordering, and that is **not** a usable handle to the content behind it.

- **No meaning leaked.** An ID encodes no data class, no title, no requester, no kind, no size, and no creation
  time. Reading the ID alone reveals nothing about what it points to. This extends the scaffold's existing item-id
  shape `^q[0-9a-f]{12}$` (opaque already — a `q` prefix plus 12 hex nibbles, carrying no semantics) to **all**
  stored object kinds, each with its own non-overlapping opaque namespace (e.g. distinct prefixes for item /
  snapshot / event) so that possessing one ID never lets a caller derive another.
- **No ordering leaked.** IDs are **not** monotonic, sequential, or time-sortable. Two objects created back to
  back must not yield adjacent or comparable IDs. Ordering, where a caller needs it, is expressed only through
  explicit caller-supplied `created_at` DATA and the event log's position — never inferred from the ID.
- **Not a guessable content handle.** An ID must be infeasible to guess or enumerate: sufficient entropy that
  brute-forcing the ID space is impractical, and — critically — **holding an ID is not, by itself, authorization
  to read the content** (see §2). An ID is a *name*, not a *capability*. Even a correctly guessed or leaked ID
  yields content only through a content-authorization check.
- **Stable and collision-refusing.** An ID, once assigned, is stable for the life of the object. On the
  astronomically unlikely collision, ingress **refuses** (mirroring `addItem`'s duplicate-id rejection:
  `duplicate item id`) rather than overwriting — no silent clobber.

**Adversarial targets for the independent checker.** Derive object B's ID from object A's ID; sort IDs to recover
creation order; read content using only a harvested ID with no content grant; enumerate the ID space; force a
collision to overwrite an existing object. Each must verifiably fail.

---

## 2. Separate metadata vs content authorization

**Requirement.** **Listing/metadata access is a distinct grant from content access.** A caller authorized to *see
that an object exists* is **not** thereby authorized to *read what it contains*. SECRET/blocked content **never**
rides inside metadata.

- **Two independent grants.**
  - **Metadata grant** — permits listing objects and reading their non-sensitive descriptor fields (id, kind,
    status, `created_at`, data class label, and whether content is displayable). This is the surface
    `listItems` / `renderQueueText` / `renderQueueHtml` operate over.
  - **Content grant** — a **separate** permission required to read an object's human-readable content
    (`title`, `summary`, `requested_by`, and any snapshot body). Possessing a metadata grant, or the object ID,
    confers **no** content grant.
- **A metadata read never carries content.** The store's list/describe path returns only descriptor fields; it
  **cannot** return `summary`/`title` bodies for an object the caller lacks a content grant for. This is the
  storage-layer expression of the scaffold's `displaySafe` behaviour in `queue-view.mjs`, which already redacts
  human CONTENT (`title`, `summary`, `requested_by` → `REDACTED`) for any non-displayable data class. The
  amendment moves that boundary **earlier** — into the store's read path — so redaction is not merely a display
  courtesy but an **authorization result**: unauthorized content is never fetched, not merely hidden after fetch.
- **SECRET/blocked content is never in metadata to begin with.** Per §0 the data-class boundary refuses
  SECRET/blocked/unknown-blocked content at ingress, so it never becomes a stored object at all. Even for the
  permitted PUBLIC/INTERNAL classes, the metadata descriptor **must not** embed content bodies — a listing shows
  *that* an INTERNAL item exists and its class label, not its `summary` text, unless a content grant is present.
- **Honest denial, not silent blank.** When content is withheld for lack of a grant, the store returns an explicit
  "content withheld — not authorized" marker (consistent with the scaffold's visible `REDACTED` token), never a
  fabricated or empty body that could read as "no content" (a state the store did not observe — Law 54).

**Adversarial targets for the independent checker.** Read `summary`/`title` with only a metadata grant; find any
list/describe response that embeds content for an object with no content grant; find SECRET/blocked bytes anywhere
in a metadata record; obtain content via the ID alone. Each must verifiably fail.

---

## 3. Append-only QueueEvent log (hash-chained, tamper-evident)

**Requirement.** Every state-changing event on the store is recorded in an **append-only `QueueEvent` log**. Each
event carries the **`previous_hash`** of the prior event and its own **`event_hash`**, forming a hash chain that
makes any insertion, deletion, reordering, or edit of past events **detectable**.

- **Append-only.** Events are only ever *appended*. There is no update-event and no delete-event operation on the
  log itself. (Deleting a stored *object* is itself an appended event — see §5 — never a rewrite of the log.)
- **Hash chain.** Each `QueueEvent` records at minimum: the event's opaque id, an event `type`
  (e.g. `item_added`, `snapshot_created`, `status_changed`, `object_deleted`, `retention_expired`), a
  caller-supplied `created_at` (DATA, never a clock read), a stable serialization of the event payload,
  `previous_hash` (the `event_hash` of the immediately preceding event, or a fixed genesis sentinel for the first
  event), and `event_hash = H(previous_hash ‖ canonical(payload) ‖ created_at ‖ type ‖ id)` over a canonical,
  deterministic encoding using a collision-resistant hash. Any mutation of a past event changes its `event_hash`,
  which breaks the `previous_hash` link of every later event — the tamper is localized and provable.
- **Verifiable.** The log exposes a pure verification that recomputes the chain head-to-tail and reports
  `intact | broken-at-<event-id>`. A broken or unreadable chain is reported as exactly that — the store must
  **never** paper over a break by reporting "intact" for a chain it could not fully verify (Law 54).
- **Records, not actions.** A `QueueEvent` is an evidence record of something that already happened in the store;
  it is **not** an instruction and carries no act edge. Consistent with the scaffold's "a queued item is a RECORD,
  never an auto-action."

**Adversarial targets for the independent checker.** Edit a past event's payload without detection; delete or
reorder events and still verify "intact"; forge an event with a valid-looking `event_hash`; splice two chains;
truncate the tail undetected. Each must verifiably fail (i.e., verification must report the break).

---

## 4. Immutable content-addressed snapshots

**Requirement.** Content is stored **by hash** (content-addressed). A **snapshot** is an immutable capture of an
object's content at a point in time; snapshots are **never mutated in place**.

- **Content-addressed.** A content blob's storage key is a collision-resistant hash of its bytes. Identical
  content deduplicates to one blob; different content necessarily has a different address. The content address is
  itself an opaque handle in the §1 sense — possessing it is not authorization to read (§2 still governs).
- **Immutable snapshots.** A snapshot binds `{ object_id, content_hash, created_at (DATA), data_class }` and is
  written once. "Changing" an object's content produces a **new** snapshot with a **new** content hash and a new
  `snapshot_created` `QueueEvent` (§3) — the prior snapshot is untouched. There is **no** in-place edit and **no**
  overwrite of a snapshot's bytes or its binding.
- **Integrity self-check.** Because the address is the hash of the content, a snapshot is self-verifying: re-hash
  the bytes and compare to the address. A mismatch is reported as `corrupt`, never silently served as if valid
  (Law 54).
- **Boundary preserved.** Snapshot content inherits the object's data class and the §2 content-authorization rule.
  A snapshot of an INTERNAL object is readable only with a content grant; its existence/metadata is visible only
  with a metadata grant. SECRET/blocked content is never snapshotted (it never entered the store).

**Adversarial targets for the independent checker.** Mutate a snapshot's bytes in place while keeping its address;
overwrite an existing content address with different bytes; serve corrupt content as valid; use a content address
as a bypass around the content grant. Each must verifiably fail.

---

## 5. Retention policy (explicit, logged deletion — never silent)

**Requirement.** A stated **retention** policy governs how long items and snapshots persist. Deletion is **always
explicit and logged**; nothing is ever removed silently.

- **Stated horizon.** Each object kind (item / snapshot / event) has a declared retention horizon expressed
  against caller-supplied `created_at` DATA (not a clock read by the store). The horizon is a property of the
  record, readable via a metadata grant; the store does not invent or shorten it.
- **Explicit + logged deletion only.** Removing an object requires an explicit delete request and appends an
  `object_deleted` (or `retention_expired`) `QueueEvent` to the log (§3) **before** the bytes are released. The
  event records what was deleted (by opaque id), why (explicit request vs retention horizon reached), and the
  caller-supplied `created_at` of the deletion. **There is no silent delete, no silent GC, and no silent
  compaction.** If it left the store, the log says so.
- **The event log is not retention-pruned into dishonesty.** The append-only `QueueEvent` chain (§3) is the
  tamper-evident spine; deleting the *content* of an expired object (releasing its snapshot bytes) does not delete
  the *events* that record its life and death — otherwise history would lie. Any pruning of ancient log segments,
  if ever specified, must itself be an appended, hash-chained, evidence-preserving operation, not a rewrite.
- **Deletion vs. tombstone.** After deletion, a metadata read of the object's id returns an honest **tombstone**
  (deleted / expired state — §6) rather than a fabricated "never existed" or a live-looking record. The store
  reports the state it can prove, and says UNKNOWN where it cannot (Law 54).

**Adversarial targets for the independent checker.** Delete an object with no corresponding log event; find a
GC/compaction path that drops data silently; make a deleted object read as still-live or as never-existed; rewrite
the log under the guise of retention pruning. Each must verifiably fail.

---

## 6. Distinct pending / dismissed / expired states (first-class; no conflation; honest UNKNOWN)

**Requirement.** `pending`, `dismissed`, and `expired` are **each a first-class status** with distinct meaning. The
store must **never conflate** them (e.g. treating a dismissed item as expired, or an expired item as pending), and
must report an honest **UNKNOWN** whenever a state cannot actually be read (Law 54).

- **Distinct, non-overlapping meanings.**
  - **pending** — the object exists and is awaiting a decision or a gate; no terminal action has been taken. It is
    *live and unresolved*.
  - **dismissed** — a decision was recorded to set this object aside; it is *resolved by an explicit choice*, not
    by time and not by deletion. A `dismissed` object still exists and remains readable (subject to §2).
  - **expired** — the object's retention horizon (§5) was reached; it is *resolved by time*, not by a decision.
    An `expired` object is a candidate for (or has undergone) logged deletion (§5) and reads as a tombstone.
- **No conflation.** Each transition into `pending` / `dismissed` / `expired` is recorded as a distinct
  `status_changed` `QueueEvent` (§3) with its own type marker. The store never derives one from another
  heuristically (e.g. never infers "expired" merely because an item is old without the retention event, and never
  labels a `dismissed` item `expired`). These three are additive to — and must not be silently mapped onto — the
  scaffold's existing item statuses (`queued`, `blocked`, `done`, `UNKNOWN` in `cto-queue.mjs` / the committed
  schema enum). Any mapping between the scaffold statuses and these store-lifecycle states must be **explicit and
  specified**, never implicit; where no mapping is defined, the state is **UNKNOWN**, not guessed.
- **Honest UNKNOWN (Law 54).** When the store cannot read an object's state — missing record, broken/unverifiable
  event chain (§3), corrupt snapshot (§4), or an unmapped/ambiguous status — it reports **UNKNOWN** out loud
  (mirroring the scaffold's `UNKNOWN = "UNKNOWN"` and the display label *"Unknown — status not shown by the
  evidence"*), never a fabricated `pending`/`dismissed`/`expired`. UNKNOWN is a real, first-class answer, not an
  error swallowed into a default.
- **Display honesty.** A read-only shell over these states must render each with its own plain-English label and
  must render UNKNOWN as UNKNOWN — no state may be silently displayed as another. This is the §16.2 "wide-safe"
  posture: no scary/ambiguous affordance, no state that reads as more (or less) resolved than the evidence shows.

**Adversarial targets for the independent checker.** Make a `dismissed` object report as `expired` (or vice
versa); make an unread/ambiguous state report as a firm status instead of UNKNOWN; collapse two distinct states
into one; produce a `pending` for an object whose state the store never actually read. Each must verifiably fail.

---

## 7. What must be proven before this amendment could ever be accepted (not proven here)

This DRAFT asserts **none** of the following as done. They are the acceptance obligations a later, gated
implementation lane would owe an independent adversarial checker:

1. Opaque-ID adversarial suite (derivation, ordering, enumeration, collision-clobber, ID-as-capability) — all fail.
2. Metadata/content split suite (content via metadata grant, content via ID alone, SECRET-in-metadata) — all fail.
3. Hash-chain tamper suite (edit/delete/reorder/forge/splice/truncate) — verification reports every break.
4. Snapshot immutability suite (in-place mutation, address overwrite, corrupt-served-as-valid) — all fail.
5. Retention suite (unlogged delete, silent GC, deleted-reads-as-live/never-existed, log rewrite) — all fail.
6. State-distinctness suite (conflation, UNKNOWN suppression, fabricated state) — all fail; UNKNOWN is honest.
7. Boundary regression: the scaffold's PUBLIC/INTERNAL-only data-class rule and `displaySafe` redaction remain
   intact and are strengthened, not weakened, by the store.

Until such a checker report exists and its findings are CLOSED, **this document authorizes nothing and claims no
readiness.**

---

*End of DRAFT. STATUS: DRAFT — PENDING INDEPENDENT CHECK. Authorizes nothing (Law 69). No readiness claim.*
