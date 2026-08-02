# Beta Freeze — Immutability Manifest Report
- FREEZE_MANIFEST.txt lists SHA-256 of every frozen file (      12 entries).
- Freeze root hash (SHA-256 of the manifest): 8e7c7db823b514970fe8bcdb3fbe1b2a38c972cee2d739419a76f9ec820d1fd1
- Verification: `shasum -a 256 -c FREEZE_MANIFEST.txt` → OK. Any post-freeze change to any file breaks this check.
- The manifest + root hash are included in the evidence package; the frozen candidate is reproducible and tamper-evident.
