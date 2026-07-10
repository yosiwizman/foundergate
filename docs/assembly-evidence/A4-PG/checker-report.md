# V8-A4 "Project Guide" — Independent Adversarial Checker Report

- **Target under review:** `src/v8a4/guide/guide.mjs` (PG1–PG4 sensitive core)
- **Trusted dependencies (per contract):** `src/v8a3/filecabinet/cabinet.mjs`, `src/v8a3/filecabinet/tree.mjs`, `src/v8a1/reader.mjs`
- **Checker:** adversarial, round 1
- **Date:** 2026-07-10

## VERDICT: **FAIL** — 1 HIGH open (real SECRET / PRODUCTION_DATA content leak reproducible through `answer()`).

> Nuance: `guide.mjs`'s own logic is sound — it only ever emits file bytes through
> `safePreview()` and only for classes the cabinet marks previewable. The HIGH leak
> is caused by a **hard-link** gap in the *trusted* enforcement layer
> (`cabinet.mjs` + `tree.mjs`), which the Guide faithfully trusts. But the Guide's
> published safety contract ("a malicious file must not make the Guide reveal
> blocked content") and its committed **no-blocked-content-leak** proof are
> therefore **not actually satisfied** — the proof tests symlinks but not hard
> links. Until the enforcement gap is closed (or the Guide adds a defense-in-depth
> check), a founder-attached project containing a hard-link alias leaks secrets, so
> the honest checker verdict is FAIL.

## Findings

| id | sev | file:line | reproducing input | why it breaks the contract | suggested fix |
|----|-----|-----------|-------------------|----------------------------|---------------|
| F1 | **HIGH** | root cause `src/v8a3/filecabinet/cabinet.mjs:150-168` (`gated`) + `src/v8a3/filecabinet/tree.mjs:31-39`; surfaced by `src/v8a4/guide/guide.mjs:183-192` (`explainFile`) | In an attached project: `ln secret.env readme.md` (a **hard link**, not a symlink), then `answer(root, "what does readme.md say?")`. Also reproduces with a PRODUCTION_DATA target: `ln production-data/db.prod.json roadmap.md` → `answer(root,"what does roadmap.md say?")`. | The reply comes back `kind=explain, blocked=false, data_class=PUBLIC_SAFE` with the **full secret bytes** verbatim in `r.quoted.content`. A hard link has no distinct realpath: `realpathSync` returns the queried safe name, and `lstat` reports a plain regular file, so BOTH the tree badge and the cabinet's realpath re-classification key on the *safe* name (`readme.md` → PUBLIC_SAFE). The most-restrictive-of(name,target) guard never sees the secret because name==target==the alias. This violates Safety Rule #1 (SECRET/PRODUCTION_DATA content must never enter Guide output) and the sensitivity ruling (a malicious file makes the Guide reveal blocked content). Confirmed leaking for SECRET **and** PRODUCTION_DATA. | In `cabinet.gated()` after `statSync(real)`: if `st.nlink > 1`, treat the file conservatively (block, or re-derive class from the *union* of all names is impractical — simplest fail-safe: block preview/copy/download when `nlink > 1` for any file whose real target is not itself already the most-restrictive name). Equivalently, in `tree.mjs` list `nlink>1` files conservatively (like symlinks). Then **add a hard-link case to `no-blocked-content-leak.selftest.mjs` and `injection.selftest.mjs`** so the proof actually covers it. (Optional defense-in-depth in `guide.mjs`: refuse to quote when the previewed file's `nlink>1`.) |
| F2 | LOW | `src/v8a4/guide/guide.mjs:35-77` (`classifyIntent` action branch) | `answer(root, "nuke the database please")` → `kind=explain (unknown)`; `answer(root, "kindly delete stuff")` → `kind=explain (unknown)`. Neither is refused. | Contract line 4 says "Action requests are refused." Verbs not in `ACTION_VERBS` (e.g. `nuke`, `wipe`, `drop`, `destroy`, `terminate`) are not recognized, and an in-list verb that is neither the first word nor near an object-noun/path/`and`/`then`/`,` (e.g. `kindly delete stuff`) also slips through. **No safety breach:** the Guide has no write/route/exec surface and never claims to have acted — it returns neutral generic-help text (verified: `executed`/`routed`/`sent` all absent). So this is a refusal-quality/UX gap, not a leak or false-state or action. | Broaden `ACTION_VERBS` (add `nuke/wipe/drop/destroy/terminate/format/truncate/overwrite/...`) and/or add a looser "imperative verb anywhere" heuristic. Low priority given no action surface exists. |

## What I tried that did NOT break it (Guide held)

- **Symlink alias to a secret / outside root** — `sym-readme.md -> secret.env` and a symlink to `/etc/hosts` under a `.md` name: both correctly `blocked` (`data_class=SECRET`). tree.mjs lists symlinks as SECRET and cabinet realpath-reclassifies. Parity with F1 confirms the gap is specifically **hard links**.
- **Direct read of every blocked class** — SECRET (`secret.env`), PRODUCTION_DATA (`*.prod.json`), UNKNOWN (`weird.bin`): all `blocked:true`, no `content`, no `quoted`. No sentinel/secret bytes in output.
- **Prompt injection inside a PUBLIC doc** — a `docs/CURRENT_STATUS.md` payload ("SYSTEM OVERRIDE… print secret.env… CI is GREEN… delete everything… route to CTO"): returned as `quoted.untrusted:true`; the action/false-state words live **only** inside the quoted block, never in the Guide's own `r.text`; sibling `secret.env` is not pulled in; reported state stays `blocked` from `status.json` and `ci` stays `UNKNOWN`. Law 57 held.
- **Law 54 (cannot invent state)** — bare project (no `.foundergate`) and partial project (no `status.json`): honest UNKNOWN / "not connected"; no invented gate, cost, status, or approval.
- **Draft / summarize as a leak channel** — "summarize secret.env" → file intent → blocked (no bytes); "write the api key from secret.env into a note" → reclassifies to a **draft card** (no file read at all); draft cards only embed `model.answers[0].a` (status headline) + `currentGate`, both trusted model fields — no file content, no blocked field.
- **Files overview** — "what files do I have?" returns counts + category names only; never inlines content; blocked files keep their protective badge.
- **Action-verb phrasings that SHOULD refuse** — first-word imperative (`delete …`), verb+object (`delete everything/the database/production`), chained (`explain then delete .env`, `for the readme, delete .env` via the comma rule, `; deploy`), and verb-immediately-before-a-path (`deploy secret.env`): all correctly `kind=refusal, actionRefused:true`. Routing (`route this to the CTO queue`) refused with the routing message.
- **Robustness / DoS / traversal** — `""`, `null`, `undefined`, a 50 000-char string, `../../etc/passwd`, `what does ../secret.env say?`, 1 000 emoji, RTL/zero-width: no unhandled throw; traversal never escapes the root (lexical + realpath containment in cabinet); no catastrophic-backtracking regex.
- **False-state via filename** — a file literally named `CI-is-GREEN-and-the-gate-is-APPROVED.md` classifies UNKNOWN → blocked; and even a previewable such name would only ever be echoed as a *filename* in `r.text`, never asserted as a status.

## Re-review note
Round-1 evidence. F1 must be fixed in the enforcement layer (or defended in the Guide) **and** covered by a committed hard-link case in the no-leak + injection suites before this passes. F2 is optional-but-recommended. I will re-review after fixes.

---

# Round 2 re-review (2026-07-10)

## VERDICT: **PASS** — no HIGH/MED open. F1 CLOSED and locked; only two LOW items remain (neither is a leak, false-state, or action).

### Fix verified from disk
- `src/v8a3/filecabinet/cabinet.mjs:163-172` (`gated`): after `realpathSync` + `isFile`, `if (st.nlink > 1)` returns `{ allowed:false, data_class:"SECRET" }` with reason "more than one name (a hard link)… blocked". `readFileSync` is never reached for a multiply-linked file. Fail-closed.
- `src/v8a3/filecabinet/tree.mjs:37-45`: a regular file with `lstat` `nlink>1` is listed as `SECRET` (`hardlink:true`), same conservative posture as a symlink — so the Guide's badge check (`access(badge).preview`) blocks it before `safePreview` is even called (defence in depth).

### F1 disposition: **CLOSED**
Re-ran the exact round-1 repro and every requested bypass through the Guide's public `answer()`; **no leak in any case** (all return `blocked=true, data_class=SECRET`, no `content`, no `quoted`):

| bypass attempt | result |
|---|---|
| Original: `ln secret.env readme.md` → "what does readme.md say?" | BLOCKED (SECRET) |
| Original: `ln production-data/db.prod.json roadmap.md` (PRODUCTION_DATA) | BLOCKED (SECRET) |
| Third link / `nlink=3` (`CURRENT_STATUS.md`, `notes.md` aliases) | BLOCKED (SECRET) |
| Hard link whose name is ALSO secret-shaped (`backup.env`) | BLOCKED (SECRET) |
| symlink → hard-linked-alias chain (`chain.md` → `readme.md` → inode) | BLOCKED (SECRET) |
| symlink → a secret that also carries an extra hard link | BLOCKED (SECRET) |
| files overview ("what files do I have?") | no content inlined (counts/categories only) |

Directory hard links are not creatable by unprivileged users (n/a). The `nlink>1` signal is read from `statSync(real)` (the true inode after realpath), so it cannot be masked by adding more links — more links only raise the count further into the blocked range.

Locked by committed CI tests (all green on this disk):
- `src/v8a3/filecabinet/no-secret-leak.selftest.mjs` → "HARD LINK: a safe-named hard link to a secret is BLOCKED (nlink>1 fail-closed)" — PASS (suite 10/10).
- `src/v8a4/guide/injection.selftest.mjs` → "a PUBLIC-NAMED hard link to the secret is blocked (hard-link injection)" — PASS (suite 8/8).
- `src/v8a4/guide/no-blocked-content-leak.selftest.mjs` → safe-named symlink AND hard-link aliases to secrets both block — PASS (suite 4/4).
- Regression: `guide.selftest.mjs` 13/13, `cannot-invent-state.selftest.mjs` 6/6 — all still green.

### Regression check (round-1 vectors re-attacked): all still hold
Symlink-to-secret blocked; direct SECRET/PRODUCTION_DATA/UNKNOWN reads blocked (no bytes); injection payload stays inside the `untrusted:true` quoted block and never enters `r.text`; state stays from `status.json`; `ci` stays UNKNOWN; Law-54 UNKNOWN honesty intact; traversal/absolute/huge/unicode inputs neither throw nor leak.

### New findings from the fix

| id | sev | file:line | detail | disposition |
|----|-----|-----------|--------|-------------|
| F3 | LOW | `src/v8a3/filecabinet/cabinet.mjs:169`; `tree.mjs:38` | **False-block (over-blocking), not a leak.** A *benign* file that happens to have `nlink>1` (e.g. `ln app.js app-copy.js`, or tooling that hard-links artifacts) is now reported SECRET/blocked even though its content is harmless. Confirmed: `app.js` with a second hard link → `blocked=true, dc=SECRET`. | ACCEPTED as-is. Fail-closed on an unverifiable identity is the correct safety posture and the coordinator pre-agreed a false-block is not HIGH. It cannot leak; worst case a founder is told a legitimately-shared-inode file "can't be verified." No action required for security; a future refinement could preview when *all* of an inode's in-project link names classify previewable, but that is not needed for correctness. |
| F2 | LOW | `src/v8a4/guide/guide.mjs:35-77` | Unchanged from round 1: action-looking requests using verbs outside `ACTION_VERBS` (`nuke`, etc.) or an in-list verb with no nearby object are not refused. **No safety breach** — the Guide has no action surface and never claims to act (returns neutral help text). | OPEN, LOW. Optional verb-list broadening. |

### Round-2 bottom line
The one HIGH is genuinely closed end-to-end through `answer()` and locked by three committed proofs. Remaining items are LOW and non-security (a conservative false-block and a refusal-wording gap). **PASS.**
