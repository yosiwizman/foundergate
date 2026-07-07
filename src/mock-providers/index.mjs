// FounderGate — Mock Provider Layer :: registry + dispatcher.
//
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// One import surface for the whole mock layer. Every provider here is a pure,
// deterministic fake tagged mock:true / live:false. There is NO real client,
// NO credential store, and NO network primitive reachable from this module.
//
//   import { getMockProvider, dispatch, MOCK_PROVIDERS } from './index.mjs';
//   const env = dispatch('payment', 'charge', { amount: 42, currency: 'USD' });
//   // env.status === 'HELD', env.mock === true, env.live === false
//
// A `live:true` request is refused at core.refuseLive — proving the live path is
// absent, not merely unused.

import email from './providers/email.mjs';
import sms from './providers/sms.mjs';
import calendar from './providers/calendar.mjs';
import weather from './providers/weather.mjs';
import maps from './providers/maps.mjs';
import payment from './providers/payment.mjs';
import notification from './providers/notification.mjs';
import { MOCK_LAYER_VERSION, MOCK_TAGS } from './core.mjs';

export { MOCK_LAYER_VERSION, MOCK_TAGS };
export { installNetworkTripwire, MOCK_NETWORK_TRIPWIRE_ERROR } from './network-tripwire.mjs';
export { mockEnvelope, auditEnvelope, refuseLive, mockId } from './core.mjs';

const _providers = [email, sms, calendar, weather, maps, payment, notification];

/** Frozen registry keyed by provider name. */
export const MOCK_PROVIDERS = Object.freeze(
  Object.fromEntries(_providers.map((p) => [p.name, p])),
);

/** Names of every registered mock provider. */
export const PROVIDER_NAMES = Object.freeze(_providers.map((p) => p.name));

/** Get a provider descriptor by name, or throw if unknown. */
export function getMockProvider(name) {
  const p = MOCK_PROVIDERS[name];
  if (!p) {
    const err = new Error(`MOCK_PROVIDER_UNKNOWN: no mock provider "${name}" (known: ${PROVIDER_NAMES.join(', ')})`);
    err.code = 'MOCK_PROVIDER_UNKNOWN';
    throw err;
  }
  return p;
}

/**
 * Invoke a provider action, returning its HELD/mock envelope.
 * Throws MOCK_PROVIDER_UNKNOWN / MOCK_ACTION_UNKNOWN / MOCK_LIVE_PATH_ABSENT.
 */
export function dispatch(providerName, action, request = {}) {
  const provider = getMockProvider(providerName);
  const fn = provider.actions[action];
  if (typeof fn !== 'function') {
    const err = new Error(
      `MOCK_ACTION_UNKNOWN: provider "${providerName}" has no action "${action}" ` +
      `(known: ${Object.keys(provider.actions).join(', ')})`,
    );
    err.code = 'MOCK_ACTION_UNKNOWN';
    throw err;
  }
  return fn(request);
}

/** A flat manifest of every provider/action pair — handy for tests + docs. */
export function manifest() {
  return _providers.map((p) => ({
    provider: p.name,
    kind: p.kind,
    mock: p.mock,
    live: p.live,
    actions: Object.keys(p.actions),
  }));
}
