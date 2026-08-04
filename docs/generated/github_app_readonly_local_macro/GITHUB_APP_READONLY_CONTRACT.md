# GitHub App Read-Only Intake Contract (W4)
The contract a FUTURE live GitHub App proof must satisfy (7/7 tests; overclaim refused if any field missing):
- repo exactly **yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET**, private:YES; installation restricted to that repo only;
- **Contents:Read + Metadata:Read**; no write/admin/workflow/issue/PR/secret/deployment;
- exact commit · manifest digest · archive/snapshot digest · file count · byte count;
- secret classification · no code execution · no build · no repo tests · no provider call · cleanup status.
A candidate missing any field → `OVERCLAIM_REFUSED`. This local macro produces **no** live record; the validator runs on synthetic candidates only.
