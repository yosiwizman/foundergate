// FounderGate — Mock SMS provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No carrier, no gateway, no phone number is ever dialed or texted. "send" is HELD.

import { mockEnvelope, refuseLive, djb2Hex, canonical } from '../core.mjs';

const PROVIDER = 'sms';

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
    send(req = {}) {
      guard('send', req);
      const to = req.to ?? '+10000000000';
      return mockEnvelope({
        provider: PROVIDER, action: 'send',
        request: { to, bodyLen: String(req.body ?? '').length },
        data: {
          delivered: false,
          smsId: `mock-sms-${djb2Hex(canonical({ to, b: req.body ?? '' }))}`,
          to,
          segments: Math.max(1, Math.ceil(String(req.body ?? '').length / 160)),
        },
      });
    },
    status(req = {}) {
      guard('status', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'status',
        request: { smsId: req.smsId ?? 'mock-sms-unknown' },
        data: { state: 'mock-held', delivered: false },
      });
    },
  },
};
