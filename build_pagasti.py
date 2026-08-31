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
OWNERS_DS="meza-zemju-ipasnieku-nogabali"
def load_owners():
    """Lielo īpašnieku nogabali -> GeoDataFrame(owner, geometry) EPSG:3059 ar sindex. Nosaukums no resursa nosaukuma."""
    gs=[]
    try:
        try:requests.head("https://lvmgeo.lvm.lv/",timeout=15)
        except Exception as e:print("  lvmgeo.lvm.lv nav sasniedzams no šejienes, īpašniekus izlaiž:",e,flush=True);return None
        for name,url in resources(OWNERS_DS):
            owner=re.sub(r"\s*(meža\s+)?nogabali.*$","",name,flags=re.I).strip().strip('"“”')
            try:
                for shp in load_zip(url):
                    g=gpd.read_file(shp,columns=[]);g=g.set_crs(3059) if g.crs is None else g.to_crs(3059)
                    g=g[g.geometry.notna()];gs.append(gpd.GeoDataFrame({"owner":owner,"geometry":g.geometry.values},crs=3059))
                    print(f"  īpašnieks {owner}: {len(g)} nogabali",flush=True)
            except Exception as e:print("  x īpašnieks",owner,e,flush=True)
    except Exception as e:print("īpašnieku datu kopa neizdevās:",e,flush=True)
    if not gs:return None
    o=gpd.GeoDataFrame(pd.concat(gs,ignore_index=True),crs=3059);o.sindex;return o

def resources(ds):
    r=requests.get(CKAN+ds,timeout=60).json()["result"]["resources"]
    return [(x.get("name") or x["url"],x["url"]) for x in r if (x.get("url") or "").lower().endswith(".zip")]
def load_zip(url):
    print("  lejupielādē",url,flush=True);b=requests.get(url,timeout=(20,1800)).content;tmp=tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z:z.extractall(tmp)
    return [os.path.join(dp,f) for dp,_,fs in os.walk(tmp) for f in fs if f.lower().endswith(".shp")]

# DAP (Ozols) datu kopas data.gov.lv: id -> veids; punktiem buferis metros
DAP_SETS=[("ipasi-aizsargajamas-dabas-teritorijas",None,0),("mikroliegumi","mikroliegums",0),("aizsargajamas-dzivotnes-biotopi","biotops",0),
          ("aizsargajamo-sugu-atradnes","sugas atradne",0),("aizsargajamie-koki","aizsargājams koks",10),("dabas-pieminekli","dabas piemineklis",10)]
NAME_COLS=("NAME","SITE_NAME","CATEGORY","NOSAUKUMS","SUGA","SUGA_LV","BIOTOPS","BIOT_KODS","KODS","VEIDS","TIPS","PIEMINEKLIS","NOSAUK")
def load_iadt():
    gs=[]
    for ds,kind0,buf in DAP_SETS:
        try:
            for name,url in resources(ds):
                for shp in load_zip(url):
                    try:g=gpd.read_file(shp)
                    except Exception as e:print("  x",shp,e,flush=True);continue
                    g=g.set_crs(3059) if g.crs is None else g.to_crs(3059)
                    g=g[g.geometry.notna()]
                    if buf and len(g) and g.geometry.iloc[0].geom_type in ("Point","MultiPoint"):g["geometry"]=g.geometry.buffer(buf)
                    g=g[g.geometry.geom_type.isin(["Polygon","MultiPolygon"])]
                    kind=kind0 or ("zona" if re.search("zonejum",shp,re.I) else "iadt")
                    keep=[c for c in g.columns if c.upper() in NAME_COLS]
                    lab=g[keep[0]].astype(str) if keep else pd.Series([""]*len(g),index=g.index)
                    if kind=="zona" and "SITE_NAME" in g.columns:lab=g["SITE_NAME"].astype(str)
                    zone=g["NAME"].astype(str) if kind=="zona" and "NAME" in g.columns else (g["CATEGORY"].astype(str) if "CATEGORY" in g.columns else (g[keep[1]].astype(str) if len(keep)>1 else pd.Series([""]*len(g),index=g.index)))
                    gs.append(gpd.GeoDataFrame({"kind":kind,"name":lab.values,"zone":zone.values,"geometry":g.geometry.values},crs=3059))
                    print(f"  DAP {ds}: {os.path.basename(shp)} {len(g)} ({kind})",flush=True)
        except Exception as e:print("  DAP datu kopa neizdevās:",ds,e,flush=True)
    if not gs:return None
    out=gpd.GeoDataFrame(pd.concat(gs,ignore_index=True),crs=3059);out.sindex;return out

def process_shp(shp,iadt,store,owners=None,zvgeo=None):
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
        ia=[];u=unary_union(geoms)
        if iadt is not None:
            hit=iadt.iloc[list(iadt.sindex.query(u,predicate='intersects'))]
            for _,t in hit.iterrows():
                ha=t.geometry.intersection(u).area/10000
                if ha>0.005:ia.append({"kind":t["kind"],"name":str(t["name"]),"zone":str(t["zone"]),"ha":round(ha,2)})
        rec={"stands":stands,"adj":adj,"iadt":ia}
        if owners is not None:
            own=[]
            for i in owners.sindex.query(u,predicate="intersects"):
                a=owners.geometry.iloc[i].intersection(u).area/10000
                if a>0.01:own.append((owners.owner.iloc[i],a))
            if own:
                agg={}
                for o,a in own:agg[o]=agg.get(o,0)+a
                rec["owners"]=[{"owner":o,"ha":round(a,2)} for o,a in agg.items()]
        if zvgeo is not None:zvgeo.setdefault(kad[:4],{})[kad]=u
        store.setdefault(kad[:4],{})[kad]=rec
    print(f"  {os.path.basename(shp)}: {len(g)} nogabali",flush=True)

def neighbours(zv,zvgeo,owners):
    """Zemes vienību kaimiņu grafs pagastā (meža ZV, kas saskaras) un lielie īpašnieki līdz 3 soļiem."""
    if not zvgeo:return
    kads=list(zvgeo.keys());geoms=[zvgeo[k] for k in kads]
    gdf=gpd.GeoDataFrame({"kad":kads},geometry=geoms,crs=3059);gdf.sindex
    adjm={k:{} for k in kads}
    for i,g in enumerate(geoms):
        for j in gdf.sindex.query(g.buffer(2),predicate="intersects"):
            if j<=i:continue
            L=g.boundary.intersection(geoms[j].buffer(2)).length
            if L>5:adjm[kads[i]][kads[j]]=round(L);adjm[kads[j]][kads[i]]=round(L)
    ownerOf={}
    for k in kads:
        rec=zv.get(k)
        if rec and rec.get("owners"):ownerOf[k]=rec["owners"][0]["owner"]
    for k in kads:
        rec=zv.get(k)
        if not rec:continue
        rec["kaimini"]=[{"kad":n,"len_m":L,"owner":ownerOf.get(n)} for n,L in sorted(adjm[k].items(),key=lambda x:-x[1])]
        # BFS līdz 3 soļiem pēc lielajiem īpašniekiem
        seen={k:0};front=[k];found={}
        for hop in (1,2,3):
            nxt=[]
            for c in front:
                for n in adjm[c]:
                    if n in seen:continue
                    seen[n]=hop;nxt.append(n)
                    o=ownerOf.get(n)
                    if o and o not in found:found[o]={"owner":o,"hops":hop,"kad":n,"dist_m":round(zvgeo[k].distance(zvgeo[n]))}
            front=nxt
        # tuvākie īpašnieki pēc attāluma (arī pāri laukiem, ko grafs neredz), līdz 1000 m
        if owners is not None:
            g=zvgeo[k]
            for i in owners.sindex.query(g.buffer(1000),predicate="intersects"):
                o=owners.owner.iloc[i];d=round(owners.geometry.iloc[i].distance(g))
                if o in ownerOf.get(k,"") :continue
                if o not in found or d<found[o]["dist_m"]:found.setdefault(o,{"owner":o,"hops":None,"kad":None,"dist_m":d})["dist_m"]=min(d,found[o]["dist_m"]) if o in found else d
        rec["lielie"]=sorted(found.values(),key=lambda x:(x["hops"] or 9,x["dist_m"]))

def flush(store,zvgeo=None,owners=None):
    os.makedirs(OUT,exist_ok=True)
    if zvgeo:
        for pg,zv in store.items():neighbours(zv,zvgeo.get(pg,{}),owners)
    for pg,zv in store.items():
        path=f"{OUT}/{pg}.json.gz";old={}
        if os.path.exists(path):
            with gzip.open(path,"rt",encoding="utf-8") as f:old=json.load(f).get("zv",{})
        for k,v in zv.items():
            if k in old and "lielie" in old[k] and "lielie" not in v:v["lielie"]=old[k]["lielie"];v["kaimini"]=old[k].get("kaimini",[])
        old.update(zv)
        with gzip.open(path,"wt",encoding="utf-8") as f:json.dump({"pagasts":pg,"updated":datetime.date.today().isoformat(),"zv":old},f,ensure_ascii=False,separators=(",",":"))
    store.clear()

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--filter",default="");ap.add_argument("--first",action="store_true");ap.add_argument("--no-iadt",action="store_true");ap.add_argument("--no-owners",action="store_true");ap.add_argument("--index",type=int,default=-1);a=ap.parse_args()
    iadt=None if a.no_iadt else load_iadt()
    owners=None if a.no_owners else load_owners()
    res=resources("meza-valsts-registra-meza-dati")
    if a.index>=0:
        if a.index>=len(res):print("index ārpus saraksta, nav darba");return
        res=[res[a.index]]
    for name,url in res:
        if a.filter and a.filter.lower() not in (name+url).lower():continue
        store={};zvgeo={}
        for shp in load_zip(url):
            process_shp(shp,iadt,store,owners,zvgeo);flush(store,zvgeo,owners);zvgeo={}
        if a.first:break
    n=len(os.listdir(OUT));sz=sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT))/1e6
    print(f"gatavs: {n} pagastu faili, {sz:.0f} MB",flush=True)
if __name__=="__main__":main()
