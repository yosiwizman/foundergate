# Founder URL-Drop UI — False-Green Report (Phase 7)

Explicitly names what WAS and WAS NOT proved, so no screen or reviewer mistakes the UI for more than it is.

## What was proved
- The founder app opens on loopback, is discoverable, and drives one primary action.
- It displays the REAL exact commit (`621e4974…`), archive digest (`fd8597e4…`), canonical manifest (`649ecb02…`, 12 files) from a fresh Phase-7 live run of the fixed public fixture.
- The live run really happened: governed sandbox GUARD_PASS (loopback-only ports), default-deny egress (example.com DENIED), docker socket ABSENT, `compileall` exit 0, in-sandbox manifest == Pro manifest, teardown DELETE 204/GET 404, VM destroyed, snapshot deleted.
- Fixed-fixture restriction: only `pypa/sampleproject` runs live; other public URLs → HELD; private/SSH/file/non-GitHub/credential URLs → refused.
- Fail-closed UI: missing run state → UNKNOWN; stale run → STALE; failure → no green.
- Independent Phase-6 Advisor: PASS.

## What was NOT proved (must not be implied)
- **Build was not proven.** **Tests were not proven.** **Security was not proven.** **Production readiness was not proven.** Only *compileability* (it byte-compiles) was observed.
- OpenSandbox is **not adopted**; the loopback patch is FounderGate-local and requires a runtime retest on any upgrade.
- No customer code and no private repository were accessed; general public-repository execution remains **HELD**.
- runc standard-container isolation only; not a microVM/kernel boundary.
- Deletion/VM-destruction proven under observable state, not forensic erasure.
- This UI is a **founder witness candidate, not an accepted product surface**.

## Green-state audit
The only green element is the "Compileability observed" badge, and it is shown lit **only** when the run is FRESH and `compileall` exit == 0; otherwise it is dimmed. Every other proven-negative is an amber "not proven" badge. No "PASS" appears without naming exactly what passed.
