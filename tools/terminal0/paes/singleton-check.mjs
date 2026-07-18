import { isHealthy } from "../../../src/supervisor/singleton.mjs";
import { readFileSync, existsSync } from "node:fs";
const lp = process.argv[2];
if (!existsSync(lp)) { console.log("free"); process.exit(0); }
let lock; try { lock = JSON.parse(readFileSync(lp, "utf8")); } catch { console.log("free"); process.exit(0); }
let alive = false; try { process.kill(lock.pid, 0); alive = true; } catch { alive = false; }
console.log(isHealthy(lock, { pid_alive: alive, now: Math.floor(Date.now()/1000), stale_interval: 120 }) ? "healthy" : "stale");
