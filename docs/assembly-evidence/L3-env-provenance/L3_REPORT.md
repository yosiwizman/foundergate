# L3 — ENVIRONMENT PROVENANCE (evidence-integrity infrastructure, SENSITIVE)

**Lane:** L3 — a single primary builder working ONLY in worktree
`foundergate-lanes/L3` on branch `lane-l3-env-provenance`, based on main
`e3eb4be81faa9e1945a87ccac8226c580f00fc96`.

**Purpose.** Capture the environment a run executed in — so a future §29 soak's
result is *interpretable* — **without ever leaking a secret**. This capability gates
every future §29 soak: a soak result is only meaningful against a recorded, honest,
secret-free description of the host it ran on.

**Scope built.** A pure, zero-dependency environment-provenance capture module plus a
self-check that bites on any leak. The capture path is PURE: all inputs are DATA passed
in (`env`, `platform`, `arch`, `cpuCount`, `totalMem`, `nodeVersion`, `now`, `allowlist`)
— **zero ambient reads** (no `process.env`, no `os.*`, no clock read). Because it is pure
and does no heavy work, it needs **no** SHWL lease guard. No soak was run; no I/J work; no
readiness claim is made here.

## §28 written-authority citation (AUTHORITY = `path @ full-40-char-SHA`)

- **Shared-Host Workload Lease (blob @ base):**
  `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743`
  — cited specifically for **§26** (append-only evidence + exact-SHA provenance) and its
  restatement of **Law 54** (honest UNKNOWN — refuse, never guess).
- **Base commit (main):** `e3eb4be81faa9e1945a87ccac8226c580f00fc96`.

## Claims table (with AUTHORITY)

| # | Claim | Evidence (proof) | Authority (`path @ 40-char SHA`) |
|---|-------|------------------|----------------------------------|
| 1 | Env vars are captured **ONLY** via the explicit `allowlist`; the **full env is never enumerated**. | `capture.mjs` iterates `allowlist` only; `capture.selftest.mjs` — non-allowlisted `PATH`/`HOME` absent from output though present in `env`. | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (§26 exact-provenance discipline) |
| 2 | **Any secret-shaped NAME is EXCLUDED even if allowlisted** (`/secret\|token\|key\|credential\|password\|passwd\|auth\|api[-_]?key/i`). | `SECRET_NAME_RE` + `isSecretName`; selftest — `SECRET_TOKEN`/`API_KEY`/`MY_PASSWORD`/`AWS_CREDENTIAL`/`GH_AUTH`/`SIGNING_KEY` all excluded, only `SAFE_FLAG` survives. | Build brief no-leak discipline; secret-hygiene (below) |
| 3 | A **value that looks secret-shaped is REDACTED**; a planted fake secret VALUE never appears in output. | `looksLikeSecretValue` + `REDACTED` sentinel; selftest — planted `sk-live_…` under benign `BUILD_META` → `[REDACTED]`; full serialized output asserted free of the raw value. | Build brief no-leak discipline |
| 4 | **Law 54 — honest UNKNOWN, never guessed:** absent/unreadable scalar fields and allowlisted-but-unset names become `UNKNOWN`; an unparseable/absent `now` → `captured_at: UNKNOWN`. | `scalarOrUnknown` / `normaliseCapturedAt` / `UNKNOWN`; selftest — omitted `platform/arch/cpu/mem/node` and `MISSING` env name all `UNKNOWN`; `now:"whenever"` → UNKNOWN. | `docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743` (Law 54) |
| 5 | **Determinism** given fixed DATA inputs — byte-identical output; no clock/randomness. | selftest — two calls with identical args produce identical `JSON.stringify`; epoch-ms and `Date` forms of `now` normalise identically. | Build brief (deterministic capture) |
| 6 | **`verifyNoSecrets` bites** on a crafted leak — secret-shaped NAME, secret-shaped VALUE (incl. a top-level field), and echoes no secret in its error. | `verifyNoSecrets`; selftest — throws on `API_TOKEN` name, on raw value under `BUILD_META`, on value in `node_version`; error message never contains the secret. | Build brief (`verifyNoSecrets` self-check) |
| 7 | **Purity:** the module never reads the real `process.env` into committed output; needs no lease guard. | selftest — a canary planted in real `process.env.__L3_CANARY__` never appears in output; `capture.mjs` imports nothing ambient. | Build brief (pure capture needs no guard; HEAVY entry points must call `src/shwl` guard — none exist here) |

## Files created (ONLY under the two allowed roots)

- `src/environment-provenance/capture.mjs` — pure capture + self-check: `captureEnvironmentProvenance`, `verifyNoSecrets`, plus predicates `isSecretName` / `looksLikeSecretValue` and the `SCHEMA_VERSION` / `UNKNOWN` / `REDACTED` / `SECRET_NAME_RE` exports. Zero deps, zero ambient reads.
- `src/environment-provenance/capture.selftest.mjs` — 16 checks: allowlist-only capture; secret-shaped name excluded even if allowlisted; planted fake secret value never emitted; honest UNKNOWN (Law 54); determinism on fixed DATA; `verifyNoSecrets` bites on crafted leaks; real-`process.env` purity guard.
- `docs/assembly-evidence/L3-env-provenance/L3_REPORT.md` — this report.

## Secret-hygiene discipline (this is the no-leak lane — lead by example)

1. **Allowlist-only.** The full env is never enumerated; only explicit `allowlist` names are considered.
2. **Name fail-safe.** A secret-shaped NAME is over-excluded — dropped entirely even when allowlisted; it never enters the output (so `verifyNoSecrets` never has a secret name to find).
3. **Value fail-safe.** A secret-shaped VALUE (JWT, PEM block, `sk-`/`ghp_`/`xox`/`AKIA`/`AIza` tokens, long high-entropy base64/hex, or a literal secret word) is redacted to `[REDACTED]`; the raw value is never emitted.
4. **Over-redaction is the safe failure mode** — when in doubt, exclude/redact.
5. **Errors never echo secrets.** `verifyNoSecrets` names the offending key but never the offending value.
6. **Diff secret-scan is clean.** The only credential-shaped literals in the diff are clearly-fake negative-test fixtures (`sk-live_ABCDEF…`, a truncated `-----BEGIN RSA PRIVATE KEY-----\nMIIE…`) required to prove the redactor bites; no real secret is captured, emitted, or committed.

## Test result

`npm test` (whole suite, from the worktree): **ALL GREEN — 77/77 self-tests passed** on
Node v24.13.1 (75 pre-existing + the new L3 `capture` suite of 16 checks).

## Boundary confirmation

No `akior` path touched. `src/shwl/**` unmodified. No other lane directory and no shared
ledger modified. Writes confined to `src/environment-provenance/**` and
`docs/assembly-evidence/L3-env-provenance/L3_REPORT.md`. No soak run; no soak-pass line; no
readiness claim.
