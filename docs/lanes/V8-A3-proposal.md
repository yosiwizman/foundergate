# V8-A3 Proposal — File Cabinet (PROPOSAL ONLY)

> **Plain English — read this first.**
>
> 1. **What this is.** A *proposal* for the next stage after V8-A2: the **File Cabinet** — a safe way for you to
>    browse, preview, copy, and download your project's files, with a data-safety badge on every file. **No code
>    is written here.**
> 2. **Why it matters.** Today you can read your project's status (V8-A1) and preview it running + report bugs
>    (V8-A2). V8-A3 lets you *look inside the files themselves* — safely, without a terminal — while secrets and
>    dangerous files stay hidden or gated.
> 3. **What can go wrong.** A file viewer that leaks a secret (`.env`, a private key) or lets a dangerous file be
>    edited/deleted. This proposal forbids exactly that: the File Cabinet enforces data classification and blocks
>    unknown files until they're classified.
> 4. **What you can test now.** Nothing to run — a document. Read the two lists (can / cannot) and confirm they
>    match what you want next.
> 5. **One next action.** At the next gate, approve or reject *starting* V8-A3. Approval is not code; V8-A3 would
>    be its own gated build (Law 69).

---

## Authority & status
- **Authority:** Roadmap V8.11 §16 staged plan; **File Cabinet §4.8** (V8-A3 stage).
- **Status:** **PROPOSAL ONLY.** No V8-A3 code exists or is authorized here. Law 69: V8-A2 remains the latest
  closed stage until the founder approves V8-A3 start.
- **Predecessors:** V8-A1 (Truth Dashboard) and V8-A2 (Preview Bay + Bug Collector) complete & approved.

## What V8-A3 would deliver (in scope, §4.8)

A **safe, classified repo viewer**. The founder can:
- **Expand / collapse** project folders.
- See files **grouped by plain-English categories** (see table).
- **Preview** safe files.
- **Copy** allowed file text.
- **Download** allowed files.
- See a **data-classification badge on every file** (C3).

### File categories (plain-English grouping, §4.8)
| Founder category | Examples | Default data class |
|---|---|---|
| Founder Documents | roadmap, current status, panic card, known limits | PUBLIC_SAFE |
| Product Screens | screenshots, before/after images, design docs | PROJECT_INTERNAL |
| Evidence | witness records, bug packets, Playwright artifacts | PROJECT_INTERNAL |
| Tests & Proof | test reports, CI summaries, checker results | PROJECT_INTERNAL |
| App Source | app code, components, pages | PROJECT_INTERNAL |
| Configuration | package files, build config, deployment config | PROJECT_INTERNAL |
| Integrations | Supabase, Vercel, Docker, env templates | PROJECT_INTERNAL |
| Notes | founder notes and decisions | PRIVATE_FOUNDER_DATA |
| Sensitive / Hidden | secrets, .env, tokens, private keys | SECRET |

### What the founder CANNOT do (safety, §4.8) — enforced by V8-A3
- View secrets (SECRET class) · copy `.env` contents · download private keys.
- Edit dangerous config without a gate · delete files without a gate.
- Access PRODUCTION_DATA-class files without a gate · export DO_NOT_EXPORT-class files.

### File Cabinet law (§4.8, carried forward)
> The founder may browse, copy, and download project files only through a classified File Cabinet. Secrets, live
> credentials, private keys, regulated data, and dangerous configuration are hidden or gated. The File Cabinet
> enforces data classification (C3). It is for visibility and safe access, not raw uncontrolled editing. **Unknown
> files are blocked until classified.**

## Explicit non-goals (NOT in V8-A3 — deferred / gated)
- **Open file in GitHub** — **V8-B**.
- **Ask Project Guide "what is this file?"** — **V8-A4** (the Project Guide hook is explicitly deferred; V8-A3
  shows files and badges only, it does not answer questions about them).
- **Editing / deleting files, or exporting sensitive/regulated data** — gated (never a raw uncontrolled editor).
- Anything outside a read-only, classified viewer: Preview Bay control (V8-A2, already shipped), Run Launcher /
  Bench / multi-project / Project Guide answers / any live/provider/send/payment path.

## Proposed acceptance criteria for V8-A3 (for a future build contract)
*(Illustrative — the binding V8-A3 contract would be authored like §16.0/the V8-A2 lane packet, only after the
founder approves V8-A3 start.)*
- Every file shows a **data-classification badge**; **SECRET** files are hidden (never previewable/downloadable),
  and **unknown/unclassified** files are **blocked** (cannot-invent-state carried to files).
- Preview/copy/download are available **only** for allowed classes; `.env`, private keys, and DO_NOT_EXPORT are
  refused (proven by test).
- Files are grouped by the plain-English categories above; folders expand/collapse.
- No edit/delete path exists in the viewer; no Open-in-GitHub, no Project-Guide answers (both deferred).
- Founder Hand-Burden: browsing/copying/downloading needs **no terminal**.
- Playwright smoke for the File Cabinet screen (incl. a hidden-SECRET and a blocked-unknown state).

## One next action (founder)
Approve or reject *starting* V8-A3. Approval authorizes a future gated V8-A3 build contract; it is not code and
starts nothing automatically (Law 69).
