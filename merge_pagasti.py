"""Apvieno vairāku darbu pagasti/ mapes (artifacts/*/pagasti/*.json.gz) vienā pagasti/."""
import os,gzip,json,glob,datetime
out={};sig={}
for f in sorted(glob.glob("artifacts/**/*.json.gz",recursive=True),key=lambda p:(0 if "/existing/" in p else 1,p)):
    pg=os.path.basename(f)[:4]
    with gzip.open(f,"rt",encoding="utf-8") as h:d=json.load(h)
    out.setdefault(pg,{}).update(d.get("zv",{}))
    # SCHEMA_VERSION turpinājums: ladSig agrāk pazuda šeit (tikai "zv" tika kopēts), tāpēc paraksta
    # salīdzinājums build_pagasti.py vienmēr redzēja oldSig=None un LAD pārbūvēja no jauna katru reizi —
    # "nemainīts, nepārbūvē" ceļš praksē nekad nenostrādāja. Jaunākais (dziļākais glob kārtībā) ladSig uzvar.
    if d.get("ladSig"):sig[pg]=d["ladSig"]
os.makedirs("pagasti",exist_ok=True)
for pg,zv in out.items():
    payload={"pagasts":pg,"updated":datetime.date.today().isoformat(),"zv":zv}
    if pg in sig:payload["ladSig"]=sig[pg]
    with gzip.open(f"pagasti/{pg}.json.gz","wt",encoding="utf-8") as h:json.dump(payload,h,ensure_ascii=False,separators=(",",":"))
print("apvienoti",len(out),"pagasti,",sum(len(v) for v in out.values()),"zemes vienības")
