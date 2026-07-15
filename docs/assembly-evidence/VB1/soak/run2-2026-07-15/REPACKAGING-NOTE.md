# Repackaging note — Run 2 bundle (addition-only repair)

**What the Pro's independent verification found (EVIDENCE-DEFECT, internal consistency only — not a
challenge to the run):** the bundle's manifest referenced `intervention-log.jsonl` — it is named in
`VERDICT.txt` ("failures & interventions log: intervention-log.jsonl") and listed in `README.md` —
but the file was **not present** in the original commit (`684dc8b`). The manifest named a file the
bundle did not contain.

**Root cause:** the reviewed driver creates the interventions file *conditionally* — only on the
first intervention, via `intervention()` which `appendFileSync`s to it
(`src/tools/soak-driver.mjs`, ~lines 372 / 386–388). But the verdict emitter references that path
*unconditionally* (`computeVerdict`, ~line 344). Run 2 had **zero interventions**, so the file was
never created, while the verdict still listed it. The reference was correct in intent (there were no
interventions) but the file did not exist to back it.

**Repair (addition only):** this commit adds an **empty (0-byte)** `intervention-log.jsonl` to this
directory, making the manifest true — an empty file is the honest representation of "zero
interventions," which is exactly what the run produced. It also adds this note.

**What was NOT changed:** no run data, timestamps, verdicts, health samples, monitor records, or the
sealed L2 attestation were altered. The original commit `684dc8b` stays in history untouched (this is
a new commit on the same branch, not an amend/rebase/rewrite). The attestation seal binds the run
data, not this added file, so adding it modifies no sealed byte. The gate verdict remains **PASS**,
unchanged.

**Reported for a separate reviewed fix (before the 24h soak):** the driver defect is the
unconditional reference (verdict emitter ~line 344) versus conditional creation (`intervention()`
~lines 372 / 386–388). The driver should create/touch `intervention-log.jsonl` at run start (empty)
so a zero-intervention run still produces the file it advertises. That is a code change to the
reviewed driver and is left to the normal review process — it is **not** made here.
