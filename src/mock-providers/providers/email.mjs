// FounderGate — Mock EMAIL provider (deterministic fake; mock:true live:false).
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// No SMTP, no IMAP, no OAuth, no network. "send" returns a HELD envelope.

import { mockEnvelope, refuseLive, djb2Hex, canonical } from '../core.mjs';

const PROVIDER = 'email';

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
    // A "send" is HELD — never delivered. Returns what *would* be queued.
    send(req = {}) {
      guard('send', req);
      const to = req.to ?? 'mock.recipient@example.invalid';
      return mockEnvelope({
        provider: PROVIDER,
        action: 'send',
        request: { to, subject: req.subject ?? '(no subject)' },
        data: {
          queued: false,
          messageId: `mock-msg-${djb2Hex(canonical({ to, s: req.subject ?? '' }))}@mock.invalid`,
          to,
          from: 'mock.sender@example.invalid',
        },
      });
    },
    // Deterministic fake inbox listing (structural rows only, no bodies).
    listInbox(req = {}) {
      guard('listInbox', req);
      const count = Number.isInteger(req.limit) ? Math.max(0, Math.min(req.limit, 3)) : 3;
      const rows = Array.from({ length: count }, (_, i) => ({
        id: `mock-inbox-${i}`,
        from: `mock.sender${i}@example.invalid`,
        subject: `Mock subject ${i}`,
        unread: i === 0,
      }));
      return mockEnvelope({
        provider: PROVIDER, action: 'listInbox',
        request: { limit: count }, data: { count, rows },
      });
    },
    createDraft(req = {}) {
      guard('createDraft', req);
      return mockEnvelope({
        provider: PROVIDER, action: 'createDraft',
        request: { to: req.to ?? 'mock.recipient@example.invalid' },
        data: { draftId: `mock-draft-${djb2Hex(canonical(req))}`, saved: false },
      });
    },
  },
};
