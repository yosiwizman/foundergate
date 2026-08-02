# Download Evidence Flow — Report
Founder-mode "Download evidence ZIP" is wired to the EXISTING real sealed exporter: src/evidence_viewer/export-package.mjs (exportSealedPackage()).
- Verified this run: sealed-export self-test 5/5; export produced a real ZIP, unzip_ok=true, sha-256=d21ee5934a53ae49ce8a6d4ef1bd2fae42d19ee627774c76a7faf7e4bae88937, files=[EVIDENCE_NOTE.md, RUN_EVIDENCE.json], decision=INTERNAL_DEMO_ONLY (refuses to seal SHIP).
- The panel exposes the action only when evidenceZip.available===true; otherwise it shows "unavailable — <reason>" (honest, never a dead/fake button).
- No credentials, no secrets, no private/customer/production data. Local only; no deploy, no external call.
