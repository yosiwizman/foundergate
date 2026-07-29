// Lane B selftest — URL-drop intake validator (fail-closed, no network).
import { classifyUrl, buildIntakeView, renderIntakeText, escapeText, UNKNOWN } from "./url-intake.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane B — URL-drop intake ==");

// 01 supported public git url -> accepted with owner/repo
(() => { const d = classifyUrl("https://github.com/pypa/sampleproject"); ok("01 github owner/repo -> SUPPORTED_PUBLIC_GIT accepted", d.classification === "SUPPORTED_PUBLIC_GIT" && d.accepted && d.owner === "pypa" && d.repo === "sampleproject"); })();
// 02 .git suffix stripped
ok("02 .git suffix stripped", classifyUrl("https://gitlab.com/foo/bar.git").repo === "bar");
// 03 supported host but no repo path -> UNSUPPORTED
ok("03 host only -> UNSUPPORTED", classifyUrl("https://github.com/").classification === "UNSUPPORTED");
// 04 unsupported host -> UNSUPPORTED
ok("04 random host -> UNSUPPORTED", classifyUrl("https://example.com/a/b").classification === "UNSUPPORTED");
// 05 non-https scheme -> BLOCKED (fail closed)
ok("05 http -> BLOCKED", classifyUrl("http://github.com/a/b").classification === "BLOCKED");
// 06 file scheme -> BLOCKED
ok("06 file:// -> BLOCKED", classifyUrl("file:///etc/passwd").classification === "BLOCKED");
// 07 credentials in URL -> BLOCKED
ok("07 creds -> BLOCKED", classifyUrl("https://user:pass@github.com/a/b").classification === "BLOCKED");
// 08 localhost/loopback -> BLOCKED
ok("08 localhost -> BLOCKED", classifyUrl("https://localhost/a/b").classification === "BLOCKED" && classifyUrl("https://127.0.0.1/a/b").classification === "BLOCKED");
// 09 .local host -> BLOCKED
ok("09 .local -> BLOCKED", classifyUrl("https://mybox.local/a/b").classification === "BLOCKED");
// 10 empty / garbage -> BLOCKED (fail closed, never accepted)
ok("10 empty+garbage -> BLOCKED not accepted", classifyUrl("").classification === "BLOCKED" && classifyUrl("not a url").classification === "BLOCKED" && !classifyUrl("").accepted);
// 11 NEVER fetches
ok("11 fetch_performed always false", classifyUrl("https://github.com/a/b").fetch_performed === false && buildIntakeView("https://github.com/a/b").fetch_performed === false);
// 12 decision frozen
ok("12 decision frozen", Object.isFrozen(classifyUrl("https://github.com/a/b")));
// 13 view frozen + honest fields
(() => { const v = buildIntakeView("https://github.com/a/b"); ok("13 view frozen + accepted", Object.isFrozen(v) && v.accepted === true && /Safety Check/.test(v.next_step)); })();
// 14 null input -> view input UNKNOWN, BLOCKED
(() => { const v = buildIntakeView(null); ok("14 null -> UNKNOWN/BLOCKED", v.input === UNKNOWN && v.classification === "BLOCKED"); })();
// 15 render escapes + deterministic
(() => { const v = buildIntakeView("https://github.com/<script>/x"); const t = renderIntakeText(v); ok("15 render escapes + deterministic", t === renderIntakeText(v) && t.includes("&lt;script&gt;") && !t.includes("<script>")); })();
// 16 NO ACT EDGE: source has no fetch/exec/act/network import
(() => { const src = readFileSync(fileURLToPath(new URL("./url-intake.mjs", import.meta.url)), "utf8"); ok("16 no fetch/net/child_process in source", !/\bfetch\s*\(|node:child_process|node:net|node:http/.test(src)); })();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-B-URL-INTAKE-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
