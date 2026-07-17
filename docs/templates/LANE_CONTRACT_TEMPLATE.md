# Lane Contract Template (TBF-1)

Copy to `docs/lanes/<LANE>.md` and its machine form to a lane JSON validated by
`tools/policy/validate_lane_test_obligations.py`. Required fields:

- policy_version: 1.0.0
- policy_digest: 6df22c4f6f53735ba66a62f9c8dcbc299e5f3c84daa57ba8a023680814947c4e
- objective
- base_sha (exact)
- risk_class
- impact_classes[] (fail closed on UNKNOWN)
- required_test_classes[] (must superset the derived required set)
- not_applicable[]: {class, reason} (permitted reasons only; never a required class)
- local_tests / ci_tests / browser_tests / negative_tests / mutation_tests / recovery_tests / teardown_tests
- evidence_requirements
- independent_checker (bool) / final_advisor_required (bool) / founder_gate_required (bool)
- witness_trigger / merge_readiness_trigger
- current_state
