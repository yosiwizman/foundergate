# FounderGate PR #198 — FRESH INDEPENDENT PACKAGE CHECKER PACKET (FG-PPRC-198)

You are a **fresh, independent, read-only package Checker**. You did not build this package. You have no
repository or GitHub mutation authority. Nothing in this repository is acceptance — the Builder cannot
accept its own package, and this packet is Builder-authored. Treat every claim below as a **claim** and
reproduce it mechanically.

The previous independent package Checker returned **FINDINGS** (report sha256
`1a38edbcb02178e5f2f09564418d84b535493e350afaf268d7c61ff016b66a9b`) with exactly three findings. That
report is preserved verbatim at
`.foundergate/evidence/lrcq-provider-package-refreeze/PPRCHK_198_PACKAGE_CHECKER_REPORT_HISTORICAL.json`.
It is **HISTORICAL FINDINGS EVIDENCE ONLY** — it is not acceptance of anything, and it certainly is not
acceptance of this corrected candidate.

---

## 0. Frozen state you must reconcile first

| item | value |
|---|---|
| repository | `yosiwizman/foundergate` |
| worktree | `/Users/yosiwizman/Projects/foundergate-wt-lrcq-provider-package-refreeze-ebd4ff5` |
| branch | `lane/lrcq-provider-package-refreeze-ebd4ff5` |
| **package-correction candidate** | `8e8c5569a75c1a23ebc90665ee6a77023b72ae10` |
| **package-correction candidate tree** | `0048ea190ccc4a3d725ef60427745b2e347f9d63` |
| final evidence HEAD / tree | resolve mechanically: `git rev-parse HEAD` and `git rev-parse HEAD^{tree}` |
| approved authority candidate | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` |
| approved authority tree | `012e0560fd21f7328088ec290f30f9eac84dc1ef` |
| PR #198 base | `39dea6364d3a32420034f0ba4895486d1b918fa1` |
| PR #196 head | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| provider target | `/Users/yosiwizman/.local/share/claude/versions/2.1.220` |
| provider sha256 | `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` |
| `active_keys` | `[]` |
| superseded package candidate | `58b36206669a27d1ce6171f0f3149721c24f35c7` (FINDINGS evidence only) |
| superseded evidence head | `46f1f0df541814dbc40a6d7a6c99997e5e539964` (FINDINGS evidence only) |
| superseded intermediate this wave | `757957e59dc53272d1a7f098c396da0046587adb` (see finding SELF-1) |

The evidence HEAD is deliberately **not** printed as a constant anywhere in the repository: a commit cannot
contain its own hash. Resolve it yourself.

---

## The twenty items you must independently reproduce

### 1. Exact package-correction candidate and tree

```
git rev-parse 8e8c5569a75c1a23ebc90665ee6a77023b72ae10^{tree}   # => 0048ea190ccc4a3d725ef60427745b2e347f9d63
git log --oneline 8e8c5569a75c1a23ebc90665ee6a77023b72ae10..HEAD          # exactly ONE evidence-only commit
git diff --stat 8e8c5569a75c1a23ebc90665ee6a77023b72ae10 HEAD -- src tools .foundergate/run-materials package.json package-lock.json
```

The last command must be **EMPTY**. The evidence tail may add evidence only.

### 2. Exact final evidence HEAD and tree

Resolve them mechanically and confirm local == upstream == GitHub:

```
git rev-parse HEAD; git rev-parse HEAD^{tree}; git rev-parse @{u}
gh api repos/yosiwizman/foundergate/git/ref/heads/lane/lrcq-provider-package-refreeze-ebd4ff5 --jq .object.sha
git status --porcelain     # must be empty
```

### 3. Authority candidate immutability

```
git rev-parse ebd4ff5672ba657b039521a8b377a094a2ea67ea^{tree}
git diff --name-only 46f1f0df541814dbc40a6d7a6c99997e5e539964 HEAD -- src/v8b/lrcq/assurance src/v8b/lrcq/provider tools/terminal0/lrcq/run-five-hour.mjs
```

The diff must be **EMPTY**. Recompute all ten authority digests and compare with
`AUTHORITY_CORE_DIGEST_COMPARISON.json`. Any byte change is a blocker.

### 4. Provider binding — reproduce independently

```
stat -f 'mode=%Sp links=%l dev=%d inode=%i size=%z mtime=%Sm' /Users/yosiwizman/.local/share/claude/versions/2.1.220
test -L /Users/yosiwizman/.local/share/claude/versions/2.1.220 && echo SYMLINK_BLOCKER || echo NOT_A_SYMLINK
shasum -a 256 ...; openssl dgst -sha256 -r ...; <target> --version   # metadata probe ONLY
```

Both hashes must equal the frozen digest and the version must be `2.1.220`. Re-stat afterwards.

### 5. PPRCHK-198-01 — the claim corrections

Confirm that **no committed artifact** asserts final-head binding as an achieved result:

```
grep -rn "binds_exact_final_head" .foundergate/evidence/lrcq-provider-package-refreeze/
```

Every `true` you find must be a **Stage-B requirement** (`required_results`,
`expected_result_by_stage.procedural_final_head_capsule`), never an achieved result about committed
material. Read `PACKAGE_CANDIDATE_SCOPE.json`: Stage A must explicitly disclaim final-head binding and
disclaim that PF-5 passes at a later evidence head. Confirm the eleven prior-tail executed-results
artifacts that carried the false claims were removed in the candidate and rewritten correctly here.

Confirm the historical result is stated precisely: candidate `58b3620` passed its **candidate-bound**
verification; evidence head `46f1f0d` did **not** pass PF-5 with that capsule; the prior package Checker
found this and blocked enrollment.

### 6. PPRCHK-198-01 — regenerate the Stage-B capsule YOURSELF, outside Git

Do **not** accept the Builder's receipt. Generate it from the final reviewed head:

```
FINAL_HEAD=$(git rev-parse HEAD); FINAL_TREE=$(git rev-parse HEAD^{tree})
node tools/terminal0/lrcq/final-head-capsule.mjs \
  --final-head "$FINAL_HEAD" --final-tree "$FINAL_TREE" \
  --evaluated-sha ebd4ff5672ba657b039521a8b377a094a2ea67ea \
  --out-root <an absolute directory OUTSIDE this repository> \
  --capsule-name CHECKER-FINAL-HEAD-CAPSULE --pr 198
```

### 7. Capsule verifier clean against the exact final HEAD/tree

From that receipt require `binds_exact_final_head: true`, `capsule_verifier.result: VALID`,
`checks_failed: 0`, `checks_skipped: 0`, and `overall: FINAL_HEAD_CAPSULE_VERIFIED`. Confirm
`SYSTEM_STATE.frozen_head` and `FINAL_UNSIGNED_ACTIVATION_TEMPLATE.evidence_commit_sha` both equal the
final HEAD you resolved in item 2.

### 8. Final preflight SIGNATURE-REQUIRED with empty binding_defects

```
node tools/terminal0/lrcq/run-five-hour.mjs --final-template-preflight <your capsule>/FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json
```

Require `SIGNATURE-REQUIRED`, `founder_gate: KEY_ENROLLMENT`, `binding_defects: []`,
`invocations.providerSpawn: 0`, `zero_invocation: true`.

Then confirm **PF-5 is not weakened**: run the same preflight against the superseded `58b3620`-bound
capsule (if still on the host, or regenerate an equivalent) and require `BINDING-DEFECT`.

### 9. PPRCHK-198-02 — stale packet markers and the complete recipe

```
python3 -c "import json;d=json.load(open('.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_GATE_PACKET.json'));print(d['__status'],'|',d['__superseded_by'],'|',d['schema_version'],'|',d['__unresolved_founder_placeholder_count'])"
```

Require `STALE-INTERMEDIATE-CANDIDATE`, `UNSIGNED_ACTIVATION_MATERIAL_PACKET.json`, `lrcq-activation-3`,
and a non-empty mechanically enumerated placeholder list. Then **regenerate it** and confirm all three
markers SURVIVE:

```
node tools/terminal0/lrcq/classify-and-packet.mjs --run-harness-candidate 39dea6364d3a32420034f0ba4895486d1b918fa1
git status --porcelain    # must be empty
```

Confirm `PACKAGE_VERIFICATION_INSTRUCTIONS.md` section 6 names and executes **all four** producing
generators, and that running the whole chain leaves the tree byte-identical.

Prove independently that the retired packet confers nothing: `verifyActivation` must refuse it `NOT_V4`,
and no package verifier may treat it as current activation material.

### 10. PPRCHK-198-03 — exact equality with the authoritative exports

```
node -e "
import('./src/v8b/lrcq/assurance/activation-v4.mjs').then(async (A) => {
  const G = await import('./tools/terminal0/lrcq/refreeze-package.mjs');
  console.log('problems:', G.assertAuthoritativeTables());                 // must be []
  console.log('exclusions equal:', G.EXCLUSIONS.join(',') === A.V4_SIGNED_EXCLUSIONS.join(','));
  console.log('limits equal:', G.LIMIT_FIELDS.join(',') === A.V4_SIGNED_LIMIT_FIELDS.join(','));
});"
```

Confirm the authoritative exports themselves are **unmodified** by this wave.

### 11. Deletion / addition mutation attacks — run them yourself

On a **disposable copy outside Git**, mutate `refreeze-package.mjs` and confirm generation REFUSES
(`AUTHORITATIVE_TABLE_MISMATCH`, exit 9) and that **no artifact byte is written**:

- remove each of the ten exclusions individually (especially `no_deploy` — the exact prior defect);
- add an unauthorized exclusion; duplicate an exclusion; reorder them;
- remove each of the six limit fields individually; add an unauthorized one; duplicate one;
- drop a `CEILINGS` key; widen every ceiling (expect `CEILING_MISMATCH`, exit 4).

Then mutate `classify-and-packet.mjs`: strip each marker from the emitted table, replace the
`__superseded_by` target, hollow out `__reason`, and omit `--run-harness-candidate`. All must refuse.
**Note the trap:** a guard that iterates the table it is checking cannot detect a deletion from that table.
Verify the marker guard checks a FIXED contract, not the emitted table's own keys — the Builder's first
draft of this very fix had that defect and disclosed it (see `PPRCHK_198_CORRECTION_LEDGER.json`,
PPRCHK-198-02 `self_caught_defect_in_the_first_draft_of_this_fix`).

### 12. All package hashes and manifests

```
python3 - <<'EOF'
import json,hashlib
d=json.load(open('.foundergate/evidence/lrcq-provider-package-refreeze/PACKAGE_SHA256_MANIFEST.json'))
bad=[r for r,e in d['files'].items() if 'sha256:'+hashlib.sha256(open(r,'rb').read()).hexdigest()!=e]
print(len(d['files']),'files |',len(bad),'mismatches')
EOF
```

Do the same for `EVIDENCE_SET_INDEX.json`. Both are non-recursive by construction; confirm what each
excludes and why. Confirm every producing generator is a package member.

### 13. Six ceilings and ten exclusions

All six at or below: `max_budget_usd 10`, `run_duration_s 18000`, `per_job_timeout_s 2700`,
`max_parallel_width 2`, `max_output_bytes 10485760`, `termination_grace_s 30`. All ten exclusions exactly
`true`. Confirm the emitted inventories are **derived from the authoritative exports**, and that their
stated counts are 6 and 10.

### 14. Invalid-package zero-spawn attacks

Re-run the negative-attack matrix yourself against disposable copies. Every invalid case must refuse
**before any productive provider spawn**, with a counted instrument. Compare with
`NEGATIVE_ATTACK_RESULTS.json` (Builder result: 74/74 refused, 0 provider spawns). Include: package-file
tampering, SHA-manifest entry tampering, preserved-report digest tampering, historical-verdict
substitution, signed-payload ceiling widening and exclusion falsification/removal, forged signature,
unknown key, and replay.

### 15. Positive deterministic counter control

Prove the instrument can observe a spawn: drive the real production boundary against a deterministic
recording stub and require the counter to go from **0 to exactly 1**. A zero count elsewhere is only a
measurement if this control passes. Run it with the hook preloaded
(`FG_SPAWN_LOG=... node --require <counter>.cjs <control>.mjs`) — without the preload the hook instrument
cannot increment and the control is inconclusive rather than failing.

### 16. Unsigned, unactivated state

`founder_signature`, `signer_key_fingerprint`, `authorization_text_digest`, `activation_nonce` and
`issued_epoch` must all be `null`; `unsigned: true`; no activation issued or consumed; no run started.

### 17. `active_keys` equals `[]`

```
python3 -c "import json;d=json.load(open('docs/governance/FOUNDER_KEY_AUTHORITY.json'));print(d['active_keys'],d['revoked_keys'])"
```

Confirm the real repository classifies its founder gate as `KEY_ENROLLMENT`.

### 18. Package / evidence commit split

Exactly one evidence-only commit after the package-correction candidate, adding evidence only — no
package artifact, generator, source, tool, dependency or run material.

### 19. Nonrecursive seal

No artifact contains its own commit's hash or tree. The committed material carries the freeze placeholder
in `evidence_commit_*`; the Stage-B capsule that binds the final head is **not committed**. Confirm the
evidence tail resolves its own SHA procedurally rather than embedding it.

### 20. Post-review immutability

At completion: HEAD and tree unchanged, worktree clean, no PR metadata mutation, no key, no signature, no
activation, no run, no residual process. Confirm PR #198 is open/draft/unmerged, PR #197 and PR #196
unchanged, and protected main still `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423`.

---

## Your verdict

Required clean verdict:

```
FOUNDERGATE-PR197-PROVIDER-PACKAGE-CHECKER: CLEAN
```

Otherwise return `FINDINGS`, `INSUFFICIENT_EVIDENCE`, `STATE_DRIFT` or `REVIEW_INVALIDATED`.

**The Builder must not issue this verdict.** Every finding must include severity, exact artifact, mechanism,
supporting evidence and a narrow correction scope.

---

## What this package explicitly does NOT claim

- **Not** package acceptance. Builder verification is not acceptance.
- **Not** real productive Claude capability — that is first exercised under founder signature.
- **Not** that the committed candidate binds the final evidence head. It deliberately does not.
- **Not** complete OS isolation, and **not** any UI proof.
- **Not** founder-key-enrollment readiness. Enrollment is blocked until an independent package Checker
  returns CLEAN and a package Advisor rules.
