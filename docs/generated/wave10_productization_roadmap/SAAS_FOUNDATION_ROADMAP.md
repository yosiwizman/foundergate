# Lane G — SaaS Foundation Roadmap (PLANNING ONLY)
**Do not jump to SaaS before paid proof and a security review.**
- User accounts (authn/z, least privilege) · tenant separation (isolated storage + compute, no cross-tenant reads).
- Project upload/import · repo connection (public first; private only behind an explicit gate).
- Evidence storage (encrypted at rest, per-tenant, retention + founder-controlled deletion).
- Billing (test-mode first; no live charges without a gate) · admin dashboard · support process.
- Abuse handling (rate limits, size caps, kill switch) · external security/compliance review.
- Deployment (single-tenant founder-owned staging first) · launch gates (green evidence + review + founder phrase).
All items are NOT started as live systems; this is a plan. No SaaS availability is claimed.
