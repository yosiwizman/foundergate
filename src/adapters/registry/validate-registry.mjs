#!/usr/bin/env node
// FounderGate — Worker Adapter Registry validator (zero-dependency, offline).
//
// Research/data only: validating the registry installs nothing, launches nothing,
// fetches nothing over the network, holds no credentials, and activates no runtime.
//
// The interpreter below is a LOCAL COPY of the H7 (harness/adapters/interface)
// zero-dep JSON-Schema subset checker, extended with just enough $ref resolution
// to (1) validate the registry envelope against registry.schema.json and
// (2) validate each embedded adapter descriptor against the locally-copied
// worker-adapter.embedded.schema.json. It deliberately does NOT import from
// ../interface — the H35 lease must stand alone (copy locally; do not depend).
//
// Supported schema keywords: type/enum/const/required/properties/
// additionalProperties/items/minItems/uniqueItems/pattern/minLength/maxLength/
// minimum/allOf/if-then-else/$ref (local '#/...' pointer + sibling '<file>.json').
//
// Usage:
//   node validate-registry.mjs [registry.json]  -> validate the registry (default: worker-adapters.json)
//   import { validateRegistryFile } from './validate-registry.mjs'
//     -> programmatic { valid, errors }

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_SCHEMA_PATH = join(HERE, 'registry.schema.json');
const DEFAULT_REGISTRY_PATH = join(HERE, 'worker-adapters.json');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
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

// Resolve a local JSON pointer like '#/$defs/registry_entry' against a root doc.
function resolvePointer(root, pointer) {
  const parts = pointer.replace(/^#\//, '').split('/').filter(Boolean);
  let node = root;
  for (const raw of parts) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || !Object.prototype.hasOwnProperty.call(node, key)) return undefined;
    node = node[key];
  }
  return node;
}

// ctx = { rootSchema, dir } — carries the current root doc (for '#/...' refs)
// and the directory to resolve sibling '<file>.json' refs against.
function check(value, s, path, errors, ctx) {
  if (s === true || s === undefined) return;
  if (s === false) {
    errors.push(`${path}: schema is false (nothing is valid here)`);
    return;
  }

  // $ref (local pointer or sibling json file)
  if (typeof s.$ref === 'string') {
    const ref = s.$ref;
    if (ref.startsWith('#')) {
      const target = resolvePointer(ctx.rootSchema, ref);
      if (target === undefined) {
        errors.push(`${path}: unresolved local $ref '${ref}'`);
        return;
      }
      check(value, target, path, errors, ctx);
      return;
    }
    if (ref.endsWith('.json')) {
      let sub;
      try {
        sub = loadJson(join(ctx.dir, ref));
      } catch (e) {
        errors.push(`${path}: cannot load $ref file '${ref}' — ${e.message}`);
        return;
      }
      // Switch root context to the referenced schema for its own '#/...' refs.
      check(value, sub, path, errors, { rootSchema: sub, dir: ctx.dir });
      return;
    }
    errors.push(`${path}: unsupported $ref form '${ref}'`);
    return;
  }

  // type
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(value)}`);
      return;
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
    if (s.items) value.forEach((item, i) => check(item, s.items, `${path}[${i}]`, errors, ctx));
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
        check(value[key], subschema, `${path}.${key}`, errors, ctx);
  }

  // allOf
  if (Array.isArray(s.allOf))
    for (const sub of s.allOf) check(value, sub, path, errors, ctx);

  // if / then / else
  if (s.if !== undefined) {
    const probe = [];
    check(value, s.if, path, probe, ctx);
    if (probe.length === 0) {
      if (s.then !== undefined) check(value, s.then, path, errors, ctx);
    } else if (s.else !== undefined) {
      check(value, s.else, path, errors, ctx);
    }
  }
}

export function validateRegistry(registry, schema = loadJson(REGISTRY_SCHEMA_PATH), dir = HERE) {
  const errors = [];
  check(registry, schema, '$', errors, { rootSchema: schema, dir });
  return { valid: errors.length === 0, errors };
}

export function validateRegistryFile(path = DEFAULT_REGISTRY_PATH, schema = loadJson(REGISTRY_SCHEMA_PATH)) {
  let parsed;
  try {
    parsed = loadJson(path);
  } catch (e) {
    return { valid: false, errors: [`$: not parseable JSON — ${e.message}`] };
  }
  return validateRegistry(parsed, schema, dirname(path));
}

// CLI
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const target = process.argv[2] || DEFAULT_REGISTRY_PATH;
  const { valid, errors } = validateRegistryFile(target);
  if (valid) {
    console.log(`VALID   ${target}`);
    process.exit(0);
  }
  console.log(`INVALID ${target}`);
  for (const e of errors) console.log(`        - ${e}`);
  process.exit(1);
}
