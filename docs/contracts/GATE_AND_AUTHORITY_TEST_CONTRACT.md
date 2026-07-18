# Gate & Authority Test Contract (TBF-1)

Gate/authority-affecting work must produce: unauthorized-path tests; second-authority tests;
signature-bypass tests; protected-file checks; **mutation proof that the gate actually fires** (a
committed test that breaks what the gate must catch and shows it go RED — a guard that cannot be shown
to fail is vacuous); an **independent checker**; and a **founder signature where required**. This
mirrors the evaluation-class oracle-anchored change control in
`docs/contracts/component-classification.md`.
