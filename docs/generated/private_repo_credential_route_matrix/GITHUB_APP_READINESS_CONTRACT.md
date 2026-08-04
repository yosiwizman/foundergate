# GitHub App Readiness Contract (B3)

**No real GitHub App is created or installed.** Contract a future App proof must satisfy:
- Exactly **one** installation; **selected** repository (the sandbox).
- Permissions: **Contents: read** (+ metadata read). No write, no administration, no members-write, no org-wide.
- No standing **webhook** unless separately authorized.
- Short-lived installation tokens (~1h); installation is **removable** (uninstall/revoke).
- App private key and installation tokens **never** in chat, printed, or packaged. Audit trail required.

`evaluateAppConfig()` returns **REFUSED** for write/admin/all-repos/multiple-installations/unauthorized-webhook/private-key-in-band, **HELD** for missing read-contents/selection/removable, and **READY_PLANNED** only for an exact read-only match — still **PLANNED_BLOCKED** pending a separate founder gate.
