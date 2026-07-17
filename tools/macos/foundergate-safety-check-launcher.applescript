-- FounderGate Safety Check — one-click launcher (no Terminal required).
--
-- Thin wrapper: the real logic lives in source control at
-- tools/macos/launch-foundergate-safety-check.sh + resolve-node.sh. The build process
-- embeds a VERIFIED absolute Node path + the repo root below, so this works even when
-- Finder gives the app only a minimal macOS PATH (no shell/nvm init). Loopback only; no
-- admin; no daemon; does not contact the M1; does not start a sandbox VM merely by opening.
on run
	set nodeBin to "@@NODE_BIN@@"
	set repoRoot to "@@REPO_ROOT@@"
	set launchSh to "@@LAUNCH_SH@@"
	set portNum to "@@PORT@@"
	set theURL to "http://127.0.0.1:" & portNum & "/"

	set cmd to "FG_EMBEDDED_NODE=" & quoted form of nodeBin & " " & ¬
		"FG_REPO_ROOT=" & quoted form of repoRoot & " " & ¬
		"FG_SAFETY_PORT=" & portNum & " FG_OPEN_BROWSER=0 " & ¬
		"/bin/sh " & quoted form of launchSh & " 2>/dev/null || true"
	set out to do shell script cmd

	if out contains "NODE_NOT_FOUND" then
		display dialog "FounderGate could not start its local engine. No project or evidence was changed. Close this message and report the problem." buttons {"OK"} default button 1 with icon stop
		return
	end if
	if out contains "UNKNOWN_SERVICE" then
		display dialog "FounderGate could not verify its own service on this computer, so it opened nothing and ran no check. No project or evidence was changed. Close this message and report the problem." buttons {"OK"} default button 1 with icon stop
		return
	end if
	if (out contains "STARTED") or (out contains "ALREADY_UP") then
		open location theURL
		return
	end if
	-- REPO_MISSING / HEALTH_TIMEOUT / anything else
	display dialog "FounderGate could not start its local engine. No project or evidence was changed. Close this message and report the problem." buttons {"OK"} default button 1 with icon stop
end run
