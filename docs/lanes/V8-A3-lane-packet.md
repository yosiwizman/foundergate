# V8-A3 Lane Packet — Build Contract (File Cabinet)

> **Plain English — read this first.**
>
> 1. **What this is.** The one-page **build contract** for V8-A3 — exactly what a future implementation bundle
>    (P-A3-BUILD) may build: a **File Cabinet** (safely browse, preview, copy, download your project's files, with
>    a data-safety badge on every file). It's the V8-A3 equivalent of the §16.0 / V8-A2 lane-packet contracts.
> 2. **Why it matters.** It's what gate **G1-A3-IMPL** asks you to approve *starting to build*. It fixes what's
>    in, what's out, and — most importantly — how secrets stay hidden.
> 3. **What can go wrong.** The core risk is *misclassification*: a file wrongly labelled "safe" could leak a
>    secret (an `.env`, a private key). This contract makes the classification/hiding path the sensitive core,
>    reviewed by an independent adversarial checker, with a committed no-secret-leak proof.
> 4. **What you can test now.** Nothing to run — a document. Read the Allowed / Forbidden / Acceptance lists.
> 5. **One next action.** At **G1-A3-IMPL**, record: *"I approve starting V8-A3 implementation per the approved
>    V8-A3 lane packet."* No V8-A3 code starts before that sentence is recorded (Law 69).

---

## Authority & provenance
- **Authority:** Roadmap V8.11 **§4.8 (File Cabinet, V8-A3)** + §16 staged plan.
- **Approved proposal:** `docs/lanes/V8-A3-proposal.md` (PR #28, SHA `5e6d867`); combined **G4-A2/G1-A3 recorded**.
- **Predecessors:** V8-A1 (Truth Dashboard) + V8-A2 (Preview Bay + Bug Collector) complete & accepted.
- **Law 69:** authorizes nothing until **G1-A3-IMPL** is recorded. Carries forward: schema-first, cannot-invent-
  state, data-classification (C3), view-only, exact-SHA CI, honest scope.

## 🔒 SENSITIVITY RULING (verbatim)

> The secret-hiding / data-classification enforcement path decides what a founder can SEE — misclassification
> leaks secrets; that path runs ONE primary builder + ONE independent adversarial checker before merge (report =
> evidence, re-review after fixes); browse/preview UI lanes are wide-safe.

**Applied:** the classification + access-enforcement lanes (`FC1–FC3`) run **one primary builder + one
independent adversarial checker** (the checker must try to make a secret visible/copyable/downloadable; its report
is evidence and it re-reviews after fixes), Harvest Terminal as sole sheriff. The browse/preview UI lanes
(`FC4–FC8`) are **wide-safe**.

## Allowed scope (component subset, §4.8)
- **Browse:** expand/collapse project folders.
- **Categorize:** files grouped by plain-English categories (Founder Documents, Product Screens, Evidence, Tests &
  Proof, App Source, Configuration, Integrations, Notes, Sensitive/Hidden).
- **Preview** safe files · **Copy** allowed file text · **Download** allowed files.
- **Data-classification badge on EVERY file** (C3).

## Forbidden scope (hidden or gated — enforced)
- **View secrets** (SECRET class) · **copy `.env` contents** · **download private keys**.
- **Edit / delete files without a gate** · **export DO_NOT_EXPORT** · **access PRODUCTION_DATA without a gate**.
- **Unknown files unblocked** — unknown/unclassified files must be **blocked until classified** (never assumed safe).
- **Open file in GitHub** — **V8-B** (deferred).
- **Ask Project Guide "what is this file?"** — **V8-A4** (Project Guide hook deferred; V8-A3 shows files + badges only).
- **Any live / provider / send / payment / production path.**

## Acceptance criteria (the V8-A3 build contract)
- **Every file shows a data-classification badge;** SECRET files are **hidden** (never previewable/copyable/
  downloadable); unknown/unclassified files are **blocked** (cannot-invent-state carried to files — **Law-54 proof
  required for A3 surfaces**).
- **Secret-hiding adversarial tests (committed):** `.env`, private keys, tokens, and DO_NOT_EXPORT/PRODUCTION_DATA
  files cannot be previewed, copied, or downloaded through any path — proven by test, including a dedicated
  **no-secret-leak proof** committed as a self-test.
- Preview/copy/download available **only** for allowed classes.
- Files grouped by the plain-English categories; folders expand/collapse.
- **No edit/delete path** in the viewer; **no Open-in-GitHub, no Project-Guide answers** (both deferred).
- Founder Hand-Burden: browsing/copying/downloading needs **no terminal**.
- **Playwright smoke per screen**, including a **hidden-SECRET** state and a **blocked-unknown** state.
- **Exact-SHA CI green** on the final V8-A3 commit; acceptance packet complete.

## Evidence plan
Per-substep folders under `docs/assembly-evidence/A3-*/`; classifier/access self-tests (pass AND fail); the
**no-secret-leak proof** self-test; a **Law-54 cannot-invent-state** self-test for file surfaces (unknown →
blocked); **Playwright smoke screenshots** for every File Cabinet screen (tree + badges + hidden-SECRET +
blocked-unknown + preview); the **independent adversarial checker report(s)** for the FC1–FC3 path (round 1 +
re-review); machine-capacity preflights; and a V8-A3 acceptance packet checked against the criteria above.

## Substep DAG (for a future P-A3-BUILD bundle)

**Phase FC-CLASS — classification + access enforcement (SENSITIVE: 1 builder + 1 adversarial checker):**
- `FC1` per-file classification engine (extend C3): map files → category + data class; unknown → **blocked**;
  SECRET → **hidden**. *First; the sensitive core.*
- `FC2` access policy: preview/copy/download allowed **only** for allowed classes; refuse `.env`/keys/
  DO_NOT_EXPORT/PRODUCTION_DATA — depends `FC1`.
- `FC3` **no-secret-leak proof** (adversarial committed test) — depends `FC1`, `FC2`. *(checker-reviewed before merge)*

**Phase FC-UI — browse/preview (WIDE-SAFE, may run parallel where locks permit):**
- `FC4` file-tree browse (expand/collapse) — depends `FC1` (needs classes to render badges).
- `FC5` plain-English category grouping + **data-class badge on every file** — depends `FC1`.
- `FC6` preview safe files (gated by `FC2`) — depends `FC2`.
- `FC7` copy allowed text / download allowed files (gated by `FC2`) — depends `FC2`.
- `FC8` Playwright smoke per screen (tree/badges/hidden-SECRET/blocked-unknown/preview) — depends `FC4`–`FC7`.

**Phase AC — acceptance:** `AC1` Law-54 cannot-invent-state for file surfaces · `AC2` exact-SHA CI · `AC3` V8-A3
acceptance packet. Gate after FC-CLASS + FC-UI + AC evidence complete: **G2-A3 (UI witness)**.

## One next action (founder, at G1-A3-IMPL)
Approve or reject *starting* V8-A3 implementation. Approval authorizes the P-A3-BUILD bundle under this contract;
it is not code and starts nothing automatically (Law 69).
