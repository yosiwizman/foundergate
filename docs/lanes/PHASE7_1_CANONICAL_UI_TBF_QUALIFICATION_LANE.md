# Phase 7.1-Q — Canonical UI & Machine Qualification Lane (TBF-enforced)

**Mode:** autonomous gate-to-gate · TBF-1 enforced · disk-first · Terminal-0 sole integration sheriff.
**Base:** TBF-1 head `51cafe6` (descends from Phase 7.1 `facfd82`). **Branch:** `qualification/phase7-1-canonical-ui-tbf`.
**Policy:** test-before-founder v1.0.0, digest `6df22c4f…947c4e`, ACTIVE (loaded from disk, digest verified).

**Impact classes (mandated minimum):** UI_AFFECTING, API_AFFECTING, RUNTIME_AFFECTING,
RECOVERY_AFFECTING, SECURITY_BOUNDARY_AFFECTING, GATE_OR_AUTHORITY_AFFECTING.

**Purpose:** exhaust every applicable machine-verifiable obligation for the bounded Safety Check UI so
the post-surgery founder is asked ONLY for human perception + usability, never to find technical bugs.

**Primary-writer change:** canonical service-identity health endpoint + identity-safe launcher reuse
(a foreign/old/other-worktree :4700 server is NOT reused — fail closed `UNKNOWN_SERVICE`).

**Lanes executed:** A source/route map · B static/authority (false-green) · C process/port/worktree
identity · D cache/storage/service-worker · E headed Mac Playwright (screenshots+video+trace+logs) ·
F headless + exact-SHA CI · G accessibility/low-hand · H mutation/false-green register · I evidence/
recovery/teardown · J historical-UI disposition (neutral-first is the only canonical founder UI).

**Boundaries:** no main merge; PRs draft/unmerged; OpenSandbox not adopted; customer/private HELD;
AKIOR not accessed; M1 not contacted; opening the app starts no VM.
