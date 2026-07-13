# L3 env-provenance — Independent Adversarial Checker Report (round 1, SHA 1bcb4735)

> Independent adversarial checker (builder ≠ checker). Report = evidence. Committed verbatim.

**VERDICT: NOT CLEAN** — broke the value-redaction guarantee (F1) and the `verifyNoSecrets` soundness guarantee (F2): credential-shaped values leaked verbatim AND `verifyNoSecrets` blessed the record `{ok:true}`. Purity, allowlist-only capture, secret-NAME exclusion, and proto-safety all held. All findings CLOSED in round 2 (SHA bc47ee47).

## F1 — HIGH: value-redaction backstop porous; credentials leak verbatim
`looksLikeSecretValue` only caught known token shapes / all-base64-hex blobs / literal secret words; any credential with a char outside `[A-Za-z0-9+/=_-]` failed the entropy test and passed through. Leaked verbatim (all also passed `verifyNoSecrets` clean): `postgres://admin:hunter2!@db...`, `redis://:s3cr3tP@ss@127.0.0.1:6379/0`, `Xk9#mP2$vL8@qR5!wN3&zT7^`, a spaced passphrase, `sk-abc123`, `TigerTiger99`. Fix: redact credential URLs `://[^/@\s]*:[^/@\s]*@`; drop the `^…$` anchoring; over-redact long non-benign values.

## F2 — HIGH: verifyNoSecrets unsound (false-negatives)
Only inspected `env_allowlisted` + `[node_version,platform,arch,total_mem]`. Blind spots: `cpu_count` (reachable via `cap({cpuCount:"sk-live_…"})`), `captured_at`, `schema_version`, and any NESTED value (`{inner:"-----BEGIN RSA PRIVATE KEY-----"}`) → `{ok:true}`. Fix: deep-walk the whole object — `isSecretName` on every key, `looksLikeSecretValue` on every string leaf.

## F3 — MEDIUM: RangeError on invalid `now`
`normaliseCapturedAt` threw for out-of-range numbers / invalid Date (`8.64e15+1`, `1e300`, `new Date("nope")`) instead of returning UNKNOWN — broke the total-function/Law-54 claim. Fix: guard `Number.isNaN(d.getTime())` before `toISOString()`.

## F4 — LOW/MED: secret-NAME regex gaps
`PASSPHRASE`, `SESSION_ID`, `BEARER`, `SALT`, `PIN`, `SIGNATURE`, `COOKIE` returned `isSecretName===false`. Fix: extend the alternation.

## F5 — LOW (anti-gaming): five value token-patterns never independently exercised
The `ghp_`/`xox`/`AKIA`/`AIza`/`sk-` patterns matched no fixture; deleting all five kept the suite green. Fix: one fixture per token pattern that only that pattern catches.

## What I could NOT break (round 1)
Purity / no ambient reads (canary in real process.env never reaches output); determinism; allowlist-only / no full-env leak (`"*"` is literal); prototype safety; secret-NAME exclusion (the covered cases); error messages never echo the secret value; boundary (only the 3 L3 files; src/shwl untouched; no akior).
