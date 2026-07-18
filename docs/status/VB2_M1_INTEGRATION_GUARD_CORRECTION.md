# STACK-1D bounded integration correction — evidence-integrity guard (empty .log exemption)
Merging the externally-published M1 VB2 soak evidence added a legitimately-EMPTY stdout log
(`sentinel-watch.log` — the sentinel's structured output is in intervention-log.jsonl /
attestation-chain.jsonl; its stdout was empty = "no output"). FounderGate's evidence-integrity guard
(`src/tools/evidence-integrity.selftest.mjs`) rejected all 0-byte evidence. The M1 evidence must NOT
be rewritten, so a **bounded, principled** guard refinement was required (Phase 8 §12 "separately
authorized correction"): a 0-byte `.log` (stdout/stderr capture) is legitimate and exempt; **every
other empty evidence file (json/md/txt/jsonl/sha256) stays rejected** (teeth intact + a mutation
self-check proves an empty non-.log is still flagged). The **founder-WITNESSED product**
(src/safety_check, src/founder_url_drop, tools/macos, .foundergate/policies) is **byte-identical to
the accepted a64ebcd**; only this CI guard (not the witnessed surface) changed. The M1 evidence was
NOT modified.
