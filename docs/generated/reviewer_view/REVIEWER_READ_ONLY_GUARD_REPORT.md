# Reviewer Read-Only Guard Report
The reviewer app calls assertReadOnly(CAPABILITIES) on load; the capability model hard-codes mutate/merge/mark_pr_ready/edit_files/delete/approve_gate = false, and assertReadOnly throws if any is enabled. There are no mutation, merge, PR-ready, or publishing controls on the surface. Asserted by test.
