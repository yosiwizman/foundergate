# Founder-Mode Leak Scan Report
Browser-verified on the LIVE dashboard after a real run:
- Full 40-hex git SHA in founder DOM: 0 (only a short commit_short build id appears).
- 64-hex sha256 in founder DOM: 0.
- Raw-log markers (stacktrace / "at Object.<anonymous>" / Traceback): 0.
- Developer jargon / branch internals: not surfaced in founder mode (they live in reviewer mode).
Founder mode does not leak technical internals.
