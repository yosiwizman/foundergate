# Lane B — Evidence Packet v1 Spec
Schema: `evidence_packet_v1.schema.json`. Validator: `src/evidence_packet/evidence-packet-v1.mjs`
(deterministic, zero-dependency, no network/fs side effects). Self-test: `tests/sample_reports/
evidence-packet.selftest.mjs` (7/7 pass).
Required fields: packet_version(v1) · task_intent · agent_identity · source_snapshot{kind, self_owned:true,
contains_customer_or_production_data:false} · files_touched[] · protected_files[] · sensitivity_ruling{ruling}
· checks[] · risk_findings[] · checker_verdict(PASS_WITH_LIMITS|HOLD|REPAIR|REFUSED) · owner_gate{decision,
never_ship:true} · next_safe_action · limitations[≥1] · blocked_actions[] · build_identity(optional).
Validation rejects: missing fields, wrong version, checker_verdict=SHIP, never_ship=false, and any real
customer/production/secret content (synthetic/self-owned only). Decision can never be SHIP.
