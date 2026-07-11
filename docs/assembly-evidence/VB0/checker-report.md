# VB0 — Independent Adversarial Isolation Checker Report (round 1)

> **Provenance:** produced by an INDEPENDENT read-only adversarial checker subagent dispatched by the CTO under the
> SENSITIVITY RULING (builder ≠ checker). Committed verbatim as evidence. Round-2 re-review (after fixes) is in
> `checker-report-round2.md`. All findings must be CLOSED before merge.

VERDICT: 4 findings (1 HIGH, 2 MEDIUM, 1 LOW). The isolation boundary is breakable. All 20 committed self-test checks pass, yet none of them cover the three attack classes below — the proofs give false confidence.

Module under review: `/Users/yosiwizman/Projects/foundergate/src/v8b0/attached-projects.mjs`
All PoCs below were executed against the real module on this machine (darwin, case-insensitive APFS) and reproduced live.

---

## FINDING 1 — HIGH — `projectId()` 32-bit hash collision → wrong project attached/activated (cross-project bleed + silent drop)

**Class:** CROSS-PROJECT BLEED / AUTO-SELECT-of-wrong-root / STATE LEAKAGE.

**Root cause** (`attached-projects.mjs`): `projectId()` is a rolling 31-polynomial hash folded to 32 bits (`(h*31 + c) | 0`, then `>>> 0`). This hash is deterministic, public, and trivially collidable. The classic `"Aa"` vs `"BB"` substitution (`31*65+97 == 31*66+66 == 2112`) preserves the hash, and it composes: any two absolute paths identical except for an adjacent `Aa`↔`BB` pair produce the same id. An attacker who controls a directory name can craft a directory whose absolute path collides with a victim project the founder also attaches.

**Confirmed collisions (executed):** `/tmp/proj/Aa` and `/tmp/proj/BB` → both `pc25acfab`; real dirs `Aa`/`BB` (each a valid project) → both `p6c6acecf`.

**Reproduction:** the founder EXPLICITLY attaches two distinct projects A then B; B's id collides with A's, the `attach` idempotency short-circuit `if (p.id === id) return` treats B as "already attached" and DROPS it; the registry holds only A. `setActive(idB)` == `setActive(idA)`; `activeRoot()` returns A's root. Every reader scoped to `activeRoot()` then reads the wrong project. Violates Boundary Rule 3 (no path/state bleed) and Rule 2 (the founder, not a hash accident, chooses active).

**Suggested fix:** cryptographic id of the canonical (realpath, case-normalised) root; in `attach`, only treat an entry as idempotent when the actual canonical PATHS match, never on id equality alone.

## FINDING 2 — MEDIUM — `withinProject()` uses lexical `resolve()`, not `realpath()` → symlink inside A escapes into B

**Class:** CROSS-PROJECT BLEED via symlink escape.

A symlink inside project A pointing at project B passes the lexical `startsWith(root + sep)` check because the string still begins with A's root; the symlink is never resolved. **Executed:** `ln -s B A/linkToB`; `withinProject(A, "linkToB/.foundergate/secret.txt")` → ALLOWED (physically inside B). The File Cabinet reader independently realpaths and fails closed, so the cabinet path is protected — but `withinProject` is exported as the general isolation helper and its guarantee is only lexical. **Fix:** realpath inside `withinProject`, fail-closed, compare against `realpathSync(root)`.

## FINDING 3 — MEDIUM — case-insensitive filesystem defeats the nested-project attach check

The nesting guard does a case-sensitive `startsWith`. On case-insensitive volumes (macOS APFS), `/D/Outer` and `/D/outer/sub` are physically nested but not detected. **Executed:** attach `Outer` then `outer/sub` → both succeed (nesting bypassed); attach `Outer` then `outer` → two entries for one physical dir. **Fix:** canonicalize (realpath) before every comparison and before hashing.

## FINDING 4 — LOW — `loadRegistry()` never re-verifies `id === projectId(root)`; the id↔root binding on disk is untrusted

Anyone who can write FounderGate's own registry file can set an arbitrary `id` for an arbitrary `root`; `activeRoot` honors `p.root` directly. Requires write access, so LOW, but combined with Finding 1 the id is not a reliable identity token. **Fix:** on load, drop entries whose `id !== projectId(root)`; validate against the schema; drop an `active_id` with no surviving entry.

## What I could NOT break
- No-auto-attach on missing/corrupt registry (loads empty; corruption never auto-activates).
- No auto-select of "the first" project (activeRoot UNKNOWN when active_id null; exactly one `projects.push`, in `attach`).
- Law-54 honest UNKNOWN (no active / unknown id / unreadable `.foundergate` / never-existed root → UNKNOWN; never falls back to another project).
- `detach` clears active (no dangling active from a normal detach).
- Sibling prefix false-positive is correctly avoided by the `+ sep`.
- Registry stores no content — only `{id, root, name, attached_at}`; a project secret is never persisted.

**Bottom line:** the "never auto-attach / honest-UNKNOWN / no-content-in-registry" half is solid; the project-IDENTITY half (Findings 1–3) let one project's root surface while the founder believes another is active. Fixing Finding 1 (realpath-derived cryptographic id + compare-by-path idempotency) and canonicalizing paths before every comparison closes all three bleed paths.
