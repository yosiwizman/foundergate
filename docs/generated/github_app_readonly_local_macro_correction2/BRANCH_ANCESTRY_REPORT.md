# Branch Ancestry & Scope Accounting
| Item | SHA | Tree |
| --- | --- | --- |
| Protected main (origin) | `65fd01669f80094e7ef9a0fa689c87347ae0c089` | `183f127f22ae968a0101a75ab8dcd27e30cdf2f7` |
| Prior evaluated candidate (correction base) | `5e97bd5ea638d463536dca53a8e1b55240e81b07` | `6db44d272d9618da17c8cf16d3e9af56789ab17e` |
| This evaluated candidate | `9fe4e3c2168abdc26af29b3a5900ad524db858ae` | `d0fb09e6833081a52c1e370496f43f9fb8de8baa` |
| Merge-base(this, origin/main) | `65fd01669f80094e7ef9a0fa689c87347ae0c089` | — |

## Scope
- **This correction's delta (prior candidate 5e97bd5 → 9fe4e3c): 37 files; out of scope: 0** (must be 0). This is the meaningful scope measure for correction2.
- **Vs origin/main: 69 files, ALL within the GitHub-App-route family** — the github_app_readonly source/tests plus the two correction doc dirs (`github_app_readonly_local_macro_correction` from the base + `_correction2` here). Files outside the GitHub-App-route family: **0** (must be 0).
- Lineage: origin/main → 5e97bd5 (correction 1, reviewed CLEAN/READY) → 9fe4e3c (this correction 2). No unrelated run history; the base carried only correction-1 github-app files, deliberately.
- Protected main unchanged (`65fd01669f80094e7ef9a0fa689c87347ae0c089`). PR #200 unchanged. No PR opened for this branch.
