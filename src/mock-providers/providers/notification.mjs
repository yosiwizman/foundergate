// FounderGate — Mock NOTIFICATION provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No push service, no APNs/FCM, no webhook. "notify" is HELD (never delivered).

import { mockEnvelope, refuseLive, djb2Hex, canonical } from '../core.mjs';

const PROVIDER = 'notification';

function guard(action, req) {
  const live = refuseLive(PROVIDER, action, req);
  if (live) throw live;
}

export default {
  name: PROVIDER,
  kind: 'messaging',
  live: false,
  mock: true,
  actions: {
    notify(req = {}) {
      guard('notify', req);
      const channel = String(req.channel ?? 'push');
      return mockEnvelope({
        provider: PROVIDER, action: 'notify',
        request: { channel, title: req.title ?? '(no title)' },
        data: {
          delivered: false,
          notificationId: `mock-notif-${djb2Hex(canonical({ channel, t: req.title ?? '' }))}`,
          channel,
        },
      });
    },
    // Read-only fake registration check.
    isRegistered(req = {}) {
      guard('isRegistered', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'isRegistered',
        request: { token: req.token ? 'present' : 'absent' },
        data: { registered: false, source: 'mock-fixture' },
      });
    },
  },
};
