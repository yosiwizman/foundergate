# L3 env-provenance — Independent Adversarial Checker Report (round 2, SHA bc47ee47)

> Same independent checker, delta re-review after the F1–F5 fixes. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — F1–F5 closed, no regression; ready for merge.**

Target re-confirmed: `git rev-parse HEAD` == `bc47ee474201cd1c323f050ad1055f8cd7e4e2da`; diff = only the 3 L3 files; `src/shwl/**` untouched; no `akior`. Suite 77/77 green. All mutation tests ran on scratchpad copies; repo untouched.

## Per-finding re-verification
- **F1 — CLOSED.** All round-1 leaks now `[REDACTED]` under benign names (so only the value fix can bite): `postgres://…:…@`, `redis://:…@`, `Xk9#mP2$…`, spaced passphrase, `sk-abc123`, `TigerTiger99`. Credential-URL pattern + de-anchored token/high-entropy substring + ≥16-char over-redact floor all fire. Benign values NOT gutted (`true`, `UTC`, `production`, `v24.13.1`, `1234`, `arm64`, ISO timestamps, `env-provenance.v1` survive). No new regression-class miss.
- **F2 — CLOSED.** `verifyNoSecrets` deep-walks: catches a secret in `captured_at`/`schema_version`/an extra top field/a nested value/an array element/a nested secret-NAME. Numeric coercion blocks a string riding through `cpu_count`/`total_mem` (→ UNKNOWN; `"8"`→8). Cycle-guarded. Errors name only the path, never the secret.
- **F3 — CLOSED.** `8.64e15+1`, `1e300`, `-8.64e15-1`, `new Date("nope")`, `NaN`, `Infinity` → `captured_at:UNKNOWN`, no throw; valid epoch still round-trips.
- **F4 — CLOSED.** `MY_PASSPHRASE`, `SESSION_ID`, `BEARER`, `COOKIE`, `REQUEST_SIGNATURE`, `PRIVATE_DATA`, `PW_SALT`, `USER_PIN` all `isSecretName===true`, excluded even when allowlisted.
- **F5 — CLOSED (mutation-verified).** Deleting the `AKIA` pattern on a scratchpad copy → suite fails (`AKIA fixture must be caught`); neutering `looksLikeSecretValue`/`isSecretName` fails the redaction/exclusion tests.

## No regression
Purity (canary never reaches output), allowlist-only, secret-NAME exclusion (original + new), proto-safety all still hold.

## Residual notes (not blockers)
- Inherent value-redaction limit: a short (<16 char) low-entropy human password (e.g. `"hunter2"`) under a BENIGN name still passes the value backstop — unfixable without redacting every short string; covered by the primary control (allowlist + secret-name exclusion). Strictly better than round 1.
- Over-redaction tradeoff (by design "over-redact, never under-redact"): some benign-but-long values (TZ names, long paths, plain `https://` URLs) hit the ≥16-char floor and redact — a minor provenance-fidelity cost, never a leak.

All five findings genuinely closed with no regression. Ready for merge.
