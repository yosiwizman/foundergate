# Next True Founder-Gate Register — after the Least-Privilege Deploy Key Proof (W8)

Each entry below is a **separate** founder gate. None is opened by this run. Order is not a commitment.

| # | Candidate next gate | Why it is a distinct gate | Status |
| --- | --- | --- | --- |
| A | Fine-grained read-only **PAT** proof | Different credential class than a deploy key; token scoping + expiry semantics must be proven separately | BLOCKED — FOUNDER DECISION REQUIRED |
| B | **GitHub App** installation read-only proof | Installation tokens + per-repo permissions are a different trust/revocation model | BLOCKED — FOUNDER DECISION REQUIRED |
| C | Existing **valuable** founder repo (read-only) | Real (non-synthetic) repo of value; higher blast radius; needs explicit founder authorization | BLOCKED — FOUNDER DECISION REQUIRED |
| D | **Customer** repo (read-only) | Third-party data; legal/consent obligations; never implied by a self-owned sandbox | BLOCKED — FOUNDER DECISION REQUIRED |
| E | Any **write** path to any repo | Every proof so far is read-only by construction; write is a categorical escalation | BLOCKED — FOUNDER DECISION REQUIRED |
| F | Provider / code-execution on intake content | No provider call or code execution has occurred; each is its own gate | BLOCKED — FOUNDER DECISION REQUIRED |

**Non-authority:** this register asserts no current verified state beyond the sealed least-privilege proof and authorizes nothing. Acceptance of any gate is a separate founder-only decision.
