# Lane D — Project Classification
Per repo: detect package.json (node) / requirements.txt|pyproject (python) / test & spec files /
node_modules presence / declared dependency count. Decide whether existing tests can run WITHOUT
install. Results: task-ledger-demo = node/0-dep; reviewer-proof = node/0-dep; akior-health-check =
python/no-requirements; officebuddy = node/3-dep but no tests; s4a-hello-world = static/minimal.
No install performed for any repo (verified: no node_modules created in the clone sandbox).
