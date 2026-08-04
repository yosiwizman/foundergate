# Founder README — Least-Privilege Read-Only Deploy Key Proof (W8)

**In one sentence:** FounderGate proved it can read one of your *private* repos using a **single, temporary, read-only key that it then threw away** — not a broad, powerful login — and proved the key stopped working after it was thrown away.

**Why this matters to you:** the earlier private-sandbox proof used your existing broad GitHub login. This run tightens that: it manufactured the *narrowest possible* credential (read-only, one repo), used *only* that credential for the read, then **revoked it and destroyed the private half** — and mechanically proved the revoked key can no longer open the repo.

**What to look at (UI):** open the dashboard → **🔒 Least-Privilege Deploy Key** → *Load Least-Privilege Proof*. You'll see the read-only key, the exact commit read, held fake secrets, 25/25 write refusals, and the revocation row (revoked · access denied · private key destroyed). If the evidence file is missing the panel shows **UNKNOWN** — it never invents a green.

**What this does NOT mean:** it does **not** mean private-repo support is finished, that customer repos are supported, or that a fine-grained token / GitHub App path is proven. Those are separate gates you have not opened. Nothing was deployed, billed, merged, or sent to any provider.
