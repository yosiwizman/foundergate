# Headed capture — labeling note

The headed Mac Playwright capture exercises the full UI via the **labeled `FG_UI_CI` deterministic
path** (`scenario:"CI-FIXTURE"`, no live VM) so the browser flow is reproducible. Its displayed values
derive from the real sealed run. The **live-VM proof** (a real UI-created run, VM created + destroyed,
snapshot deleted) is the sealed `docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/` run — that is the
runtime evidence of record; the headed capture proves the visible founder experience, not the VM.

Screenshot notes: 01/02/14 are byte-identical by design (neutral-first is unchanged across initial /
normal-refresh / relaunch — a false-green guard). 06/07/08 are one full-page capture of the completed
result page, labeled by the region each highlights (runtime-complete / exact-version+snapshot /
compileability+not-proven badges).
