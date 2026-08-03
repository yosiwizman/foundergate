// FounderGate local Doctor — read-only environment check. NO secrets, NO provider, NO network.
// Reports availability of required + optional tools so a non-developer knows the demo can run locally.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function ver(bin, args = ['--version']) { try { return String(execFileSync(bin, args, { stdio:['ignore','pipe','ignore'], timeout:6000 })).split('\n')[0].trim(); } catch { return null; } }
function portFree(port) { try { execFileSync('bash', ['-c', `! lsof -iTCP:${port} -sTCP:LISTEN >/dev/null 2>&1`], { timeout:5000 }); return true; } catch { return false; } }

const required = {
  node: ver('node'), unzip: ver('unzip', ['-v']) ? 'present' : (ver('unzip') ? 'present' : null),
  zip: ver('zip', ['-v']) ? 'present' : null, ditto: existsSync('/usr/bin/ditto') ? 'present' : null,
};
const optional = { python3: ver('python3'), go: ver('go', ['version']), cargo: ver('cargo'), java: ver('java', ['-version']) || ver('java'), javac: ver('javac', ['-version']) };
const playwright = existsSync(join(process.cwd(), 'node_modules', 'playwright')) ? 'present' : (existsSync(join(homedir(), 'Library', 'Caches', 'ms-playwright')) ? 'cache-present' : null);
const launcher = existsSync(join(homedir(), 'Desktop', 'FounderGate_Start_Here', 'Open_FounderGate_Converged_Demo.command')) ? 'present' : null;

const report = {
  kind: 'foundergate-local-doctor', local_only: true, no_secrets: true, no_provider: true,
  required, optional, playwright, port_4880_free_now: portFree(4880), desktop_launcher: launcher,
  summary: (required.node && (required.unzip==='present') && launcher) ? 'READY_LOCAL' : 'CHECK_ITEMS',
  note: 'Optional runtimes (python/go/cargo/java) missing only affect their fixture adapters, which return UNKNOWN_RUNTIME_MISSING — never a fake pass.',
};
console.log(JSON.stringify(report, null, 2));
