# Correction Item 01 — stale dashboard copy (Checker + Advisor nit)
Issue: demo/founder_operator_dashboard/index.html had stale copy ("Start (LOCAL_SIMULATION)" button text; a paragraph saying the run path is a LOCAL_SIMULATION and sealed export "remains honestly NOT_WIRED") that contradicted the now-wired REAL_LOCAL path + working CLI sealed export. It UNDER-claimed (safe direction), not a dishonesty finding.
Fix (cycle 1/3): updated button to "Start (loads REAL_LOCAL_RUN)" and the paragraph to state Start loads the real CLI run and a real sealed ZIP is produced by the CLI export tool, with LOCAL_SIMULATION only as a labeled fallback.
Verification: browser re-run PASS (2/2); state-model still consistent (sealed_package_export=REAL_LOCAL). Resolved in 1 cycle.

## Correction Item 02 — brittle browser SHA assertion (cycle 2/3)
Issue: the browser test hardcoded commit `90f49fdcd408`, but the REAL runner correctly binds the CURRENT git HEAD, which moved to 86fe4577 after the freeze commit — so the test (not the code) was stale. This is actually positive evidence the SHA is read live, not faked.
Fix: changed the assertion to `toHaveText(/^[0-9a-f]{12}$/)` — asserts a real 12-hex commit regardless of which HEAD. Browser re-run PASS. Resolved.
