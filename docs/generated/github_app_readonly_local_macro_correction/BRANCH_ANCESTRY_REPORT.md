# Branch Ancestry & Scope Accounting (Correction G)
| Item | SHA | Tree |
| --- | --- | --- |
| Protected main (origin/main) at preflight | `65fd01669f80094e7ef9a0fa689c87347ae0c089` | `183f127f22ae968a0101a75ab8dcd27e30cdf2f7` |
| Correction base | `65fd01669f80094e7ef9a0fa689c87347ae0c089` | `183f127f22ae968a0101a75ab8dcd27e30cdf2f7` |
| Prior local-macro candidate | `5b885fdbc704d5c0d09e98081804735601ed567b` | `65c56e934186e61de1cdf8e08ba052b903c7d5be` |
| Correction branch (evaluated) | `5e97bd5ea638d463536dca53a8e1b55240e81b07` | `6db44d272d9618da17c8cf16d3e9af56789ab17e` |
| Merge-base(correction, main) | `65fd01669f80094e7ef9a0fa689c87347ae0c089` | — |

- **Merge-base equals origin/main** → the correction branch is a clean single-commit delta directly on top of protected main. **No inherited unrelated changes** were carried forward (the prior macro branch's long run-history chain was deliberately excluded by branching off origin/main and importing only the github-app files).
- **Changed files vs origin/main: 39.** Files outside authorized scope: **0** (must be 0).
- Protected main unchanged (`65fd01669f80094e7ef9a0fa689c87347ae0c089`). PR #200 unchanged (OPEN). No other PR changed. No PR opened for this branch.
