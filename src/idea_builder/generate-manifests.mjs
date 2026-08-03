// FounderGate — evidence manifest generator (node). Runs each supported template's REAL selftest and binds
// the results into per-template manifests (fetched by the browser Idea Builder) and per-request manifests
// (evidence). DONE/PASS can ONLY appear here because a request bound to an artifact whose tests actually ran.
import { classifyRequest, TEMPLATES } from './template-registry.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..'); // repo root
const ASSET_DIR = join(REPO, 'demo/founder_operating_environment/assets/binding');
const RUN_MANIFEST_DIR = process.env.RR ? join(process.env.RR, 'request_manifests') : join(ASSET_DIR, 'request_manifests');
mkdirSync(ASSET_DIR, { recursive: true });
mkdirSync(RUN_MANIFEST_DIR, { recursive: true });

function runSelftest(testPathRel) {
  try {
    const out = execFileSync('node', [join(REPO, testPathRel)], { cwd: REPO, timeout: 30000, encoding: 'utf8', env: { PATH: process.env.PATH } });
    const m = out.match(/ALL GREEN:\s*(\d+)\/(\d+)/);
    if (m) return { ran: true, ok: true, result: `PASS ${m[1]}/${m[2]}`, passed: Number(m[1]), total: Number(m[2]) };
    return { ran: true, ok: false, result: 'RAN_NO_GREEN', raw: out.slice(0, 200) };
  } catch (e) {
    return { ran: true, ok: false, result: 'FAIL', raw: String(e.stdout || e.message).slice(0, 200) };
  }
}

// Build the per-template manifest (browser fetches assets/binding/<template_id>_manifest.json)
function templateManifest(template_id) {
  const tpl = TEMPLATES[template_id];
  const t = runSelftest(tpl.test_path);
  const steps = [
    { step: 'Idea recorded', status: 'DONE' },
    { step: 'Template selected', status: `DONE (${template_id})` },
    { step: 'Local app generated', status: `DONE (${tpl.label})` },
    { step: 'Tests generated + run', status: t.ok ? t.result : `HOLD (${t.result})` },
    { step: 'Local preview', status: `AVAILABLE (bound to ${tpl.preview_url})` },
    { step: 'Evidence manifest', status: 'DONE' },
    { step: 'Decision', status: 'INTERNAL_DEMO_ONLY (never SHIP)' },
  ];
  return {
    manifest_kind: 'TEMPLATE_BUILD_MANIFEST',
    selected_template: template_id,
    label: tpl.label,
    generated_app_path: tpl.generated_app_path,
    preview_url: tpl.preview_url,
    test_plan_id: tpl.test_plan_id,
    test_path: tpl.test_path,
    tests_run: t.ran,
    test_result: t.ok ? t.result : `HOLD (${t.result})`,
    final_status: t.ok ? 'REQUEST_ARTIFACT_BINDING_OK' : 'HOLD_TESTS_NOT_GREEN',
    steps,
    builder_identity: 'FounderGate local template builder',
    limitations: 'Local synthetic only; no network/accounts/deploy/customer data. Not production/SaaS/secure/customer-ready.',
  };
}

// Build a per-request evidence manifest (contract fields)
function requestManifest(request_text) {
  const c = classifyRequest(request_text);
  if (c.kind === 'SUPPORTED') {
    const tm = templateManifest(c.template_id);
    return {
      request_id: c.request_id, request_text: c.request_text, request_hash: c.request_hash,
      supported_template_id: c.template_id, unsupported_reason: null,
      generated_artifact_id: c.template_id + '@' + c.request_hash,
      generated_app_path: tm.generated_app_path, preview_url: tm.preview_url,
      test_plan_id: tm.test_plan_id, test_results_path: tm.test_path,
      tests_run: tm.tests_run, test_result: tm.test_result,
      evidence_manifest_path: `demo/founder_operating_environment/assets/binding/${c.template_id}_manifest.json`,
      builder_identity: 'FounderGate local template builder',
      checker_verdict: 'PENDING_INDEPENDENT_CHECKER', terminal_advisor_verdict: 'PENDING_INDEPENDENT_TERMINAL_ADVISOR',
      final_status: tm.final_status,
    };
  }
  // unsupported / held — NO DONE/PASS, NO preview, NO artifact
  return {
    request_id: c.request_id, request_text: c.request_text, request_hash: c.request_hash,
    supported_template_id: null, unsupported_reason: c.reason,
    generated_artifact_id: null, generated_app_path: null, preview_url: null,
    test_plan_id: null, test_results_path: null, tests_run: false, test_result: null,
    evidence_manifest_path: null,
    builder_identity: 'FounderGate local template builder',
    checker_verdict: 'PENDING_INDEPENDENT_CHECKER', terminal_advisor_verdict: 'PENDING_INDEPENDENT_TERMINAL_ADVISOR',
    final_status: c.kind, // UNSUPPORTED_LOCAL_TEMPLATE or HELD_REQUIRES_FOUNDER_GATE
  };
}

// --- emit per-template manifests (for the browser) ---
for (const id of Object.keys(TEMPLATES)) {
  const tm = templateManifest(id);
  writeFileSync(join(ASSET_DIR, `${id}_manifest.json`), JSON.stringify(tm, null, 2));
  console.log(`template manifest: ${id} → ${tm.test_result} → final ${tm.final_status}`);
}

// --- emit per-request manifests (evidence): calculator / task_planner / unsupported ---
const REQUESTS = {
  calculator_request_manifest: 'Build a simple calculator app.',
  task_planner_request_manifest: 'Build a simple appointment/task planner.',
  unsupported_request_manifest: 'Build a CRM for my sales team with real customer data.',
};
const summary = {};
for (const [name, text] of Object.entries(REQUESTS)) {
  const rm = requestManifest(text);
  writeFileSync(join(RUN_MANIFEST_DIR, `${name}.json`), JSON.stringify(rm, null, 2));
  summary[name] = { request: text, template: rm.supported_template_id, preview: rm.preview_url, test_result: rm.test_result, final_status: rm.final_status };
  console.log(`request manifest: ${name} → template=${rm.supported_template_id} preview=${rm.preview_url} status=${rm.final_status}`);
}
writeFileSync(join(RUN_MANIFEST_DIR, 'GENERATION_SUMMARY.json'), JSON.stringify(summary, null, 2));
console.log('\nMANIFESTS_GENERATED_OK');
