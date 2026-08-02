# Local CI Hook Report
Hook: tools/ci/repeatability-ci-hook.sh — rerunnable by ONE command; runs the continuous repeatability trend (tests/repeatability/continuous-ci.mjs) with a durable trend dir; exits non-zero on any flake/fail/false-green. Local, synthetic, no network.
Active vs template:
- ACTIVE: the hook script (run on demand).
- TEMPLATE ONLY (NOT installed/loaded): tools/ci/com.foundergate.repeatability.plist.template — a launchd schedule the FOUNDER must explicitly `launchctl load` to activate. FounderGate does NOT install system jobs autonomously.
