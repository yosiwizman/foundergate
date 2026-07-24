// FounderGate LRCQ — founder key ENROLLMENT ceremony (FG-LRCQ-ACT-028). Interactive TTY only.
// Generates an encrypted Ed25519 PKCS#8 private key at ~/.foundergate/keys/founder-ed25519.p8 (mode 600,
// atomic create, never overwrites, never a symlink), derives the SPKI DER public key + sha256 fingerprint,
// and writes only a PUBLIC enrollment candidate + safe receipt OUTSIDE the repo. The passphrase is read
// twice via hidden TTY input and NEVER accepted from argv/env/pipe/file, NEVER logged, NEVER persisted.
// The private key never leaves the encrypted file. This wave does NOT run it with a real key.
import { generateKeyPairSync, createHash } from "node:crypto";
import { writeFileSync, existsSync, lstatSync, mkdirSync, rmSync, openSync, closeSync, writeSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const KEY_PATH = join(homedir(), ".foundergate/keys/founder-ed25519.p8");
const fp = (spkiDer) => "sha256:" + createHash("sha256").update(spkiDer).digest("hex");

// ---- pure, testable core: generate encrypted keypair material (disposable keys in tests) ----
// Returns { encryptedPkcs8Pem, spkiDerB64, fingerprint }. The passphrase is used only here and discarded.
export function generateEnrollment(passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 8) throw new Error("enroll: passphrase must be >= 8 chars");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const encryptedPkcs8Pem = privateKey.export({ format: "pem", type: "pkcs8", cipher: "aes-256-cbc", passphrase });
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  return { encryptedPkcs8Pem, spkiDerB64: spkiDer.toString("base64"), fingerprint: fp(spkiDer) };
}

// Atomic, fail-closed private-key write (never overwrite, never symlink, mode 600).
export function writeEncryptedKey(path, encryptedPkcs8Pem) {
  if (existsSync(path)) throw new Error("enroll: key target already exists (refusing to overwrite): " + path);
  try { if (lstatSync(path).isSymbolicLink()) throw new Error("enroll: key target is a symlink"); } catch { /* not present: fine */ }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const fd = openSync(path, "wx", 0o600); // wx: fail if exists; 600 perms
  try { writeSync(fd, encryptedPkcs8Pem); } finally { closeSync(fd); }
  return path;
}

// hidden TTY passphrase (no echo). Refuses non-TTY.
function readHiddenTTY(prompt) {
  if (!process.stdin.isTTY) throw new Error("enroll: interactive TTY required (refusing piped/unattended input)");
  process.stdout.write(prompt);
  const fd = 0; const buf = Buffer.alloc(1); let s = "";
  try { process.stdin.setRawMode && process.stdin.setRawMode(true); } catch { /* */ }
  while (true) { let bytes = 0; try { bytes = readSync(fd, buf, 0, 1); } catch { break; } if (bytes === 0) break; const c = buf[0]; if (c === 13 || c === 10) break; if (c === 3) { throw new Error("cancelled"); } if (c === 127) { s = s.slice(0, -1); continue; } s += String.fromCharCode(c); }
  try { process.stdin.setRawMode && process.stdin.setRawMode(false); } catch { /* */ }
  process.stdout.write("\n");
  return s;
}

if (fileURLToPath(import.meta.url) === (process.argv[1] || "")) {
  // Production CLI: interactive-only, fixed external path, no argv/env passphrase, no repo authority edit.
  for (const a of process.argv.slice(2)) if (/^--(passphrase|private-key|key-path|authority)/.test(a)) { console.error("enroll: forbidden flag " + a); process.exit(2); }
  if (!process.stdin.isTTY) { console.error("enroll: interactive TTY required"); process.exit(2); }
  let created = null;
  try {
    const p1 = readHiddenTTY("Founder passphrase: ");
    const p2 = readHiddenTTY("Confirm passphrase: ");
    if (p1 !== p2) { console.error("enroll: passphrases do not match"); process.exit(3); }
    const enr = generateEnrollment(p1);
    created = writeEncryptedKey(KEY_PATH, enr.encryptedPkcs8Pem);
    const outDir = join(homedir(), ".foundergate/enrollment"); mkdirSync(outDir, { recursive: true, mode: 0o700 });
    // PUBLIC candidate + safe receipt OUTSIDE the repo. Never the governed authority file itself.
    writeFileSync(join(outDir, "founder-public-enrollment-candidate.json"), JSON.stringify({ algorithm: "ed25519", public_key_spki_b64: enr.spkiDerB64, fingerprint: enr.fingerprint, current: true }, null, 2) + "\n", { mode: 0o600 });
    console.log("ENROLLED (public values only): fingerprint", enr.fingerprint);
    console.log("Encrypted private key:", KEY_PATH, "(mode 600). The later enrollment wave imports ONLY the public candidate into the governed authority.");
    process.exit(0);
  } catch (e) { try { if (created && existsSync(created)) rmSync(created, { force: true }); } catch { /* */ } console.error("enroll: " + (e.message || e)); process.exit(1); }
}
