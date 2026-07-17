-- FounderGate Safety Check — one-click launcher (no Terminal required).
-- Starts the loopback service from the Phase 7.1 worktree, waits for health, opens the browser.
-- Never exposes beyond 127.0.0.1; no admin; no daemon; does not contact the M1.
on run
	set repoRoot to "/Users/yosiwizman/Projects/foundergate-wt-safety-check-phase7-1"
	set portNum to "4700"
	set healthURL to "http://127.0.0.1:" & portNum & "/api/health"
	set pidFile to "/tmp/foundergate-safety-check.pid"
	-- avoid a duplicate server: if health already answers, just open the browser
	set alreadyUp to (do shell script "/usr/bin/curl -s -m 2 -o /dev/null -w '%{http_code}' " & healthURL & " || echo 000")
	if alreadyUp is not "200" then
		try
			set nodeBin to do shell script "/bin/bash -lc 'command -v node'"
		on error
			display dialog "Could not find Node.js. Please install Node 20+ and try again." buttons {"OK"} default button 1 with icon stop
			return
		end try
		-- start detached, loopback only, record PID
		do shell script "cd " & quoted form of repoRoot & " && FG_SAFETY_PORT=" & portNum & " nohup " & quoted form of nodeBin & " src/safety_check/service.mjs >/tmp/foundergate-safety-check.log 2>&1 & echo $! > " & pidFile
		-- wait up to ~20s for health
		set ok to false
		repeat 20 times
			delay 1
			set code to (do shell script "/usr/bin/curl -s -m 2 -o /dev/null -w '%{http_code}' " & healthURL & " || echo 000")
			if code is "200" then
				set ok to true
				exit repeat
			end if
		end repeat
		if not ok then
			display dialog "FounderGate Safety Check did not start in time. See /tmp/foundergate-safety-check.log." buttons {"OK"} default button 1 with icon stop
			return
		end if
	end if
	do shell script "/usr/bin/open http://127.0.0.1:" & portNum & "/"
end run
