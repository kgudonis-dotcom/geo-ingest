"""Sagriež VMD nogabalus pa pagastiem (kadastra apz. pirmie 4 cipari) statiskos failos ar iepriekš izrēķinātiem kaimiņiem un ĪADT.
Izvade: pagasti/<PPPP>.json.gz  {"pagasts","updated","zv":{kadastrs:{"stands":[...],"adj":[[i,j,len_m]],"iadt":[...]}}}"""
import os, io, re, json, gzip, zipfile, tempfile, argparse, requests, datetime
import geopandas as gpd, pandas as pd
from shapely.geometry import mapping
from shapely.ops import unary_union

CKAN="https://data.gov.lv/dati/api/3/action/package_show?id="
ATTRS=["zkat","mt","izc","p_darbv","p_darbg","p_cirp","p_cirg","saimn_d_ie","jakopj","jaatjauno","atj_gads",
 "s10","a10","h10","d10","g10","n10","s11","a11","h11","d11","g11","n11","s12","a12","h12","d12","g12","n12","s13","a13","h13","d13","g13","n13","s14","a14","h14","d14","g14","n14"]
OUT="pagasti"

def resources(ds):
    r=requests.get(CKAN+ds,timeout=60).json()["result"]["resources"]
    return [(x.get("name") or x["url"],x["url"]) for x in r if (x.get("url") or "").lower().endswith(".zip")]
def load_zip(url):
    print("  lejupielādē",url,flush=True);b=requests.get(url,timeout=1800).content;tmp=tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z:z.extractall(tmp)
    return [os.path.join(dp,f) for dp,_,fs in os.walk(tmp) for f in fs if f.lower().endswith(".shp")]

def load_iadt():
    try:
        gs=[]
        for name,url in resources("ipasi-aizsargajamas-dabas-teritorijas"):
            for shp in load_zip(url):
                g=gpd.read_file(shp);g=g.set_crs(3059) if g.crs is None else g.to_crs(3059)
                kind="zona" if re.search("zonejum",shp,re.I) else "iadt"
                g=g[["geometry"]+[c for c in g.columns if c.upper() in ("NAME","SITE_NAME","CATEGORY")]];g["kind"]=kind;gs.append(g)
        return gpd.GeoDataFrame(pd.concat(gs,ignore_index=True),crs=3059)
    except Exception as e:print("ĪADT nav:",e,flush=True);return None

def process_shp(shp,iadt,store):
    g=gpd.read_file(shp);g=g.set_crs(3059) if g.crs is None else g.to_crs(3059)
    cols={c.lower():c for c in g.columns};g=g[g.geometry.notna()]
    g["geometry"]=g.geometry.simplify(1.0,preserve_topology=True).buffer(0)
    g["_kad"]=g[cols["kadastrs"]].astype(str)
    g=g[g["_kad"].str.len()==11]
    w=g.to_crs(4326)
    for kad,idx in g.groupby("_kad").groups.items():
        sub=g.loc[idx];subw=w.loc[idx];stands=[]
        rows=list(sub.itertuples(index=False));geoms=list(sub.geometry)
        for r,gw in zip(rows,subw.geometry):
            d=r._asdict()
            def v(k):
                c=cols.get(k);x=d.get(c) if c else None
                if x is None or str(x) in ("nan","None","0","0.0",""):return None
                return x.item() if hasattr(x,"item") else x
            st={"kv":v("kvart"),"nog":v("nog"),"anog":v("anog"),"plat":v("nog_plat")}
            for a in ATTRS:
                x=v(a)
                if x is not None:st[a]=x
            mp=mapping(gw);ring=max(mp["coordinates"],key=lambda c:len(c[0]))[0] if mp["type"]=="MultiPolygon" else mp["coordinates"][0]
            st["geom"]=[[round(x,6),round(y,6)] for x,y in ring]
            stands.append(st)
        adj=[]
        for i in range(len(geoms)):
            for j in range(i+1,len(geoms)):
                if geoms[i].intersects(geoms[j]):
                    L=geoms[i].boundary.intersection(geoms[j].boundary).length
                    if L>5:adj.append([i,j,round(L)])
        ia=[]
        if iadt is not None:
            u=unary_union(geoms)
            hit=iadt[iadt.intersects(u)]
            for _,t in hit.iterrows():
                ha=t.geometry.intersection(u).area/10000
                if ha>0.01:ia.append({"kind":t["kind"],"name":str(t.get("SITE_NAME") or t.get("NAME") or ""),"zone":str(t.get("NAME") if t["kind"]=="zona" else t.get("CATEGORY") or ""),"ha":round(ha,2)})
        store.setdefault(kad[:4],{})[kad]={"stands":stands,"adj":adj,"iadt":ia}
    print(f"  {os.path.basename(shp)}: {len(g)} nogabali",flush=True)

def flush(store):
    os.makedirs(OUT,exist_ok=True)
    for pg,zv in store.items():
        path=f"{OUT}/{pg}.json.gz";old={}
        if os.path.exists(path):
            with gzip.open(path,"rt",encoding="utf-8") as f:old=json.load(f).get("zv",{})
        old.update(zv)
        with gzip.open(path,"wt",encoding="utf-8") as f:json.dump({"pagasts":pg,"updated":datetime.date.today().isoformat(),"zv":old},f,ensure_ascii=False,separators=(",",":"))
    store.clear()

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--filter",default="");ap.add_argument("--first",action="store_true");ap.add_argument("--no-iadt",action="store_true");a=ap.parse_args()
    iadt=None if a.no_iadt else load_iadt()
    for name,url in resources("meza-valsts-registra-meza-dati"):
        if a.filter and a.filter.lower() not in (name+url).lower():continue
        store={}
        for shp in load_zip(url):
            process_shp(shp,iadt,store);flush(store)
        if a.first:break
    n=len(os.listdir(OUT));sz=sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT))/1e6
    print(f"gatavs: {n} pagastu faili, {sz:.0f} MB",flush=True)
if __name__=="__main__":main()
