# Evidence Viewer Read-Only Report
The evidence viewer renders manifest + escaped text only; it has no forms and no write endpoints. assertReadOnly throws if any mutation capability is enabled. There is no path from the viewer to a mutation, merge, PR-ready, provider, or deploy action.
