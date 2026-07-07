// FounderGate — Mock WEATHER provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No weather API, no geolocation call. Read-only; the fake forecast is a pure
// function of the requested location string so it is fully deterministic.

import { mockEnvelope, refuseLive, djb2Hex } from '../core.mjs';

const PROVIDER = 'weather';
const CONDITIONS = ['clear', 'clouds', 'rain', 'snow'];

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
    current(req = {}) {
      guard('current', req);
      const loc = String(req.location ?? 'nowhere');
      const h = parseInt(djb2Hex(loc), 16);
      return mockEnvelope({
        provider: PROVIDER, action: 'current',
        request: { location: loc },
        data: {
          location: loc,
          tempC: (h % 45) - 5,          // deterministic -5..39
          condition: CONDITIONS[h % CONDITIONS.length],
          source: 'mock-fixture',
        },
      });
    },
    forecast(req = {}) {
      guard('forecast', req);
      const loc = String(req.location ?? 'nowhere');
      const days = Number.isInteger(req.days) ? Math.max(1, Math.min(req.days, 3)) : 3;
      const base = parseInt(djb2Hex(loc), 16);
      const daily = Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        highC: ((base + i * 7) % 40) - 2,
        lowC: ((base + i * 3) % 20) - 5,
        condition: CONDITIONS[(base + i) % CONDITIONS.length],
      }));
      return mockEnvelope({
        provider: PROVIDER, action: 'forecast',
        request: { location: loc, days }, data: { location: loc, days, daily },
      });
    },
  },
};
