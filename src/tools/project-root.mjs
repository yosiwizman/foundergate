// FounderGate — SAFE default project root for locally-run servers (anti-repeat).
//
// The committed mock fixture was twice written to by a live server that had been
// started WITHOUT an explicit FG_PROJECT_ROOT (Run-1 launcher; a build-time ad-hoc
// server run). The fixture-pristine guard CAUGHT both — this makes them IMPOSSIBLE:
// any server started without an explicit FG_PROJECT_ROOT serves a THROWAWAY temp
// COPY of the fixture, so it can never write into the repo's committed demo data.
// An explicit FG_PROJECT_ROOT (used by tests and the stranger-test launcher) still
// overrides this.

import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// The repo's committed fixture — servers must NEVER serve this by default.
export const COMMITTED_FIXTURE = resolve(HERE, "..", "v8a1", "fixture", "mock-project");

// Returns the project root a bare-started server should serve:
//   - FG_PROJECT_ROOT set  → that path (explicit override; tests / launcher).
//   - otherwise            → a fresh throwaway temp COPY of the committed fixture.
// The returned default NEVER resolves inside COMMITTED_FIXTURE.
export function defaultProjectRoot(announce = true) {
  if (process.env.FG_PROJECT_ROOT) return process.env.FG_PROJECT_ROOT;
  const tmp = mkdtempSync(join(tmpdir(), "fg-demo-"));
  cpSync(COMMITTED_FIXTURE, tmp, { recursive: true });
  if (announce) {
    console.log(`Serving a throwaway copy of the demo data (${tmp}). The committed fixture is never written to. Set FG_PROJECT_ROOT to override.`);
  }
  return tmp;
}
