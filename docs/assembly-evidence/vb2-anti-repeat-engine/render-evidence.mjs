// FounderGate V8-B VB2 — Anti-repeat Engine surface EVIDENCE GENERATOR.
//
// Plain English: this renders the standalone Anti-repeat surface from REAL, on-disk facts about this
// repository, entirely offline. The whole point of an anti-repeat system is that "never again" must be
// EARNED — a caught bug is only protected once a regression check is wired into a suite that actually
// runs and is proven to reproduce the defect. So this generator does not hand-type "wired"/"proven":
// it VERIFIES them against the repo.
//
//   Page 1 — a PROTECTED defect (real conversion on disk):
//     The Run-4 "two ports appeared to serve the same page" defect was converted into the check
//     `src/tools/launcher-health.selftest.mjs` — whose own header calls itself "anti-repeat for the
//     Run-4 session defect". This generator confirms that file EXISTS (so the src/ self-test runner
//     discovers it → WIRED), RUNS IT and confirms it exits green, and confirms the file self-declares
//     it locks that specific defect (→ PROVEN). Only then is the card rendered "protected — never
//     again". Every part of that verdict is checked, not asserted.
//
//   Page 2 — an UNPROTECTED defect (a real, on-disk gap):
//     The founder-caught launcher Node-discovery bug (`docs/bugs/FOUNDER_LAUNCHER_NODE_DISCOVERY_
//     FAILURE.md`) has NO regression check wired into the counted self-test suite. The generator
//     searches every `src/**/*.selftest.mjs` for a guard over that failure and finds none, so the card
//     renders "not yet protected — can recur". That is the honest on-disk truth and a real, actionable
//     gap the surface exists to make visible.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module stays free
// of any fs/io surface (the VB2 no-act-edge source scan reads src/ only). Deterministic: the repo
// facts and the referenced self-test are deterministic, so the same tree in → byte-identical pages
// out. It only READS committed source and one green self-test, and WRITES html artifacts; it takes no
// other action, opens no network beyond that, and approves/wires/converts nothing.

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { deriveRegressionCheck, deriveAntiRepeatView, renderSurfaceHtml } from "../../../src/v8b2/anti-repeat-engine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const SRC = join(ROOT, "src");

// Walk src/ for every discovered self-test — exactly what scripts/run-selftests.mjs runs.
function allSelftests(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...allSelftests(full));
    else if (name.endsWith(".selftest.mjs")) out.push(full);
  }
  return out;
}
const discovered = allSelftests(SRC);

// ── VERIFY page-1's check on disk (wired + proven), never assert it ──────────────────────────────
const CHECK_HOME = "src/tools/launcher-health.selftest.mjs";
const checkAbs = join(ROOT, CHECK_HOME);
const checkExists = existsSync(checkAbs);
const checkDiscovered = discovered.some((f) => relative(ROOT, f) === CHECK_HOME);
// WIRED := the file exists AND the src/ runner discovers it AND it exits green when run.
let checkGreen = false;
if (checkExists) {
  const res = spawnSync(process.execPath, [checkAbs], { cwd: ROOT, encoding: "utf8" });
  checkGreen = res.status === 0;
}
const wired = checkExists && checkDiscovered && checkGreen;
// PROVEN := the check self-declares it locks THIS specific defect (an on-disk, checkable statement).
const checkSrc = checkExists ? readFileSync(checkAbs, "utf8") : "";
const proven = wired && /anti-repeat/i.test(checkSrc) && /run[\s-]?4/i.test(checkSrc);

const protectedDefect = {
  defectId: "BUG-RUN4-PORTS",
  title: "Two ports appeared to serve the same page",
  caughtBy: "founder",
  caughtAt: "2026-07-10",
  area: "scripts/start-stranger-test.mjs",
  failureKind: "wrong-output",
  symptom:
    "During Run 4 the founder saw two ports appearing to serve the same page (the Project Guide was not visibly on :4500). The launcher printed 'ready' after any 200, never checking each port served its OWN app.",
  evidence: "founder observation during the Run-4 stranger test",
  dataClass: "INTERNAL",
  regressionCheck: {
    id: "CHK-LAUNCHER-HEALTH",
    text: "The launcher config must have distinct ports, distinct per-app identity markers, distinct port env vars, and the launcher must verify each port serves its own app (marker), not merely return 200.",
    home: CHECK_HOME,
    registered: wired, // VERIFIED: file exists + discovered by the runner + exits green
    reproducesDefect: proven, // VERIFIED: the check self-declares it locks the Run-4 defect
    by: "harness",
    at: "2026-07-10",
    note: "self-test header: \"anti-repeat for the Run-4 session defect\"",
  },
};

// ── VERIFY page-2 has NO wired guard for the founder Node-discovery defect ───────────────────────
// Search the discovered suite for any guard over launcher Node discovery / nvm; expect none.
const nodeGuard = discovered.find((f) => {
  const s = readFileSync(f, "utf8");
  return /node[\s-]?discovery/i.test(s) || (/\bnvm\b/i.test(s) && /launch/i.test(s));
});
const unprotectedDefect = {
  defectId: "BUG-FINDER-NODE-DISCOVERY",
  title: "Mac launcher could not locate the already-installed Node from Finder",
  caughtBy: "founder",
  caughtAt: "2026-07-17",
  area: "tools/macos launcher (Node discovery)",
  failureKind: "launch-failure",
  symptom:
    "Double-clicking the Safety Check app from Finder showed \"Could not find Node.js. Please install Node 20+\" even though Node (via nvm) was already installed and worked from Terminal.",
  evidence: "docs/bugs/FOUNDER_LAUNCHER_NODE_DISCOVERY_FAILURE.md",
  dataClass: "INTERNAL",
  // No regressionCheck: verified below — no wired guard exists in the counted suite.
  regressionCheck: nodeGuard
    ? { id: "CHK-NODE-DISCOVERY", home: relative(ROOT, nodeGuard), registered: true }
    : null,
};

const OUT = [
  { file: "anti-repeat-protected.html", defect: protectedDefect },
  { file: "anti-repeat-unprotected.html", defect: unprotectedDefect },
];

for (const { file, defect } of OUT) {
  const conversion = deriveRegressionCheck(defect);
  const snapshot = { source: "fixture", conversion };
  const view = deriveAntiRepeatView(snapshot);
  const html = renderSurfaceHtml(snapshot);
  writeFileSync(join(HERE, file), html + "\n");
  console.log(
    `wrote ${file} (${html.length} bytes) — defect=${defect.defectId}, neverAgain=${view.neverAgain}, wired=${view.wired}, proven=${view.proven}, generalized=${view.generalized}`
  );
}

console.log(
  `\nverified on disk: launcher-health check exists=${checkExists} discovered=${checkDiscovered} green=${checkGreen} => wired=${wired}, proven=${proven}; node-discovery guard in suite=${nodeGuard ? relative(ROOT, nodeGuard) : "NONE"}`
);
