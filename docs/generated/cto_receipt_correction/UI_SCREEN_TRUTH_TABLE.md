# UI Screen Truth Table
| Element | Truthfully shows | Founder must NOT infer |
|---------|------------------|------------------------|
| Banner | local dashboard, loopback, real runner+export, not production | product / secure / deployed |
| Start status | RUNNING/COMPLETE/INSUFFICIENT/REFUSED/UNAUTHORIZED | that a provider ran (none did) |
| Commit | the real git HEAD SHA | that anything merged/published |
| Tests | real pass/fail of a self-owned target | arbitrary/customer code tested |
| Decision | INTERNAL_DEMO_ONLY (never SHIP) | ship-ready |
| Export | a real sealed ZIP (unzip -t verified) | signed/certified |
| Reviewer drawer | real manifest + sample text, read-only | a reviewer can change anything |
| Auth | token+Origin loopback gate | "secure" / certified |
