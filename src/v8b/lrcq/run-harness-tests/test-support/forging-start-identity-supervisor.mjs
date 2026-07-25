#!/usr/bin/env node
// FounderGate LRCQ — TEST-SUPPORT adversarial supervisor for FG-FFIN4-197-01. Structurally test-only.
//
// It models the exact threat the fourth independent Checker demonstrated: a supervisor that LEGITIMATELY
// holds the transferred ephemeral private key (it really did read and decode the governed key frame off the
// inherited descriptor) and therefore signs a claim that passes EVERY other binding — activation identity,
// payload digest, marker digest, intent digest, launch nonce, entrypoint digest, lifecycle-root object
// identity and its own real PID — while forging the ONE field it fully controls: supervisor_start_identity.
//
// The point of the attack is that the launcher's defence against that single forged field is an INDEPENDENT
// operating-system observation of the child's process-start time. If that observation is unavailable and the
// launcher treats "unobservable" as "skip the check", the forged identity is accepted.
//
// This child does NOT use attachSupervisorFromInheritedFdV4, because the production attach records the REAL
// observed identity. It constructs and signs the claim itself, exactly as a compromised-but-key-holding
// supervisor would. It reads the marker and intent from the signed lifecycle root to fill in the bindings.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, createPrivateKey, sign as edSign } from "node:crypto";
import { join } from "node:path";
import { canonicalize } from "../../assurance/canonical-json.mjs";

const at = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const cfg = JSON.parse(readFileSync(at("--config"), "utf8"));
const forgedIdentity = at("--forge-identity") || "FORGED-START-IDENTITY-NEVER-OBSERVED";
const fd = cfg.keyFd || 3;
const out = at("--receipt");
const receipt = { pid: process.pid, wrote_claim: false, error: null, forged_identity: forgedIdentity };

// ---- decode the governed key frame off the inherited descriptor (the real thing) ----
const MAGIC = Buffer.from("FGV4KEY1", "utf8");
function decodeFrame(buf) {
  const header = MAGIC.length + 4;
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("bad magic");
  const derLen = buf.readUInt32BE(MAGIC.length);
  const head = buf.subarray(0, header + derLen);
  const tag = buf.subarray(header + derLen);
  if (!createHash("sha256").update(head).digest().equals(tag)) throw new Error("bad tag");
  return createPrivateKey({ key: Buffer.from(buf.subarray(header, header + derLen)), format: "der", type: "pkcs8" });
}

try {
  const key = decodeFrame(readFileSync(fd));
  const idFile = cfg.activationIdentity.replace(":", "_");
  const marker = JSON.parse(readFileSync(join(cfg.lifecycleRoot, idFile + ".consumed.json"), "utf8"));
  const intent = JSON.parse(readFileSync(join(cfg.lifecycleRoot, idFile + ".launch-intent.json"), "utf8"));
  const digestOf = (o) => "sha256:" + createHash("sha256").update(Buffer.from(JSON.stringify(o, null, 2) + "\n")).digest("hex");
  const body = {
    schema: "lrcq-supervisor-claim-v4-1",
    lifecycle_contract_version: marker.lifecycle_contract_version,
    activation_identity: cfg.activationIdentity,
    payload_digest: marker.payload_digest,
    consumed_marker_digest: digestOf(marker),
    launch_intent_digest: digestOf(intent),
    lifecycle_root_object_id: marker.lifecycle_root_object_id,
    lifecycle_root_digest: "sha256:" + createHash("sha256").update(Buffer.from(marker.lifecycle_root_object_id)).digest("hex"),
    launch_nonce: intent.launch_nonce,
    supervisor_pid: process.pid,                       // the REAL pid of the process this transfer spawned
    supervisor_start_identity: forgedIdentity,         // the ONE forged field
    supervisor_entrypoint_digest: intent.supervisor_entrypoint_digest,
    claim_epoch: cfg.now || 0,
    terminal: false,
    ephemeral_fingerprint: marker.ephemeral_fingerprint,
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), key).toString("base64");
  writeFileSync(join(cfg.lifecycleRoot, idFile + ".supervisor-claim.json"),
    JSON.stringify({ ...body, ephemeral_signature: sig }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  receipt.wrote_claim = true;
} catch (e) { receipt.error = String((e && e.message) || e); }

if (out) writeFileSync(out, JSON.stringify(receipt) + "\n");
console.log(JSON.stringify(receipt));
// Stay alive briefly so the parent's OS observation window is realistic; the launcher decides, not the child.
setTimeout(() => process.exit(0), Number(at("--linger") || 1500));
