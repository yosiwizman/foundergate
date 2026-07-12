# VB2 (LANE B) — Independent Adversarial Checker Report

**VERDICT: CLEAN** — The builder's core safety claims hold. VB2 is non-executing: no act/approve/execute path, no VB1 reach, no side effects, deterministic pure render, and SECRET/blocked content is refused at ingress. XSS and prototype-pollution attacks failed. Findings below are LOW-severity hardening / defense-in-depth notes only; none falsifies a stated claim.

## Claims tested and result
| # | Claim | Result |
|---|-------|--------|
| 1 | No act edge / side effects (pure render) | HELD — no fs/net/child_process/clock/eval; render mutates nothing; byte-identical across time |
| 2 | No VB1 reach (direct or transitive) | HELD — production modules import only `./cto-queue.mjs`; that module imports nothing |
| 3 | No auto-action from queued content/status | HELD — items are inert records; renderer only builds strings |
| 4 | Data-class boundary (SECRET can't enter/leak) | HELD at ingress — all SECRET/blocked variants refused; renderer output fully escaped |
| 5 | Schema/validation bypass (proto pollution, etc.) | HELD — `__proto__` own-prop dropped, `Object.prototype` unpolluted |

## What I could NOT break (proved safe)
1 — Act edge / purity: `cto-queue.mjs` zero imports; `queue-view.mjs` imports only `./cto-queue.mjs`. Exports exactly `emptyQueue, addItem, listItems, getItem, validateItem, QueueError` + `renderQueueText/renderQueueHtml`. `addItem` leaves input queue+item byte-identical (`normaliseItem` deep-copies known keys and `Object.freeze`s the result); render mutates nothing; output byte-identical across a time gap → no clock/randomness. No `Date`/`fetch`/`spawn`/`exec`/`writeFile`/`eval`/`process.*`. `created_at` validated as caller-supplied string, never a clock read.
2 — VB1 isolation: no `v8b1` token/import/require/dynamic-import anywhere; `cto-queue.mjs` imports nothing, so no transitive path to executor/session-token/rollback/atomic-store.
3 — Auto-action: no status/content routes to execution — no execution surface exists.
4 — XSS/injection: a maximally hostile queue (`<script>`, `<img onerror=>`, `<svg onload=>`, `javascript:` URL, attribute-breakout `">`<`, `</li></ul>` container-breakout) fed directly into `renderQueueHtml` (bypassing `addItem`): every dynamic value passes `escapeHtml` (`& < > " '`) → only escaped entities. No live `<script`, no live `<img`, no attribute breakout; HTML uses double-quoted attributes only and emits no `href`/`<a>`, so `javascript:` URLs are inert.
5 — Prototype pollution: real own-`__proto__` passed to `validateItem`+`addItem` left `Object.prototype.polluted` undefined. `normaliseItem` copies only the 8 whitelisted keys into a fresh literal, so `__proto__`/`constructor` own-props never reach an assignment sink.
Data-class case/whitespace smuggle: `"secret"`, `"SECRET "`, `" SECRET"`, `"Secret"`, `"BLOCKED"`, `null`, `undefined` all rejected. Only exact `PUBLIC`/`INTERNAL` pass.

## Findings (all LOW — hardening, none falsifies a claim)
### LOW-1 — renderers do not re-validate `data_class`; a hand-crafted queue bypassing `addItem` renders SECRET in the clear
Repro: `renderQueueHtml({schema_version:"1.0.0", items:[{…, data_class:"SECRET"}]})` emits `data class: SECRET`. Renderer trusts input is validated. Impact low (ingress refuses SECRET; value is escaped; a bypassing caller already holds the secret) — defense-in-depth gap, not a boundary breach. Fix: in `listItems`/renderers skip or redact any item whose `data_class ∈ FORBIDDEN_DATA_CLASS` (or not in `DATA_CLASS`).
### LOW-2 — `validateItem` does not enforce `additionalProperties:false` (code/schema divergence)
Repro: `validateItem(goodItem({ evil:()=>1, __act:"execute", nested:{a:1} }))` → `valid:true`, but the committed schema sets `additionalProperties:false`. Impact low for the act-edge claim (`normaliseItem` strips extras; no act handle rides along) but code and schema disagree. Fix: reject unknown own-keys in `validateItem`.
### LOW-3 — no length caps (only `minLength:1`)
Repro: a 2,000,000-char `summary` validates true. Memory/DoS surface, inert data, no act. Fix: add `maxLength` to string fields in `validateItem` and the schema.
### LOW-4 (informational) — `ISO_RE` is shape-only: `"9999-99-99T99:99:99Z"` passes; still caller-supplied DATA (no clock read). `1720742400000` correctly rejected. Optional tighten.
### LOW-5 (informational) — `validateItem` then `normaliseItem` each read props → a caller's side-effecting getter runs up to twice (caller's own side effect, not a VB2 act edge). Noted.

## Evidence
Selftests pass: `cto-queue.selftest.mjs` 12/12, `no-act-edge.selftest.mjs` 9/9. Adversarial harness (throwaway, scratchpad only, repo untouched): XSS fully escaped; `Object.prototype` unpolluted; all SECRET/case variants rejected; inputs/render targets unmutated; render deterministic across time. Files reviewed: `src/v8b2/cto-queue.mjs`, `src/v8b2/queue-view.mjs`, `src/v8b2/schemas/cto_queue.schema.json`, both selftests.

Bottom line: could not falsify any of the five non-executing safety claims. VB2 is a pure data model + escaped read-only renderer with no act edge and no VB1 dependency. Only improvements are optional hardening (re-validate `data_class` at render, enforce `additionalProperties`, add length caps).
