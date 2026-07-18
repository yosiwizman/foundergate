# Outage Recovery Runbook

After an unexpected shutdown, run ONE command (or double-click the .command). The starter detects a missing clean-stop marker or changed boot/session, loads the original manifest + deadline, reconciles repo/worktree/singleton/lease/heartbeat, classifies the incomplete action by effect class, and produces ONE recovery verdict. A reboot never creates a new 9h deadline; if the original deadline expired the run is sealed and remaining work queued for a new authorized run. Emergency stop: tools/terminal0/paes/stop-wave2-session.
