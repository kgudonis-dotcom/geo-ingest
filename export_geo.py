"""Izvelk viena kadastra nogabalu ģeometriju no VMD atvērtajiem datiem (DB vai tieši no data.gov.lv zip)."""
import os, io, re, json, zipfile, tempfile, requests
import geopandas as gpd

CKAN="https://data.gov.lv/dati/api/3/action/package_show?id=meza-valsts-registra-meza-dati"
def main():
    req=open("EXPORT_REQ").read().split()
    kad=req[0]; hint=req[1].lower() if len(req)>1 else ""
    out=None
    # 1. mēģina DB
    try:
        from sqlalchemy import create_engine, text
        eng=create_engine(os.environ["DATABASE_URL"])
        with eng.begin() as con:
            n=con.execute(text("select count(*) from stands where kadastrs=:k"),{"k":kad}).scalar()
            if n:
                rows=con.execute(text("select kvartals,nogabals,platiba_ha,attrs,st_asgeojson(geom) g from stands where kadastrs=:k"),{"k":kad}).fetchall()
                out={"type":"FeatureCollection","source":"db","features":[{"type":"Feature","properties":{"kvartals":r[0],"nogabals":r[1],"platiba_ha":float(r[2] or 0),**(r[3] or {})},"geometry":json.loads(r[4])} for r in rows]}
                print("no DB:",n,"nogabali",flush=True)
    except Exception as e: print("DB nav pieejama:",e,flush=True)
    # 2. ja DB tukša: tieši no zip
    if not out:
        res=[(x.get("name") or x["url"],x["url"]) for x in requests.get(CKAN,timeout=60).json()["result"]["resources"] if (x.get("url") or "").endswith(".zip")]
        for name,url in res:
            if hint and hint not in (name+url).lower(): continue
            print("lejupielādē",url,flush=True)
            b=requests.get(url,timeout=1800).content; tmp=tempfile.mkdtemp()
            with zipfile.ZipFile(io.BytesIO(b)) as z: z.extractall(tmp)
            feats=[]
            for dp,_,fs in os.walk(tmp):
                for f in fs:
                    if not f.lower().endswith(".shp"): continue
                    try: g=gpd.read_file(os.path.join(dp,f),where=f"kadastrs = '{kad}'")
                    except Exception: 
                        g=gpd.read_file(os.path.join(dp,f)); g=g[g.get("kadastrs","").astype(str)==kad]
                    if len(g):
                        g=(g.set_crs(3059) if g.crs is None else g).to_crs(4326)
                        feats.append(g); print(" ",f,len(g),"nogabali",flush=True)
            if feats:
                import pandas as pd
                gg=gpd.GeoDataFrame(pd.concat(feats,ignore_index=True))
                out=json.loads(gg.to_json()); out["source"]="zip:"+name
                break
    os.makedirs("geo",exist_ok=True)
    with open(f"geo/{kad}.json","w") as f: json.dump(out or {"error":"nav atrasts"},f,ensure_ascii=False)
    print("gatavs",kad,flush=True)

if __name__=="__main__": main()
