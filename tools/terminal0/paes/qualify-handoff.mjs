// Live handoff qualification. Returns 0 only when the detached supervisor
// genuinely survives + heartbeats advance + detached Claude auth succeeds. The
// mechanical guarantees (worker recovery, gate routing, stop rejection) are
// proven by the unit selftests, which this harness also runs.
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const REPO = process.argv[2], supPid = Number(process.argv[3]);
const SUP = REPO + "/.foundergate/supervisor";
const led = (e) => appendFileSync(SUP + "/events.jsonl", JSON.stringify({ ...e, ts: Math.floor(Date.now()/1000) }) + "\n");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const beat = () => { try { return JSON.parse(readFileSync(SUP + "/heartbeat.json")); } catch { return null; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

const problems = [];
async function run() {
  // 1. supervisor alive after launcher's own shell continues (parent-independent)
  await sleep(2000);
  if (!alive(supPid)) problems.push("supervisor not alive after start");
  // 2. observe >=3 advancing heartbeat timestamps
  const seen = new Set(); let last = 0;
  for (let i = 0; i < 8 && seen.size < 3; i++) {
    const b = beat(); if (b && b.ts && b.ts !== last) { seen.add(b.ts); last = b.ts; }
    await sleep(2500);
  }
  if (seen.size < 3) problems.push(`only ${seen.size} advancing heartbeats (need >=3)`);
  led({ evt: "handoff_heartbeats", count: seen.size });
  // 3. detached read-only Claude auth probe (session keychain)
  const CLAUDE = process.env.FG_CLAUDE_BIN || "claude";
  const r = spawnSync(CLAUDE, ["-p", 'Reply {"probe":"ok"}', "--output-format", "json", "--allowedTools", "Read"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 32*1024*1024, stdio: ["ignore","pipe","pipe"] });
  let authOk = false; try { const o = JSON.parse((r.stdout||"").trim().split("\n").pop()); authOk = o.subtype==="success" && !o.is_error; } catch {}
  if (!authOk) problems.push("detached Claude auth probe failed");
  led({ evt: "handoff_auth_probe", ok: authOk });
  // 4. mechanical guarantees via unit selftests (worker recovery / gate routing / stop rejection / singleton)
  const st = spawnSync(process.execPath, [REPO + "/scripts/run-selftests.mjs"], { cwd: REPO, encoding: "utf8", maxBuffer: 64*1024*1024 });
  if (!/ALL GREEN/.test(st.stdout || "")) problems.push("mechanical selftests not all green");
  led({ evt: "handoff_selftests", green: /ALL GREEN/.test(st.stdout || "") });
}
run().then(() => {
  led({ evt: "handoff_qualification", pass: problems.length === 0, problems });
  if (problems.length) { console.error("QUAL FAIL:", problems.join("; ")); process.exit(1); }
  console.log("handoff qualification PASSED"); process.exit(0);
});
