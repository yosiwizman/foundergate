# Autonomous Repository Lifecycle — Founder Authorization Record (ARLC-1)

**Recorded:** 2026-07-17 · **Terminal-0 integration** · verbatim founder standing rule.

## Founder standing authorization (verbatim intent)

> Routine mechanically-qualified repository operations are backend Terminal-0
> responsibilities, not founder gates. A repository merge is not a founder gate
> merely because it writes `main`. Terminal-0 may merge autonomously when the
> exact candidate satisfies all current machine-enforced merge-readiness
> requirements and the merge does not create new legal, provider, production,
> customer-data, payment, public-release, security-boundary, or live-action
> authority. The founder is not a release engineer.

This authorization **supersedes** earlier disk rules that required explicit
founder approval for *every* write to `main`.

## What it explicitly does NOT authorize or weaken

It does **not** authorize: OpenSandbox adoption or default activation; customer
or private repository execution; production deployment; public release;
payments; AKIOR access/modification/execution/adoption; provider activation
beyond existing disk authority.

It does **not** weaken: the hard safety floor; evidence / checker / Advisor
requirements; exact-SHA CI; qualification and rollback requirements;
customer-data, payment, and security-boundary protections; the no-self-hosted-
runner rule; the no-rewrite/no-force-push rule for evidence branches.

## Encoding

Machine-enforced by `.foundergate/governance/autonomous_repository_lifecycle.json`
(active pointer `.foundergate/pointers/active_repository_lifecycle_policy.json`,
controller `tools/terminal0/arlc_lib.py`). Any action not positively classified
`OPERATIONAL_AUTONOMOUS` **fails closed** to a founder gate.
