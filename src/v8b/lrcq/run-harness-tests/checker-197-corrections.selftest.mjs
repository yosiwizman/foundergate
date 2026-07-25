// FounderGate LRCQ — INDEPENDENT-CHECKER FINDING CORRECTIONS (PR #197, report digest
// caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f).
//
// One regression family per mechanically reported finding. Each test reproduces the Checker's own attack and
// requires the corrected behaviour — not merely "no crash".
//
//   C1 (FG-CHK-197-01, HIGH)   concurrent transfer: exactly one OK, one ALREADY_TRANSFERRED, one child, one
//                              frame, one claim, zero provider spawn, no process left behind
//   C2 (FG-CHK-197-02, MEDIUM) hostile PATH: fixed absolute git/ps; fake executables get ZERO invocations
//   C3 (FG-CHK-197-03, MEDIUM) supervisor config: exec/now and any unknown authority field refused
//   C4 (FG-CHK-197-04, LOW)    owner + permission-mode enforcement on the root and every record
//   C5 (FG-CHK-197-05, LOW)    canonical filesystem OBJECT identity (device+inode), not string case
//   C6 (FG-CHK-197-06, LOW)    no mutable state on the capability; module-private WeakMap only
//   C7 (FG-CHK-197-07, INFO)   supervisor entrypoint mandatory; self-proof unconditional
//   C9 (FG-CHK-197-09, INFO)   protected-main prohibition holds independently of GitHub branch protection
//
// Disposable keys, disposable repositories, deterministic children. No provider is invoked.
//
// EVIDENCE CLASS (FG-FCHK-197-E). Every assertion here states exactly what it observed:
//   * unmarked            — an attack was EXECUTED and its refusal/behaviour observed in this process tree;
//   * "[SOURCE-PROVEN]"   — a property of the SOURCE TEXT (a regex over the module), not an execution;
//   * "COUNTED from ..."  — a real process count read from a recording stub's own log.
// C3j, C3k, C3l, C3m, C7e, C7f, C9b and C9c are source-text assertions and are marked [SOURCE-PROVEN]
// accordingly; C3l compares source-string offsets, i.e. textual ordering, NOT observed execution order.
// The behavioural counterpart for that family is C3n/C3o, which execute the route. Structural evidence is
// never presented here as runtime proof.
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync, readdirSync, statSync, realpathSync, rmSync } from "node:fs";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./test-support/v4-fixture.mjs";
import {
  consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4,
  isConsumedCapabilityV4, lifecycleStateV4, LC_CODES, TRANSFER_STATES,
} from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";
import { validateSupervisorConfig, SUPERVISOR_CONFIG_KEYS, FORBIDDEN_SUPERVISOR_CONFIG_KEYS } from "../run-harness/supervisor-main.mjs";
import { verifyFixedExecutable, FIXED_GIT, FIXED_PS, MINIMAL_ENV } from "../../../../src/v8b/lrcq/assurance/fixed-executables.mjs";
import { assertAuthorityObject, FS_CLASS, objectIdOf } from "../../../../src/v8b/lrcq/assurance/fs-authority-guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const RECEIPT_CHILD = realpathSync(join(HERE, "test-support", "v4-key-receipt-child.mjs"));
const HOSTILE_CHILD = realpathSync(join(HERE, "test-support", "hostile-path-child.mjs"));
// FG-FCHK-197-E: a RECORDING provider stub, so "zero provider spawn" is a counted fact, not an inference.
const RECORDING_STUB = realpathSync(join(HERE, "test-support", "recording-provider-stub.mjs"));
// FG-FCHK-197-E: source text backing the assertions that are STRUCTURAL rather than executed.
const GUARD_SRC = readFileSync(join(REPO, "src/v8b/lrcq/assurance/fs-authority-guards.mjs"), "utf8");

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 300) + "]" : "")); } else console.log("  ok   " + name); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } };
const worlds = [];
const world = (nonce, opts = {}) => { const w = makeDisposableV4World({ prefix: "fg-c197-", nonce, ...opts }); worlds.push(w); return w; };

(async () => {
try {
  // ================================================================= C1 concurrent transfer (HIGH)
  {
    // FG-FCHK-197-E: the SIGNED provider target for this world is the RECORDING stub, and every process in
    // the attack is given FG_SPAWN_LOG, so any productive-provider execution anywhere in this family would
    // append a line to PROVIDER_SPAWN_LOG. C1i below counts that file instead of inspecting receipts.
    // The stub is COPIED into the disposable world and its log lives beside that copy, so the count does
    // not depend on an environment variable the production boundary would scrub away.
    let stubCopy = null;
    const w = world("c1", { prepare: ({ repoRoot }) => {
      stubCopy = join(repoRoot, "recording-provider-stub.mjs");
      writeFileSync(stubCopy, readFileSync(RECORDING_STUB), { mode: 0o755 });
      return { provider_executable_path: stubCopy, resolved_provider_target: stubCopy, provider_version: "recording-1", provider_executable_identity: "sha256:" + "d".repeat(64) };
    } });
    const PROVIDER_SPAWN_LOG = stubCopy + ".spawns.log";
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    const rd = join(w.repoRoot, "receipts"); mkdirSync(rd, { recursive: true });
    const mk = (tag) => ({ args: ["--receipt", join(rd, tag + ".json"), "--fd", "3"], detached: false });
    const [a, b] = await Promise.all([
      spawnGovernedSupervisorV4(c.capability, mk("a")),
      spawnGovernedSupervisorV4(c.capability, mk("b")),
    ]);
    const results = [a, b];
    const okCount = results.filter((r) => r && r.ok === true).length;
    const alreadyCount = results.filter((r) => r && r.code === LC_CODES.ALREADY_TRANSFERRED).length;
    const children = results.filter((r) => r && r.child).map((r) => r.child);
    ok("C1a exactly ONE concurrent transfer returned OK", okCount === 1, "ok=" + okCount + " codes=" + results.map((r) => r && r.code));
    ok("C1b exactly ONE concurrent transfer returned ALREADY_TRANSFERRED", alreadyCount === 1, "already=" + alreadyCount);
    ok("C1c exactly ONE child process was created", children.length === 1, "children=" + children.length);
    // wait for the single child to finish writing its receipt
    await Promise.all(children.map((ch) => new Promise((res) => { ch.on("close", res); setTimeout(res, 6000); })));
    const receipts = readdirSync(rd).map((f) => JSON.parse(readFileSync(join(rd, f), "utf8")));
    const delivered = receipts.filter((r) => r.frame_bytes > 0);
    ok("C1d exactly ONE key frame was delivered", delivered.length === 1, "delivered=" + delivered.length + " receipts=" + receipts.length);
    ok("C1e the delivered frame went to the ONE spawned child", delivered.length === 1 && children.length === 1 && delivered[0].pid === children[0].pid);
    ok("C1f the capability is permanently TRANSFERRED_SPENT", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT);
    ok("C1g a third sequential transfer is still refused", (await spawnGovernedSupervisorV4(c.capability, mk("c"))).code === LC_CODES.ALREADY_TRANSFERRED);
    // exactly one supervisor claim can exist: the wx create is atomic. Prove the claim file is single.
    const claims = readdirSync(w.lifecycleRoot).filter((f) => f.endsWith(".supervisor-claim.json"));
    ok("C1h at most ONE supervisor claim exists for the activation", claims.length <= 1, "claims=" + claims.length);
    // FG-FCHK-197-E: this assertion was labelled "zero provider spawn" but its predicate was
    // receipts.every(r => r.read_error === null || r.frame_bytes === 0) — a statement about receipt FIELDS
    // that holds whether or not a provider was spawned, and nothing in the C1 family counted spawns at all.
    // It now reads a REAL counter: the recording provider stub appends one line per execution to
    // PROVIDER_SPAWN_LOG, and zero spawn means that file recorded nothing. Zero-spawn is COUNTED, never
    // inferred from key-frame receipts.
    const providerSpawnCount = existsSync(PROVIDER_SPAWN_LOG) ? readFileSync(PROVIDER_SPAWN_LOG, "utf8").split("\n").filter(Boolean).length : 0;
    ok("C1i zero provider spawn during the concurrent-transfer attack (COUNTED from the recording provider stub's own log)", providerSpawnCount === 0, "spawns=" + providerSpawnCount);
    // no process left behind
    await new Promise((r) => setTimeout(r, 250));
    ok("C1j no spawned process remains afterward", children.every((ch) => ch.exitCode !== null || ch.signalCode !== null || !alive(ch.pid)));
  }

  // ---- C1 negative: a failed transfer is never retryable with the same key -------------------------
  {
    const w = world("c1fail");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    // keyFd 9 with a child that never reads it still transfers; instead force the descriptor to be absent by
    // asking for an fd the module cannot establish is not possible, so prove the sequential invariant:
    const first = await spawnGovernedSupervisorV4(c.capability, { args: ["--receipt", join(w.repoRoot, "r1.json"), "--fd", "3"], detached: false });
    await new Promise((res) => { if (first.child) { first.child.on("close", res); setTimeout(res, 5000); } else res(); });
    ok("C1k after a completed transfer the key is gone from module storage (no KEY_RELEASED retry path)", (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);
  }

  // ================================================================= C2 hostile PATH (MEDIUM)
  {
    ok("C2a the fixed authority executables verify as regular non-symlink executables", verifyFixedExecutable(FIXED_GIT).ok && verifyFixedExecutable(FIXED_PS).ok);
    ok("C2b the minimal environment drops every git redirection variable", !("GIT_DIR" in MINIMAL_ENV) && !("GIT_WORK_TREE" in MINIMAL_ENV) && !("GIT_COMMON_DIR" in MINIMAL_ENV) && MINIMAL_ENV.GIT_CONFIG_GLOBAL === "/dev/null" && MINIMAL_ENV.GIT_CONFIG_SYSTEM === "/dev/null");
    ok("C2c a missing fixed executable fails closed", verifyFixedExecutable("/usr/bin/definitely-not-here").code === "FIXED_EXECUTABLE_MISSING");
    ok("C2c2 a SYMLINK in the fixed-executable position fails closed (/tmp is a symlink on macOS)", verifyFixedExecutable("/tmp").code === "FIXED_EXECUTABLE_IS_SYMLINK");
    ok("C2c3 a non-regular (directory) fixed executable fails closed", verifyFixedExecutable("/usr/bin").code === "FIXED_EXECUTABLE_NOT_REGULAR");
    ok("C2c4 a non-executable regular file in the fixed position fails closed", verifyFixedExecutable("/etc/hosts").code === "FIXED_EXECUTABLE_NOT_EXECUTABLE");

    // Build the hostile PATH directory: `git` answers --show-toplevel with an attacker root; both log calls.
    const w = world("c2");
    const evilRoot = join(w.repoRoot, "evilroot");
    const evilLife = join(evilRoot, "life"); mkdirSync(evilLife, { recursive: true });
    const binDir = join(w.repoRoot, "hostilebin"); mkdirSync(binDir, { recursive: true });
    const callLog = join(w.repoRoot, "hostile-calls.log");
    const gitCommon = w.gitCommonDir;
    writeFileSync(join(binDir, "git"), [
      "#!/bin/sh",
      'echo "git $*" >> "' + callLog + '"',
      'for a in "$@"; do',
      '  if [ "$a" = "--show-toplevel" ]; then echo "' + evilRoot + '"; exit 0; fi',
      '  if [ "$a" = "--git-common-dir" ]; then echo "' + gitCommon + '"; exit 0; fi',
      "done",
      "exit 0",
    ].join("\n"), { mode: 0o755 });
    writeFileSync(join(binDir, "ps"), ["#!/bin/sh", 'echo "ps $*" >> "' + callLog + '"', 'echo "HOSTILE FAKE LSTART"', "exit 0"].join("\n"), { mode: 0o755 });

    // A genuinely SIGNED activation naming the ATTACKER's directories.
    const evil = w.signVariant({ repository_root_realpath: realpathSync(evilRoot), lifecycle_root_realpath: realpathSync(evilLife), activation_nonce: "evil" });
    const evilPath = join(w.repoRoot, "evil-activation.json"); writeFileSync(evilPath, JSON.stringify(evil.signed, null, 2) + "\n");
    const runHostile = (cfg) => {
      const p = join(w.repoRoot, "hostile-cfg-" + cfg.mode + ".json"); writeFileSync(p, JSON.stringify(cfg));
      const r = spawnSync(process.execPath, [HOSTILE_CHILD, "--config", p], { encoding: "utf8", timeout: 30000, env: { PATH: binDir + ":" + process.env.PATH, HOME: process.env.HOME } });
      try { return JSON.parse(r.stdout.trim().split("\n").pop()); } catch { return { parse_error: r.stdout + r.stderr }; }
    };
    const base = { authorityPath: w.authorityPath, authorizationB64: w.authorizationBytes.toString("base64"), now: w.now, callLog };
    const attack = runHostile({ ...base, mode: "consume", activationPath: evilPath, evilRoot, callLog });
    ok("C2d a hostile PATH `git` cannot vouch for an attacker-chosen root (consume REFUSED)", attack.consume_ok !== true, JSON.stringify(attack).slice(0, 300));
    ok("C2e no ephemeral-signed marker was written into the attacker root", attack.marker_written_into_evil_root !== true && !readdirSync(evilLife).some((f) => f.endsWith(".consumed.json")));
    ok("C2f the hostile git/ps executables received ZERO invocations", (attack.hostile_git_calls || []).length === 0, JSON.stringify(attack.hostile_git_calls));

    // The LEGITIMATE signed root still verifies under the same hostile PATH — the fixed git answered.
    const legit = runHostile({ ...base, mode: "consume", activationPath: w.activationPath, callLog });
    ok("C2g the legitimate signed binding still succeeds under a hostile PATH (fixed git answered)", legit.consume_ok === true, JSON.stringify(legit).slice(0, 300));
    ok("C2h still zero hostile invocations after the legitimate path", (legit.hostile_git_calls || []).length === 0, JSON.stringify(legit.hostile_git_calls));

    // process-start identity cannot be forged by a hostile `ps`
    const psr = runHostile({ ...base, mode: "ps", callLog });
    ok("C2i observedStartIdentity uses the fixed /bin/ps (no HOSTILE output, real lstart)", psr.ps_identity_looks_real === true, JSON.stringify(psr).slice(0, 200));
    ok("C2j the hostile ps received ZERO invocations", (psr.hostile_git_calls || []).length === 0, JSON.stringify(psr.hostile_git_calls));
  }

  // ================================================================= C3 supervisor config (MEDIUM)
  {
    ok("C3a exec is on the forbidden config key list", FORBIDDEN_SUPERVISOR_CONFIG_KEYS.includes("exec"));
    ok("C3b now is on the forbidden config key list", FORBIDDEN_SUPERVISOR_CONFIG_KEYS.includes("now"));
    ok("C3c neither exec nor now is on the allow-list", !SUPERVISOR_CONFIG_KEYS.includes("exec") && !SUPERVISOR_CONFIG_KEYS.includes("now"));
    const good = { schema: "lrcq-v4-supervisor-config-1", activation_path: "/a.json", authorization_path: "/b.txt", activation_identity: "sha256:x", run_id: "r", supervisorDir: "/s", runRoot: "/r", heartbeatMs: 30000, eventLog: "/e" };
    ok("C3d the production config shape validates", validateSupervisorConfig(good).ok === true, JSON.stringify(validateSupervisorConfig(good)));
    const execCfg = validateSupervisorConfig({ ...good, exec: { repoRoot: "/attacker/repo", candidateRef: "ATTACKER-SHA" } });
    ok("C3e a config carrying exec is REFUSED with the authority-field code", execCfg.ok === false && execCfg.code === "SUPERVISOR_CONFIG_AUTHORITY_FIELD_REFUSED" && execCfg.keys.includes("exec"));
    const nowCfg = validateSupervisorConfig({ ...good, now: 1 });
    ok("C3f a config carrying now is REFUSED with the authority-field code", nowCfg.ok === false && nowCfg.code === "SUPERVISOR_CONFIG_AUTHORITY_FIELD_REFUSED" && nowCfg.keys.includes("now"));
    const unk = validateSupervisorConfig({ ...good, somethingElse: 1 });
    ok("C3g an UNKNOWN config field is refused (allow-list, not deny-list only)", unk.ok === false && unk.code === "SUPERVISOR_CONFIG_UNKNOWN_FIELD_REFUSED");
    ok("C3h a null/array/absent config is refused", validateSupervisorConfig(null).ok === false && validateSupervisorConfig([]).ok === false);
    ok("C3i an out-of-range heartbeat is refused", validateSupervisorConfig({ ...good, heartbeatMs: 0 }).ok === false && validateSupervisorConfig({ ...good, heartbeatMs: 10 ** 9 }).ok === false);
    // the production launcher no longer WRITES either field
    const launcherSrc = readFileSync(join(REPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "utf8");
    ok("C3j [SOURCE-PROVEN] the launcher no longer writes exec/now into the supervisor config", !/exec:\s*life\.exec/.test(launcherSrc) && !/now:\s*life\.fixedNow/.test(launcherSrc));
    const supSrc = readFileSync(join(REPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs"), "utf8");
    ok("C3k [SOURCE-PROVEN] the supervisor never reads cfg.exec / cfg.now", !/cfg\.exec/.test(supSrc) && !/cfg\.now/.test(supSrc));
    ok("C3l [SOURCE-PROVEN] the config-validation call appears BEFORE the lifecycle claim in the source (textual order; the behavioural check is C3n/C3o)", supSrc.indexOf("validateSupervisorConfig(cfg)") < supSrc.indexOf("attachSupervisorFromInheritedFdV4(vr.capability"));
    ok("C3m [SOURCE-PROVEN] the supervisor passes an EMPTY exec object to the executor", /executeSignedRunV4\(cap, vr\.activation, man, counters, \{\}\)/.test(supSrc));
    // a real hand-written config with exec fails closed, before any lifecycle claim
    {
      const w = world("c3run");
      const cfgPath = join(w.repoRoot, "evil-supervisor-config.json");
      writeFileSync(cfgPath, JSON.stringify({ schema: "lrcq-v4-supervisor-config-1", activation_path: w.activationPath, authorization_path: null, run_id: "r", supervisorDir: join(w.repoRoot, "s"), runRoot: join(w.repoRoot, "r"), eventLog: join(w.repoRoot, "ev.jsonl"), exec: { repoRoot: "/attacker/repo", candidateRef: "ATTACKER-SHA" } }), { mode: 0o600 });
      const SUPMAIN = realpathSync(join(REPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs"));
      const r = spawnSync(process.execPath, [SUPMAIN, "--config", cfgPath], { encoding: "utf8", timeout: 30000 });
      ok("C3n a hand-written config containing exec fails closed at the real supervisor entrypoint", r.status === 2 && /SUPERVISOR_CONFIG_AUTHORITY_FIELD_REFUSED/.test(r.stderr + r.stdout), "status=" + r.status + " " + (r.stderr || "").slice(0, 200));
      ok("C3o that refusal wrote no supervisor state (no lifecycle claim)", !existsSync(join(w.repoRoot, "s")) || readdirSync(join(w.repoRoot, "s")).length === 0);
    }
  }

  // ================================================================= C4 owner + mode (LOW)
  {
    const w = world("c4");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    const marker = c.marker_path;
    const intent = join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".launch-intent.json");
    ok("C4a records are created 0600", (statSync(marker).mode & 0o777) === 0o600 && (statSync(intent).mode & 0o777) === 0o600);
    ok("C4b a 0600 record passes the guard", assertAuthorityObject(marker, FS_CLASS.SECRET_OR_MUTABLE).ok === true);
    chmodSync(marker, 0o666);
    ok("C4c a group/world-writable marker is REFUSED by the guard", assertAuthorityObject(marker, FS_CLASS.SECRET_OR_MUTABLE).code === "FS_UNSAFE_MODE");
    // the refusal must fire in the AUTHORITY path, before the cryptographic key comparison
    const g = await spawnGovernedSupervisorV4(c.capability, { detached: false });
    ok("C4d a permissive marker refuses the governed transfer with RECORD_UNSAFE_MODE (not a crypto code)", g.code === LC_CODES.RECORD_UNSAFE_MODE, g.code);
    chmodSync(marker, 0o600);
    chmodSync(intent, 0o644);
    ok("C4e a group/world-READABLE intent is refused (records carry secrets)", (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.RECORD_UNSAFE_MODE);
    chmodSync(intent, 0o600);
    // lifecycle root mode
    chmodSync(w.lifecycleRoot, 0o777);
    const c2 = consumeActivationV4(w.signVariant({ activation_nonce: "c4b" }).result.capability, { now: w.now });
    ok("C4f a world-WRITABLE lifecycle root is refused (ROOT_UNSAFE_MODE)", c2.code === LC_CODES.ROOT_UNSAFE_MODE, c2.code);
    chmodSync(w.lifecycleRoot, 0o755);
    ok("C4g a 0755 lifecycle root is accepted (a directory must stay traversable)", consumeActivationV4(w.signVariant({ activation_nonce: "c4c" }).result.capability, { now: w.now }).ok === true);
    // FG-FCHK-197-E: this was labelled "the guard compares owner against the running uid", but its predicate
    // only shows that a CORRECTLY-owned file passes — it cannot show that a wrongly-owned file fails, and
    // producing a foreign-owned file requires root. The label now states exactly what is measured, and the
    // uid comparison itself is recorded as SOURCE-PROVEN rather than dynamically reproduced.
    ok("C4h a correctly-owned record passes the owner guard (the wrong-owner branch is SOURCE-PROVEN below — dynamic reproduction requires root)",
      assertAuthorityObject(marker, FS_CLASS.SECRET_OR_MUTABLE).ok === true && statSync(marker).uid === process.getuid());
    ok("C4h2 [SOURCE-PROVEN] the guard's owner branch compares st.uid against the running uid and returns UNSAFE_OWNER",
      /st\.uid !== uid/.test(GUARD_SRC) && /FS_GUARD_CODES\.UNSAFE_OWNER/.test(GUARD_SRC));
    ok("C4i a PUBLIC_SIGNED activation is refused only when group/other WRITABLE", (() => {
      chmodSync(w.activationPath, 0o644);
      const readable = assertAuthorityObject(w.activationPath, FS_CLASS.PUBLIC_SIGNED).ok;
      chmodSync(w.activationPath, 0o666);
      const writable = assertAuthorityObject(w.activationPath, FS_CLASS.PUBLIC_SIGNED).ok;
      chmodSync(w.activationPath, 0o600);
      return readable === true && writable === false;
    })());
  }

  // ================================================================= C5 object identity (LOW)
  {
    const w = world("c5");
    const upper = w.lifecycleRoot.replace(/lifecycle$/, "LIFECYCLE");
    const sameObject = existsSync(upper) && objectIdOf(statSync(upper)) === objectIdOf(statSync(w.lifecycleRoot));
    ok("C5a this host resolves the case variant to the SAME filesystem object", sameObject, "upper=" + upper);
    const variant = w.signVariant({ lifecycle_root_realpath: upper, activation_nonce: "case" });
    const cv = consumeActivationV4(variant.result.capability, { now: w.now });
    ok("C5b a case-variant spelling of the SAME inode is accepted (not a different authority root)", cv.ok === true, cv.code);
    const doc = JSON.parse(readFileSync(cv.marker_path, "utf8"));
    // the SAME physical directory must derive the SAME digest regardless of spelling
    const c2 = consumeActivationV4(w.signVariant({ activation_nonce: "case2" }).result.capability, { now: w.now });
    const doc2 = JSON.parse(readFileSync(c2.marker_path, "utf8"));
    ok("C5c both spellings derive the IDENTICAL lifecycle_root_digest (object identity, not string)", doc.lifecycle_root_digest === doc2.lifecycle_root_digest, doc.lifecycle_root_digest + " vs " + doc2.lifecycle_root_digest);
    ok("C5d the marker records the canonical filesystem object id", /^dev:\d+\/ino:\d+$/.test(doc.lifecycle_root_object_id || ""), doc.lifecycle_root_object_id);
    // a DIFFERENT filesystem object with a similar-looking path is refused
    const w2 = world("c5b");
    const different = assertAuthorityObject(w2.lifecycleRoot, FS_CLASS.DIRECTORY, { expectObjectId: objectIdOf(statSync(w.lifecycleRoot)) });
    ok("C5e a DIFFERENT filesystem object is refused even when the path looks similar", different.ok === false && different.code === "FS_OBJECT_IDENTITY_MISMATCH");
  }

  // ================================================================= C6 private capability state (LOW)
  {
    const w = world("c6");
    const c = consumeActivationV4(w.verified, { now: w.now });
    const cap = c.capability;
    ok("C6a Object.isFrozen(capability) is true", Object.isFrozen(cap) === true);
    ok("C6b the capability has NO __state property", cap.__state === undefined && !("__state" in cap));
    ok("C6c Reflect.ownKeys reveals no mutable state key", !Reflect.ownKeys(cap).some((k) => /state|transfer|launched/i.test(String(k))), JSON.stringify(Reflect.ownKeys(cap)));
    ok("C6d every own property value is frozen or primitive (no nested mutable object)", Reflect.ownKeys(cap).every((k) => { const v = cap[k]; return v === null || typeof v !== "object" || Object.isFrozen(v); }));
    ok("C6e JSON.stringify(capability) contains no launch/transfer state", !/launched|transfer|NOT_TRANSFERRED|TRANSFERRED_SPENT/.test(JSON.stringify(cap)));
    ok("C6f the prototype is the plain object prototype (no state on the chain)", Object.getPrototypeOf(cap) === Object.prototype && !("__state" in Object.getPrototypeOf(cap)));
    // external mutation cannot reset any state
    try { cap.__state = { launched: false, transfer: TRANSFER_STATES.NOT_TRANSFERRED }; } catch { /* frozen throws in strict mode */ }
    ok("C6g assigning __state on the frozen capability does not create state", cap.__state === undefined || lifecycleStateV4(cap).transfer === TRANSFER_STATES.NOT_TRANSFERRED);
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    ok("C6h after the intent the module state says launched (read through the read-only accessor)", lifecycleStateV4(cap).launched === true);
    try { cap.__state = { launched: false }; } catch { /* */ }
    ok("C6i an external write cannot reset launched", lifecycleStateV4(cap).launched === true && createLaunchIntentV4(cap, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD }).code === LC_CODES.ALREADY_LAUNCHED);
    const snap = lifecycleStateV4(cap);
    ok("C6j the read-only snapshot is frozen and cannot be used to mutate module state", Object.isFrozen(snap) === true && (() => { try { snap.transfer = "X"; } catch { /* */ } return lifecycleStateV4(cap).transfer === TRANSFER_STATES.NOT_TRANSFERRED; })());
    ok("C6k lifecycleStateV4 returns null for a non-capability (no state leak for forged objects)", lifecycleStateV4({ _stage: "CONSUMED" }) === null);
  }

  // ================================================================= C7 mandatory entrypoint (INFO)
  {
    const w = world("c7");
    const c = consumeActivationV4(w.verified, { now: w.now });
    const noEntry = createLaunchIntentV4(c.capability, { now: w.now });
    ok("C7a an intent with NO supervisorEntrypoint is REFUSED at creation", noEntry.ok === false && noEntry.code === LC_CODES.ENTRYPOINT_INVALID, JSON.stringify(noEntry));
    ok("C7b an explicit null entrypoint is refused", createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: null }).code === LC_CODES.ENTRYPOINT_INVALID);
    ok("C7c no intent file was written by the refused creation", !existsSync(join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".launch-intent.json")));
    const good = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    ok("C7d a real entrypoint yields an intent recording its realpath + digest", good.ok === true && good.supervisor_entrypoint === RECEIPT_CHILD && /^sha256:/.test(good.supervisor_entrypoint_digest));
    const lifeSrc = readFileSync(join(REPO, "src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs"), "utf8");
    ok("C7e [SOURCE-PROVEN] the attach-side self-proof is UNCONDITIONAL (refuses when the intent records none)", /intent records no supervisor entrypoint — self-proof cannot be armed/.test(lifeSrc));
    ok("C7f [SOURCE-PROVEN] production callers cannot disable the self-proof (no opt-out flag exists)", !/skipEntrypointProof|allowNoEntrypoint|opts\.unsafe/.test(lifeSrc));
  }

  // ================================================================= C9 protected-main independence (INFO)
  {
    // Branch protection is NOT enabled on GitHub (Checker FG-CHK-197-09) and this wave does not change it.
    // The run route must prohibit protected-main mutation, merge and unauthorized push regardless.
    const { projectLegacyActivationV4, SEMANTIC_DENY } = await import("../run-harness/v4-legacy-projection.mjs");
    const { denyListSemanticGaps } = await import("../provider/activation-schema.mjs");
    ok("C9a the projection's deny-list semantically covers push, merge, checkout/switch, gh pr merge, destructive reset and permission bypass", denyListSemanticGaps(SEMANTIC_DENY).length === 0, JSON.stringify(denyListSemanticGaps(SEMANTIC_DENY)));
    const harnessSrc = readFileSync(join(REPO, "src/v8b/lrcq/run-harness/harness.mjs"), "utf8");
    ok("C9b [SOURCE-PROVEN] the harness result reports merged/accepted/pushed/protected_main_written as false unconditionally", /merged:\s*false,\s*accepted:\s*false,\s*pushed:\s*false,\s*protected_main_written:\s*false/.test(harnessSrc));
    const provSrc = readFileSync(join(REPO, "src/v8b/lrcq/provider/real-provider.mjs"), "utf8");
    ok("C9c [SOURCE-PROVEN] the provider's protected-main pre-spawn refusal is present in source (the behavioural counterpart is exercised by the real-provider family)", /worktree is on protected main/.test(provSrc));
    ok("C9d the signed V4 payload carries the no_protected_main_merge / no_pr_merge / no_push_unless_authorized exclusions", (await import("../assurance/activation-v4.mjs")).V4_PAYLOAD_FIELDS.includes("no_protected_main_merge") && (await import("../assurance/activation-v4.mjs")).V4_PAYLOAD_FIELDS.includes("no_pr_merge") && (await import("../assurance/activation-v4.mjs")).V4_PAYLOAD_FIELDS.includes("no_push_unless_authorized"));
    const evidence = join(REPO, ".foundergate/evidence/lrcq-assurance-factory/BRANCH_PROTECTION_STATUS.json");
    ok("C9e the unprotected-main observation is recorded as queued administration, not silently dismissed", existsSync(evidence) && (() => { const d = JSON.parse(readFileSync(evidence, "utf8")); return d.github_branch_protection_enabled === false && d.changed_in_this_wave === false && Array.isArray(d.route_level_prohibitions) && d.route_level_prohibitions.length >= 4; })());
  }
} finally {
  for (const w of worlds) w.cleanup();
}

console.log("\nLRCQ CHECKER-197-CORRECTIONS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
})();
