import json,sys
d=json.load(open(sys.argv[1])); bar=float(sys.argv[2])
mons=d.get("monitor_span_min",0); leds=d.get("ledger_span_min",0)
ms=d.get("monitor_samples",0); ls=d.get("ledger_samples",0)
if d.get("verdict")=="HELD_EVIDENCE_WRITE_FAILURE": v="HELD_EVIDENCE_WRITE_FAILURE"
elif ms<2 or ls<2: v="INSUFFICIENT_EVIDENCE"
elif mons>=bar and leds>=bar and d.get("pass"): v="LEVEL4_EIGHT_HOUR_PROVEN"
else: v="LEVEL4_DURATION_NOT_PROVEN"
out=dict(d); out["level4_bar_min"]=bar; out["level4_verdict"]=v
print(json.dumps(out,indent=2))
