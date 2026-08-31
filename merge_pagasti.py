"""Apvieno vairāku darbu pagasti/ mapes (artifacts/*/pagasti/*.json.gz) vienā pagasti/."""
import os,gzip,json,glob,datetime
out={}
for f in glob.glob("artifacts/**/*.json.gz",recursive=True):
    pg=os.path.basename(f)[:4]
    with gzip.open(f,"rt",encoding="utf-8") as h:d=json.load(h)
    out.setdefault(pg,{}).update(d.get("zv",{}))
os.makedirs("pagasti",exist_ok=True)
for pg,zv in out.items():
    with gzip.open(f"pagasti/{pg}.json.gz","wt",encoding="utf-8") as h:json.dump({"pagasts":pg,"updated":datetime.date.today().isoformat(),"zv":zv},h,ensure_ascii=False,separators=(",",":"))
print("apvienoti",len(out),"pagasti,",sum(len(v) for v in out.values()),"zemes vienības")
