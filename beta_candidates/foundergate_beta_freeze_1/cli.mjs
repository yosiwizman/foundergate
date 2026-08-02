#!/usr/bin/env node
// Demo Tasks CLI. Local-only; reads a JSON data file and prints a summary.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fromData, toJSON, summarize, decision } from './src/task-ledger.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const path = process.argv[2] || join(here, 'sample-data.json');
try {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const ledger = fromData(data); const s = summarize(ledger);
  console.log('Demo Tasks — ledger summary');
  console.log(`  tasks: ${s.total}  done: ${s.counts.done}  doing: ${s.counts.doing}  blocked: ${s.counts.blocked}  todo: ${s.counts.todo}`);
  console.log(`  done: ${s.donePercent}%`);
  console.log(`  decision: ${decision(ledger)}  (note: never "SHIP" — this is a local demo)`);
  console.log(''); console.log(toJSON(ledger));
} catch (e) { console.error('error:', e.message); process.exit(1); }
