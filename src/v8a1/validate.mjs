// FounderGate V8-A1 — .foundergate schema validator (dependency-free, offline).
//
// PURE NODE. No external deps, no network. A small interpreter of the JSON-Schema
// subset the V8-A1 .foundergate schemas use: type/const/enum/required/properties/
// additionalProperties:false/items/minItems/minLength/pattern/format(date-time).
//
// Law 53 (schema-first): before any dashboard UI work, all .foundergate schemas
// must exist and pass validation; a fixture project must pass. No schema, no UI.
// This module is the validator half of that law.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_DIR = join(HERE, "schemas");

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (Number.isInteger(v)) return "integer";
  return typeof v; // string | number | boolean | object
}

function typeMatches(value, type) {
  const t = typeOf(value);
  if (type === "number") return t === "number" || t === "integer";
  if (type === "integer") return t === "integer";
  return t === type;
}

function check(value, s, path, errors) {
  if (s === true || s === undefined) return;
  if (s === false) {
    errors.push(`${path}: schema false (nothing valid here)`);
    return;
  }
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected ${types.join("|")}, got ${typeOf(value)}`);
      return;
    }
  }
  if (Object.prototype.hasOwnProperty.call(s, "const")) {
    if (JSON.stringify(value) !== JSON.stringify(s.const)) {
      errors.push(`${path}: must equal const ${JSON.stringify(s.const)}`);
    }
  }
  if (Array.isArray(s.enum)) {
    if (!s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
      errors.push(`${path}: ${JSON.stringify(value)} not in enum [${s.enum.join(", ")}]`);
    }
  }
  const t = typeOf(value);
  if (t === "string") {
    if (typeof s.minLength === "number" && value.length < s.minLength) {
      errors.push(`${path}: shorter than minLength ${s.minLength}`);
    }
    if (typeof s.pattern === "string" && !new RegExp(s.pattern).test(value)) {
      errors.push(`${path}: does not match /${s.pattern}/`);
    }
    if (s.format === "date-time" && !ISO_RE.test(value)) {
      errors.push(`${path}: not an ISO-8601 date-time`);
    }
  }
  if (t === "array") {
    if (typeof s.minItems === "number" && value.length < s.minItems) {
      errors.push(`${path}: fewer than minItems ${s.minItems}`);
    }
    if (s.items) value.forEach((it, i) => check(it, s.items, `${path}[${i}]`, errors));
  }
  if (t === "object") {
    if (Array.isArray(s.required)) {
      for (const req of s.required) {
        if (!Object.prototype.hasOwnProperty.call(value, req)) {
          errors.push(`${path}: missing required '${req}'`);
        }
      }
    }
    const props = s.properties || {};
    if (s.additionalProperties === false) {
      for (const k of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) {
          errors.push(`${path}: additional property '${k}' not allowed`);
        }
      }
    }
    for (const [k, sub] of Object.entries(props)) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        check(value[k], sub, `${path}.${k}`, errors);
      }
    }
  }
}

export function loadSchema(name) {
  const file = name.endsWith(".json") ? name : `${name}.schema.json`;
  return JSON.parse(readFileSync(join(SCHEMA_DIR, file), "utf8"));
}

// Validate a parsed object against a named schema. Returns { valid, errors }.
export function validate(value, schemaName) {
  const schema = typeof schemaName === "string" ? loadSchema(schemaName) : schemaName;
  const errors = [];
  check(value, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

// The V8-A1 minimum .foundergate subset → the schema each file validates against.
export const FILE_SCHEMA = Object.freeze({
  "project.json": "project",
  "status.json": "status",
  "locks.json": "locks",
  "run_state.json": "run_state",
  "data_classification.json": "data_classification",
  "cost_budget.json": "cost_budget",
  "release_label.json": "release_label",
});

// The folder definitions in the V8-A1 subset (each has a schema for its entries).
export const FOLDER_SCHEMA = Object.freeze({
  gates: "gate_entry",
  witnesses: "witness_entry",
  evidence: "evidence_entry",
});

// Every schema name that MUST exist for the schema-first gate (Law 53).
export const REQUIRED_SCHEMAS = Object.freeze([
  ...Object.values(FILE_SCHEMA),
  ...Object.values(FOLDER_SCHEMA),
]);

// List schema files present on disk (basename without .schema.json).
export function presentSchemas() {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".schema.json"))
    .map((f) => f.replace(/\.schema\.json$/, ""));
}
