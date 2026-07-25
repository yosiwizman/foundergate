// FounderGate LRCQ — the ONE production canonicalization authority (FG-LRCQ-ACT-028).
// Deterministic, byte-identical canonical JSON for signing/verifying activation payloads. Production code
// AND tools import this exact module; production verification never depends on tools/terminal0 code.
//
// Rules: recursively key-sorted objects; arrays preserve order; exact UTF-8; NO Unicode normalization, NO
// line-ending normalization, NO whitespace variation. Rejects undefined, functions, NaN, Infinity, symbols,
// bigint, and any non-plain-object/non-array/non-(string|number-finite|boolean|null) value. Rejecting
// unsupported values prevents duplicate/ambiguous semantic representations from producing a signable payload.

function assert(cond, msg) { if (!cond) throw new Error("canonical-json: " + msg); }

// Serialize one value to canonical JSON text (no incidental whitespace).
function ser(v, path) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "string") return JSON.stringify(v); // JSON.stringify emits exact UTF-8-safe escaping; no normalization
  if (t === "boolean") return v ? "true" : "false";
  if (t === "number") { assert(Number.isFinite(v), "non-finite number at " + path); return JSON.stringify(v); }
  if (t === "undefined") throw new Error("canonical-json: undefined not allowed at " + path);
  if (t === "function" || t === "symbol" || t === "bigint") throw new Error("canonical-json: unsupported type " + t + " at " + path);
  if (Array.isArray(v)) return "[" + v.map((e, i) => ser(e, path + "[" + i + "]")).join(",") + "]";
  if (t === "object") {
    // reject non-plain objects (Date, Map, Set, class instances) — only plain JSON objects allowed
    const proto = Object.getPrototypeOf(v);
    assert(proto === Object.prototype || proto === null, "non-plain object at " + path);
    const keys = Object.keys(v).sort();
    // reject duplicate semantic representation is impossible for JS object keys (unique); reject undefined values
    return "{" + keys.map((k) => { assert(v[k] !== undefined, "undefined value at " + path + "." + k); return JSON.stringify(k) + ":" + ser(v[k], path + "." + k); }).join(",") + "}";
  }
  throw new Error("canonical-json: unhandled value at " + path);
}

export function canonicalize(value) { return ser(value, "$"); }

// Canonical bytes (UTF-8).
export function canonicalBytes(value) { return Buffer.from(canonicalize(value), "utf8"); }

// ---- signed-message domain separation (FG-LRCQ-ACT-028) -------------------------------------------
// The signed message is: UTF8("FOUNDERGATE-LRCQ-ACTIVATION-V4\0") + UTF8(canonicalPayload).
export const V4_SIGNATURE_DOMAIN = "FOUNDERGATE-LRCQ-ACTIVATION-V4\0";
export function signedMessage(canonicalPayloadText) {
  return Buffer.concat([Buffer.from(V4_SIGNATURE_DOMAIN, "utf8"), Buffer.from(canonicalPayloadText, "utf8")]);
}
export function signedMessageFor(payloadObject) { return signedMessage(canonicalize(payloadObject)); }
