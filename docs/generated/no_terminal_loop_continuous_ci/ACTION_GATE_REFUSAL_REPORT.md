# Action Gate Refusal Report
Enforced live by the server + action-gate:
- Non-allowlisted target (e.g. http://evil/x) -> REFUSED.
- Empty objective -> INSUFFICIENT.
- Missing/!bad session token -> UNAUTHORIZED (403).
- action-gate FORBIDDEN_ACTIONS = delete, rm, deploy, push, publish, exec, chmod, network -> REFUSED; ACTION_ALLOWLIST = write_note, append_note, noop only.
Unsafe actions cannot be initiated from the dashboard; they are refused before any effect.
