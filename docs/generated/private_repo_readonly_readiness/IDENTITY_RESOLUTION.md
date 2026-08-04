# Identity Resolution (W3)
Accepts ONLY `https://github.com/<owner>/<repo>` (+ optional exact commit SHA). Rejects: SSH URLs · embedded credentials/tokens · path traversal · non-GitHub domains · branch-only-as-final-identity (exact commit required) · unresolved submodule/LFS (held). No network by default — synthetic fixtures only.
