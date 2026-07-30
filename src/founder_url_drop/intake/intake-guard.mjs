// Level-3B Lane B — intake guard (pure, deterministic, fail-closed). Wraps URL intake with an explicit policy.
import { buildIntakeView } from "./url-intake.mjs";
export function guardIntake(url){
  const intake = buildIntakeView(url);
  const allowed = intake.accepted === true;
  return Object.freeze({
    intake, allowed,
    policy: allowed ? "PROCEED_TO_READONLY_SAFETY_CHECK" : "REFUSE_FAIL_CLOSED",
    reason: allowed ? "supported public git repo; read-only safety check may proceed" : `refused at intake: ${intake.reason}`,
    fetch_performed: false, requires_safety_check: allowed,
  });
}
export function renderGuardText(g){ return `intake-guard: ${g.policy} (${g.reason})`; }
