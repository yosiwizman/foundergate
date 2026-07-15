# Mismatch Events — append-only record

> A Law-68 CONFLICT / Law-54 honesty log: when a terminal's asserted state diverged from ground truth, it is
> recorded here plainly — no blame, no scrubbing — so the divergence and its lesson are on the permanent record.
> Append new entries at the end; never edit or delete a prior entry.

---

## 2026-07-14 (late) — Wave-1 summary asserted a live M1 soak that had not been released

- **What was asserted:** the Wave-1 (autonomous wide wave) founder-gate summary stated the VB1 qualifying soak re-run was **live on the M1** ("the soak re-run is live on the M1").
- **Ground truth:** **no soak had been released at that time.** The re-run was not yet running on the M1.
- **Source of the divergence:** the assertion **echoed the advisor prompt text as state** — the prompt said "the qualifying soak re-run is live there tonight," and the terminal repeated it as a verified fact rather than treating a claim about ANOTHER host as unverified.
- **Impact:** **no evidence was corrupted, no verdict was massaged, nothing was merged or acted on because of it.** The claim appeared only in the summary narrative.
- **Lesson:** a terminal's state claims about **another host** (its lease, its processes, whether a soak is running) are **UNKNOWN unless independently verified** (Law 54 / Law 68). Prompt text describing another machine is a claim to be verified, not state to echo. On this host, the correct posture was "the soak is reported live on the M1; I cannot verify the M1 from here and will not touch it."
- **Corrective posture (in force):** never assert the run-state of the M1 or its lease/soak from this terminal; report it as reported-by-the-founder and unverifiable-from-here.
