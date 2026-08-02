# Lane L — Accessibility & Hand-Burden Report

- **axe-core: 0 serious/critical** across all seven panels (Truth, Preview, Evidence, Decisions,
  Ask Guide, Files, Technical), tested with each panel visible.
- Active nav is keyboard reachable (`<button>` elements, visible focus ring, `aria-current`).
- Main action ("Run safe demo check") is large and obvious; Export is the clear second step.
- No mandatory typing anywhere; no tiny required controls.
- Display-only / view-only labels are readable (contrast fixed: `.tag` on the active blue nav
  lightened to meet WCAG AA; white-on-blue button/nav uses `#1d4ed8`).
- The founder can tell live vs display-only from on-screen labels alone.

Hand-burden: the founder only looks at the screen, may click one button, and answers a visual
gate. No terminal, Git, SHA, code, raw-log, or ZIP-internal action is required of the founder.
