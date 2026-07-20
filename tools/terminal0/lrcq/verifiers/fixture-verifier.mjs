#!/usr/bin/env node
// FounderGate LRCQ — IMMUTABLE fixture verifier (outside every builder-writable path). It is the
// signed test target for executable backlog v2 ENDURANCE_FIXTURE jobs. Given a produced file path
// (relative to the job worktree cwd), it verifies the file exists, is non-empty, and carries the
// FounderGate fixture marker. Exit 0 = PASS, non-zero = FAIL. It NEVER writes anything.
import { existsSync, readFileSync } from "node:fs";
const target = process.argv[2];
if (!target) { console.error("usage: fixture-verifier.mjs <produced-file>"); process.exit(2); }
if (!existsSync(target)) { console.error("MISSING: " + target); process.exit(1); }
const body = readFileSync(target, "utf8");
if (body.trim().length === 0) { console.error("EMPTY: " + target); process.exit(1); }
if (!/FounderGate LRCQ ENDURANCE_FIXTURE/.test(body)) { console.error("NO FIXTURE MARKER: " + target); process.exit(1); }
process.exit(0);
