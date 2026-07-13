// SHWL §11.2 — host / boot / process identity accessor (cross-platform).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
// §3 field notes + §11 risk 2 (host/boot identity portability). Pure Node, zero-dep.
//
// Plain English: to know whether a lease's owner is really still on THIS machine,
// on THIS boot, we need three durable facts:
//   - owner_host_id      — stable hardware identity (survives reboots)
//   - owner_boot_id      — identity of the CURRENT boot (changes on reboot)
//   - process start-marker — so a REUSED pid (same number, different process) is
//                            NOT mistaken for the original owner.
//
// Every value is derived from OS facts here, but every accessor also accepts an
// override so tests pass identity as DATA and never shell out. `isProcessAlive`
// is the mechanical liveness truth used by §4.3 recovery.

import { readFileSync } from "node:fs";
import { hostname, uptime, homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", timeout: 4000, stdio: ["ignore", "pipe", "ignore"] });
}

// Stable per-machine hardware identity (survives reboots).
export function hostId({ platform = process.platform, env = process.env } = {}) {
  if (env && env.SHWL_HOST_ID) return env.SHWL_HOST_ID;
  try {
    if (platform === "darwin") {
      const out = sh("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"]);
      const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (m) return "host_" + m[1];
    } else if (platform === "linux") {
      for (const p of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        try { const v = readFileSync(p, "utf8").trim(); if (v) return "host_" + v; } catch { /* try next */ }
      }
    }
  } catch { /* fall through to a stable fallback */ }
  return "host_" + createHash("sha256").update(hostname() + "|" + homedir()).digest("hex").slice(0, 32);
}

// Identity of the CURRENT boot (macOS kern.boottime; Linux boot_id). Changes on reboot,
// so owner_boot_id != current boot id is strong "prior boot -> cannot be running" evidence.
export function bootId({ platform = process.platform, env = process.env, now = Date.now } = {}) {
  if (env && env.SHWL_BOOT_ID) return env.SHWL_BOOT_ID;
  try {
    if (platform === "darwin") {
      const out = sh("sysctl", ["-n", "kern.boottime"]);
      const m = out.match(/sec\s*=\s*(\d+)/);
      if (m) return "boot_darwin_" + m[1];
    } else if (platform === "linux") {
      const v = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
      if (v) return "boot_" + v;
    }
  } catch { /* fall through */ }
  // Fallback: boot instant = now - uptime, quantized to the second.
  const t = typeof now === "function" ? now() : now;
  return "boot_uptime_" + Math.floor(t / 1000 - uptime());
}

// A start-marker for a pid so PID REUSE is detectable (§3: "a live PID whose start-marker
// differs from the record is NOT the owner"). Returns null when it cannot be read.
export function processStartMarker(pid, { platform = process.platform } = {}) {
  if (!Number.isInteger(pid) || pid < 1) return null;
  try {
    if (platform === "darwin" || platform === "linux") {
      // lstart = absolute start time; combined with pid it uniquely marks THIS process
      // instance. A reused pid started later has a different lstart.
      const out = sh("ps", ["-o", "lstart=", "-p", String(pid)]).trim();
      if (out) return "start_" + createHash("sha256").update(String(pid) + "|" + out).digest("hex").slice(0, 32);
    }
  } catch { /* process gone or ps unavailable */ }
  return null;
}

// Mechanical liveness truth used by §4.3: is `pid` alive AND is it the SAME process
// instance recorded (start-marker match)? A live pid with the WRONG marker is a REUSED
// pid — NOT the owner — so this returns false (defeats the PID-reuse spoof, §8 row 9).
export function isProcessAlive(pid, marker, { platform = process.platform } = {}) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0); // ESRCH => gone; EPERM => alive but not ours (still alive)
  } catch (e) {
    if (e && e.code === "ESRCH") return false;
    // EPERM: the pid exists (owned by another uid) — treat as alive, fail-closed (refuse).
  }
  if (marker == null) return true; // nothing to compare — best-effort alive
  const current = processStartMarker(pid, { platform });
  if (current == null) return true; // cannot read marker — do NOT falsely declare dead
  return current === marker; // reused pid (different start) => not the owner
}

// Snapshot the full identity for a lease record. All fields overridable (tests pass DATA).
export function captureIdentity(overrides = {}) {
  const pid = overrides.pid ?? process.pid;
  const boot = overrides.boot_id ?? bootId(overrides);
  return {
    host_id: overrides.host_id ?? hostId(overrides),
    boot_id: boot,
    pid,
    process_start_marker:
      overrides.process_start_marker ??
      processStartMarker(pid, overrides) ??
      // stable deterministic fallback so the record is never missing this identity field
      "start_fallback_" + createHash("sha256").update(String(pid) + "|" + boot).digest("hex").slice(0, 24),
  };
}
