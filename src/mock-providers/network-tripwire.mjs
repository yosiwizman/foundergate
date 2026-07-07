// FounderGate — Mock Provider Layer :: network tripwire.
//
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// PURPOSE
// -------
// The mock provider layer must NEVER touch a real network. This module installs a
// *tripwire*: it wraps every outbound-network primitive that pure Node exposes
// (`fetch`, `http.request`, `https.request`, `http.get`, `https.get`, and the low
// level `net.Socket#connect` / `tls.connect`) with a guard that THROWS the moment
// it is invoked. If a mock provider ever accidentally reached for the wire the
// tripwire fires immediately and deterministically instead of leaking a real call.
//
// This is a *defensive* control, not a capability. Nothing here opens a socket,
// resolves DNS, or contacts any host. The wrapped functions only ever throw.
//
// USAGE (hermetic tests):
//   import { installNetworkTripwire } from './network-tripwire.mjs';
//   const wire = installNetworkTripwire();
//   ... run mock providers ...
//   assert(wire.fired() === false);   // proves zero network attempts
//   wire.restore();                   // put the originals back
//
// The tripwire records whether it fired (and how), so a test can prove a *clean*
// run touched the network zero times, AND prove that a deliberate attempt WOULD
// have been caught (the tripwire has teeth).

import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';

export const MOCK_NETWORK_TRIPWIRE_ERROR = 'MOCK_NETWORK_TRIPWIRE_FIRED';

/**
 * Install the tripwire over every outbound network primitive.
 * Returns a controller: { fired(), events(), restore() }.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.throwOnFire=true] when true the wrapped primitive throws;
 *   when false it records the attempt and returns undefined (used to prove teeth
 *   without unwinding a whole call stack in a negative test).
 */
export function installNetworkTripwire(opts = {}) {
  const throwOnFire = opts.throwOnFire !== false;
  const events = [];

  function trip(surface, detail) {
    events.push({ surface, detail: String(detail ?? '').slice(0, 200) });
    if (throwOnFire) {
      const err = new Error(
        `${MOCK_NETWORK_TRIPWIRE_ERROR}: outbound network attempt via "${surface}" ` +
        `is forbidden in the mock provider layer (mock:true, live:false).`,
      );
      err.code = MOCK_NETWORK_TRIPWIRE_ERROR;
      err.surface = surface;
      throw err;
    }
  }

  // Snapshot originals so we can restore exactly.
  const original = {
    fetch: globalThis.fetch,
    httpRequest: http.request,
    httpsRequest: https.request,
    httpGet: http.get,
    httpsGet: https.get,
    socketConnect: net.Socket.prototype.connect,
    tlsConnect: tls.connect,
  };

  globalThis.fetch = function trippedFetch(input) {
    return trip('globalThis.fetch', input);
  };
  http.request = function trippedHttpRequest(arg) { return trip('http.request', arg); };
  https.request = function trippedHttpsRequest(arg) { return trip('https.request', arg); };
  http.get = function trippedHttpGet(arg) { return trip('http.get', arg); };
  https.get = function trippedHttpsGet(arg) { return trip('https.get', arg); };
  net.Socket.prototype.connect = function trippedSocketConnect() { return trip('net.Socket#connect'); };
  tls.connect = function trippedTlsConnect() { return trip('tls.connect'); };

  return {
    /** True iff any wrapped primitive was invoked since install. */
    fired() { return events.length > 0; },
    /** A copy of the recorded attempt events. */
    events() { return events.slice(); },
    /** Restore every original primitive. Idempotent. */
    restore() {
      globalThis.fetch = original.fetch;
      http.request = original.httpRequest;
      https.request = original.httpsRequest;
      http.get = original.httpGet;
      https.get = original.httpsGet;
      net.Socket.prototype.connect = original.socketConnect;
      tls.connect = original.tlsConnect;
    },
  };
}
