# VB1 24h qualifying soak — SLEEP-TRUTH PREFLIGHT

**Host:** qual-host-m1 (this machine) · **Captured:** 2026-07-15 22:16 -0400 · **Bound SHA:** `0cd51f8d34af1c0c3837210845c47deb7c53e9ce`
**Uptime at preflight:** 1 day, 13:21 · load avg 1.18 / 1.35 / 1.28

## pmset -g (power settings)
```
 standby              0
 Sleep On Power Button 1
 autorestartatconnect 0
 autorestart          0
 powernap             1
 networkoversleep     0
 disksleep            0
 sleep                0 (sleep prevented by caffeinate, powerd, bluetoothd)
 ttyskeepawake        1
 displaysleep         0
 tcpkeepalive         1
 womp                 1
```
- `sleep 0`, `disksleep 0`, `displaysleep 0` — idle-sleep timers all zero. PASS.
- **Residual sleep capability present** (`standby`/`powernap` non-restrictive; `PreventSystemSleep` not asserted at preflight — see below). Tolerated ONLY because the real run launches under `caffeinate -dimsu`, which asserts PreventSystemSleep on behalf of the driver's own process tree for the full span.

## pmset -g assertions (full, at preflight)
```
System-wide:
   UserIsActive                   1
   PreventUserIdleDisplaySleep    0
   PreventSystemSleep             0
   PreventUserIdleSystemSleep     1
Listed by owning process:
   pid 54306(caffeinate): PreventUserIdleSystemSleep "caffeinate command-line tool"
        Details: asserting for 300 secs; Timeout fires in ~205 secs; Action=TimeoutActionRelease
   pid 342(powerd): PreventUserIdleSystemSleep "Powerd - Prevent sleep while display is on"
   pid 342(powerd): UserIsActive "com.apple.powerd.ws.initialize"
   pid 401(WindowServer): UserIsActive (HID tickle)
   pid 393(bluetoothd): UserIsActive "Bluetooth LE HID Activity"
Kernel Assertions: 0x104=USB,MAGICWAKE (webcam; en1 magicwake)
```
- The only `caffeinate` assertion at preflight is **pid 54306** = the Claude harness idle-keepalive (`-i -t 300`, TimeoutActionRelease, parent PID 50617 `claude`). **This is NOT the soak wrapper** (soak uses `-dimsu`, long TTL, no `-t`). It will self-expire in ~205s.
- **`PreventSystemSleep` is 0 at preflight** → the machine can still be put to system sleep absent an explicit assertion → the `-dimsu` pin is required and will be independently re-verified post-launch (Step 4).

## Sleep/wake counts since boot (from `pmset -g log`)
- Sleep-labeled log lines: **201**
- Wake-labeled log lines: **63**
- (Historical since boot 1d13h ago; recorded as the baseline. The soak's own span must show **zero** system-sleep events under the `-dimsu` pin; any sleep/wake during the run is a §5.1 permanent QUIET_HOST downgrade.)

## Preflight verdict
Idle-sleep timers zero; residual sleep capability acknowledged and covered by the mandatory `caffeinate -dimsu` pin, which will be verified as held-with-no-timeout on the driver's process tree immediately after launch and recorded in this evidence directory.
