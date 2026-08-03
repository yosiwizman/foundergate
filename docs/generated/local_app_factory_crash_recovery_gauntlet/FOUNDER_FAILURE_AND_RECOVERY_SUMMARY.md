# Founder Failure & Recovery Summary (plain English)
**What we did:** we deliberately broke FounderGate 12 different ways — deleted and corrupted its records,
pointed a preview at the wrong app, made a test fail, deleted app files mid-build, tried to pass off old
(Round 1/Round 2) work as new, asked for an unsafe app, and simulated the local server being down.

**What FounderGate detected:** all 12. Every broken case was caught and marked HELD — shown in red on the
Crash Test screen with the exact reason. **None turned green.**

**What FounderGate refused:** every broken fixture was blocked from opening a preview. Old work could not be
reused as new (it demanded a current run). An unsafe request got no app and no preview. A file changed after
review was flagged as tampered.

**What FounderGate recovered:** 6 of the 12, but only where it could safely rebuild the app from scratch
(missing/corrupted record, wrong preview link, missing files, server-back-up). Each recovered app was
re-tested before it was allowed to be "OK". The other 6 stayed HELD on purpose — it never faked a fix.

**What still needs a human/founder gate:** nothing new here — this was a safety test. Selling, deploying,
billing, real accounts, and Gate 8 all remain blocked and untouched.

**What remains unproven:** this proves the brakes work locally on synthetic data. It does NOT prove
production, security, or that a real customer would buy it.

**Can a non-developer founder understand the result?** Yes — the Crash Test screen shows a simple table:
each broken thing, that it was caught (red), that no preview opened, and whether it was safely recovered.
