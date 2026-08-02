# Lane D — Evidence Panel (local wiring)

- Before run/export: **UNKNOWN — no run/export yet.**
- After a real run: **Ready to export a sealed local package.**
- After a real export: **SEALED_EXPORT_LOCAL** + a plain-English receipt summary + the reminder
  "Send the ZIP to ChatGPT only if asked."
- No raw ZIP internals and no full SHA in the founder-facing panel (by design).
- Export is the real `/api/export` path (seals a real ZIP and verifies it with `unzip -t`); it is
  never faked.

Verified by Lane K: export becomes enabled only after a real run; the panel shows
`SEALED_EXPORT_LOCAL` only after the real export completes.
