# Evidence Viewer — readable per-bundle surface (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-7-evidence-viewer` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** the Playwright evidence **index** (lane `w2-6`) reads *across* every
bundle and answers "which bundles exist and which claims aren't backed?" — it is the directory. It does
**not** let the founder open **one** bundle and *read* it. That is the gap the V8-B completion matrix
names: **Evidence Viewer = NOT BUILT, missing "readable viewer surface"** — and the index's own REPORT
flagged "a readable per-bundle drill-in surface" as the next lane. This lane is that surface: **one pure,
read-only viewer that opens a single evidence bundle and shows its files, the hashes that make each file
checkable, what the run did, what it recorded, and one honest verdict on whether the bundle can be
trusted.**

**Why it matters — the check a viewer uniquely exposes:** a bundle's hash manifest is what makes it
*falsifiable*. A file listed **with** a valid sha256 is *verifiable* — a reviewer can run
`shasum -a 256 <file>` and check it. A file listed **without** a usable hash is *unverifiable* — the
bundle names it but gives you no way to prove it is what it claims. The viewer decides this
independently of the bundle's own words: a `RESULT.json` that says `foreground_state: VERIFIED` never
overrides files that aren't hashed. A bundle is **self-verifying** only when *every* file it lists
carries a recomputable hash; a bundle that records **PASS** while not self-verifying is an **unsupported
claim** at the file level.

**What the viewer shows on the real committed evidence** (run the generator to reproduce):
- **`foreground-founder-surface-final` → PASS, 21 of 21 files hashed → self-verifying.** The rich
  founder-surface bundle reads in full: its recorded facts (`run_id`, `candidate_sha`, `browser`,
  `governed_pack_sha256`, …), its file manifest with every sha256, the steps the run took
  (`goto /`, `open-existing-run`, `click #pack-dl`, …), its ten screenshot names, and its observed
  counts — with an honest banner confirming every listed file can be recomputed. See
  [`bundle-view-surface.html`](bundle-view-surface.html).
- **`launcher` → UNKNOWN, 0 of 2 files hashed → not checkable.** The launcher bundle has real files
  (`FINDER_LAUNCH_EVIDENCE.md`, `initial-page.png`) but **no `ARTIFACT_HASHES.sha256`**. The same viewer
  says so out loud — "these files carry no recomputable hash" — instead of dressing it up as proven. See
  [`bundle-view-unverifiable.html`](bundle-view-unverifiable.html). (It is UNKNOWN, not PASS, so it is
  *partial evidence*, not an *unsupported claim* — a bundle that claims no pass overstates nothing.)

Two bundles, the same viewer, the same real disk: one you can fully check, one you cannot — and the
surface tells them apart truthfully.

**What can go wrong (and how this guards against it):**
- *An act edge sneaks in* → the viewer is pure and read-only; its self-test scans the module source for
  `fs`/`net`/`child_process`/`fetch`/`spawn`/`readFileSync`/etc. and the rendered page for
  `<script>`/`<form>`/`<button>`/`<input>`/`on*=`/`href`. There is no "re-run" or "accept" control — the
  viewer opens no file, recomputes no hash, and runs nothing. The act edge stays frozen to VB3.
- *A pass is trusted without proof* → a PASS bundle that is not self-verifying is flagged as an
  **unsupported claim** and the unhashed files are named; only a claimed PASS can be one.
- *The bundle's own words override the evidence* → the verdict/facts are shown as **self-reported**; the
  independent trust decision comes from the manifest, not from a `VERIFIED` string. A self-test proves a
  bundle whose facts say "verified" is still flagged when its files aren't hashed.
- *Invented state* → an unreadable verdict is `UNKNOWN`, never assumed PASS; a missing byte size is
  "size unknown", never guessed to 0; a file absent from the manifest carries no hash, never a fabricated
  one (Law 54).
- *Non-reproducible evidence* → both the viewer and the generator are deterministic (no clock, no
  randomness; files sorted): same disk in → byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/evidence-viewer.selftest.mjs` — 25 checks, all green.
2. `npm test` at the repo root — the whole suite stays green with the viewer added.
3. `node docs/assembly-evidence/vb2-evidence-viewer/render-evidence.mjs` — re-reads the real bundles and
   regenerates both pages (byte-identical).
4. Open [`bundle-view-surface.html`](bundle-view-surface.html) (a self-verifying bundle) and
   [`bundle-view-unverifiable.html`](bundle-view-unverifiable.html) (a bundle with no hash manifest) — the
   same read-only viewer, telling the two apart.

**One next action:** the viewer reads a bundle. Wiring an *act* edge (re-run a bundle, accept it) remains
frozen to VB3 (Gate/Witness Engine) behind a founder gate. GitHub links / integration cards is the next
matrix gap and a separate lane.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/evidence-viewer.mjs` | Pure, read-only single-bundle viewer: `normalizeManifestEntry`, `normalizeView`, `renderView{Text,Html,SurfaceHtml}`. No io, no act edge. |
| `src/v8b2/evidence-viewer.selftest.mjs` | 25-check proof: file-level verifiability, unsupported-claim guard, facts-don't-override-hashes, no-invented-state, complete page, escaping, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-evidence-viewer/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface) — reads a real bundle on disk (files, sizes, manifest, facts, steps, screenshots) and feeds the pure viewer. |
| `docs/assembly-evidence/vb2-evidence-viewer/bundle-view-surface.html` | Rendered view of a fully self-verifying PASS bundle. |
| `docs/assembly-evidence/vb2-evidence-viewer/bundle-view-unverifiable.html` | Rendered view of a bundle with no hash manifest — the honest "not checkable" case. |

## Scope discipline
Adds only a new read-only viewer module + its self-test + evidence. Does **not** touch any frozen VB2
scaffold file, changes no schema, adds no capture/run/act path, and does not modify the existing
safety-check capture tools, `playwright.config.mjs`, or the sibling index module. It composes only DATA
the generator reads from disk. This lane commits locally only; it does not push or merge (Terminal-0 owns
merges).
