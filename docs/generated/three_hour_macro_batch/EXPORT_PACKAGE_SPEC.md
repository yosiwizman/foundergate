# Export Package Spec
Sealed local package contents: EVIDENCE_NOTE.md (objective, exact commit, tests, decision, limitations), RUN_EVIDENCE.json (the full run object), SHA256SUMS.txt (over the package files). Sealed via `ditto -c -k --sequesterRsrc --keepParent`; verified via `unzip -tq`. Output: a real ZIP + its SHA-256. Never seals a SHIP decision.
