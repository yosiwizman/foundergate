// PAES-HANDOFF-HOTFIX-2 regression selftest — the heartbeat qualification defect
// ("only 1 advancing heartbeats (need >=3)") and the guarantees that prevent it
// from recurring or being silently weakened. Threshold floor is 3 and MUST hold.
import { heartbeatValue, foldAdvancing, requiredAdvancing, deriveTimeoutMs, HEARTBEAT_MIN_ADVANCING } from "./heartbeat-observer.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const HERE = dirname(fileURLToPath(import.meta.url));

// --- heartbeatValue: prefers monotonic seq, falls back to ms ts ---
ok("01 seq preferred over ts", heartbeatValue({ seq: 7, ts: 123 }) === 7);
ok("02 ts fallback when no seq", heartbeatValue({ ts: 123 }) === 123);
ok("03 null/garbage -> null", heartbeatValue(null) === null && heartbeatValue({}) === null && heartbeatValue({ seq: "x" }) === null);

// --- foldAdvancing: strict advancement, floor of 3 ---
const beats = (vals) => vals.map((v) => ({ seq: v }));
ok("04 three strictly-advancing seq -> satisfied", foldAdvancing(beats([1, 2, 3])).satisfied === true);
ok("05 exactly 3 distinct across noise -> satisfied", foldAdvancing(beats([1, 1, 2, 2, 3, 3])).satisfied === true && foldAdvancing(beats([1,1,2,2,3,3])).count === 3);
ok("06 ONLY 1 advancing (the exact original bug) -> NOT satisfied", foldAdvancing(beats([5, 5, 5, 5])).satisfied === false && foldAdvancing(beats([5,5,5,5])).count === 1);
ok("07 static heartbeat (no advance) -> NOT satisfied", foldAdvancing(beats([9, 9, 9, 9, 9, 9])).count === 1);
ok("08 only 2 advancing -> NOT satisfied (need 3)", foldAdvancing(beats([1, 2, 2, 2])).satisfied === false);
ok("09 non-monotone dips ignored, still needs 3 rising", foldAdvancing(beats([3, 1, 2, 4])).advancing.join(",") === "3,4" && foldAdvancing(beats([3,1,2,4])).satisfied === false);
ok("10 equal ts (seconds-collision) does NOT advance", foldAdvancing([{ ts: 100 }, { ts: 100 }, { ts: 100 }]).count === 1);
ok("11 ms ts advancing works as fallback", foldAdvancing([{ ts: 100 }, { ts: 101 }, { ts: 102 }]).satisfied === true);
ok("12 empty / missing readings -> not satisfied", foldAdvancing([]).satisfied === false && foldAdvancing(undefined).count === 0);

// --- threshold floor: cannot be lowered below 3 ---
ok("13 HEARTBEAT_MIN_ADVANCING is exactly 3", HEARTBEAT_MIN_ADVANCING === 3);
ok("14 requiredAdvancing floors sub-3 requests to 3", requiredAdvancing(1) === 3 && requiredAdvancing(2) === 3 && requiredAdvancing(0) === 3);
ok("15 requiredAdvancing honors higher requests", requiredAdvancing(5) === 5);
ok("16 requiredAdvancing(garbage) -> floor 3", requiredAdvancing(undefined) === 3 && requiredAdvancing("x") === 3);
// with the floor applied, a caller asking for 1 still fails on a single beat
ok("17 asking for 1 still needs 3 advancing (floor enforced end-to-end)", foldAdvancing(beats([1]), requiredAdvancing(1)).satisfied === false);

// --- timeout DERIVED from cadence (never a fixed window shorter than the sequence) ---
ok("18 timeout >= need*interval (room for the full sequence)", deriveTimeoutMs(3, 1000) >= 3 * 1000);
ok("19 timeout scales with interval", deriveTimeoutMs(3, 2000) > deriveTimeoutMs(3, 1000));
ok("20 timeout uses floored need", deriveTimeoutMs(1, 1000) === deriveTimeoutMs(3, 1000));
ok("21 zero/garbage interval defaults sanely (>0)", deriveTimeoutMs(3, 0) > 0 && deriveTimeoutMs(3, -5) > 0);

// --- SOURCE-LEVEL guards: the production qualifier must consume the floored
// threshold and cadence-derived timeout, so a future edit lowering the bar
// trips this test. (Regression against silently weakening qualification.) ---
const qsrc = readFileSync(join(HERE, "..", "..", "tools", "terminal0", "paes", "qualify-handoff.mjs"), "utf8");
ok("22 qualifier imports the shared observer floor", /HEARTBEAT_MIN_ADVANCING/.test(qsrc) && /heartbeat-observer\.mjs/.test(qsrc));
ok("23 qualifier derives NEED via requiredAdvancing (not a bare literal <3)", /requiredAdvancing\(HEARTBEAT_MIN_ADVANCING\)/.test(qsrc));
ok("24 qualifier uses cadence-derived timeout (deriveTimeoutMs)", /deriveTimeoutMs\(/.test(qsrc));
ok("25 threshold constant is not < 3 anywhere in the observer module", (() => {
  const osrc = readFileSync(join(HERE, "heartbeat-observer.mjs"), "utf8");
  const m = osrc.match(/HEARTBEAT_MIN_ADVANCING\s*=\s*(\d+)/);
  return m && Number(m[1]) >= 3;
})());

// --- SOURCE-LEVEL guard: the supervisor must emit a startup warmup of
// strictly-advancing (ms + monotonic seq) heartbeats BEFORE any blocking worker,
// and gate jobs behind activation — the twin root causes of the failed qual. ---
const ssrc = readFileSync(join(HERE, "..", "..", "tools", "terminal0", "paes", "supervisor-session"), "utf8");
ok("26 supervisor has a startup warmup loop before the job loop", /warmup_start/.test(ssrc) && /for \(let k = 0; k < WARMUP_BEATS/.test(ssrc));
ok("27 heartbeat carries ms ts + monotonic seq (not seconds-only)", /ts: Date\.now\(\)/.test(ssrc) && /seq: hbSeq/.test(ssrc));
ok("28 jobs gated behind handoff.json activation (no pre-qual work)", /const activated = existsSync\(join\(SUP, "handoff\.json"\)\)/.test(ssrc) && /ready\.length && activated/.test(ssrc));

console.log(`\nPAES HEARTBEAT-OBSERVER SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
