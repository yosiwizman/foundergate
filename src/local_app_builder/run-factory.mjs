// FounderGate Local App Factory — CLI orchestrator. Records the deterministic selection BEFORE building,
// generates + tests the 4 selected apps, and writes the UI factory index. No network / accounts / deploy.
import { selectArchetypes, generateAndTest } from './app-factory.mjs';
import { ARCHETYPE_IDS } from './archetypes.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = process.env.FACTORY_SEED || '20260803T0835ET';
const RR = process.env.RR || join(REPO, 'docs/generated/local_app_factory_self_proof_gauntlet');

// calculator + task planner are NOT factory archetypes (excluded by construction); enforce the rule anyway.
const pool = ARCHETYPE_IDS.filter((id) => id !== 'calculator' && id !== 'task_planner');
const selected = selectArchetypes(SEED, pool, 4);

// Record selection BEFORE building (Lane B).
const selDoc = `# Runtime App Selection (recorded BEFORE build)
- Seed (timestamp-derived): \`${SEED}\`
- Selection method: deterministic LCG shuffle of the safe local archetype pool, first 4.
- Pool: ${pool.join(', ')}
- Excluded by rule: calculator, task_planner (appointment/task planner)
- **Selected (4):** ${selected.join(', ')}

This selection is mechanically reproducible: same seed + same pool → same 4 apps.
`;
mkdirSync(RR, { recursive: true });
writeFileSync(join(RR, 'RUNTIME_APP_SELECTION.md'), selDoc);
writeFileSync(join(RR, 'selection.json'), JSON.stringify({ seed: SEED, pool, selected }, null, 2));
console.log('SELECTED (before build): ' + selected.join(', '));

// Build + test each selected app.
const manifests = [];
for (const id of selected) {
  const m = generateAndTest(id);
  manifests.push(m);
  console.log(`built ${id} -> ${m.generated_app_path} :: ${m.test_results.result} :: ${m.final_status}`);
}

// Write UI factory index (browser fetches this).
const ASSET = join(REPO, 'demo/founder_operating_environment/assets/factory');
mkdirSync(ASSET, { recursive: true });
const index = {
  kind: 'FACTORY_INDEX',
  seed: SEED,
  apps: manifests.map((m) => ({
    request_id: m.request_id, request_hash: m.request_hash, request_text: m.request_text,
    template_id: m.selected_template_id, title: m.app_spec.title,
    generated_app_path: m.generated_app_path, preview_url: m.preview_url,
    test_result: m.test_results.result, final_status: m.final_status,
  })),
  unsupported_example: { request_text: 'build an app that emails customers from Google Calendar', expected: 'UNSUPPORTED/HELD — not built, no DONE/PASS, no preview' },
  disclaimer: 'Local synthetic apps only. No network/accounts/deploy/customer data. Never ship.',
};
writeFileSync(join(ASSET, 'factory_index.json'), JSON.stringify(index, null, 2));

const allPass = manifests.every((m) => m.final_status === 'BUILT_AND_PASSED');
writeFileSync(join(RR, 'factory_run_summary.json'), JSON.stringify({ seed: SEED, selected, allPass, manifests }, null, 2));
console.log('\nFACTORY_RUN ' + (allPass ? 'ALL_BUILT_AND_PASSED' : 'SOME_HOLD') + ' :: ' + manifests.length + ' apps');
