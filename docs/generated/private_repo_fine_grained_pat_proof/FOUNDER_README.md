# Founder README — Fine-Grained PAT Proof

**In one sentence:** FounderGate built and tested the *safe machinery* to read your private sandbox using a narrow read-only GitHub token — but it stopped honestly because **no such token is stored yet**, and it will **never** ask you to paste one into chat.

**What it did:** checked your Mac's Keychain for a token (found none, without ever seeing a value), then proved the surrounding safety: the token would be read from Keychain into memory only, never printed or packaged; 30 "bad-idea" attempts are all refused; and the screen shows an honest **"gate — token needed"** state, never a fake green.

**What it did NOT do:** it did not read your repo with a token (there wasn't one), touched no real or customer repo, ran no code, called no provider, and merged nothing.

**If you want to open this gate later:** create a **fine-grained, read-only, single-repo** token for the sandbox and save it in your Mac Keychain under the name FounderGate expects. FounderGate reads it straight from Keychain — you never paste it into a chat. Then this same gate proves the real read.
