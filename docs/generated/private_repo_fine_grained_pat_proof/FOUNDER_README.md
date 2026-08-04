# Founder README — Fine-Grained PAT Proof (it worked)

**In one sentence:** with your new, correctly-scoped token, FounderGate actually read your private sandbox repo — using only that token straight from your Mac Keychain, never showing it — and proved exactly what it read.

**What it proved:** the token is new (its fingerprint changed from the one that failed), it now opens the sandbox (GitHub returned "OK" instead of "not found"), and FounderGate read the exact commit, listed all 9 files, held 5 fake-secret files safely, and produced a tamper-checkable record — all with a read-only token it never exposed.

**The one honest caveat:** FounderGate can prove it *read* the repo read-only (it only ever asked to read), but it can't *independently* prove the token is incapable of writing without trying a write — which it will never do. GitHub shows your owner role on the repo, not the token's limits. So the result is "read-only intake proven, with scope limits." That's the honest ceiling for this kind of token.

**What it did NOT do:** no other repo of yours or anyone's was touched, no code was run, no provider was called, nothing was merged. Your token expires on its own in 7 days.
