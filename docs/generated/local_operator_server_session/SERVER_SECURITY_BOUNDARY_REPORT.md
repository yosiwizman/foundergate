# Server Security Boundary Report
- Loopback only: listens on 127.0.0.1, not 0.0.0.0.
- Target allowlist: only exact logical keys map to fixed vetted test paths; raw paths, ../ traversal, absolute paths, http/https/file URLs, private-host URLs -> REFUSED.
- No shell: execFile array-args; objective is an argv element, never shell-interpolated -> metacharacters/backticks/$()/pipes inert (tested).
- Input bounds: objective non-empty and <=200 chars; request body capped at 10KB.
- No network egress, no provider, no deployment, no external repo. Only local read-only git + node test execution + local ditto sealing.
- Never SHIP: any runner SHIP is rejected by the server.
