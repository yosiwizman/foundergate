# LANE L1 — FREEZE MANIFEST (evidence-integrity infrastructure, SENSITIVE)

**Lane:** L1 — a builder working ONLY in worktree `foundergate-lanes/L1` on branch
`lane-l1-freeze-manifest`, based on main `e3eb4be81faa9e1945a87ccac8226c580f00fc96`.

**Purpose.** Bind a future §29 soak's evidence to an immutable code state. Before a
qualifying soak begins, `buildFreezeManifest` fingerprints the exact code under test — the
git SHA plus a sha256 + byte count of every file — into a small, tamper-evident manifest.
When the soak's evidence is later reviewed, `verifyFreezeManifest` re-fingerprints the tree
and reports any drift (a file modified, removed, or added) and any tamper with the manifest
itself. This gates every future §29 soak: evidence that cannot be bound to frozen code is
evidence that cannot be trusted. **No soak was run and none is claimed here** — this lane
delivers only the pure freeze/verify infrastructure and its self-tests.

## §28 — Written-authority citation

- **Shared-host workload lease (SHWL) authority packet:**
  `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743`
  (blob SHA at `HEAD:docs/lanes/shared-host-workload-lease.md`, via
  `git -C <wt> rev-parse HEAD:docs/lanes/shared-host-workload-lease.md`).
- **Base commit (main):** `e3eb4be81faa9e1945a87ccac8226c580f00fc96`.

The SHWL packet is the governing authority for §26 (append-only evidence + exact-SHA
provenance), §29 (Honest-Duration / soak-proof), and Law 54 (honest UNKNOWN) as cited in
its own text (packet §"Reused patterns"): §26 at line 26, §29 at line 28, Law 54 at line 27.

## Claims table (with AUTHORITY)

| # | Claim | Evidence (proof) | Authority (`path @ 40-char SHA`) |
|---|-------|------------------|----------------------------------|
| 1 | A manifest is **exact-SHA provenance for a code state**: git SHA + per-file sha256 + byte count, deterministically sorted. | `src/freeze-manifest/freeze-manifest.mjs` `buildFreezeManifest`; `build-verify.selftest.mjs` (well-formed manifest, sorted entries). | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§"Reused patterns": Assembly Manual **§26** — append-only evidence + exact-SHA provenance) |
| 2 | **`manifest_hash` is tamper-evident** over the code-state identity (schema_version + git_sha + sorted entries). Any tamper with an entry, the git_sha, or the schema is refused **fail-closed**. | `computeManifestHash`; `drift-tamper.selftest.mjs` (flipped sha256 → refused; swapped git_sha → refused; malformed/unknown-schema manifest → refused). | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§"Reused patterns": Assembly Manual **§26**) |
| 3 | **Drift detection gates a §29 soak**: a modified / removed / added file is detected; a clean tree verifies with zero drift. | `verifyFreezeManifest`; `drift-tamper.selftest.mjs` (MODIFIED, MISSING, ADDED, and combined) + `build-verify.selftest.mjs` round-trip. | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§"Reused patterns": Assembly Manual **§29** — Honest-Duration / soak-proof: a qualifying soak is bound to the exact code under test) |
| 4 | **Law 54 — honest UNKNOWN, never guess**: an unresolved git SHA or absent `now` is recorded as explicit `UNKNOWN`; an unreadable listed file at build → **refusal (throws)**, never an omitted/guessed entry; verify never silently passes. | `normalizeGitSha`, build refusal path; `build-verify.selftest.mjs` (UNKNOWN sha/created_at, build refuses unreadable path). | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§"Reused patterns": **Law 54** — when it can't be proven, refuse; never guess) |
| 5 | **Determinism**: same tree + same gitSha → byte-identical `manifest_hash`; the hash is independent of the `created_at` timestamp (code identity, not provenance metadata). | `build-verify.selftest.mjs` (two identical trees → equal hash; two timestamps → equal hash). | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§"Reused patterns": Assembly Manual **§26/§29**) |
| 6 | **Timestamps are DATA, never a clock read**: `created_at` is the `now` argument verbatim; no `Date.now()` / `new Date()` anywhere in logic. | `grep` of `src/freeze-manifest/**` shows no `Date.now`/`new Date`; `created_at` echoes the passed `now`. | Lane L1 build brief (timestamps are DATA passed in); consistent with Law 54. |
| 7 | **No ungated heavy-work surface**: every export is a pure hashing / comparison function that starts no build, test, soak, monitor, or browser, so per SHWL §5 it is not a heavy entry point and needs no lease guard — and must never become one. | `src/freeze-manifest/freeze-manifest.mjs` imports only `node:crypto` + `node:fs` (read/stat) + `node:path`; no `child_process`, no network, no process spawn. | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§5 heavy-operation classification: heavy = starts host workload; pure ops are not gated) |

## Files created (ONLY these; nothing else touched)

- `src/freeze-manifest/freeze-manifest.mjs` — core: `buildFreezeManifest`,
  `verifyFreezeManifest`, `computeManifestHash`, `enumerateTree`, `enumerateFiles`, plus
  `SCHEMA_VERSION`, `UNKNOWN`, `DRIFT`, `FreezeManifestError`. Zero-dependency Node v24 ESM;
  pure hashing/verify.
- `src/freeze-manifest/_fmkit.mjs` — shared self-test helpers (OS-temp trees only; not a
  `.selftest.mjs`, so the runner never executes it directly).
- `src/freeze-manifest/build-verify.selftest.mjs` — build+verify round-trip, deterministic
  sort, determinism (same tree → same hash; hash independent of timestamp), per-entry
  sha256+bytes+mode, honest UNKNOWN, fail-closed build refusal (unreadable AND non-regular
  listed path). (12 checks.)
- `src/freeze-manifest/drift-tamper.selftest.mjs` — MODIFIED / MISSING / ADDED / UNEXPECTED
  drift (including same-length edit, exec-bit flip, symlink injection, and combined drift),
  manifest_hash tamper detection, internally consistent forgery caught on disk, external
  `expectedManifestHash` anchor, fail-closed on malformed/unknown-schema manifest and on a
  malformed entry, read-only verify. (19 checks.)
- `docs/assembly-evidence/L1-freeze-manifest/L1_REPORT.md` — this report.

## Test result

`npm test` from the worktree (the repo's `scripts/run-selftests.mjs` runner, Node v24.13.1):
**ALL GREEN — 78/78 self-tests passed** (76 pre-existing + 2 L1 suites:
`build-verify` 12 checks, `drift-tamper` 19 checks = 31 L1 checks). Self-tests use OS-temp
directories only and never touch any real repo path, home dir, or lease.

## Independent adversarial checker — verdict & advisory dispositions

**Verdict: CLEAN** on the core integrity guarantee (no undetected byte-drift, no
verifying-but-lying manifest, all mutation-pinned). The checker raised four LOW advisories;
because this manifest gates every future §29 soak, all four were CLOSED to strengthen
"catch ANY drift".

| Advisory | Disposition | Proof |
|----------|-------------|-------|
| **A2** — a symlink / non-regular file ADDED after freeze was invisible (enumeration emitted only `isFile()` regulars). | **CLOSED** — new `enumerateTree` classifies every entry via `lstat` and returns `{files, nonRegular}`; verify reports any symlink/fifo/socket/device under the frozen root as drift reason **`UNEXPECTED`** (`nonRegular:true`), and a symlink-to-directory is flagged, not traversed. A frozen regular replaced by a symlink is also MISSING. | `drift-tamper.selftest.mjs` A2 checks: injected symlink → UNEXPECTED; regular→symlink swap → MISSING + UNEXPECTED. |
| **A3** — a self-consistent wholesale re-freeze of a tampered tree could verify `ok:true`. | **CLOSED** — `verifyFreezeManifest(manifest, {root, expectedManifestHash})`: when the external anchor is supplied and does not equal the recomputed hash → fail-closed (`manifest_tampered:true`, `hash_mismatch:true`), INSIDE the fail-closed path. Optional (absent = content-addressed); soak callers MUST pass it. | `drift-tamper.selftest.mjs` A3 checks: match → ok; tampered re-freeze caught by anchor; wrong-type anchor refused. |
| **A1** — an exec-bit flip on frozen bytes was undetected. | **CLOSED** — each entry records `st.mode & 0o777`; `mode` is in `canonicalString` (part of `manifest_hash`) and diffed at verify, so a `chmod +x` on unchanged bytes → **MODIFIED**. Determinism holds (same bytes+mode → same hash). | `drift-tamper.selftest.mjs` A1 checks: chmod +x → MODIFIED; no-op chmod → no drift. |
| **A4** — per-entry structural validation was unpinned (could silently rot). | **CLOSED** — a malformed entry (negative/non-integer/wrong-type `bytes`, bad `sha256` shape/type, empty `path`, out-of-range/wrong-type/missing `mode`) → `manifest_tampered:true`. | `drift-tamper.selftest.mjs` A4 check: 10 malformations, each → tampered. |

## Scope & isolation attestation

- Wrote ONLY `src/freeze-manifest/**` and this report under
  `docs/assembly-evidence/L1-freeze-manifest/`.
- Did NOT modify `src/shwl/**`, `src/v8b*`, any other lane directory, or any shared ledger.
- Did NOT read or write any `akior` path; no `akior` reference exists in the new files.
- No soak, no steps I/J. Secret-scan of the new files: clean. Repo remains PRIVATE.

## Design notes carried in code (for the checker)

- `manifest_hash` deliberately covers `schema_version + git_sha + sorted entries`
  (`path + sha256 + bytes + mode`) and **excludes `created_at`** — re-freezing identical code
  at a different time yields the same fingerprint (a useful code-binding property).
  `created_at` is provenance metadata; tamper with it does not affect the code-state binding.
  Verify refuses any tamper with the hashed fields, and any real file that no longer matches
  its frozen sha256/mode is MODIFIED drift regardless of an internally consistent re-hash (the
  "forgery caught on disk" test). For a wholesale self-consistent re-freeze, callers pass the
  external `expectedManifestHash` anchor (A3) — soak callers MUST.
- `enumerateTree` is the single source of truth for "what does this tree contain" — regular
  files (to build/diff) AND non-regular entries (to flag as UNEXPECTED). It skips `.git` by
  default and follows no symlinks (`lstat`). `enumerateFiles` is the thin regular-files wrapper
  callers pass to build. Drift semantics are symmetric between build and verify.

*No readiness claim is made. An independent adversarial checker and the sheriff follow.*
