# Founder README — Fine-Grained PAT Proof (rerun)

**In one sentence:** your token is now in the Keychain and FounderGate read it safely (never showing it), but it **stopped** because that token can't actually open the sandbox repo — and it can see a lot of *other* repos — so it's not the narrow, single-repo, read-only key this gate needs.

**What happened:** the token is valid and is a fine-grained token (good), but GitHub returned "not found" when FounderGate tried to read the sandbox with it — meaning the sandbox wasn't included in the token's allowed repositories. At the same time, the token could list 100+ of your repositories, which is broader than intended. FounderGate did **not** open any of those other repos, did not read the sandbox, and did not expose your token.

**The fix (2 minutes):** in GitHub, create a **new** fine-grained token whose *Repository access* is set to **only** `foundergate-private-readonly-sandbox-20260804T0105ET`, with permissions **Contents: Read-only** and **Metadata: Read-only** (nothing else). Save it in your Mac Keychain under the same name as before (you can reuse the same paste-into-Keychain command). Then tell FounderGate to rerun this gate. FounderGate never sees the value.
