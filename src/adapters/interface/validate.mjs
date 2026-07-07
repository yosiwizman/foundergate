#!/usr/bin/env node
// FounderGate — Worker Adapter Descriptor validator (zero-dependency).
//
// The authoritative contract is worker-adapter.schema.json in this folder.
// This file is a small, dependency-free interpreter of the JSON-Schema subset
// that schema uses (type/enum/const/required/properties/additionalProperties/
// items/minItems/uniqueItems/pattern/minLength/maxLength/minimum/allOf/if-then).
// It exists so the harness can validate adapter descriptors in CI with no npm
// install and no network — consistent with the harness's static, offline safety
// posture. A descriptor is a SPEC; validating it never installs, launches,
// activates, or authorizes any worker.
//
// Usage:
//   node validate.mjs <descriptor.json> [more.json ...]  -> validate given files
//   node validate.mjs                                     -> validate all examples/*.json (expect valid)
//   import { validateDescriptor } from './validate.mjs'   -> programmatic { valid, errors }

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, 'worker-adapter.schema.json');

function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v; // 'string' | 'number' | 'boolean' | 'object'
}

function typeMatches(value, type) {
  const t = typeOf(value);
  if (type === 'number') return t === 'number' || t === 'integer';
  if (type === 'integer') return t === 'integer';
  return t === type;
}

// Validate `value` against subschema `s`, pushing dotted-path errors into `errors`.
function check(value, s, path, errors) {
  if (s === true || s === undefined) return;
  if (s === false) {
    errors.push(`${path}: schema is false (nothing is valid here)`);
    return;
  }

  // type (string or array of strings)
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(value)}`);
      return; // downstream keyword checks assume the type held
    }
  }

  // const
  if (Object.prototype.hasOwnProperty.call(s, 'const')) {
    if (JSON.stringify(value) !== JSON.stringify(s.const)) {
      errors.push(`${path}: must equal const ${JSON.stringify(s.const)}`);
    }
  }

  // enum
  if (Array.isArray(s.enum)) {
    const ok = s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value));
    if (!ok) errors.push(`${path}: ${JSON.stringify(value)} not in enum [${s.enum.join(', ')}]`);
  }

  const t = typeOf(value);

  // string constraints
  if (t === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength)
      errors.push(`${path}: string shorter than minLength ${s.minLength}`);
    if (typeof s.maxLength === 'number' && value.length > s.maxLength)
      errors.push(`${path}: string longer than maxLength ${s.maxLength}`);
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(value))
      errors.push(`${path}: string does not match pattern /${s.pattern}/`);
  }

  // number constraints
  if (t === 'number' || t === 'integer') {
    if (typeof s.minimum === 'number' && value < s.minimum)
      errors.push(`${path}: ${value} < minimum ${s.minimum}`);
  }

  // array constraints
  if (t === 'array') {
    if (typeof s.minItems === 'number' && value.length < s.minItems)
      errors.push(`${path}: array shorter than minItems ${s.minItems}`);
    if (s.uniqueItems === true) {
      const seen = new Set();
      for (const item of value) {
        const k = JSON.stringify(item);
        if (seen.has(k)) { errors.push(`${path}: array items must be unique`); break; }
        seen.add(k);
      }
    }
    if (s.items) value.forEach((item, i) => check(item, s.items, `${path}[${i}]`, errors));
  }

  // object constraints
  if (t === 'object') {
    if (Array.isArray(s.required)) {
      for (const req of s.required)
        if (!Object.prototype.hasOwnProperty.call(value, req))
          errors.push(`${path}: missing required property '${req}'`);
    }
    const props = s.properties || {};
    if (s.additionalProperties === false) {
      for (const key of Object.keys(value))
        if (!Object.prototype.hasOwnProperty.call(props, key))
          errors.push(`${path}: additional property '${key}' is not allowed`);
    }
    for (const [key, subschema] of Object.entries(props))
      if (Object.prototype.hasOwnProperty.call(value, key))
        check(value[key], subschema, `${path}.${key}`, errors);
  }

  // allOf
  if (Array.isArray(s.allOf))
    for (const sub of s.allOf) check(value, sub, path, errors);

  // if / then / else
  if (s.if !== undefined) {
    const probe = [];
    check(value, s.if, path, probe);
    if (probe.length === 0) {
      if (s.then !== undefined) check(value, s.then, path, errors);
    } else if (s.else !== undefined) {
      check(value, s.else, path, errors);
    }
  }
}

export function validateDescriptor(descriptor, schema = loadSchema()) {
  const errors = [];
  check(descriptor, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}

export function validateFile(path, schema = loadSchema()) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { valid: false, errors: [`$: not parseable JSON — ${e.message}`] };
  }
  return validateDescriptor(parsed, schema);
}

// CLI
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const schema = loadSchema();
  let files = process.argv.slice(2);
  if (files.length === 0) {
    const exDir = join(HERE, 'examples');
    files = readdirSync(exDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => join(exDir, f));
  }
  let bad = 0;
  for (const f of files) {
    const { valid, errors } = validateFile(f, schema);
    if (valid) {
      console.log(`VALID   ${f}`);
    } else {
      bad += 1;
      console.log(`INVALID ${f}`);
      for (const e of errors) console.log(`        - ${e}`);
    }
  }
  process.exit(bad === 0 ? 0 : 1);
}
