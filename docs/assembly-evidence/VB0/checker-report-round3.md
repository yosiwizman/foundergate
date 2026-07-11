# VB0 — Independent Adversarial Isolation Checker Report (round 3)

> **Provenance:** same INDEPENDENT read-only adversarial checker (builder ≠ checker), re-review after the F2/F3
> completions + the A2 hardening. Committed verbatim. This is the round that CLOSES all findings.

VERDICT: ALL FINDINGS CLOSED — mergeable. F1, F2, F3, F4 all verified CLOSED against live repros; no new blocking finding. One non-blocking hardening note recorded (since addressed by the builder with a `..`-segment rejection).

Module re-reviewed: `/Users/yosiwizman/Projects/foundergate/src/v8b0/attached-projects.mjs`. All four committed self-tests pass (7 / 6 / 9 / 4 checks). Every result below was reproduced live against the current file on this darwin / case-insensitive APFS box — the real deployment platform — and the round-2 open items were re-run with their exact original repros.

## F1 — HIGH (hash collision) — CLOSED (still)
`projectId` hashes `canonicalKey` with SHA-256. The classic `Aa`/`BB` pair gets distinct ids; two distinct real dirs get distinct keys and both attach (n=2). Idempotency compares canonical keys, never id alone. No silent drop, no wrong-root activation.

## F2 — MEDIUM (withinProject symlink escape) — CLOSED
`realpathPrefix()` walks up to the deepest existing prefix of the target and realpaths it (resolving symlinks at every existing level, including the leaf), then re-checks containment against `realpathSync(root)`. Re-ran the round-2 leaf-symlink repro:
- `A/leakFile -> B/.foundergate/secret.txt` (leaf file symlink): REJECTED
- `A/leakDir -> B/.foundergate` and `leakDir/secret.txt` through it: REJECTED
- symlink in an existing prefix with a non-existing leaf (`link->B`, `link/newfile`): REJECTED
- `..` climbing to a sibling: REJECTED
- Regression guard — an in-bounds symlink (`inlink -> A/.foundergate`) is still ALLOWED; in-bounds relative paths still resolve. No over-rejection.

## F3 — MEDIUM (case-insensitive nesting / idempotency split) — CLOSED
Identity/idempotency/nesting key on `canonicalKey`, which case-folds via a live `isCaseInsensitive()` inode probe. Re-ran the round-2 case repro on this case-insensitive volume:
- `canonicalKey("…/Outer") === canonicalKey("…/outer")` → true (collapsed; was two distinct strings in round 2).
- `attach(Outer)` then `attach(outer/sub)` (physically nested child via case-variant ancestor): REJECTED.
- `attach(Outer)` then `attach(outer)` (same dir, case-variant): registry has 1 entry (idempotent).
- Nesting via a symlink alias into an attached tree: REJECTED.
I checked the dangerous inverse — that case-folding cannot make two genuinely distinct dirs share a key and resurrect the F1 drop. `isCaseInsensitive` returns true only when a case-flipped spelling stats to the same dev/ino, so it cannot false-positive a case-sensitive volume into folding distinct inodes. Verified distinct dirs keep distinct keys and both attach.

## F4 — LOW (untrusted id↔root on load) — CLOSED (still)
A hand-crafted registry whose entry has `id !== projectId(root)` is dropped on load and its rogue `active_id` is nulled → `activeRoot` UNKNOWN.

## Fresh attacks attempted this round (all defended)
Non-existing-leaf-through-symlink, lexical `..`-after-symlink cancellation, `..` sibling climb, in-bounds-symlink over-reject regression, all-numeric leaf path identity stability / no crash in `isCaseInsensitive`, distinct-dir key separation, symlink-aliased nesting. None produced a bleed, a wrong-root activation, an auto-attach, or a dishonest non-UNKNOWN.

## Non-blocking hardening note (A2) — addressed
`withinProject` lexically cancels `..` in `resolve()` before symlinks are considered; safe as implemented because callers open the RETURNED, containment-checked path. To remove even the theoretical divergence for a caller that re-opens the raw relPath, the builder now (a) documents that callers MUST use the return value and (b) rejects any `..` segment outright. Not merge-blocking.

## What I could NOT break
The complete boundary is solid: no cross-project bleed (path, content, or state), no auto-attach / auto-select, honest UNKNOWN on unreadable/absent/detached/rogue active, registry stores paths + metadata only (no secret ever written), collision-resistant crypto identity keyed on a case- and symlink-canonicalized path, leaf-and-intermediate symlink escapes rejected in both `attach` nesting and `withinProject`, and disk-forged id↔root bindings dropped on load. All 26 committed self-test checks pass. I recommend merge.
