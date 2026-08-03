# Lane M — Disk Persistence Audit (no major result is memory-only)
| Artifact | On disk? |
| --- | --- |
| Idea record | yes |
| Guided spec | yes |
| Build plan | yes |
| App: core.mjs | yes |
| App: index.html | yes |
| App: package.json | yes |
| Tests: planner.selftest.mjs | yes |
| Test-run result (doc) | yes |
| Test-run result (json) | yes |
| Preview screenshots | yes |
| Preview report | yes |
| Evidence report | yes |
| Refusal tests | yes |
| Roadmap | yes |
| Founder action bundle | yes |
| Idea builder UI status json | yes |

All material results are written to disk (docs + generated app + tests + result JSON + screenshots
+ receipt). The final verdict + sealed ZIP are created at finalize and live in the sealed receipt/ZIP (external to the git tree by design, consistent with every prior wave). Screenshots, the test-run JSON, and the Checker/Gate Advisor/Terminal reports are ALSO persisted IN-REPO under docs/generated/wave9_idea_to_local_app_builder/ (screenshots/, evidence/, and the *_REPORT.md files) so nothing material is memory-only.
