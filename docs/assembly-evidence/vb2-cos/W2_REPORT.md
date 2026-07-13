# W2 (docs) — VB2 ClassifiedObjectStore amendment authority (DRAFT) — evidence

> **STATUS: DRAFT — PENDING INDEPENDENT CHECK.** Docs-only lane. **Authorizes nothing (Law 69). No readiness
> claim. No soak-pass asserted.** This report indexes the DRAFT authority doc and the exact VB2/contract sources
> it amends, each pinned by resolvable full 40-char SHA (§28).

## Deliverable

- `docs/lanes/vb2-classifiedobjectstore-amendment.md` — new DRAFT authority doc specifying the VB2
  ClassifiedObjectStore amendment (opaque object IDs; separate metadata/content authorization; append-only
  hash-chained `QueueEvent` log; immutable content-addressed snapshots; explicit+logged retention; distinct
  pending/dismissed/expired states with honest UNKNOWN per Law 54). Design DRAFT only — edits no `src/**` file.

## AUTHORITY provenance (path @ full-40-char SHA — resolvable via `git rev-parse HEAD:<path>`)

| AUTHORITY | Path @ SHA | Role |
| --- | --- | --- |
| V8-B Build Contract (LIVE; authorizes nothing by itself — Law 69) | `docs/lanes/V8-B-build-contract.md @ 670046b74b805790de785daa3f14cb0c7f5bad12` | Scope-fixing contract this amendment narrows/hardens; not widened. |
| VB2 CTO queue data model (scaffold — NOT edited) | `src/v8b2/cto-queue.mjs @ 44d6a6d3ab86e9a9716f0676aa5023dc252daad1` | Surface amended: id shape, data-class boundary, statuses, UNKNOWN. |
| VB2 read-only display shell (scaffold — NOT edited) | `src/v8b2/queue-view.mjs @ 7e4d5eb78e2ec9605cb022d110da61a80f951285` | Surface amended: `displaySafe` redaction → storage-layer authorization. |
| VB2 committed queue schema (scaffold — NOT edited) | `src/v8b2/schemas/cto_queue.schema.json @ 37c42c1ad2a10b4b51c4b832e8deba788929a040` | Surface amended: `additionalProperties:false`, id/status/data_class enums. |

## Host discipline / hard rules honored

- Docs-only DRAFT. No `src/**` file edited. No local test/build/soak/service run. Read-only git/gh + docs writes.
- Did NOT touch `docs/lanes/shared-host-workload-lease.md`, any `src/**`, any other lane's file, or shared ledgers.
- Repo PRIVATE — diff secret-scanned before commit; no secrets, tokens, or keys introduced.
- STOP at PR-open. No merge. No readiness claim. No soak-pass line.
