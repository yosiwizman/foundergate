# Lane G — Sample Report Delivery Pack (no legal/binding terms)
- **What a customer receives:** one owner report (PASS/HOLD/REPAIR/REFUSED) + a sealed evidence ZIP.
- **Report structure:** verdict → what was checked → risks → owner action → developer-review flag →
  evidence summary → files touched → protected files → next safe action → what is NOT proven → disclaimer.
- **Evidence ZIP structure:** evidence_packet.json (v1) + report.md + SHA256SUMS.txt (integrity-verified).
- **Limitation statement:** local evidence only; not production/secure/SaaS/customer/commercial; not paid/market validated.
- **How to read it:** start at the verdict + owner action; the rest is supporting detail.
- **Support/follow-up:** a short written Q&A on the report (no code changes without a separate scope).
- **Refund/hold policy HYPOTHESIS:** if a check can't run safely it HOLDs and isn't charged; no fake green.
- **Triggers for expert review:** REPAIR/REFUSED verdicts, or any request touching deploy/billing/real data.
This is a plan; no binding contract or legal terms are created.
