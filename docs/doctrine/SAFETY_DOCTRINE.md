# FounderGate Safety Doctrine

> **Plain English — read this first.**
>
> 1. **What this is.** The governing safety rules for the harness: what every role may read, what only the founder may authorize, and what nothing in the harness is ever allowed to touch.
> 2. **Why it matters.** This is the floor under everything else. The Operating Doctrine and the Parallel-Run Contract describe how work flows; this doctrine describes the lines that are never crossed. If a rule anywhere else appears to conflict with a rule here, this file wins.
> 3. **What can go wrong.** A lane reads a secret it should never read. An agent performs a real-world action — a send, a payment, a deploy — without the founder. A "done" is declared with no evidence to back it. Each is a safety failure, not a style issue.
> 4. **What you can test now.** Read the two short lists below: **Human gates** (things that always require you) and **What the harness must never read**. If the harness ever does something on either list without stopping, that is a violation to report.
> 5. **One next action.** Remember the default posture: **when uncertain, stop and raise a gate.** A false "done" or an unrequested real-world action costs far more than pausing to ask.

> **Status: GOVERNING PRINCIPLES.** These are the governing safety principles for the harness. Where they are not yet enforced by automation, they are enforced by role discipline and the Operating Doctrine. This file is the safety floor: it is never weakened by any other doctrine document.

---

## Core principle: read wide, write narrow

Every role may **read broadly** what it is allowed to read, but **writing is tightly constrained**. The writer is a single role, in a single scope, for a single task.

---

## Role boundaries

- **Advisor — read-only.** The Advisor reviews and proposes; it never writes project code and never launches a writer. (In a later phase this becomes an OS-level permission wall; until then it is enforced by role discipline.)
- **Builder (CTO) — sole writer.** Only the builder changes code, and only inside the allowed scope / file lease / branch / worktree for one approved task.
- **Checker — independent read-only verifier.** Reviews evidence; writes only checker reports; never edits code; never approves real-world actions.

---

## Human gates (always require the founder)

The harness must **stop and ask the founder** before anything in this list. It never performs these on its own:

- OAuth / sign-in flows
- QR / device-pairing payloads
- Identity verification
- Secrets, credentials, API keys
- Payments and billing
- Outbound messages (email, SMS, chat, social)
- Production deploys
- Smart-home / device actions
- Provider or account mutation (creating, changing, or deleting accounts/resources)

---

## Proof rules

- **No artifact = no completion.** A task is not "done" without the required evidence artifacts on disk.
- **The builder does not self-certify.** The role that wrote the code does not get to declare it proven. The independent Checker verifies.
- **The correct proof category is required.** Proof must match the project type; a passing unit test does not prove a deploy, and so on.
- **No founder manual testing until machine proof has been attempted.** The founder's hands are the last resort, not the first. Automated/local proof is tried first; the founder is asked to test only when machine proof cannot cover it.
- **No cloud or paid reviewer unless explicitly approved.** The default reviewer is the local Checker. Any cloud/paid review is a founder decision.

---

## What the harness must never read

Secrets, `.env` files, SSH keys, browser profiles, cookies, tokens, QR payloads, provider credentials, private messages, and payment data are **off-limits to every role**. If a task appears to require them, stop and raise a gate.

---

## Default posture

When uncertain, **stop and raise a gate** rather than proceeding. A false "done" or an unrequested real-world action is far more expensive than pausing to ask.
