// FounderGate — Mock MAPS provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No geocoding API, no directions API, no network. Read-only deterministic fakes.

import { mockEnvelope, refuseLive, djb2Hex } from '../core.mjs';

const PROVIDER = 'maps';

function guard(action, req) {
  const live = refuseLive(PROVIDER, action, req);
  if (live) throw live;
}

export default {
  name: PROVIDER,
  kind: 'read-only',
  live: false,
  mock: true,
  actions: {
    geocode(req = {}) {
      guard('geocode', req);
      const q = String(req.query ?? 'unknown place');
      const h = parseInt(djb2Hex(q), 16);
      // Deterministic fake lat/lng in a plausible range, clearly synthetic.
      const lat = ((h % 18000) / 100 - 90).toFixed(4);
      const lng = (((h >> 3) % 36000) / 100 - 180).toFixed(4);
      return mockEnvelope({
        provider: PROVIDER, action: 'geocode',
        request: { query: q },
        data: { query: q, lat: Number(lat), lng: Number(lng), source: 'mock-fixture' },
      });
    },
    directions(req = {}) {
      guard('directions', req);
      const from = String(req.from ?? 'A');
      const to = String(req.to ?? 'B');
      const h = parseInt(djb2Hex(from + '->' + to), 16);
      return mockEnvelope({
        provider: PROVIDER, action: 'directions',
        request: { from, to },
        data: {
          from, to,
          distanceKm: (h % 500) / 10,
          etaMin: h % 120,
          steps: [`Depart ${from}`, 'Continue on Mock St', `Arrive ${to}`],
        },
      });
    },
  },
};
