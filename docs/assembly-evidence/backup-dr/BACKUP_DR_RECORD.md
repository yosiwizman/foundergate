# Backup / DR Record — 2026-07-17 (P1 lane)

> "Untested backup = nonexistent." This record documents a **tested** backup: each artifact was decrypted,
> hash-verified, restored, and its HEAD/contents checked against origin. Results below.

## What was backed up
| Artifact | Source | Bound SHA / note | Encrypted size |
|---|---|---|---|
| `foundergate-e1cee56.bundle.enc` | `git bundle --all` of foundergate | origin/main `e1cee56294a21c6b2f9f0cc5f2d2f4bef6e5876b` (all refs) | ~16 MB |
| `akior-cb631b0.bundle.enc` | `git bundle --all` of akior-activepieces-engine (**read-only** bundling; no AKIOR writes) | origin/main `cb631b0b1f8afa503cb6e542780ccfcba28c7133` (all refs) | ~495 MB |
| `akior-soak-runs-raw.tar.gz.enc` | `tar` of `~/Projects/akior-soak-runs/` (the **single-copy** raw AKIOR soak reports) | incl. the 24h run `20260712T080823Z-24h/soak-report.json` (36,943,179 bytes) | ~2.6 MB |

Each `*.enc` has a sibling `*.sha256` recording the **plaintext** hash (for restore verification). The 24h raw
`soak-report.json` is the only copy of the per-iteration series behind the "41,871 iterations" claim, so it is
prioritized here.

## Where
- **Copy 0 (local):** `~/foundergate-backups/2026-07-17/` (on Macintosh HD).
- **Copy 1 (second local volume):** NOT written this run — **no writable second volume was available**
  (`/Volumes/vibe` is present but read-only; the other `/Volumes/*` entries are mounted app installers, not
  storage). Queued as a FOUNDER ACTION below.
- **Off-site (copy 2):** requires an account/credentials — queued as a FOUNDER ACTION with one-paste instructions.

## Encrypted how
- `openssl enc -aes-256-cbc -pbkdf2 -salt` (LibreSSL), one random 48-byte base64 key.
- **Key location:** `~/foundergate-backups/2026-07-17/DR_KEY_DO_NOT_COMMIT.txt`, mode `0600`, **OUTSIDE the repo — never committed**. No key material appears in this repo or any commit.
- Plaintext bundles/tar were **deleted after encryption**; only `*.enc` + `*.sha256` remain at rest.
- **HONEST LIMITATION:** the key currently sits on the **same disk** as Copy 0, so Copy 0 alone is **not** protected against disk loss/theft. Encryption becomes meaningful only once (a) an `*.enc` copy is moved off-site and (b) the key is stored **separately** (password manager). Both are queued as founder actions. Treat Copy 0 as a fast local restore point, not yet a protected off-site backup.

## Restore-test results (TESTED — all PASS)
Performed into a throwaway temp dir; nothing in the repo touched.
- Decrypt + plaintext-hash-match: `foundergate` **YES**, `akior` **YES**, `soak-runs tar` **YES**.
- `foundergate` bundle → `git clone` → restored HEAD `e1cee56294a21c6b2f9f0cc5f2d2f4bef6e5876b` **== origin ✓**; `docs/assembly-evidence/EVIDENCE_LEDGER.md` hash **== on-main blob ✓**.
- `akior` bundle → `git clone` → restored HEAD `cb631b0b1f8afa503cb6e542780ccfcba28c7133` **== origin ✓**.
- `akior-soak-runs` tar → extract → `20260712T080823Z-24h/soak-report.json` restored at **36,943,179 bytes ✓** (byte-identical to source).

## Restore procedure (plain English)
1. Get the key file `DR_KEY_DO_NOT_COMMIT.txt` (from your password manager / the backup dir).
2. Decrypt an artifact: `openssl enc -d -aes-256-cbc -pbkdf2 -pass file:<keyfile> -in <artifact>.enc -out <artifact>`.
3. (Optional) verify: `shasum -a 256 <artifact>` should equal the value in `<artifact>.sha256`.
4. Restore a repo bundle: `git clone <artifact>.bundle <dir>` — the result is a full working clone; `git -C <dir> rev-parse HEAD` should equal the bound SHA above.
5. Restore the raw soak reports: `tar xzf akior-soak-runs-raw.tar.gz.enc-decrypted -C <dir>`.

## Schedule recommendation
- **Weekly** full `git bundle --all` of both repos + re-tar the raw soak reports; encrypt; refresh Copy 0 + Copy 1 + off-site.
- **After every acceptance / major merge** (like this VB1 acceptance), take an out-of-cycle bundle.
- **Monthly** run a full tested-restore drill (not just a bundle) — an untested backup does not count.
- **Annually** rotate the encryption key; keep the prior key until all bundles under it are superseded.

## FOUNDER ACTIONS (queued — not performed by the wave)
1. **Store the key off-disk.** Copy the contents of `~/foundergate-backups/2026-07-17/DR_KEY_DO_NOT_COMMIT.txt` into your password manager, then keep only the password-manager copy for long-term (the on-disk key is fine short-term for local restores).
2. **Second local volume (Copy 1):** attach a writable external/second volume; then paste: `cp ~/foundergate-backups/2026-07-17/*.enc ~/foundergate-backups/2026-07-17/*.sha256 /Volumes/<YourVolume>/foundergate-backups-2026-07-17/`.
3. **Off-site (Copy 2):** after signing into a storage account of your choice, upload the three `*.enc` + three `*.sha256` files (do NOT upload the key to the same place). Keep the key in your password manager only.
