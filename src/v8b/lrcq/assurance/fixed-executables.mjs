// FounderGate LRCQ — FIXED authority executables (FG-CHK-197-02).
//
// An independent Checker demonstrated that the repository / git-common-dir binding trusted a PATH-resolved
// `git`: a hostile script named `git` first on PATH answered `--show-toplevel` with an attacker-chosen
// directory, and the ephemeral-signed consumed marker was written into that directory. The same exposure
// applied to `ps`, on which stale-PID / PID-reuse detection depends.
//
// Every authority-bearing process observation therefore runs a FIXED ABSOLUTE executable, verified to be a
// regular non-symlink executable file immediately before use, in a MINIMAL controlled environment. No
// environment variable, activation field, config field, CLI flag, or test fixture may replace these paths.
//
// The minimal environment matters as much as the absolute path: it drops GIT_DIR, GIT_WORK_TREE,
// GIT_COMMON_DIR, GIT_CONFIG_* and every other inherited variable that could otherwise redirect what git
// reports, and it pins GIT_CONFIG_GLOBAL/SYSTEM to /dev/null so no user or system config participates.
import { execFileSync } from "node:child_process";
import { lstatSync, statSync } from "node:fs";

// The supported macOS host's system executables. Deliberately literal constants — not configurable.
export const FIXED_GIT = "/usr/bin/git";
export const FIXED_PS = "/bin/ps";

export const FIXED_EXEC_CODES = {
  OK: "OK",
  MISSING: "FIXED_EXECUTABLE_MISSING",
  SYMLINK: "FIXED_EXECUTABLE_IS_SYMLINK",
  NOT_REGULAR: "FIXED_EXECUTABLE_NOT_REGULAR",
  NOT_EXECUTABLE: "FIXED_EXECUTABLE_NOT_EXECUTABLE",
};

// The controlled environment every fixed authority executable runs in.
export const MINIMAL_ENV = Object.freeze({
  PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
  LC_ALL: "C",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
});

// Verify a fixed absolute executable is a regular, non-symlink, executable file. Fails CLOSED.
export function verifyFixedExecutable(absPath) {
  let ls;
  try { ls = lstatSync(absPath); } catch { return { ok: false, code: FIXED_EXEC_CODES.MISSING, path: absPath }; }
  if (ls.isSymbolicLink()) return { ok: false, code: FIXED_EXEC_CODES.SYMLINK, path: absPath };
  let st;
  try { st = statSync(absPath); } catch { return { ok: false, code: FIXED_EXEC_CODES.MISSING, path: absPath }; }
  if (!st.isFile()) return { ok: false, code: FIXED_EXEC_CODES.NOT_REGULAR, path: absPath };
  if ((st.mode & 0o111) === 0) return { ok: false, code: FIXED_EXEC_CODES.NOT_EXECUTABLE, path: absPath, mode: (st.mode & 0o777).toString(8) };
  return { ok: true, code: FIXED_EXEC_CODES.OK, path: absPath };
}

// Run a fixed authority executable. Throws on a bad executable or a non-zero exit; callers fail closed.
export function runFixed(absPath, args, opts = {}) {
  const v = verifyFixedExecutable(absPath);
  if (!v.ok) { const e = new Error("fixed-executables: " + v.code + " (" + absPath + ")"); e.code = v.code; throw e; }
  return execFileSync(absPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: MINIMAL_ENV,
    ...(opts.cwd ? { cwd: opts.cwd } : {}),
  }).trim();
}

// The two authority observations FounderGate makes about the host.
export function fixedGit(args, opts = {}) { return runFixed(FIXED_GIT, args, opts); }
export function fixedPs(args, opts = {}) { return runFixed(FIXED_PS, args, opts); }

// Both fixed executables, verified. Used by evidence records and by the launcher's startup self-check.
export function fixedExecutableReport() {
  return { git: verifyFixedExecutable(FIXED_GIT), ps: verifyFixedExecutable(FIXED_PS) };
}
