# Snapshot Binding (W4)
Binds an exact commit to a canonical file manifest + archive digest. Enforces file-count/byte limits, and HELDs on: missing commit · path traversal · symlink · unsafe filenames · unresolved submodule · unresolved LFS · over-limit archive · binary-heavy. Records a binary inventory. **No command execution.** Synthetic archive fixtures only.
