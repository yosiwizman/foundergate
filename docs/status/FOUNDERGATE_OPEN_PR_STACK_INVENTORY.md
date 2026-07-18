# FounderGate Open PR Stack Inventory (12 open, linear)
Resolved mechanically. All draft, all MERGEABLE, one linear tower on current main e1ca1989.

| PR | head branch → base | head SHA | ancestor of final? |
|----|----|----|----|
| #151 | audit/opensandbox-phase1 → **main** | e58632b | YES |
| #152 | spike/opensandbox-phase2 → #151 | adcb169 | YES |
| #153 | design/opensandbox-provider-adapter-phase3 → #152 | 3fe19c1 | YES |
| #154 | spike/opensandbox-linux-adapter-phase4 → #153 | f6eeb8f | YES |
| #155 | spike/opensandbox-port-binding-phase4-1 → #154 | 900fa8f | YES |
| #156 | design/opensandbox-customer-intake-phase5 → #155 | e1147c5 | YES |
| #157 | spike/opensandbox-public-repo-intake-phase6 → #156 | 96932fe | YES |
| #158 | integration/founder-url-drop-ui-phase7 → #157 | 6a26978 | YES |
| #159 | integration/founder-safety-check-evidence-pack-phase7-1 → #158 | facfd82 | YES |
| #160 | policy/test-before-founder-tbf1 → #159 | 51cafe6 | YES |
| #161 | qualification/phase7-1-canonical-ui-tbf → #160 | a103f2e | YES |
| #162 | correction/ffs1-foreground-founder-surface → #161 | 20136202 (final) | (self) |

The final head (#162) cumulatively contains every earlier PR head + the acceptance seal + all
attestations. #162 is the single cumulative integration PR (to be retargeted to main, kept draft).
