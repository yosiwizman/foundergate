# Repeatability / Crash-Test Ladder (Planning — synthetic only)
No private/customer/production data at any rung.

## Objective families
- verify-only run; generate-doc run; build-demo run; freeze run; acceptance-record run.

## Repo fixture families (synthetic)
- empty repo; clean demo repo; repo with intentional stale evidence; repo with wrong-account remote; repo with no network; repo with no secrets by construction.

## Failure cases to inject
- stale-head (final-head guard must FAIL); stale metric (receipt-consistency must FAIL); missing evidence file; corrupted SHA256SUMS; truncated ZIP; broken freeze manifest.

## Crash / recovery cases
- kill mid-run before commit; kill after commit before ZIP; kill during ZIP seal → each must resume or package HOLD, never a false green.

## Environment cases
- no-network (public-repo checks must degrade to HOLD, not fake pass); wrong-account (must HOLD_WRONG_ACCOUNT, never substitute).

## Thresholds
- Repeatability = same inputs → same verdict + guards pass, across N≥3 clean runs, AND every injected defect is CAUGHT (guard FAIL) — non-vacuous.
- What counts: deterministic verdict + defect detection + honest HOLD on unsafe conditions.
- What does NOT count: passing only clean cases; any false green; any silent skip.
