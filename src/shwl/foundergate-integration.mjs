// SHWL §9 E/F — FounderGate integration: soak-launcher wrapper + heavy-op guard entry points.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §9 E/F, §5, §7.
//
// This is FounderGate's ADOPTION of the shared lease (one library, not a reimplementation).
//   E — a FounderGate soak launcher: acquire -> preflight -> activate -> heartbeat -> release.
//   F — every §5 heavy entry point calls the shared guard and REFUSES (not warns).
//
// No real soak is executed here — the wiring is demonstrated by tests. `owner_project` is the
// label "foundergate" (a label, not an access grant — §7.1/§7.2).

import { launchSoak } from "./launcher.mjs";
import { guardHeavyOp } from "./guard.mjs";
import { bootId } from "./identity.mjs";

export const FOUNDERGATE_PROJECT = "foundergate";

// E — FounderGate soak launcher. Thin wrapper stamping owner_project=foundergate.
export function foundergateLaunchSoak(opts = {}) {
  return launchSoak({ ...opts, owner_project: FOUNDERGATE_PROJECT });
}

// F — the FounderGate heavy entry points. Each is a §5 heavy op that MUST pass through the
// shared guard before it may run. In production each closure would exec the real work only
// when `allowed`; here they return the guard decision so tests prove refuse-not-warn.
function makeEntryPoint(op) {
  return function foundergateHeavyEntryPoint({ root, requester = null, currentBootId, now = Date.now(), override = null, expectedFinish = null, isAlive } = {}) {
    const boot = currentBootId || bootId();
    const decision = guardHeavyOp({ root, op, requester, currentBootId: boot, now, override, expectedFinish, ...(isAlive ? { isAlive } : {}) });
    return { op, ...decision };
  };
}

// The concrete FounderGate §5 launchers (all gated through the one guard).
export const foundergateHeavyOps = Object.freeze({
  build: makeEntryPoint("build"),
  test: makeEntryPoint("test"),
  ci: makeEntryPoint("ci"),
  checker: makeEntryPoint("checker.exec"),
  browser: makeEntryPoint("playwright"),
  devServer: makeEntryPoint("devserver"),
  installDeps: makeEntryPoint("deps.install"),
  docker: makeEntryPoint("docker"),
  worktree: makeEntryPoint("worktree.large"),
  soak: makeEntryPoint("soak"),
});

// Convenience: guard an arbitrary FounderGate op by name (unknown -> heavy, refuses).
export function foundergateGuard({ root, op, requester = null, currentBootId, now = Date.now(), override = null, expectedFinish = null, isAlive } = {}) {
  return guardHeavyOp({ root, op, requester, currentBootId: currentBootId || bootId(), now, override, expectedFinish, ...(isAlive ? { isAlive } : {}) });
}
