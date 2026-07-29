// PR201+PR202 integration glue — the founder-facing visible view.
//
// Plain English: this composes the two dashboards into ONE truthful founder view and
// settles their relationship: the #202 "command center" is the TOP-LEVEL SUMMARY
// (run status + heartbeat liveness + evidence freshness), and the #201 "status cards"
// are the DRILL-DOWN DETAIL under it. They are COMPLEMENTARY, not duplicates: the
// command center answers "is the run alive and is its evidence fresh?", the status
// cards show the per-signal detail. Neither invents state (both honor UNKNOWN).
//
// Pure + deterministic: no I/O, no clock, no randomness. Reuses both components read-only.
import { buildCommandCenter, renderCommandCenterText } from "../command-center/command-center.mjs";
import { buildCards, renderCardsText } from "../dashboard/status-cards.mjs";

export const UNKNOWN = "UNKNOWN";

// The canonical founder-facing surface: summary on top, detail cards beneath.
export function buildFounderView(snapshot = {}) {
  const summary = buildCommandCenter(snapshot);   // #202 — primary/top
  const detailCards = buildCards(snapshot);       // #201 — detail rows
  return Object.freeze({
    title: "Founder View",
    visible_path: "src/ui/command-center (summary) → src/ui/dashboard/status-cards (detail)",
    primary: "command-center",
    detail: "status-cards",
    relationship: "complementary",                // summary vs detail; not duplicate
    run_id: summary.run_id,
    summary,
    detail_cards: detailCards,
    // A single truthful liveness/freshness headline the founder sees first:
    headline: Object.freeze({
      liveness: summary.liveness,
      evidence_freshness: summary.evidence_freshness,
      lifecycle: summary.lifecycle_display,
    }),
  });
}

// Deterministic render: headline, then summary block, then detail block.
export function renderFounderView(v) {
  return [
    `${v.title} — run=${v.run_id}`,
    `[HEADLINE] lifecycle=${v.headline.lifecycle} | liveness=${v.headline.liveness} | evidence=${v.headline.evidence_freshness}`,
    `--- summary (command center) ---`,
    renderCommandCenterText(v.summary),
    `--- detail (status cards) ---`,
    renderCardsText(v.detail_cards),
  ].join("\n");
}
