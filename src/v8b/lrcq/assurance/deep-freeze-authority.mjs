// FounderGate LRCQ — audited DEEP FREEZE for founder-signed authority data (FG-FCHK-197-C).
//
// Object.freeze is SHALLOW. Every capability stage in this lane publishes nested authority objects
// (`limits`, `exclusions`), so a shallow freeze left the founder-signed cost ceiling, duration, parallel
// width, output cap, grace period and the signed exclusions WRITABLE through any capability reference —
// and every downstream consumer (the budget ledger, the legacy projection, the supervisor receipt) treats
// those values as the authoritative signed ceiling.
//
// This helper is deliberately TINY and TOTAL. It accepts ONLY plain JSON authority data and refuses
// everything else rather than silently passing it through:
//
//   * accepted values: string, boolean, null, FINITE number, plain array, plain object
//     (prototype === Object.prototype or null);
//   * refused: functions, class instances and any non-plain prototype, accessor (get/set) properties,
//     symbol keys and symbol values, undefined, NaN, Infinity, -Infinity, BigInt, Date/Map/Set/RegExp,
//     typed arrays and Buffers, and reference CYCLES;
//   * it COPIES before freezing and freezes only the COPY, so a caller-owned source object is never
//     frozen in place (the parsed activation document stays an ordinary mutable object owned by its
//     caller, and the authority retains no reference to it).
//
// A refusal THROWS rather than returning a partially frozen structure: an authority object that cannot be
// made immutable must never be published.

export const AUTHORITY_FREEZE_CODES = {
  UNSUPPORTED_VALUE: "AUTHORITY_UNSUPPORTED_VALUE",
  NON_PLAIN_PROTOTYPE: "AUTHORITY_NON_PLAIN_PROTOTYPE",
  ACCESSOR_PROPERTY: "AUTHORITY_ACCESSOR_PROPERTY",
  SYMBOL_KEY: "AUTHORITY_SYMBOL_KEY",
  CYCLE: "AUTHORITY_CYCLE",
};

export class AuthorityFreezeError extends Error {
  constructor(code, path, detail) {
    super("deepFreezeAuthority: " + code + " at " + path + (detail ? " (" + detail + ")" : ""));
    this.name = "AuthorityFreezeError";
    this.code = code;
    this.path = path;
  }
}

function isPlainObject(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function copyFreeze(value, path, seen) {
  // ---- leaves ----
  if (value === null) return null;
  const t = typeof value;
  if (t === "string" || t === "boolean") return value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, "non-finite number");
    return value;
  }
  if (t === "undefined") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, "undefined");
  if (t === "function") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, "function");
  if (t === "symbol") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, "symbol");
  if (t === "bigint") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, "bigint");
  if (t !== "object") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path, t);

  // ---- containers ----
  const isArr = Array.isArray(value);
  if (!isArr && !isPlainObject(value)) {
    const ctor = (value.constructor && value.constructor.name) || "unknown";
    throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.NON_PLAIN_PROTOTYPE, path, ctor);
  }
  // A cycle would make an immutable authority snapshot impossible; refuse rather than recurse.
  if (seen.has(value)) throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.CYCLE, path);
  seen.add(value);
  // Symbol-keyed data is invisible to canonical JSON, so it can never be part of signed authority.
  if (Object.getOwnPropertySymbols(value).length > 0) throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.SYMBOL_KEY, path);

  let out;
  if (isArr) {
    out = [];
    for (let i = 0; i < value.length; i++) {
      const d = Object.getOwnPropertyDescriptor(value, i);
      // A hole or an accessor element is not plain JSON authority data.
      if (!d) throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.UNSUPPORTED_VALUE, path + "[" + i + "]", "sparse element");
      if (typeof d.get === "function" || typeof d.set === "function") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.ACCESSOR_PROPERTY, path + "[" + i + "]");
      out.push(copyFreeze(d.value, path + "[" + i + "]", seen));
    }
  } else {
    out = {};
    for (const k of Object.getOwnPropertyNames(value)) {
      const d = Object.getOwnPropertyDescriptor(value, k);
      // An accessor could recompute an "immutable" authority value on every read — refuse it outright.
      if (typeof d.get === "function" || typeof d.set === "function") throw new AuthorityFreezeError(AUTHORITY_FREEZE_CODES.ACCESSOR_PROPERTY, path + "." + k);
      out[k] = copyFreeze(d.value, path + "." + k, seen);
    }
  }
  seen.delete(value);
  return Object.freeze(out);
}

// Return a FROZEN DEEP COPY of `value`. The source is never mutated and never frozen.
export function deepFreezeAuthority(value) {
  return copyFreeze(value, "$", new Set());
}

// Mechanical audit helper: enumerate the paths of every nested object/array reachable from `value` that is
// NOT frozen. A published authority object must return an EMPTY array.
export function mutableAuthorityPaths(value, path = "$", out = [], seen = new Set()) {
  if (typeof value !== "object" || value === null) return out;
  if (seen.has(value)) return out;
  seen.add(value);
  if (!Object.isFrozen(value)) out.push(path);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) mutableAuthorityPaths(value[i], path + "[" + i + "]", out, seen);
  } else {
    for (const k of Object.getOwnPropertyNames(value)) {
      const d = Object.getOwnPropertyDescriptor(value, k);
      if (d && "value" in d) mutableAuthorityPaths(d.value, path + "." + k, out, seen);
    }
  }
  return out;
}
