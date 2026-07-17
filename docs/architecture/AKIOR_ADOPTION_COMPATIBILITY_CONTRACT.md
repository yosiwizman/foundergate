# AKIOR Adoption Compatibility Contract (planning only)

**Status:** COMPATIBILITY_PREPARED — planning only. Phase 7.1 Lane F.

> **AKIOR was NOT accessed, inspected, cloned, imported, executed, or modified to produce this
> document.** It is written from existing FounderGate roadmap law and already-recorded project
> knowledge (AKIOR is an Android/mobile project involving device/emulator, Gradle-style builds,
> APK artifacts, voice/permission surfaces, and communication/contacts data). Nothing here claims
> AKIOR is adopted, or that Android/Gradle/device execution is supported. Every item carries a
> label. Where knowledge is insufficient, the item is `REQUIRES AKIOR-SIDE AUDIT`.

## Hard non-claims
- AKIOR is **NOT** adopted. `AKIOR_ADOPTION_AUTHORIZED: NO`.
- Android, Gradle, emulator, device, and APK execution are **NOT** supported or proven.
  `ANDROID_EXECUTION_PROVEN: NO`.
- The AKIOR repository was **NOT** accessed. `AKIOR_REPOSITORY_ACCESSED: NO`.

## Label vocabulary
`REQUIRED BEFORE AKIOR ADOPTION` · `COMPATIBILITY PREPARED` · `NOT YET IMPLEMENTED` ·
`REQUIRES AKIOR-SIDE AUDIT` · `FOUNDER GATE` · `HUMAN EXPERT REQUIRED`.

## Future AKIOR adoption requirements

| # | Requirement | Label(s) |
|---|---|---|
| 1 | Explicit repository identity (owner/name, visibility declared) | REQUIRED BEFORE AKIOR ADOPTION · COMPATIBILITY PREPARED (IntakeRequest/ProjectDescriptor exist) |
| 2 | Exact evaluated SHA bound to the run | REQUIRED BEFORE AKIOR ADOPTION · COMPATIBILITY PREPARED (ExactVersionIdentity is core-required) |
| 3 | AKIOR ProjectDescriptor (project_type=android) | COMPATIBILITY PREPARED (schema-only descriptor exists; NOT_AUTHORIZED) |
| 4 | Android/mobile project adapter | NOT YET IMPLEMENTED · REQUIRES AKIOR-SIDE AUDIT |
| 5 | Gradle or approved build/check plan | NOT YET IMPLEMENTED · HUMAN EXPERT REQUIRED (repo-defined build is currently forbidden by FounderGate law) |
| 6 | Device/emulator boundary (no real device, no dialer/SMS) | NOT YET IMPLEMENTED · REQUIRES AKIOR-SIDE AUDIT · HUMAN EXPERT REQUIRED |
| 7 | Accessibility-specific evidence (mobile a11y ≠ web axe) | NOT YET IMPLEMENTED · HUMAN EXPERT REQUIRED |
| 8 | Voice & permission-risk classification | NOT YET IMPLEMENTED · REQUIRES AKIOR-SIDE AUDIT |
| 9 | Contacts/calendar/maps/communication data classification | NOT YET IMPLEMENTED · REQUIRES AKIOR-SIDE AUDIT · HUMAN EXPERT REQUIRED |
| 10 | Provider and credential boundaries | COMPATIBILITY PREPARED (provider boundary exists) · REQUIRES AKIOR-SIDE AUDIT |
| 11 | Network policy (default-deny egress) | COMPATIBILITY PREPARED (egress default-deny proven for the fixture) · REQUIRES AKIOR-SIDE AUDIT for mobile endpoints |
| 12 | Offline-mode classification | NOT YET IMPLEMENTED · REQUIRES AKIOR-SIDE AUDIT |
| 13 | APK/build artifact handling | NOT YET IMPLEMENTED · HUMAN EXPERT REQUIRED |
| 14 | Pixel-device witness boundary | NOT YET IMPLEMENTED · FOUNDER GATE · HUMAN EXPERT REQUIRED |
| 15 | Founder witness requirements | COMPATIBILITY PREPARED (FounderWitnessState exists) · FOUNDER GATE |
| 16 | Evidence retention | COMPATIBILITY PREPARED (Evidence Pack + retention concept) · REQUIRES AKIOR-SIDE AUDIT |
| 17 | Cleanup & deletion proof | COMPATIBILITY PREPARED (CleanupEvidence exists) · REQUIRES AKIOR-SIDE AUDIT for device/emulator teardown |
| 18 | Live-action gates | NOT YET IMPLEMENTED · FOUNDER GATE · HUMAN EXPERT REQUIRED |
| 19 | Call/message/send restrictions | NOT YET IMPLEMENTED · HUMAN EXPERT REQUIRED (must be prohibited by default) |
| 20 | Production-data restrictions | REQUIRED BEFORE AKIOR ADOPTION · HUMAN EXPERT REQUIRED (no production/customer data) |

## What AKIOR could later consume unchanged
The project-neutral core: run-ID, one-job lock, disk ledger, recovery state, status transitions,
claim classes, Evidence Pack **core** schema + namespaced extensions, checker status, teardown
requirement, founder witness state, UNKNOWN/STALE rules.

## What AKIOR still requires (bounded adapter + audit work)
An Android project adapter (#4), a device/emulator sandbox adapter with call/SMS/send prohibited
by default (#6, #19), mobile accessibility + permission/voice + communication-data evidence
modules (#7–#9, #12), APK artifact handling (#13), a Pixel-device witness boundary (#14), and an
**AKIOR-side audit** plus **human mobile-security expert** sign-off before any live action.

No claim of "no future rework" is made. Adoption is bounded adapter + audit work, not a promise
of zero change.
