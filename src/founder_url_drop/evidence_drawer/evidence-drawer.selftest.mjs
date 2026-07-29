// Lane B selftest — Safety Check evidence drawer linkage.
// Proves: SHA linkage, UNKNOWN honesty (never PASS/green), data-class redaction
// (fail-closed), determinism, display escaping, no act edge, frozen outputs.
import { buildDrawer, renderDrawerText, redactEntry, escapeHtml, UNKNOWN } from "./evidence-drawer.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

console.log("== Lane B — Safety Check evidence drawer ==");

const pack = {
  manifest_sha256: "b9a6603559c74ed0eb1d4fa4f763bb27b9ffc906f30691a18bb43606c13f7cac",
  entries: [
    { label: "exact_commit", value: "deadbeef", class: "PUBLIC" },
    { label: "api_token", value: "sk-live-SHOULD-NEVER-APPEAR", class: "SECRET" },
    { label: "blocked_path", value: "/Users/private/store", class: "BLOCKED" },
    { label: "mystery", value: "unlabelled-should-fail-closed" }, // no class -> UNKNOWN -> redacted
  ],
};
const result = { url: "https://github.com/pypa/sampleproject", verdict: "COMPILEABILITY_OBSERVED" };

// 01 — full linkage: verdict + sha present -> linked
(() => { const d = buildDrawer({ safetyResult: result, evidencePack: pack }); ok("01 linked when verdict+sha present", d.linked === true && d.evidence_sha256 === pack.manifest_sha256 && d.verdict === "COMPILEABILITY_OBSERVED"); })();

// 02 — missing pack -> UNKNOWN sha, NOT linked
(() => { const d = buildDrawer({ safetyResult: result }); ok("02 missing pack -> sha UNKNOWN, not linked", d.evidence_sha256 === UNKNOWN && d.linked === false); })();

// 03 — missing verdict -> UNKNOWN, never coerced to PASS
(() => { const d = buildDrawer({ evidencePack: pack }); ok("03 missing verdict -> UNKNOWN (never PASS)", d.verdict === UNKNOWN && d.verdict !== "PASS"); })();

// 04 — never certifies green
ok("04 certifies_green is always false", buildDrawer({ safetyResult: result, evidencePack: pack }).certifies_green === false);

// 05 — SECRET content is REDACTED and never appears in the rendered text
(() => {
  const d = buildDrawer({ safetyResult: result, evidencePack: pack });
  const txt = renderDrawerText(d);
  ok("05 SECRET value redacted, never in the clear", !txt.includes("sk-live-SHOULD-NEVER-APPEAR") && txt.includes("‹REDACTED: SECRET›"));
})();

// 06 — BLOCKED content redacted
(() => { const d = buildDrawer({ safetyResult: result, evidencePack: pack }); ok("06 BLOCKED value redacted", d.entries.find((e) => e.label === "blocked_path").redacted === true); })();

// 07 — UNKNOWN/unlabelled class fails CLOSED (redacted, never shown)
(() => {
  const d = buildDrawer({ safetyResult: result, evidencePack: pack });
  const m = d.entries.find((e) => e.label === "mystery");
  ok("07 unlabelled class fails closed (redacted UNKNOWN)", m.redacted === true && m.value === "‹REDACTED: UNKNOWN›");
})();

// 08 — PUBLIC content shown in the clear
(() => { const d = buildDrawer({ safetyResult: result, evidencePack: pack }); ok("08 PUBLIC shown in clear", d.entries.find((e) => e.label === "exact_commit").value === "deadbeef"); })();

// 09 — redacted_count is accurate (3 of 4)
ok("09 redacted_count accurate", buildDrawer({ safetyResult: result, evidencePack: pack }).redacted_count === 3);

// 10 — deterministic render
(() => { const a = renderDrawerText(buildDrawer({ safetyResult: result, evidencePack: pack })); const b = renderDrawerText(buildDrawer({ safetyResult: result, evidencePack: pack })); ok("10 render deterministic", a === b); })();

// 11 — render escapes injected markup in verdict/url
(() => {
  const d = buildDrawer({ safetyResult: { url: "<img src=x onerror=1>", verdict: "<b>bad</b>" }, evidencePack: pack });
  const txt = renderDrawerText(d);
  ok("11 render escapes markup", txt.includes("&lt;img") && !txt.includes("<img src=x") && txt.includes("&lt;b&gt;"));
})();

// 12 — outputs are frozen
(() => { const d = buildDrawer({ safetyResult: result, evidencePack: pack }); ok("12 drawer + entries frozen", Object.isFrozen(d) && Object.isFrozen(d.entries) && Object.isFrozen(d.entries[0])); })();

// 13 — empty pack entries -> zero rows, still valid
(() => { const d = buildDrawer({ safetyResult: result, evidencePack: { manifest_sha256: "abc", entries: [] } }); ok("13 empty entries -> count 0, linked yes", d.entry_count === 0 && d.linked === true); })();

// 14 — NO ACT EDGE: module source exports no executor/act/approve/run/execute function
(() => {
  const src = readFileSync(fileURLToPath(new URL("./evidence-drawer.mjs", import.meta.url)), "utf8");
  ok("14 no act/approve/execute/run export", !/export\s+(async\s+)?function\s+(act|approve|execute|run|certify|activate)\b/.test(src));
})();

// 15 — redactEntry is null-safe and escapeHtml null-safe
ok("15 redactEntry + escapeHtml null-safe", redactEntry(null).redacted === true && escapeHtml(null) === "");

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-B-EVIDENCE-DRAWER-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
