# VB0 — Independent Adversarial Isolation Checker Report (round 2)

> **Provenance:** same INDEPENDENT read-only adversarial checker (builder ≠ checker), re-review after the round-1
> fixes. Committed verbatim. Round-3 re-review (after the F2/F3 completions) is in `checker-report-round3.md`.

VERDICT: 2 of 4 CLOSED, 2 STILL-OPEN — F1 CLOSED, F2 STILL-OPEN (leaf-symlink escape survives the fix, MEDIUM), F3 STILL-OPEN (case-insensitive nesting/idempotency bypass survives the fix, MEDIUM), F4 CLOSED. NOT mergeable yet.

Module re-reviewed: `/Users/yosiwizman/Projects/foundergate/src/v8b0/attached-projects.mjs` (all 4 self-tests pass). Every result below was reproduced live against the current file on this darwin (case-insensitive APFS) box — the real deployment platform.

## F1 — HIGH (hash collision) — CLOSED
`projectId()` is now `"p" + sha256(canonicalRoot(root)).slice(0,16)` and `attach()` idempotency compares canonical paths, not ids. Verified: the round-1 collision pair now gets distinct ids (`id(Aa)=p1199a765f10e4f69`, `id(BB)=pcb8ddf460dfb6cbf`; were identical `p6c6acecf`); attaching two distinct colliding-name projects yields 2 entries; `setActive(idB)` resolves to B, not A. A 64-bit SHA-256 prefix is not attacker-constructible; idempotency keyed on canonical path. Schema `id` pattern widened to `^p[0-9a-f]{16}$`. **Closed.**

## F4 — LOW (untrusted id↔root on load) — CLOSED
`loadRegistry()` drops entries where `id !== projectId(root)` and nulls a rogue `active_id`. Verified with a forged entry + active_id pointing at it: only the self-consistent entry survives, active_id → null, `activeRoot` → UNKNOWN. **Closed.**

## F2 — MEDIUM (withinProject symlink escape) — STILL-OPEN (fix incomplete)
The fix realpaths the target's PARENT only, then re-attaches `basename(target)` un-resolved. That closes the intermediate-component repro (`linkToB/.foundergate/secret.txt` now rejected) but leaves a LEAF symlink unresolved.
Reproduction (executed): active A, sibling secret B.
```
ln -s <B>/.foundergate/secret.txt  A/leakFile ; withinProject(A,"leakFile") -> ALLOWED (BAD)
ln -s <B>/.foundergate             A/leakDir  ; withinProject(A,"leakDir")  -> ALLOWED (BAD)
```
A reader that opens the returned path follows the symlink and reads B's SECRET while A is active. The cabinet reader independently realpaths the final target (protected), but `withinProject` is the exported general helper and its guarantee is false for a leaf symlink. **Fix:** realpath the full existing prefix of the target (deepest existing ancestor), not just the parent.

## F3 — MEDIUM (case-insensitive nesting/idempotency bypass) — STILL-OPEN (fix does not address case)
The fix routes through `canonicalRoot()` = `realpathSync(resolve(root))`, but realpathSync on macOS resolves symlinks and does NOT normalize case — it returns the caller's casing. So `canonicalRoot("…/Outer")` ≠ `canonicalRoot("…/outer")` → distinct ids and the `startsWith` nesting compare still misses.
Reproduction (executed): physical `Outer/` containing `Outer/sub/`:
```
attach(reg,"…/Outer"); attach(reg,"…/outer/sub") -> SUCCEEDED (BAD; nested child accepted; n=2)
attach(reg,"…/Outer"); attach(reg,"…/outer")     -> n=2 (BAD; expected idempotent n=1)
```
The round-2 proof titled "case/symlink" only tests symlink aliases (which realpath resolves); it never tests a CASE alias, so it passes while the case attack remains open. **Fix:** case-fold the canonical path on case-insensitive volumes before hashing/comparing (detect case-insensitivity, or resolve the true on-disk casing per component).

## What I could NOT break (this round)
F1 hash-collision drop (distinct ids, correct active root); F4 disk forgery (forged entries dropped, rogue active nulled); F2 intermediate-component symlink (now rejected); `..` traversal and absolute-into-B (rejected); no-auto-attach / honest-UNKNOWN (missing/corrupt → empty; never auto-select; UNKNOWN for null/rogue/detached/unreadable; registry persists paths + metadata only, never content/secrets).

**Bottom line:** F1 and F4 properly closed. F2 and F3 narrowed but not closed — both fixes lean on realpathSync, which resolves symlinks but is applied only to the parent in withinProject (leaf symlink escapes) and does not case-normalize on macOS (case aliases split). Both remaining holes are reproducible on the darwin target and must be closed before merge.
