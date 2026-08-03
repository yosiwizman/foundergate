# Lane E — Production-Claim Blocker
`tools/doctor/claim-blocker.mjs` (read-only) scans this run's generated docs + the demo UI and flags
only NON-negated positive assertions; negation / disclaimer forms are allowed.

The blocklist (all forbidden, none allowed as a positive claim): "production-ready" is forbidden ·
"secure/compliant" is forbidden · "SaaS-ready" is forbidden · "customer-ready" is forbidden ·
"commercially validated" is forbidden · "paid proof" is forbidden · "market validated" is forbidden ·
"deploy-ready" is forbidden · "calendar integration live" is forbidden · "private repo ready" is forbidden.

Result on this run: CLEAN (0 violations across the scanned docs + UI). The blocker exits non-zero if
any surviving positive claim is found. (The tool's own source and this doc enumerate the blocklist
for governance; each enumeration line is written with a "forbidden" disclaimer so it is not itself a claim.)
