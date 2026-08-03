// FounderGate Local App Factory — Round 2 (repeatability). Fresh seed, apps DIFFERENT from Round 1, output
// under tests/generated_apps/factory_round2/<request_id>/. Records selection before build.
import { selectArchetypes, generateAndTest } from './app-factory.mjs';
import { ARCHETYPE_IDS } from './archetypes.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = process.env.FACTORY_SEED || '20260803T0915ET';
const RR = process.env.RR || join(REPO, 'docs/generated/local_app_factory_repeatability_round2');
const ROUND1 = ['score_keeper', 'budget_tracker', 'inventory_list', 'notes_board'];

// pool excludes Round 1 four + calculator + task_planner
const pool = ARCHETYPE_IDS.filter((id) => !ROUND1.includes(id) && id !== 'calculator' && id !== 'task_planner');
const selected = selectArchetypes(SEED, pool, 4);
if (selected.some((id) => ROUND1.includes(id))) { console.error('SELECTION_ERROR: Round 1 app selected'); process.exit(1); }

mkdirSync(RR, { recursive: true });
writeFileSync(join(RR, 'RUNTIME_APP_SELECTION.md'), `# Round 2 Runtime App Selection (recorded BEFORE build)
- Seed: \`${SEED}\`
- Method: deterministic LCG shuffle of the Round-2 pool (Round 1 apps + calculator + task_planner excluded), first 4.
- Round-2 pool: ${pool.join(', ')}
- Excluded (Round 1): ${ROUND1.join(', ')}; plus calculator, task_planner.
- **Selected (4, all different from Round 1):** ${selected.join(', ')}
`);
writeFileSync(join(RR, 'selection.json'), JSON.stringify({ seed: SEED, pool, round1: ROUND1, selected }, null, 2));
console.log('ROUND2 SELECTED (before build): ' + selected.join(', '));

const manifests = [];
for (const id of selected) {
  const m = generateAndTest(id, { runsDir: 'factory_round2' });
  manifests.push(m);
  console.log(`built ${id} -> ${m.generated_app_path} :: ${m.test_results.result} :: ${m.final_status}`);
}

const ASSET = join(REPO, 'demo/founder_operating_environment/assets/factory');
mkdirSync(ASSET, { recursive: true });
const index = {
  kind: 'FACTORY_INDEX_ROUND2', round: 2, seed: SEED,
  apps: manifests.map((m) => ({
    request_id: m.request_id, request_hash: m.request_hash, request_text: m.request_text,
    template_id: m.selected_template_id, title: m.app_spec.title,
    generated_app_path: m.generated_app_path, preview_url: m.preview_url,
    test_result: m.test_results.result, final_status: m.final_status,
  })),
  unsupported_example: { request_text: 'a workout app that emails customers and deploys live', expected: 'UNSUPPORTED/HELD — not built, no DONE/PASS, no preview' },
  disclaimer: 'Round 2 local synthetic apps only. No network/accounts/deploy/customer data. Never ship.',
};
writeFileSync(join(ASSET, 'factory_index_round2.json'), JSON.stringify(index, null, 2));

const allPass = manifests.every((m) => m.final_status === 'BUILT_AND_PASSED');
writeFileSync(join(RR, 'factory_run_summary.json'), JSON.stringify({ seed: SEED, selected, allPass, manifests }, null, 2));
console.log('\nROUND2_FACTORY ' + (allPass ? 'ALL_BUILT_AND_PASSED' : 'SOME_HOLD') + ' :: ' + manifests.length + ' apps');
