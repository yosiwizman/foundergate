# Founder Witness — Public-Repository URL-Drop UI (one page)

**This is a witness candidate, not an accepted product.** You are checking whether it is clear and usable — not validating code, security, Git, or Docker.

## What to open
On the Mac Mini, run: `node src/founder_url_drop/server.mjs` — then open the printed link (`http://127.0.0.1:4700/`).

## What to click
1. Click **Use evaluation fixture** (fills in the one allowed URL), then **Run Safety Check**.
2. Watch the progress steps finish.

## The exact fixed URL to use
`https://github.com/pypa/sampleproject` — the only project the live check will run. It is an open-source **evaluation fixture**, not customer code.

## What success should look like
- An **exact commit** is shown (`621e4974…`) and a **snapshot fingerprint** (archive + manifest).
- The result says **Compileability observed** (the project's code parses).
- Alongside it: **Build not proven · Tests not proven · Security not proven · Production readiness not proven**.
- A **Cleanup** card confirms the temporary sandbox and disposable machine were removed.

## What is intentionally NOT proved
The project was **not built, not tested, not run, not certified secure, and not shown production-ready**. We only observed that it compiles. OpenSandbox is a tested candidate, **not adopted**.

## What must not be touched
- Do **not** expect private repositories to work — they are refused.
- A **different** public URL is **HELD** ("general public-repository execution not yet authorized"). That is expected.

## How to Pause & get help
The **⏸ Pause & get help** button is always at the top right. Nothing runs project code or touches customer data; you can stop anytime.

## Your decision (one of three)
- **Accept as a witness candidate** — it is clear and usable (this is not product acceptance, adoption, or a security sign-off).
- **Reject** — confusing, overclaims, or you couldn't find Pause.
- **Report a problem** — tell us the specific issue.
