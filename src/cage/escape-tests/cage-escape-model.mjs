// FounderGate — Mock deny-by-default cage model (pure, zero-IO, zero-dependency).
//
// SCAFFOLD ONLY — red-team fixtures/spec, NOT a live-cage proof; final cage claims require
// independent Checker + Advisor verification. Caged / held / mocked is NEVER live proof.
//
// This module is a PURE decision function. It performs NO input/output of any kind:
//   - no network (never opens a socket, never resolves DNS),
//   - no filesystem (never opens a path — it only inspects path STRINGS),
//   - no process/child spawn, no env mutation, no real provider call.
// It exists so the escape-test harness can assert, hermetically, that a deny-by-default cage
// posture REFUSES an adversarial request — and, via the "teeth" path, that even an explicit
// founder allow-rule routes only to the held-action sink (HELD), never to a live crossing.
// A live crossing is structurally impossible here: there is no code path that does real IO.
//
// Decisions (never enact anything):
//   DENIED   — refused at the gate; no allow-rule opened.
//   REFUSED  — provider dispatch refused into the held-action sink in the OFF posture.
//   HELD     — an allow-rule (and, for providers, an ARMED posture) matched, so the request is
//              parked in the held-action sink. HELD IS NOT LIVE. See OUTER_CAGE.md Truth Law §2.
// There is intentionally NO "LIVE" / "SENT" / "DELIVERED" decision in this model.

export const DECISION = Object.freeze({
  DENIED: 'DENIED',
  REFUSED: 'REFUSED',
  HELD: 'HELD',
});

// A policy the model evaluates against. Defaults are the OFF posture with an empty allow-list —
// i.e. deny-by-default. Anything omitted is treated as denied.
export function offPolicy(overrides = {}) {
  return {
    posture: 'OFF',
    cageRoot: '/cage/workspace',
    allowlist: { network: [], paths: [], sockets: [], providers: [] },
    ...overrides,
    allowlist: {
      network: [], paths: [], sockets: [], providers: [],
      ...(overrides.allowlist || {}),
    },
  };
}

function within(cageRoot, target) {
  // Pure string containment: target must be under cageRoot with a path separator boundary.
  if (typeof target !== 'string' || typeof cageRoot !== 'string') return false;
  const root = cageRoot.endsWith('/') ? cageRoot : cageRoot + '/';
  return target === cageRoot || target.startsWith(root);
}

// Evaluate one adversarial request against a policy. Returns { decision, reason }.
export function evaluate(request, policy = offPolicy()) {
  const p = policy || offPolicy();
  const allow = p.allowlist || {};
  const cls = request && request.action_class;

  switch (cls) {
    case 'network-egress': {
      const target = request.target;
      if ((allow.network || []).includes(target)) {
        return { decision: DECISION.HELD, reason: 'EGRESS_ALLOWED_BUT_HELD' };
      }
      return { decision: DECISION.DENIED, reason: 'EGRESS_DENY_DEFAULT' };
    }
    case 'host-path-read': {
      const target = request.target;
      const inRoot = within(p.cageRoot, target);
      if (inRoot && (allow.paths || []).includes(target)) {
        return { decision: DECISION.HELD, reason: 'PATH_ALLOWED_BUT_HELD' };
      }
      return { decision: DECISION.DENIED, reason: 'PATH_OUTSIDE_CAGE_ROOT' };
    }
    case 'control-socket-connect': {
      if ((allow.sockets || []).includes('control-socket-connect')) {
        return { decision: DECISION.HELD, reason: 'CONTROL_SOCKET_ALLOWED_BUT_HELD' };
      }
      return { decision: DECISION.DENIED, reason: 'CONTROL_SOCKET_DENY_DEFAULT' };
    }
    case 'provider-dispatch': {
      const provider = request.provider;
      const armed = p.posture === 'ARMED';
      const allowed = (allow.providers || []).includes(provider);
      if (armed && allowed) {
        // Allowed + armed still only parks in the sink — the model cannot fire.
        return { decision: DECISION.HELD, reason: 'PROVIDER_ALLOWED_BUT_HELD_NOT_FIRED' };
      }
      // OFF posture (or not allow-listed) → refused into the held-action sink.
      return { decision: DECISION.REFUSED, reason: 'PROVIDER_DISPATCH_HELD_IN_SINK' };
    }
    default:
      // Unknown action class is denied by default — deny-by-default extends to the unknown.
      return { decision: DECISION.DENIED, reason: 'UNKNOWN_ACTION_CLASS_DENY_DEFAULT' };
  }
}

// Secrets-absent check. Pure: scans a supplied env MAP (never process.env here) for any
// secret-shaped NAME. Returns only NAMES that matched — NEVER any value. Case-insensitive.
export function scanForSecretNames(envMap, secretShapedNames) {
  const present = [];
  const keysLower = new Set(Object.keys(envMap || {}).map((k) => k.toLowerCase()));
  for (const name of secretShapedNames || []) {
    if (keysLower.has(String(name).toLowerCase())) present.push(name);
  }
  return { absent: present.length === 0, present };
}
