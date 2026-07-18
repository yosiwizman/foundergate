# Autonomous Merge Authority Contract
Terminal-0 may merge a single designated cumulative PR to main autonomously iff ALL machine-enforced
merge-readiness predicates are true (one cumulative PR; exact head; base main; exact-head CI green;
independent checker clean; final Advisor ready; no post-attestation code drift; complete ancestry; no
forbidden artifacts; merge method = MERGE COMMIT; no active merge embargo; rollback+cleanup plan). It
DENIES when any deny-condition holds. It never authorizes adoption/customer/private/production/release/
payment/AKIOR/provider-activation, nor check-bypass or governance-weakening. Founder is reserved for
true founder gates + human-perception witnesses.
