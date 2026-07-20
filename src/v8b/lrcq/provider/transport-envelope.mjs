// FounderGate LRCQ — strict provider CLI transport-envelope parser (FG-LRCQ-ACT-013 protocol).
// Separates (1) the Claude CLI transport envelope from (2) the model-produced FounderGate payload.
// Accepts ONLY the documented, fixture-backed transport shape; records transport/payload/cost
// evidence separately. Unknown/ambiguous/absent/non-JSON/error/malformed-cost -> refusal.
import { createHash } from "node:crypto";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// The pinned CLI (`claude --output-format json`) emits ONE JSON object:
//   { "type":"result", "subtype":"success", "is_error":false, "result":"<model text>", "total_cost_usd": N }
// The model text (`result`) must itself be the FounderGate JSON payload.
export const SUPPORTED_TRANSPORT_TYPE = "result";

export function parseTransport(stdout) {
  const refuse = (reason) => ({ ok: false, reason });
  if (typeof stdout !== "string" || stdout.trim() === "") return refuse("absent transport output");
  let env;
  try { env = JSON.parse(stdout); } catch { return refuse("transport is not JSON"); }
  if (Array.isArray(env)) return refuse("ambiguous transport (array of results)");
  if (!env || typeof env !== "object") return refuse("transport not an object");
  if (env.type !== SUPPORTED_TRANSPORT_TYPE) return refuse("unknown transport envelope type: " + env.type);
  if (env.is_error === true || env.subtype === "error") return refuse("transport reports error");
  if (typeof env.result !== "string" || env.result.trim() === "") return refuse("absent model result payload");
  if (typeof env.total_cost_usd !== "number" || !Number.isFinite(env.total_cost_usd) || env.total_cost_usd < 0) return refuse("malformed cost metadata");
  let payload;
  try { payload = JSON.parse(env.result); } catch { return refuse("model payload is not JSON"); }
  if (!payload || typeof payload !== "object") return refuse("model payload not an object");
  return {
    ok: true, payload, cost_usd: env.total_cost_usd,
    transport_metadata: { type: env.type, subtype: env.subtype || "success" },
    transport_digest: sha(stdout), payload_digest: sha(env.result),
  };
}

// Wrap a FounderGate payload in the supported transport envelope (used by the deterministic stub
// so it emits exactly what the production parser consumes — it never returns a raw payload).
export function wrapTransport(payload, costUsd) {
  return JSON.stringify({ type: "result", subtype: "success", is_error: false, result: JSON.stringify(payload), total_cost_usd: costUsd });
}
