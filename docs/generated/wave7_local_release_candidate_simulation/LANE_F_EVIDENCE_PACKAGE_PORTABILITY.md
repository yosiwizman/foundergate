# Lane F — Evidence Package Portability Rehearsal
A sealed local evidence package is: created (real ditto ZIP), unzip-verified (`unzip -t`), replayed
in the Evidence Viewer (founder-readable summary), compared to another package (same/DIFF), and
malformed inputs are rejected on import. No raw logs, no full SHA in the founder view, no private
data. Verified (E2E across Wave 5/6/7): aggregate sealed + viewer replay + compare; import rejection.
