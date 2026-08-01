# Server Security Boundary Report
- Loopback only: listens on 127.0.0.1, not 0.0.0.0.
- Target allowlist: only exact logical keys map to fixed vetted test paths; raw paths, ../ traversal, absolute paths, http/https/file URLs, private-host URLs -> REFUSED.
- No shell: execFile array-args; objective is an argv element, never shell-interpolated -> metacharacters/backticks/$()/pipes inert (tested).
- Input bounds: objective non-empty and <=200 chars; request body capped at 10KB.
- No network egress, no provider, no deployment, no external repo. Only local read-only git + node test execution + local ditto sealing.
- Never SHIP: any runner SHIP is rejected by the server.

## Disclosed limitation (NOT a security claim)
The loopback API has NO authentication and NO Origin/CSRF check. Any local process, or a page open in the same browser, could POST to /api/start or /api/export. The blast radius is bounded (only allowlisted self-tests run, decisions never SHIP, no network egress, no external repo, no provider, no deployment), but this surface is UNASSESSED. This session makes NO security or compliance claim about the server; the boundaries above are observed engineering properties, not a certification. Adding an auth/Origin decision is a recorded safe follow-on.
