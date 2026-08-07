# VB2 — License / IP Register (minimal register: dependencies, copied code, worker outputs)

**Requirement (V8-B acceptance, C15):** *Minimal License/IP register* — dependencies, copied code,
worker/AI-tool outputs, and their license constraints, recorded so a founder can see whether the
project is clear to make a **commercial or pilot** claim. ROADMAP §6.11 defines the concrete artifact
(`.foundergate/license_ip_register.json`) and its minimum fields; **Law 66** is the doctrine.

**Status after this lane:** built. A standalone engine reads a register snapshot (the §6.11 fields)
and derives, **per entry and rolled up**, the one honesty a license/IP register lives or dies by:
*a commercial/pilot claim is clear only when every recorded component is cleared — a single unknown,
high-risk, or unreviewed entry blocks the whole claim, and an empty register clears nothing.*

## What Law 66 (ROADMAP §6.11) asks for, and where each piece lives

> *Any open-source worker, copied component, or AI tool used by FounderGate must enter the License/IP
> Register before real use. Unknown license/IP risk blocks commercial/pilot claims. Human legal review
> is required for high-risk or unclear licenses. The register is a concrete
> .foundergate/license_ip_register.json artifact, not just a policy.*

- *"must enter the register before real use"* → each **entry** (`package_name`, `source_repo_vendor`,
  `version`, `license`, `copied_code_or_adapter_only`, …) — read verbatim, and **data-classified**
  (Founder Evidence law): non-displayable terms are shown **redacted**, while the clearance verdict is
  computed regardless.
- *"Unknown license/IP risk blocks commercial/pilot claims"* → the **verdict**: an entry is *cleared*
  only when its license is known, commercial use is confirmed allowed, copyleft/redistribution risk is
  neither high nor unknown, its `status` is APPROVED, and a review is on record (`reviewer_source` +
  `date_reviewed`). A single blocking entry rolls the whole register up to **blocked**.
- *"Human legal review is required for high-risk or unclear licenses"* → `needsLegalReview`, surfaced
  whenever `human_legal_review_required` is set, copyleft risk is high, or the license is unclear —
  because that decision is a human's, never the harness's.
- *"a concrete artifact, not just a policy"* → the surface reads the concrete register snapshot and
  carries its `source` truth-label (**live** vs **fixture**), so a founder always knows whether they
  read the live register or a committed sample.

## What was added

- **`src/v8b2/license-ip-register.mjs`** — a pure, read-only engine + surface. It:
  - `deriveEntryVerdict(entry)` reads one caller-supplied register entry and returns its normalized
    shape plus an honest clearance verdict — *cleared*, or the **exact list of reasons** it blocks a
    commercial/pilot claim. `commercial_use_allowed` is **tri-state** (only explicit `true` clears;
    missing is *unknown*, and unknown blocks); a missing/unrecognized risk is *unknown* (never *none*);
    a missing/unrecognized status is *UNKNOWN* (never assumed *APPROVED*).
  - `deriveRegisterView(snapshot)` rolls the per-entry verdicts up. An **empty** register is
    *unsubstantiated* — never *clear*: nothing recorded clears no claim, and anything actually in use is
    then unregistered, in breach of Law 66.
  - renders the register (text + HTML + a complete page), with the law quoted verbatim, and applies
    **data-class redaction** to free-text terms.
  - No `fs` / net / `child_process` / clock / randomness. Same snapshot in → byte-identical page out.

- **`src/v8b2/license-ip-register.selftest.mjs`** — 27 checks: the engine reads an entry into a verdict;
  *clear only when every entry clears*; **one blocking entry blocks the whole claim**; unknown license
  never guessed permissive; tri-state commercial use; unknown-vs-none risk; high risk blocks + flags
  legal review; status never assumed APPROVED; unreviewed never cleared; **empty register is
  unsubstantiated, never clear**; the roll-up counts; **SECRET-classed terms redacted yet still get a
  verdict**; the law shown verbatim; obligations surfaced without blocking; purity + idempotency;
  garbage-in honest degrade; source truth-label; flexible snapshot shape; a complete page with balanced
  `<section>` tags; the seductive-lie HTML guard; injection-safe escaping; deterministic output; the
  §6.11 enums; and the three act-edge scans (source imports, rendered page, exported names).

- **`docs/assembly-evidence/vb2-license-ip-register/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and two rendered pages.

## The honesty stance — clearance is earned (Law 66; Law 54 "never invent state")

- **A claim is clear only when every entry is cleared.** *Unknown license/IP risk blocks
  commercial/pilot claims* is a stop, not a caution — one unknown/high-risk/unreviewed entry blocks the
  whole register. This is exactly the roll-up the surface refuses to fudge.
- **Unknown is never upgraded.** A missing license → *unknown, blocks*; a missing risk → *unknown,
  blocks*; a missing status → *UNKNOWN, blocks*. The register never guesses a gap into an approval.
- **An empty register clears nothing.** It reads *unsubstantiated*, with the warning that any
  open-source worker, copied component, or AI tool actually in use is then unregistered.
- **Redaction never blocks the verdict.** A SECRET-classed entry has its free-text terms redacted, but
  its license, risk, status, and review facts still produce a clearance verdict — because whether a
  component clears a claim does not depend on whether its raw terms can be printed.

## Evidence (rendered from real, on-disk repo facts, offline)

`render-evidence.mjs` does not hand-type the licenses — it **reads** them from the committed
`package-lock.json`, this repo's deterministic source of truth for dependency licenses, and lets the
**engine** decide what blocks. The license → risk classification is derived from the SPDX id off disk
(permissive → none, weak copyleft e.g. MPL/LGPL → medium, strong copyleft e.g. GPL/AGPL → high,
unrecognized → unknown). It renders one page for each posture over the **same** six real dependencies:

- **`register-clear.html`** — the six dependencies shown *as if a human license review had been
  completed* (status APPROVED, a `reviewer_source` and `date_reviewed` on record). Every entry clears,
  so the register rolls up to **commercial/pilot: clear**. This is what earned green looks like — and it
  is a **fixture**, because no such review is recorded on disk yet.
- **`register-blocked.html`** — the exact same dependencies **as they stand today**: no reviewer, no
  date, status UNKNOWN. Not one has a recorded license/IP review, so every entry blocks and the register
  rolls up to **commercial/pilot: blocked**. That is the honest current posture and a real, actionable
  gap — the licenses are *known* (Apache-2.0, MPL-2.0, MIT), but "known license" is not "reviewed and
  cleared".

Real on-disk facts read at render time (deterministic, from `package-lock.json`):

| Package | Version | License (read off disk) | Copyleft posture (derived) |
|---|---|---|---|
| @axe-core/playwright | 4.12.1 | MPL-2.0 | medium (weak copyleft) |
| @playwright/test | 1.61.1 | Apache-2.0 | none (permissive) |
| axe-core | 4.12.1 | MPL-2.0 | medium (weak copyleft) |
| fsevents | 2.3.2 | MIT | none (permissive) |
| playwright | 1.61.1 | Apache-2.0 | none (permissive) |
| playwright-core | 1.61.1 | Apache-2.0 | none (permissive) |

Additional real repo fact: the project's own `package.json` declares **no `license` field** (`private:
true`) — so FounderGate's own code has no declared license on record, itself a real blocker for any
commercial/pilot claim about the product. (Surfaced in prose here rather than as a fabricated entry.)

Reproduce:

```
node docs/assembly-evidence/vb2-license-ip-register/render-evidence.mjs
```

## Read-only / no act edge (verified)

- The license-ip-register self-test is green (27/27); the full suite is green (110/110).
- Both rendered pages contain **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline `on*=`
  handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network. There is
  nothing here to **add** an entry, **review**/**approve** one, or **advance** a release label —
  reviewing and approving a component (and writing the register file) is a later, separately-owned act
  and is **not** wired here.

Local commit only; Terminal-0 owns merges.
