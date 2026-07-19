# VB2 — GitHub Integration Cards (read-only repo/PR/branch/file cards)

**Requirement (V8-B completion matrix):** *GitHub links / integration cards* — **NOT BUILT**,
missing "read-only repo/PR/branch/file cards".

**Status after this lane:** built. A founder-readable surface renders the repository, each open
pull request, its branch, its head commit, and its changed files as cards — each carrying the
exact canonical `github.com` link — over the data FounderGate's existing read-only GitHub
collector already gathers.

## What was added

- **`src/v8b2/github-cards.mjs`** — a pure, read-only surface. It takes the collector's
  normalized bundle (`src/collectors/github/github-collector.mjs` → `normalizeBundle`) and:
  - derives the canonical `github.com` URL for the **repo**, each **PR**, each **branch**, each
    **head commit**, and each **file** (blob pinned to the head SHA, falling back to the branch);
  - shows every URL as **copyable text, never a clickable `<a href>`** — see the link stance
    below;
  - carries the collector's **`source` truth-label** (`live-gh` vs `fixture`) to the top of the
    page, so a founder always knows whether they are looking at a live read or a committed sample;
  - surfaces CI rollup (passing/failing/pending), mergeability, Copilot review state (and whether
    it is bound to the current head SHA, i.e. not stale), and unresolved review threads.
  - No `fs` / net / `child_process` / clock / randomness. Same bundle in → byte-identical page out.

- **`src/v8b2/github-cards.selftest.mjs`** — 16 checks: URL derivation for every card kind,
  branch-slash preservation with per-segment encoding, honest `null`/"no canonical link" for
  non-`owner/name` repos and missing/redacted/malformed components, injection-safe escaping,
  purity, deterministic output, complete page, the source truth-label, and the two act-edge scans
  (source side-effect imports + exported-name act words).

- **`docs/assembly-evidence/vb2-github-cards/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and the rendered page (`github-integration-cards.html`).

## The link stance — the honest heart of a "links" surface

The requirement is literally *GitHub links*, yet every FounderGate surface is observably
read-only: it carries **no navigable link** (`<a href>`) so there is nothing an interaction can
ride. This surface honours both. It derives the exact canonical URL for every entity and shows it
as **copyable `<code>` text** (`user-select:all`). The founder can see and copy the precise link;
the page itself navigates nowhere, clicks nothing, and merges nothing. *"Here is the link"* — not
*"let me take you there"*.

## Never invent a link (Law 54)

A URL is built **only** from clean components. If the repo is not in `owner/name` form, or a
branch / SHA / file path is missing, redacted, or malformed (traversal, unsafe characters, the
`[REDACTED]` marker), the surface says **"no canonical link"** out loud instead of fabricating a
URL that could 404 or mislead. A guessed link is a lie with a domain name on it. The selftest
proves each of these refusals.

## Evidence (rendered from real data, offline)

`render-evidence.mjs` reads the **committed collector fixture**
(`src/collectors/github/fixtures/sample-bundle.json`) through the **frozen** `normalizeBundle`
normalizer — the same code path a live `gh` read uses, minus the network — and writes
`github-integration-cards.html`. Reproduce:

```
node docs/assembly-evidence/vb2-github-cards/render-evidence.mjs
```

The rendered page shows `source = Fixture` (never conflated with live), the repo card for
`owner/example-repo`, and three PR cards:

| PR | Branch | CI | Mergeable | Copilot |
|----|--------|----|-----------|---------|
| #139 | `feature/example-lane` | failing (1✓ 1✗ 1…) | CONFLICTING · DIRTY | bound to head |
| #140 | `feature/redaction-check` | passing | MERGEABLE · CLEAN | stale (not on head) |
| #141 | `chore/docs-only` | pending | MERGEABLE · BLOCKED | none |

Every card renders its canonical `github.com` link as copyable text — repo, PR, branch (slashes
preserved), head commit, and each changed file's blob URL pinned to the head SHA.

## Read-only / no act edge (verified)

- Full self-test suite green (see the runner output on this lane).
- The rendered page contains **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline
  `on*=` handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network; the
  act edge (merge / approve / dispatch) stays frozen and is not wired here.

Local commit only; Terminal-0 owns merges.
