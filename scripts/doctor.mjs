// FounderGate local Doctor CLI (read-only). Probes the real local toolchain + presence.
import { existsSync } from "node:fs"; import { homedir } from "node:os"; import { join } from "node:path";
import { execSync } from "node:child_process";
import { buildDoctor, renderDoctorReport } from "../src/ui/founder-view/live/doctor.mjs";
const has = (bin) => { try { execSync(`command -v ${bin}`, { stdio: "ignore", shell: "/bin/bash" }); return true; } catch { return false; } };
let mainSha = "UNKNOWN"; try { mainSha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); } catch {}
const signals = {};
for (const t of ["git","gh","node","npm","zip","unzip","shasum","python3"]) signals[t] = has(t);
signals.node_modules = existsSync(join(process.cwd(), "node_modules"));
signals.browsers = existsSync(join(homedir(), "Library/Caches/ms-playwright"));
signals.local_server = existsSync("src/ui/founder-view/live/live-server.mjs");
signals.evidence_root = existsSync(join(homedir(), ".foundergate"));
console.log(renderDoctorReport(buildDoctor({ signals, identity: { repo: "yosiwizman/foundergate", main_sha: mainSha, evidence_root: "~/.foundergate/runs/" } })));
process.exit(0);
