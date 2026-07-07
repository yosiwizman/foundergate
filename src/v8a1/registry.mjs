// FounderGate V8-A1 — attached-project registry (attach ONE repo, read-only).
//
// V8-A1 attaches exactly one project and reads it read-only. A second, different
// repo is REJECTED (multi-project autonomous execution is out of scope until
// later stages). The registry never writes into an attached repo — it only
// records the path and confirms a `.foundergate/` folder is present to read.

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export class AttachError extends Error {
  constructor(message) {
    super(message);
    this.name = "AttachError";
  }
}

export class ProjectRegistry {
  constructor() {
    this._attached = null;
  }

  // Attach one project root (a directory containing `.foundergate/`). Read-only.
  attach(projectRoot) {
    if (typeof projectRoot !== "string" || !projectRoot.length) {
      throw new AttachError("projectRoot must be a non-empty path");
    }
    const fg = join(projectRoot, ".foundergate");
    if (!existsSync(fg) || !statSync(fg).isDirectory()) {
      throw new AttachError(`no .foundergate/ folder found under ${projectRoot} — cannot attach`);
    }
    if (this._attached && this._attached !== projectRoot) {
      throw new AttachError(
        `V8-A1 attaches exactly ONE repo (already attached: ${this._attached}). Multi-project is out of scope; detach first.`
      );
    }
    this._attached = projectRoot;
    return this._attached;
  }

  current() {
    return this._attached;
  }

  detach() {
    this._attached = null;
  }
}
