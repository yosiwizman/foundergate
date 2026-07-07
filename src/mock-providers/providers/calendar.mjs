// FounderGate — Mock CALENDAR provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No CalDAV, no Google/Outlook API, no RSVP is ever dispatched. Mutating
// actions (createEvent/delete/notify) are HELD.

import { mockEnvelope, refuseLive, djb2Hex, canonical } from '../core.mjs';

const PROVIDER = 'calendar';

function guard(action, req) {
  const live = refuseLive(PROVIDER, action, req);
  if (live) throw live;
}

export default {
  name: PROVIDER,
  kind: 'scheduling',
  live: false,
  mock: true,
  actions: {
    listEvents(req = {}) {
      guard('listEvents', req);
      const count = Number.isInteger(req.limit) ? Math.max(0, Math.min(req.limit, 2)) : 2;
      const events = Array.from({ length: count }, (_, i) => ({
        id: `mock-evt-${i}`,
        title: `Mock event ${i}`,
        start: `2026-01-0${i + 1}T09:00:00Z`,
        end: `2026-01-0${i + 1}T10:00:00Z`,
      }));
      return mockEnvelope({
        provider: PROVIDER, action: 'listEvents',
        request: { limit: count }, data: { count, events },
      });
    },
    createEvent(req = {}) {
      guard('createEvent', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'createEvent',
        request: { title: req.title ?? 'Mock event' },
        data: {
          created: false,
          eventId: `mock-evt-${djb2Hex(canonical(req))}`,
          title: req.title ?? 'Mock event',
        },
      });
    },
    // RSVP would notify an organizer on a real provider — HELD (delete/notify class).
    notify(req = {}) {
      guard('notify', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'notify',
        request: { eventId: req.eventId ?? 'mock-evt-unknown', response: req.response ?? 'tentative' },
        data: { notified: false, response: req.response ?? 'tentative' },
      });
    },
  },
};
