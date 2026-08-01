#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildEvidenceNote, renderEvidenceNoteText } from './evidence-note.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(__dirname, 'sample-input.json');

const raw = readFileSync(inputPath, 'utf8');
const input = JSON.parse(raw);

const note = buildEvidenceNote(input);
console.log(renderEvidenceNoteText(note));

process.exit(0);
