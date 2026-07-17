# Founder Authorization — OpenSandbox & Safety Check Experimental Track

**Recorded on disk to close the Phase 7.1 final-audit FINDING A (roadmap-authority recording gap).**
This is the authoritative on-disk record of the founder's authorization for the experimental track.
Recorded in the PR #159 head branch (`integration/founder-safety-check-evidence-pack-phase7-1`); it
integrates to main only through the normal, still-pending gates. Nothing here authorizes a merge.

## Verbatim founder authorization
> FOUNDER AUTHORIZATION — OPENSANDBOX AND SAFETY CHECK EXPERIMENTAL TRACK
>
> I authorize FounderGate to record OpenSandbox Phases 1–6 and Safety Check Phases 7–7.1 as
> founder-approved experimental, draft, and unmerged work under the FounderGate roadmap authority.
>
> This authorization recognizes the work as permitted research, design, controlled runtime
> qualification, evidence generation, and founder-witness preparation.
>
> This authorization does not accept Phase 7.1, adopt OpenSandbox, authorize a merge to main,
> authorize customer or private repositories, authorize production integration, authorize public
> deployment, authorize payments, or authorize AKIOR adoption.
>
> Terminal-0 is authorized to repair the durable Evidence Pack by sealing the already-generated PDF
> and ZIP into the governed evidence directory, regenerate and verify all artifact hashes, run all
> affected selftests, Playwright, accessibility checks, project-adoption tests, and exact-SHA CI, and
> commission a fresh independent read-only Advisor audit.
>
> All PRs #151 through #159 must remain draft and unmerged until the corrected evidence is
> independently verified and the formal founder witness is completed.
>
> OpenSandbox remains a tested candidate, not an adopted dependency.
>
> FounderGate must return to me at the next true gate:
> FORMAL FOUNDER WITNESS — BOUNDED SAFETY CHECK AND EVIDENCE PACK UI.
>
> Signed by the Founder and Acceptance Authority.

## What this authorization DOES grant
- Records OpenSandbox Phases 1–6 and Safety Check Phases 7–7.1 as **founder-approved experimental,
  draft, unmerged** work under FounderGate roadmap authority (research, design, controlled runtime
  qualification, evidence generation, founder-witness preparation).
- Authorizes Terminal-0 to **seal the already-generated PDF + ZIP** into the governed evidence
  directory, **regenerate and verify all artifact hashes**, run all affected selftests + Playwright +
  accessibility + project-adoption tests + exact-SHA CI, and **commission a fresh independent
  read-only Advisor audit**.

## What this authorization explicitly does NOT grant
- NOT acceptance of Phase 7.1 · NOT OpenSandbox adoption · NOT a merge to main · NOT customer or
  private repositories · NOT production integration · NOT public deployment · NOT payments · NOT
  AKIOR adoption.
- All PRs #151–#159 **remain draft and unmerged** until the corrected evidence is independently
  verified and the **formal founder witness** is completed.

## Standing constraints reaffirmed
OpenSandbox remains a **tested candidate, not an adopted dependency.** The next true gate is the
**FORMAL FOUNDER WITNESS — BOUNDED SAFETY CHECK AND EVIDENCE PACK UI.**

## Effect on the Phase 7.1 final-audit findings
- **FINDING A (roadmap-authority recording gap): RESOLVED** by this recorded founder authorization —
  the experimental track now has an explicit on-disk founder-approved authority basis.
- **FINDING B (Evidence Pack durability): REPAIRED** — `evidence-pack.pdf` + `evidence-pack.zip`
  sealed into `docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/EVIDENCE_PACK/`; run + pack sha256
  manifests regenerated and verified 100% clean (content unchanged).
