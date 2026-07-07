// FounderGate — Mock PAYMENT provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// The most safety-sensitive mock: NO card network, NO processor, NO money can
// move. "charge" / "pay" are always HELD (captured, never enacted). There is no
// live path — any live:true request is refused by core.refuseLive.

import { mockEnvelope, refuseLive, djb2Hex, canonical } from '../core.mjs';

const PROVIDER = 'payment';

function guard(action, req) {
  const live = refuseLive(PROVIDER, action, req);
  if (live) throw live;
}

export default {
  name: PROVIDER,
  kind: 'money',
  live: false,
  mock: true,
  actions: {
    // HELD — never charges. Echoes amount/currency; no PAN, no processor.
    charge(req = {}) {
      guard('charge', req);
      const amount = Number.isFinite(req.amount) ? req.amount : 0;
      const currency = String(req.currency ?? 'USD');
      return mockEnvelope({
        provider: PROVIDER, action: 'charge',
        request: { amount, currency },
        data: {
          captured: false,
          moved: false,
          chargeId: `mock-charge-${djb2Hex(canonical({ amount, currency }))}`,
          amount, currency,
        },
      });
    },
    // HELD alias — same held semantics as charge.
    pay(req = {}) {
      guard('pay', req);
      const amount = Number.isFinite(req.amount) ? req.amount : 0;
      return mockEnvelope({
        provider: PROVIDER, action: 'pay',
        request: { amount, currency: String(req.currency ?? 'USD') },
        data: { paid: false, moved: false, payId: `mock-pay-${djb2Hex(canonical(req))}` },
      });
    },
    // Read-only fake balance.
    balance(req = {}) {
      guard('balance', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'balance',
        request: { account: req.account ?? 'mock-acct' },
        data: { available: 0, currency: 'USD', source: 'mock-fixture' },
      });
    },
  },
};
