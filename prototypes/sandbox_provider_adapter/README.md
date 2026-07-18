# sandbox_provider_adapter — isolated Phase-3 prototype

**Prototype only. Not integrated. Not adopted. No runtime executed in Phase 3.**

This package is a standalone design prototype for a FounderGate-owned, provider-neutral
sandbox interface. It is **not imported by FounderGate production code** and must not be
wired into any FounderGate execution lane.

## What is here
- `contract.py` — provider-neutral types, error classes, evidence records, the abstract
  `SandboxProvider` interface (10 operations), fail-closed validation, and the
  FounderGate-side `evaluate_run` (evidence-completeness outcome, **not** a founder acceptance).
  No OpenSandbox dependency.
- `fake_provider.py` — deterministic in-memory provider implementing the full contract,
  with injectable failures. Cannot yield `EVIDENCE_SUFFICIENT` when required evidence is withheld.
- `opensandbox_provider.py` — pure request-serialization / response-parsing for the exact
  Phase-2-proven REST + execd seams. **No network, no Docker, no SDK, no MCP.** Endpoints are
  configurable and **default disabled**; in `LOCAL_DEV` mode non-loopback endpoints and any
  `0.0.0.0` client target are rejected. Requires explicit timeout, exact image identity, and
  (in governed mode) default-deny egress; rejects host mounts and Docker-socket mounts;
  validates response schemas; translates provider errors into neutral errors.
- `test_contract.py` — 17 isolated tests (stdlib `unittest`), no Docker/OpenSandbox/network.

## Run the tests (isolated; no runtime)
```
cd prototypes/sandbox_provider_adapter
python3 -m unittest test_contract -v
```

## Boundaries this prototype encodes (from Phase 2 evidence)
- No source-code host mounts, no home mounts, no Docker socket to the workload.
- Deny-by-default egress capability; exact image digest for governed runs (no `:latest`).
- stdout/stderr/exit/timestamps and upload/download digests are required evidence.
- Termination must be independently provable; unproven ⇒ UNKNOWN (never PASS).
- No provider may issue founder acceptance; provider output is input to FounderGate checking.

## Intended next target
A later, separately-authorized bounded runtime spike on an **ephemeral Linux VM**
(native Docker bridge networking; disposable host; direct-IP egress denial re-verified).
See `docs/architecture/OPEN_SANDBOX_ADAPTER_DESIGN.md`.

## Limitations inherited from Phase 2
runc = standard container isolation (not microVM/kernel); macOS Docker Desktop proxy
failure (worked around with published ports — **not** a production pattern); execd/control
ports were published on `0.0.0.0` (**not** accepted for production); workload ran as root in
container; execd used a Docker-managed staging volume; pre-1.0 server/SDK API mismatches;
Playwright/rendered-UI never run.
