# Founder Browser Profile Contract (FFS-1)

The configured founder browser on the Mac Mini Pro is **Google Chrome** (`/Applications/Google
Chrome.app`, bundle `com.google.Chrome`), recorded in
`.foundergate/machine_profiles/mac-mini-pro-founder-surface.json`. Foreground founder-surface tests
MUST use actual Google Chrome via a **dedicated temporary profile** — never the founder's personal
Chrome profile, cookies, extensions, history, passwords or browsing state. Playwright Chromium may be
used for internal headless tests but MUST NOT be substituted for Google Chrome in the foreground
qualification (that yields `FFS1-HOLD: FOUNDER-BROWSER-NOT-AVAILABLE` if Chrome is unavailable).
