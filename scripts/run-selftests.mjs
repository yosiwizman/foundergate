// FounderGate — self-test runner.
//
// Plain English: this finds every `*.selftest.mjs` file under `src/` and runs it
// as its own Node process. A component is "green in this repo" only when its
// self-test exits 0 here. This is the single proof that counts.
//
// No network, no external deps, no provider access. Pure Node.

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..", "src");

function findSelftests(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findSelftests(full));
    } else if (name.endsWith(".selftest.mjs")) {
      out.push(full);
    }
  }
  return out;
}

const tests = findSelftests(SRC).sort();

if (tests.length === 0) {
  console.log("No self-tests found under src/ yet. (Nothing extracted.)");
  process.exit(0);
}

console.log(`FounderGate self-test runner — ${tests.length} self-test(s) found\n`);

let failed = 0;
for (const t of tests) {
  const rel = t.replace(resolve(HERE, "..") + "/", "");
  console.log(`── ${rel}`);
  const res = spawnSync(process.execPath, [t], { stdio: "inherit" });
  if (res.status !== 0) {
    failed++;
    console.log(`   FAIL (exit ${res.status})\n`);
  } else {
    console.log(`   OK\n`);
  }
}

console.log(
  failed === 0
    ? `ALL GREEN: ${tests.length}/${tests.length} self-test(s) passed.`
    : `RED: ${failed}/${tests.length} self-test(s) failed.`
);
process.exit(failed === 0 ? 0 : 1);
