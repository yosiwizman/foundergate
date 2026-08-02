# Developer/Reviewer Mode — Implementation Report
renderDeveloperText(vm) exposes technical detail from the SAME view-model: head SHA, branch, guard outputs, evidence paths, chips JSON, unknowns list. It is separate from renderFounderText and is NOT shown in founder mode. Reviewer mode is where SHAs, freeze root hashes, ZIP manifests, guard outputs, and PR #200 read-only state belong.
