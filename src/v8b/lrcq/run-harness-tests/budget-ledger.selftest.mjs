// FounderGate LRCQ — run-wide budget ledger truthfulness (FG-LRCQ-ACT-012). These lock the guarantees
// the ledger MUST honestly provide for a real-money autonomous run: the per-session reservation caps the
// CLI (never the full run budget), the checker keeps headroom, a missing cost HOLDS the run rather than
// committing a silent $0, real overspend is counted truthfully (never masked), and the cumulative $10
// ceiling is enforced by refusing the next reservation.
import { BudgetLedger } from "../run-harness/budget-ledger.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// 01: reserve returns a per-session cap = min(cap, available-after-headroom), NOT the run total.
{ const L = new BudgetLedger(10);
  const r = L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0.08);
  ok("01 per-session cap is the reservation (0.25), never the $10 run budget", r.ok && r.session_cap_usd === 0.25); }

// 02: the checker headroom (keepReserveUsd) is retained — a builder cannot reserve into the checker's share.
{ const L = new BudgetLedger(0.3);
  const r = L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0.08); // available = 0.30 - 0.08 = 0.22
  ok("02 checker headroom retained: builder capped at 0.22 (0.30 - 0.08 keep)", r.ok && near(r.session_cap_usd, 0.22)); }

// 03: a session that reports NO cost HOLDS the run (HELD_COST_EVIDENCE_MISSING), never a silent $0 commit.
{ const L = new BudgetLedger(10);
  L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0);
  const c = L.commit({ role: "builder", job: "j1", attempt: 1 }, undefined);
  ok("03 missing cost -> HELD_COST_EVIDENCE_MISSING, spent stays 0 (no silent $0)", !c.ok && c.reason === "HELD_COST_EVIDENCE_MISSING" && L.spent() === 0 && L.records.some((x) => x.event === "HELD_COST_EVIDENCE_MISSING")); }

// 04: a non-numeric / negative cost is also held.
{ const L = new BudgetLedger(10);
  L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0);
  ok("04 negative reported cost -> held", !L.commit({ role: "builder", job: "j1", attempt: 1 }, -1).ok); }

// 05: honest under-spend — commit the REAL cost, release the rest of the reservation.
{ const L = new BudgetLedger(10);
  L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0);
  const c = L.commit({ role: "builder", job: "j1", attempt: 1 }, 0.10);
  ok("05 under-spend commits the real cost + releases the reservation", c.ok && near(L.spent(), 0.10) && L.reserved() === 0 && !c.overspent); }

// 06: OVERSPEND is counted TRUTHFULLY (not masked at the reservation) + flagged as its own event.
{ const L = new BudgetLedger(10);
  L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0); // reserved 0.25
  const c = L.commit({ role: "builder", job: "j1", attempt: 1 }, 0.90); // really spent 0.90
  ok("06 overspend counted at the REAL cost (0.90, not capped to 0.25) + BUDGET_OVERSPEND recorded", c.ok && c.overspent === true && near(L.spent(), 0.90) && L.records.some((x) => x.event === "BUDGET_OVERSPEND" && near(x.reported_cost_usd, 0.90))); }

// 07: cumulative ceiling — the NEXT required reservation is refused once spent+reserved would reach $10.
{ const L = new BudgetLedger(0.4);
  L.reserve({ role: "builder", job: "g1", attempt: 1 }, 0.25, 0.08); L.commit({ role: "builder", job: "g1", attempt: 1 }, 0.25);
  L.reserve({ role: "checker", job: "g1", attempt: 1 }, 0.08); L.commit({ role: "checker", job: "g1", attempt: 1 }, 0.08); // spent 0.33
  const g2 = L.reserve({ role: "builder", job: "g2", attempt: 1 }, 0.25, 0.08); // available = 0.40 - 0.33 - 0.08 < 0
  ok("07 cumulative ceiling: next builder reservation refused -> CONTROLLED_BUDGET_STOP", !g2.ok && g2.reason === "CONTROLLED_BUDGET_STOP" && L.spent() <= 0.4); }

// 08: spent + reserved never silently exceed the ceiling via reservations (reserve is the gate).
{ const L = new BudgetLedger(1);
  let reserved = 0; for (let i = 0; i < 20; i++) { const r = L.reserve({ role: "builder", job: "j" + i, attempt: 1 }, 0.25, 0); if (r.ok) { reserved++; L.commit({ role: "builder", job: "j" + i, attempt: 1 }, 0.25); } }
  ok("08 reservations never overshoot the $1 ceiling (exactly 4 x 0.25 admitted)", reserved === 4 && near(L.spent(), 1) && !L.overCeiling()); }

// 09: a refused (zero-cost) session commits $0 legitimately and releases its reservation.
{ const L = new BudgetLedger(10);
  L.reserve({ role: "builder", job: "j1", attempt: 1 }, 0.25, 0);
  const c = L.commit({ role: "builder", job: "j1", attempt: 1 }, 0);
  ok("09 explicit $0 cost commits 0 + releases reservation", c.ok && L.spent() === 0 && L.reserved() === 0); }

console.log("\nLRCQ BUDGET-LEDGER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
