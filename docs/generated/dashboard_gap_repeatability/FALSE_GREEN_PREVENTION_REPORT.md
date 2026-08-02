# False-Green Prevention Report
The ladder has an explicit tripwire: any fixture whose expected verdict is NOT PASS but which returns PASS increments falseGreen; the run asserts falseGreen === 0 and exits non-zero otherwise.
This run: falseGreen = 0. Combined with the panel's anti-false-green rule (green only when freshness=FRESH & checker=CLEAN & gate=READY & tests all-pass; any missing signal → UNKNOWN), the system cannot show or certify a green it did not earn.
