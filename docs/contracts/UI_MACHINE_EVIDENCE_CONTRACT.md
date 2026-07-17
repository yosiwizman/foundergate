# UI Machine-Evidence Contract (TBF-1)

UI-affecting work must produce, bound to the exact candidate SHA, all of:
- **source inspection** + **unit/syntax** tests;
- **actual Playwright** browser flows (not a narrative, not Claude-in-Chrome described as Playwright);
- **headed local browser proof** on the applicable local target platform when a graphical session
  exists; if technically impossible → state `HEADED_BROWSER_EVIDENCE_BLOCKED` (never replaced silently
  by headless screenshots);
- **headless exact-SHA CI** on GitHub-hosted runners;
- **screenshots** at material states; **video** for acceptance-critical flows; **trace**;
- **console log**, **network log**, **page-error log**;
- **responsive/mobile**, **keyboard-only**, **focus behavior**, **automated accessibility**,
  **200% zoom**, **reduced-motion** (where applicable);
- **initial neutral-state proof**, **stale-state proof**, **cache/storage/service-worker proof**;
- **false-green tests**; **independent checker**; **final read-only Advisor** before an
  acceptance-critical founder witness.

These artifact classes are **distinct and non-interchangeable**. A screenshot alone is not acceptance.
Headless CI alone is not proof of the visible experience. A headed local run alone is not exact-SHA CI.
The founder witness must not repeat malformed-input, cache, process, recovery, mutation or low-level
technical checks that are machine-testable.
