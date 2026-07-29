// RunGrid Wave — Lane B: URL-drop intake validator / owner experience (pure, no network).
//
// Plain English: when the founder drops a URL, this validates and CLASSIFIES it safely
// BEFORE anything is fetched — it never makes a network call, never activates a provider.
// It decides, from the URL string alone, whether the target is a supported public git
// repo, unsupported, or blocked (private/local/credentialed), and produces a truthful
// owner-experience view-model. Unknown/ambiguous inputs fail CLOSED (BLOCKED), never open.
//
// Pure + deterministic: uses only the WHATWG URL parser (no I/O, no network, no clock).
export const UNKNOWN = "UNKNOWN";

const SUPPORTED_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org"]);
// Hosts/patterns that must never be treated as fetchable public sources.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function escapeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Classify a dropped URL string. Returns a frozen decision. Fail-closed on anything unclear.
export function classifyUrl(raw) {
  const input = typeof raw === "string" ? raw.trim() : "";
  if (input === "") return decision("BLOCKED", "empty input", { host: UNKNOWN });
  let u;
  try { u = new URL(input); } catch { return decision("BLOCKED", "unparseable URL", { host: UNKNOWN }); }
  const scheme = u.protocol.replace(":", "").toLowerCase();
  const host = (u.hostname || "").toLowerCase();
  // Credentials in the URL, non-https scheme, or local hosts are blocked (fail closed).
  if (u.username || u.password) return decision("BLOCKED", "URL carries credentials", { host });
  if (scheme !== "https") return decision("BLOCKED", `unsupported scheme: ${scheme || UNKNOWN}`, { host });
  if (LOCAL_HOSTS.has(host) || host.endsWith(".local")) return decision("BLOCKED", "local/loopback host", { host });
  if (SUPPORTED_HOSTS.has(host)) {
    // A supported host still needs an owner/repo path to be a real repo target.
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return decision("SUPPORTED_PUBLIC_GIT", "supported public git host + owner/repo", { host, owner: parts[0], repo: parts[1].replace(/\.git$/, "") });
    return decision("UNSUPPORTED", "supported host but not an owner/repo path", { host });
  }
  return decision("UNSUPPORTED", "host not in the supported public set", { host });
}

function decision(klass, reason, extra) {
  return Object.freeze({
    classification: klass,           // SUPPORTED_PUBLIC_GIT | UNSUPPORTED | BLOCKED
    accepted: klass === "SUPPORTED_PUBLIC_GIT",
    reason,
    fetch_performed: false,          // this module NEVER fetches
    ...extra,
  });
}

// Owner-experience view-model: what the founder sees after dropping a URL (display only).
export function buildIntakeView(raw) {
  const d = classifyUrl(raw);
  const nextStep = d.accepted
    ? "Ready for a read-only Safety Check (no provider activation)."
    : d.classification === "UNSUPPORTED"
      ? "Not a supported public git repo URL. Nothing was fetched."
      : "Blocked before anything was fetched — unsafe or unclear input.";
  return Object.freeze({
    title: "URL drop — intake",
    input: raw == null ? UNKNOWN : String(raw),
    classification: d.classification,
    accepted: d.accepted,
    host: d.host ?? UNKNOWN,
    owner: d.owner ?? UNKNOWN,
    repo: d.repo ?? UNKNOWN,
    reason: d.reason,
    fetch_performed: false,
    next_step: nextStep,
  });
}

export function renderIntakeText(v) {
  return [
    `${escapeText(v.title)}`,
    `input: ${escapeText(v.input)}`,
    `classification: ${escapeText(v.classification)} (accepted=${v.accepted ? "yes" : "no"})`,
    `host=${escapeText(v.host)} owner=${escapeText(v.owner)} repo=${escapeText(v.repo)}`,
    `reason: ${escapeText(v.reason)}`,
    `next: ${escapeText(v.next_step)}`,
  ].join("\n");
}
