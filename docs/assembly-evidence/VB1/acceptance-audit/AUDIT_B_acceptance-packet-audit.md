# AUDIT B — Independent Acceptance-Packet Construction & Attack: VB1 at b904366

> Two-audit VB1 acceptance-readiness wave. Independent lane B (second flashlight, fresh context), separate
> from Audit A; neither audit read the other before writing its verdict. Read-only. Committed as evidence.

**Bind SHA:** `b904366856d4adc8ec1332a83a6c3998863e52b4` (== HEAD == origin/main, all three confirmed equal). Committed state read via `git show b904366:<path>`. Read-only; no repo writes.

---

## PART 1 — THE ACCEPTANCE PACKET (claim → anchor by path + SHA)

Source ledgers: `docs/assembly-evidence/EVIDENCE_LEDGER.md` and `docs/assembly-evidence/FOUNDER_GATE_LEDGER.md` (both at b904366).

### Family 1 — VB1 build merged + independently checker-verified
| Claim | Anchor (path @ SHA) |
|---|---|
| VB1 Run-Launcher SAFETY CORE merged; act edge machine-gated (VB3_VERIFIER=null ⇒ nothing executes); 29 committed proofs | EVIDENCE_LEDGER row `| VB1 |`, PR #90, code commit ddafb6d5fea3f525e6da03762a38ebc822e953ab |
| Independent adversarial checker, builder≠checker, r1 NOT-CLEAN (2H/3M/2L) → r2 ALL SEVEN CLOSED | `docs/assembly-evidence/VB1/checker-report.md` + `.../checker-report-round2.md` |
| Build-contract authority (VB1 residuals) | `docs/lanes/V8-B-build-contract.md` @ blob 670046b74b805790de785daa3f14cb0c7f5bad12 |
| Founder gate = start only (not acceptance) | FOUNDER_GATE_LEDGER `G1-B-VB1`, contract @ main 321888e |

### Family 2 — §29 endurance evidence
| Leg | Anchor |
|---|---|
| Honest failure preserved: 8h Run-1 NOT-PASSED (host idle-sleep) | EVIDENCE_LEDGER `VB1-SOAK-NOT-PASSED`, PR #115, merge be116b551757496542ca48388aa3e27148be6518, attested c22b86a2f70847490961595b383c0ee358aaaa33, evidence commit a8200fe; `docs/assembly-evidence/VB1/soak/run-2026-07-14/*` |
| 8–9h leg PASS (span 8.0026h, avail 100% 33/33, caffeinate pinned) | `VB1-SOAK-RUN2-PASS`, PR #128, merge 69fa3e4b5562508ee775b3a609d7ce893c634823, attested 490440d2a18910fe02f412d588ccddce132522e6, evidence commit 684dc8b, SD-1 closed c8fd6f6; `docs/assembly-evidence/VB1/soak/run2-2026-07-15/*` |
| 24h leg PASS (span 24.0021h, avail 100% 97/97, QUIET_HOST intact) | `VB1-SOAK-24H-PASS`, PR #133, merge 01b026f4a8fdc7f457166fab61b4761648fd1bcc, attested 0cd51f8d34af1c0c3837210845c47deb7c53e9ce, evidence commit adb64c6; `docs/assembly-evidence/VB1/soak/run24-2026-07-15/*` |

### Family 3 — Evidence-integrity infrastructure (L1–L4) + SHWL that gate the soak
| Claim | Anchor |
|---|---|
| L1 freeze-manifest / L2 run-attestation / L3 env-provenance / L4 quiet-host-monitor, each builder + independent checker looped-to-CLEAN | EVIDENCE_LEDGER `L1-L4-EVIDENCE-INTEGRITY`, PR #111/#112/#110/#113, row commit 5f3a1d21f4baad3693cd179dfd2fa40e1e469d63; sub-lane commits 5f3a1d2/69a312b/a9f0deb/490477a; authority blob 708b034; dirs `docs/assembly-evidence/{L1-freeze-manifest,L2-run-attestation,L3-env-provenance,L4-quiet-host-monitor}/` |
| SHWL authority — founder signed exact independently-checked commit; self-cert removed | EVIDENCE_LEDGER `SHWL-AUTHORITY` + FOUNDER_GATE `G-SHWL-AUTHORITY`; PR #97 merge 6a4488d, signed commit 9ef4fa0ffdff3fbcfa61fe620371baee19d9f8b1; check `docs/assembly-evidence/shwl/independent-check-9ef4fa0.md` |
| SHWL build accepted (steps I/J held) | EVIDENCE_LEDGER `SHWL-BUILD` + FOUNDER_GATE `G-SHWL-BUILD`; PR #106 merge 628bb11, checker-verified code 5a9cea49; reports `docs/assembly-evidence/shwl-build/checker-report-round{1,2}.md` + `pre-acceptance-audit.md` |

### Family 4 — V8-A / V8-B build-contract basis
| Claim | Anchor |
|---|---|
| V8-A whole-product ACCEPTED (Stranger-Test Run 7 PASS) — the basis VB1 builds on | FOUNDER_GATE `V8-A ACCEPTANCE`, product-final 85a59f9 |
| §29 Honest-Duration & Soak-Proof Law adopted | EVIDENCE_LEDGER `HONEST-DURATION`, PR #82, commit 82119930 |
| AKIOR harness harvest (soak accumulator #5 etc.) | EVIDENCE_LEDGER `AKIOR-HARVEST`, PR #88, commit e5c614b |
| V8-B build contract (VB1 gate source), DRAFT pending V8-A acceptance | EVIDENCE_LEDGER `V8-B-CONTRACT-DRAFT`, PR #72, commit 2c13bc9 |

---

## PART 2 — ATTACK ON THE PACKET

### (a) Does every claim resolve? — YES
`git rev-parse --verify` / `git cat-file -e` run against all 30 cited SHAs and all cited paths. Every commit SHA resolves and is an ancestor of b904366. The two non-commit SHAs (670046b, 708b034) are blobs (the "Authority (path @ SHA)" doc-blob column), correctly resolve as blobs, and each equals the on-main blob at b904366 (`b904366:docs/lanes/V8-B-build-contract.md` == 670046b; `b904366:docs/lanes/shared-host-workload-lease.md` == 708b034). All evidence directories/files resolve. Zero missing anchors.

### (b) Staleness — NO VALIDITY GAP (mechanically proven)
The soaks are attested at OLDER commits than bind (490440d 8h, 0cd51f8 24h < b904366). I tested whether "code under test" still equals the code that would be accepted:

`git rev-parse <sha>:src/v8b1` yields the identical tree hash `cba621e28cbebf808286dbb37fed17eddb914cb7` at the merged build (ddafb6d), the 8h-attested commit (490440d), the 24h-attested commit (0cd51f8), and the bind commit (b904366). `git diff src/v8b1` across all four = empty. The VB1 product code under soak is byte-identical to the VB1 code at bind → the older attestation commits carry a valid current-validity argument. No staleness defect.

### (c) §12 separation gate across VB1 history — INTACT; the one known self-cert was genuinely withdrawn
- **Build:** builder ≠ checker. Checker reports are provably adversarial (round-1 VERDICT "NOT CLEAN — 2 HIGH…" with working repros for a forgeable act edge and arbitrary-write rollback; round-2 re-verified against fixed source). Not a rubber stamp.
- **SHWL authority (the flagged test case):** `independent-check-9ef4fa0.md` item h PASS — "Self-cert removed: no 'Advisor verdict'/'sound and coherent'/'Authority-ready? Yes'… 'No lane self-certifies.'" Checker's own `git rev-parse HEAD` == 9ef4fa0 (the exact commit the founder signed), read-only. author ≠ checker ≠ founder confirmed. The withdrawal is real, not asserted.
- **Soak:** run executed on host → independent Harvest-Terminal re-derivation from raw machine records; the soak driver was separately checker-CLEAN.
- **Signer role has not fired** (acceptance HELD by design), so the three-role chain is intentionally incomplete — its open leg is exactly item (d).
- *Soft observation (not a finding):* the Harvest Terminal both maintains EVIDENCE_LEDGER / orchestrates the build lanes and acts as soak "independent verifier." This is mitigated because soak verification is a mechanical re-derivation of machine-emitted raw evidence (independently re-checkable) and the driver was independently reviewed — it is not self-certification of prose. The binding independent-audit leg is still owed (below).

### (d) Anything pending presented as complete? — NO overclaim; the open gap is honestly recorded
- No VB1 acceptance gate exists in FOUNDER_GATE_LEDGER (grep for accept/G3-B-VB1/G4-B-VB1 → none). Every VB1 touchpoint says HELD.
- `git grep` for "VB1 (is )?(ACCEPTED|complete and accepted|signed)" across `docs/` → empty. WHERE_AM_I / STAGE_TRACKER stop at V8-A acceptance / V8-B DRAFT.
- The one true sub-claim marked complete — "§29 endurance evidence COMPLETE (8–9h + 24h legs both PASSED and ledgered)" — is accurate and correctly scoped; the same row states "VB1 acceptance remains HELD: two independent audits + founder signature outstanding."
- **W4 gap honestly represented:** the `G1-B-VB1` row carries a ⟨W4 RECONCILIATION 2026-07-13 · KNOWN GAP (Law 54)⟩ note stating the referenced `docs/assembly-evidence/VB1/advisor-pre-signature-audit.md` is ABSENT. Confirmed on disk at b904366: the file is ABSENT (VB1 dir holds only `checker-report.md`, `checker-report-round2.md`, `soak/`), while the analogous VB0 `advisor-pre-signature-audit.md` EXISTS. The gap is disclosed, not fabricated/backdated, and left OPEN — glossing did not occur.
- **Negative fact preserved:** Run-1 `VERDICT.txt` "8-HOUR SOAK — NOT-PASSED" remains committed.

---

## FINDINGS

**None that undermine the packet.** Concretely:
- No unresolved anchor (a): all 30 SHAs + all paths resolve; blobs match on-main.
- No staleness gap (b): `src/v8b1` tree identical (cba621e) across build/both-soaks/bind.
- No self-certification survives (c): the SHWL self-cert was verifiably removed and independently re-checked at the exact signed commit.
- No pending-as-complete overclaim (d): VB1 is HELD everywhere; §29-complete is the only "complete" and it is true.

**Two OPEN GAPS — correctly disclosed, blocking acceptance (not packet defects):**
1. `docs/assembly-evidence/VB1/advisor-pre-signature-audit.md` is MISSING (W4-recorded, Law 54). Until committed, the independent pre-signature-audit leg of §12 is unmet.
2. Per the 24h row, two independent audits + the founder signature are outstanding. No G3/G4-B-VB1 acceptance gate has fired.

These keep VB1 correctly HELD; the packet does not claim otherwise.

---

## FINAL VERDICT: PACKET-SOUND

As a *readiness/HELD* packet. Every acceptance-relevant claim resolves to a ledger row or sealed artifact by path+SHA; the older soak attestations carry a byte-identical-code current-validity proof; the §12 chain is intact with its one known self-cert genuinely withdrawn and independently re-checked; and nothing pending is dressed as complete — VB1 acceptance is honestly HELD with the missing pre-signature audit and the outstanding two-audits-plus-signature disclosed as open. The packet must NOT be read as "signable now": acceptance remains blocked by the two disclosed open gaps.
