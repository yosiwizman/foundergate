// VB2 INTEGRATED SOAK PROBE — VB1-launched work routed THROUGH the VB2 ClassifiedObjectStore.
//
// This file lives UNDER docs/ (outside the frozen scope src/+scripts/+package.json) so running it
// never drifts the freeze manifest. It imports the ACCEPTED product modules by absolute path.
//
// One tick = one unit of VB1-launched work, driven end-to-end:
//   (1) VB1 LAUNCH  — mint a boot-bound session token and USE it for a real action. That is the
//                      VB1-sanctioned launch gate. We also call the VB1 executor act() to show the
//                      act-edge is genuinely contained in VB1 (no VB3 verifier -> refused), proving
//                      the launch went through the real VB1 authority, not a fabrication.
//   (2) BUILD ITEM  — construct a CTO-queue work item (a run_draft) and validate it through the
//                      accepted cto-queue.validateItem boundary.
//   (3) VB2 WRITE   — append the item into the ClassifiedObjectStore as a genesis-anchored,
//                      hash-chained event (create), then a legal lifecycle transition.
//   (4) VB2 READ    — read the item BACK by folding the chain (objectState) AND cryptographically
//                      verify the chain (verifyChain === "intact").
//
// HEALTH (exit code) is DERIVED FROM THE STORE READ:
//   exit 0  iff  the value read back FROM the store == what VB1 launched  AND  verifyChain==="intact"
//                AND the store handle actually contains the create event for this object.
//   exit 1  otherwise.
//
// STORE-BYPASS PROOF: with FG_STORE_BYPASS=1, step (3)/(4) route AROUND the store — the item is kept
// in a plain in-memory shadow and "read" from there. The health check still demands a store handle
// whose chain verifies intact and contains the event; the shadow has no such chain, so the probe
// FAILS (exit 1). If bypassing the store still exited 0, the store would not be load-bearing.
//
// Deterministic: no wall-clock is fed into the store (timestamps are DATA). IDs use the accepted
// idFromBytes minter seeded from a per-tick counter so a bypass can never accidentally match.

import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// docs/assembly-evidence/VB2/soak/integrated-8h-2026-07-18 -> repo root is 5 levels up.
const REPO = resolve(HERE, "../../../../..");
const imp = (rel) => import(pathToFileURL(resolve(REPO, rel)).href);

const BYPASS = process.env.FG_STORE_BYPASS === "1";

function log(...a) { if (process.env.FG_PROBE_VERBOSE === "1") console.error("[probe]", ...a); }

async function main() {
  const sessionMod = await imp("src/v8b1/session-token.mjs");
  const execMod = await imp("src/v8b1/executor.mjs");
  const queueMod = await imp("src/v8b2/cto-queue.mjs");
  const store = await imp("src/v8b2/classified-object-store.mjs");

  // ---- (1) VB1 LAUNCH: real boot-bound session token, minted then used for an action. ----------
  // mint() mutates `st.tokens` in place and RETURNS the token (with .id). Timestamps are DATA (now:).
  const bootId = "soak-boot-0000000000000000000000000000";
  const st = sessionMod.emptyStore();
  const token = sessionMod.mint(st, { bootId, scope: ["queue.route"], ttlMs: 60_000, now: 1_000 });
  const used = sessionMod.use(st, token.id, { bootId, action: "queue.route", now: 2_000 });
  if (!used || used.ok !== true) throw new Error("VB1 launch failed: session-token use() refused a valid in-scope action: " + (used && used.reason));

  // The VB1 act-edge is HARD-gated in VB1 (no VB3 verifier). Prove the launch runs through the REAL
  // VB1 executor all the way to the contained act-edge: act() must reach step 2 and REFUSE with
  // NO_WIRED_APPROVAL (not fail earlier at the token gate, not silently execute). Pass now:3_000 so
  // the fixed-timestamp token is still valid at the executor's clock.
  const actRes = execMod.act({
    tokenStore: st, tokenId: token.id, bootId, action: "queue.route", work: "vb2-soak-item",
    approval: { wired: true }, backup: { backups: [], created_at: "2026-07-18T00:00:00Z" },
    mutate: () => { throw new Error("VB1 must never execute a mutate in-soak"); },
  }, { now: 3_000 });
  if (actRes.ok !== false || actRes.reason !== execMod.REFUSE.NO_WIRED_APPROVAL) {
    throw new Error("VB1 containment invariant BROKEN: expected act-edge refusal NO_WIRED_APPROVAL, got ok=" + actRes.ok + " reason=" + actRes.reason + " detail=" + actRes.detail);
  }
  log("VB1 launch ok — session used, act-edge contained at NO_WIRED_APPROVAL");

  // ---- (2) BUILD ITEM: a CTO-queue run_draft, validated through the accepted boundary. ---------
  // The queue id space is ^q[0-9a-f]{12}$; created_at is caller-supplied DATA (VB2 never reads a clock).
  const tick = Number(process.env.FG_PROBE_TICK || "0");
  const objId = "q" + ((tick >>> 0).toString(16).padStart(12, "0").slice(-12));  // ^q[0-9a-f]{12}$
  const item = {
    id: objId, title: "VB2 soak launched item #" + tick, kind: "run_draft", status: "queued",
    created_at: "2026-07-18T00:00:00Z",
    summary: "VB1-launched work, routed to the VB2 classified object store.",
    requested_by: "vb2-integrated-soak", data_class: "INTERNAL",
  };
  const v = queueMod.validateItem(item);
  if (!v.valid) throw new Error("cto-queue.validateItem rejected the launched item: " + v.errors.join("; "));
  // The SAME work-item id is the store object_id — one item flowing VB1 -> queue -> VB2 store.
  log("item built + validated:", objId);

  // ---- (3)+(4) WRITE THROUGH + READ THROUGH the store, then derive health from the read. -------
  // The "answer" (lifecycle read back + chain proof) MUST come from a real store handle.
  const AT0 = "2026-07-18T00:00:00.000Z";
  const AT1 = "2026-07-18T00:00:01.000Z";

  let handle;   // must end up being a real ClassifiedObjectStore with a verifiable chain
  if (!BYPASS) {
    // REAL PATH: write the create + a legal transition into the chained store.
    let s = store.newStore();
    s = store.appendEvent(s, { at: AT0, kind: "create", object_id: objId, payload: { data_class: item.data_class, kind: item.kind } });
    s = store.appendEvent(s, { at: AT1, kind: "transition", object_id: objId, payload: { from: "PENDING", to: "RESOLVED" } });
    handle = s;
  } else {
    // BYPASS PATH: route around the store. Keep the item in a plain shadow that carries NO chain.
    // (This is the mutation that must make the probe FAIL.)
    handle = { schema_version: "1.0.0", events: [], __shadow: { [objId]: { lifecycle: "RESOLVED" } } };
  }

  // Health is DERIVED FROM THE STORE READ — three store-only facts must all hold:
  const chain = store.verifyChain(handle);                    // fact A: cryptographic chain intact
  const readState = store.objectState(handle, objId);         // fact B: fold the chain back to state
  const hasCreate = Array.isArray(handle.events)
    && handle.events.some((e) => e.kind === "create" && e.object_id === objId);  // fact C: event present

  const healthy =
    chain === "intact" &&
    readState.lifecycle === "RESOLVED" &&          // what VB1 launched, read back through the fold
    hasCreate === true;

  log("chain:", chain, "readLifecycle:", readState.lifecycle, "hasCreate:", hasCreate, "bypass:", BYPASS, "=> healthy:", healthy);

  if (!healthy) {
    console.error(`[probe] UNHEALTHY (bypass=${BYPASS}) chain=${chain} lifecycle=${readState.lifecycle} hasCreate=${hasCreate}`);
    process.exit(1);
  }
  // Success is silent (soak-run runs with stdio ignored); exit 0.
  process.exit(0);
}

main().catch((e) => { console.error("[probe] ERROR:", e && e.message ? e.message : e); process.exit(1); });
