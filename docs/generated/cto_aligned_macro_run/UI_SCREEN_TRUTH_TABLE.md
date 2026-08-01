# UI Screen Truth Table
| Screen element | What it truthfully shows | What the founder must NOT infer |
|----------------|--------------------------|---------------------------------|
| Banner | local dashboard, loopback, real runner+export, not production | that it is a product / secure / deployed |
| Start status | RUNNING/COMPLETE/INSUFFICIENT/REFUSED/UNAUTHORIZED | that a provider ran (none did) |
| Commit | the real git HEAD SHA | that anything was merged/published |
| Tests | real pass/fail counts of a self-owned target | that arbitrary/customer code was tested |
| Decision | INTERNAL_DEMO_ONLY (never SHIP) | that it is ship-ready |
| Export | a real sealed ZIP (unzip -t verified) | that it is signed/certified |
| Reviewer drawer | real manifest + sample text, read-only | that a reviewer can change anything |
