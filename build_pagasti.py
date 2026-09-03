"""Sagriež VMD nogabalus pa pagastiem (kadastra apz. pirmie 4 cipari) statiskos failos ar iepriekš izrēķinātiem kaimiņiem, ĪADT, LAD lauku blokiem, VZD eksplikāciju un NĪ saiti.
Izvade: pagasti/<PPPP>.json.gz  {"pagasts","updated","ladSig":{"n","maxdate","schema":SCHEMA_VERSION},"zv":{kadastrs:{"stands":[{...,"geom":[[[lon,lat],...],[caurums1,...],...]},...],"adj":[[i,j,len_m]],"iadt":[...],"lad":{"ha","blocks":[...]},"expl":{"liz","krum","mezs",...},"ni":{"nr","name"}}}}
#22 turpinājums (2026-09-03): stand["geom"] ir GREDZENU SARAKSTS (GeoJSON Polygon konvencija: [ārējais, caurums1, caurums2, ...]),
NEVIS viens plakans punktu saraksts — nogabaliem ar caurumu (piem. lauces, ūdenstilpes vidū) iepriekš caurums pazuda un platība bija par lielu."""
import os, io, re, json, gzip, zipfile, tempfile, argparse, requests, datetime, time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
import geopandas as gpd, pandas as pd
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

CKAN="https://data.gov.lv/dati/api/3/action/package_show?id="
ATTRS=["zkat","mt","izc","p_darbv","p_darbg","p_cirp","p_cirg","saimn_d_ie","jakopj","jaatjauno","atj_gads",
 "s10","a10","h10","d10","g10","n10","s11","a11","h11","d11","g11","n11","s12","a12","h12","d12","g12","n12","s13","a13","h13","d13","g13","n13","s14","a14","h14","d14","g14","n14"]
# #46: VMD BON lauks (Number(14), "Bonitāte, kods") -> burtu klase. Avots: VMD klasifikatori
# https://gis.vmd.gov.lv/Public/GetClasificators, lapa "BON_klasifikators" (0=Ia ... 6=Va), lauks "BON" lapā "Struktūra_KOPĀ".
# #46-turpinājums (2026-09-03): data.gov.lv publiskajā SHP/DBF eksportā ("meza-valsts-registra-meza-dati")
# NAV lauka ar nosaukumu "bon" — pārbaudīts lokāli uz 2 reģionu (Centra, Dienvidu) DBF, 69 lauki katrā,
# neviens nesatur apakšvirkni "bon". cols.get("bon") tāpēc vienmēr atgriež None un st["bon"] nekad netiek iestatīts.
# Kandidātlauki bv10..bv14 (katram no 5 sugas elementiem) satur 3 ciparu kodus (piem. 500, 624, 300),
# kas NEATBILST 0-6 BON_CODES skalai — to nozīme nav apstiprināta, tāpēc NAV izmantoti. Sk. STATUSS.md.
SCHEMA_VERSION=2  # #22: stand["geom"] tagad gredzenu saraksts (ar caurumiem), nevis viens plakans gredzens. Pagasta JSON izvades shēmas versija (zv ieraksta lauku struktūra). Paaugstini par 1 katru
# reizi, kad pievieno/noņem/pārdēvē lauku zv ierakstā, un ieraksti izmaiņu CLAUDE.md — tas iekļaujas
# lad_signature() parakstā, tāpēc versijas maiņa vienmēr liek no jauna aprēķināt paraksta-balstīto (LAD) kešu.
BON_CODES={0:"Ia",1:"I",2:"II",3:"III",4:"IV",5:"V",6:"Va"}
OUT="pagasti"
OWNERS_DS="meza-zemju-ipasnieku-nogabali"
def load_owners():
    """Lielo īpašnieku nogabali -> GeoDataFrame(owner, geometry) EPSG:3059 ar sindex. Nosaukums no resursa nosaukuma."""
    gs=[]
    try:
        # avots: Release "mirror" (spogulis no Latvijas); ja tā nav, mēģina lvmgeo tieši
        srcs=[]
        try:
            rel=requests.get("https://api.github.com/repos/kgudonis-dotcom/geo-ingest/releases/tags/mirror",timeout=30).json()
            srcs=[(a["name"].replace("_NOGABALI.zip","").replace("_"," "),a["browser_download_url"]) for a in rel.get("assets",[]) if a["name"].endswith("_NOGABALI.zip")]
            print(f"  spogulis: {len(srcs)} īpašnieku faili",flush=True)
        except Exception as e:print("  spogulis nav pieejams:",e,flush=True)
        if not srcs:
            try:requests.head("https://lvmgeo.lvm.lv/",timeout=15);srcs=resources(OWNERS_DS)
            except Exception as e:print("  lvmgeo.lvm.lv nav sasniedzams, īpašniekus izlaiž",flush=True);return None
        for name,url in srcs:
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
                    g["geometry"]=g.geometry.buffer(0)
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

# LAD lauku bloki: karte.lad.gov.lv ArcGIS REST (STATUSS.md 6. sadaļa: sasniedzams no GitHub runneriem). Nav atbalsttiesīgās platības lauka, tikai BLOCK_AREA/BLOCK_NUMBER.
LAD_QUERY="https://karte.lad.gov.lv/arcgis/rest/services/lauku_bloki/MapServer/0/query"
def lad_get(params,tries=3):
    for i in range(tries):
        try:
            r=requests.get(LAD_QUERY,params=params,timeout=(15,90))
            if r.ok:return r.json()
        except Exception:
            if i==tries-1:raise
        time.sleep(2*(i+1))
    raise RuntimeError("LAD karte.lad.gov.lv nesasniedzama")
def lad_bbox(geoms):
    xs=[g.bounds for g in geoms.values()]
    return "%.1f,%.1f,%.1f,%.1f"%(min(x[0] for x in xs)-50,min(x[1] for x in xs)-50,max(x[2] for x in xs)+50,max(x[3] for x in xs)+50)
def lad_signature(bbox):
    """Lēts paraksts (bloku skaits + jaunākais VALID_FROM) pagasta bbox'am, lai atpazītu, ka LAD dati nav mainījušies kopš pēdējās būves."""
    d=lad_get({"where":"1=1","geometry":bbox,"geometryType":"esriGeometryEnvelope","inSR":3059,"spatialRel":"esriSpatialRelIntersects",
               "outStatistics":json.dumps([{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"n"},
                                            {"statisticType":"max","onStatisticField":"VALID_FROM","outStatisticFieldName":"maxdate"}]),"f":"json"})
    a={k.lower():v for k,v in (d.get("features") or [{}])[0].get("attributes",{}).items()}
    return {"n":a.get("n",0),"maxdate":a.get("maxdate"),"schema":SCHEMA_VERSION}
def lad_fetch(bbox):
    """Visi LAD lauku bloki bbox'am (lapots pa 2000, resultOffset), GeoDataFrame EPSG:3059 ar block,geometry."""
    feats=[];offset=0
    while True:
        d=lad_get({"where":"1=1","geometry":bbox,"geometryType":"esriGeometryEnvelope","inSR":3059,"outSR":3059,
                   "spatialRel":"esriSpatialRelIntersects","outFields":"BLOCK_NUMBER","resultOffset":offset,
                   "resultRecordCount":2000,"returnGeometry":"true","f":"geojson"})
        fs=d.get("features",[]);feats+=fs
        if len(fs)<2000:break
        offset+=len(fs)
    if not feats:return None
    g=gpd.GeoDataFrame({"block":[f["properties"]["BLOCK_NUMBER"] for f in feats]},
                        geometry=[shape(f["geometry"]) for f in feats],crs=3059)
    g["geometry"]=g.geometry.buffer(0);g.sindex;return g
def lad_for_pagasts(geoms,oldSig):
    """LAD bloku ∩ ZV pagastam -> (paraksts,{kadastrs:{ha,blocks}},vai_atjaunots). Ja paraksts sakrīt ar iepriekšējo, ģeometrijas vaicājumu izlaiž (nemainīts, nepārbūvē)."""
    bbox=lad_bbox(geoms);sig=lad_signature(bbox)
    if oldSig and sig==oldSig:return sig,{},False
    blocks=lad_fetch(bbox);per_zv={}
    if blocks is not None and len(blocks):
        for kad,g in geoms.items():
            ha=0;bl=set()
            for i in blocks.sindex.query(g,predicate="intersects"):
                t=blocks.iloc[i]
                try:a=t.geometry.intersection(g).area/10000
                except Exception:continue
                if a>0.005:ha+=a;bl.add(t.block)
            if ha>0.005:per_zv[kad]={"ha":round(ha,2),"blocks":sorted(bl)}
    return sig,per_zv,True

# VZD zemes vienību lietošanas mērķu eksplikācija (m2 -> ha), datu kopa "kadastra-informacijas-sistemas-atvertie-dati", resurss parcel.zip (XML)
VZD_NS="{http://ivis.eps.gov.lv/XMLSchemas/100007/CadastreRegistry/v1-0}"
EXPL_FIELDS=[("AgricultTotal","liz"),("Bushes","krum"),("Forest","mezs"),("Swamp","purvs"),("UnderWaterTotal","udens"),
             ("UnderBuildings","ekas"),("UnderRoads","celi"),("OtherLand","cita"),("Drained","meliorets")]
def load_expl():
    """{kadastrs:{liz,krum,mezs,purvs,udens,ekas,celi,cita,meliorets}} ha, summēts pa visiem ZV lietošanas mērķiem."""
    out={}
    try:
        for name,url in resources("kadastra-informacijas-sistemas-atvertie-dati"):
            if not url.lower().endswith("parcel.zip"):continue
            print("  lejupielādē",url,flush=True)
            b=requests.get(url,timeout=(20,1800)).content
            with zipfile.ZipFile(io.BytesIO(b)) as z:
                for n in [n for n in z.namelist() if n.lower().endswith(".xml")]:
                    with z.open(n) as f:
                        for _,el in ET.iterparse(f,events=("end",)):
                            if el.tag==VZD_NS+"ParcelItemData":
                                kad=(el.findtext(VZD_NS+"ParcelBasicData/"+VZD_NS+"ParcelCadastreNr") or "").strip()
                                if len(kad)==11:
                                    agg={}
                                    for lp in el.iter(VZD_NS+"LandPurposeExplicationData"):
                                        for tag,key in EXPL_FIELDS:
                                            v=lp.findtext(VZD_NS+tag)
                                            if v:agg[key]=agg.get(key,0)+float(v)/10000
                                    if agg:out[kad]={k:round(v,2) for k,v in agg.items()}
                                el.clear()
                    print(f"  {n.split('/')[-1]}: kopā {len(out)} ZV ar eksplikāciju",flush=True)
    except Exception as e:print("VZD eksplikācija neizdevās:",e,flush=True)
    return out

def load_ni():
    """{kadastrs:{"nr":NĪ kadastra numurs,"name":nosaukums vai None}}, no VZD property.zip (Nekustamā īpašuma sastāvā esošās zemes vienības)."""
    out={}
    try:
        for name,url in resources("kadastra-informacijas-sistemas-atvertie-dati"):
            if not url.lower().endswith("property.zip"):continue
            print("  lejupielādē",url,flush=True)
            b=requests.get(url,timeout=(20,1800)).content
            with zipfile.ZipFile(io.BytesIO(b)) as z:
                for n in [n for n in z.namelist() if n.lower().endswith(".xml")]:
                    with z.open(n) as f:
                        for _,el in ET.iterparse(f,events=("end",)):
                            if el.tag==VZD_NS+"PropertyItemData":
                                proNr=(el.findtext(VZD_NS+"CadastreObjectIdData/"+VZD_NS+"ProCadastreNr") or "").strip()
                                pname=el.findtext(VZD_NS+"PropertyBasicData/"+VZD_NS+"PropertyName")
                                if proNr:
                                    for o in el.findall(VZD_NS+"PropertyContentData/"+VZD_NS+"ObjectList/"+VZD_NS+"ObjectData"):
                                        if o.findtext(VZD_NS+"ObjectKindData")=="Zemes vienība":
                                            zvKad=(o.findtext(VZD_NS+"ObjectCadastreNrData") or "").strip()
                                            if len(zvKad)==11:out[zvKad]={"nr":proNr,"name":pname.strip() if pname else None}
                                el.clear()
                    print(f"  {n.split('/')[-1]}: kopā {len(out)} ZV ar NĪ saiti",flush=True)
    except Exception as e:print("VZD NĪ saites neizdevās:",e,flush=True)
    return out

def process_shp(shp,iadt,store,owners=None,zvgeo=None,expl=None,ni=None):
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
            # #46: bonitāte atsevišķi, jo v() izmet "0", bet BON kods 0 = Ia (labākā bonitāte)
            bc=cols.get("bon");bx=d.get(bc) if bc else None
            if bx is not None and str(bx) not in ("nan","None",""):
                try:st["bon"]=BON_CODES.get(int(float(bx)))
                except (TypeError,ValueError):pass
                if st.get("bon") is None:st.pop("bon",None)
            # #22 turpinājums: geom = VISI gredzeni [ārējais, caurums1, ...] (GeoJSON Polygon konvencija), ne tikai ārējais —
            # iepriekš caurumi (piem. lauces, ūdenstilpes nogabala vidū) pazuda, platība bija pārāk liela (60700020059 kv2/15: 7,30 ārējais pret VMD 5,53 ha)
            mp=mapping(gw);poly=max(mp["coordinates"],key=lambda c:len(c[0])) if mp["type"]=="MultiPolygon" else mp["coordinates"]
            st["geom"]=[[[round(x,6),round(y,6)] for x,y in ring] for ring in poly]
            stands.append(st)
        geoms=[g if g.is_valid else g.buffer(0) for g in geoms]
        if iadt is not None:
            for st,gm in zip(stands,geoms):
                dv=[]
                try:
                    for i in iadt.sindex.query(gm,predicate="intersects"):
                        t=iadt.iloc[i]
                        if t["kind"] in ("biotops","mikroliegums","sugas atradne","zona","aizsargājams koks","dabas piemineklis"):
                            try:a=t.geometry.intersection(gm).area/10000
                            except Exception:continue
                            if a>0.005:dv.append({"kind":t["kind"],"name":str(t["name"])[:60],"ha":round(a,2)})
                except Exception:pass
                if dv:st["dv"]=dv
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
                try:ha=t.geometry.intersection(u).area/10000
                except Exception:
                    try:
                        from shapely.validation import make_valid
                        ha=make_valid(t.geometry).intersection(make_valid(u)).area/10000
                    except Exception:continue
                if ha>0.005:ia.append({"kind":t["kind"],"name":str(t["name"]),"zone":str(t["zone"]),"ha":round(ha,2)})
        rec={"stands":stands,"adj":adj,"iadt":ia}
        if expl is not None and kad in expl:rec["expl"]=expl[kad]
        if ni is not None and kad in ni:rec["ni"]=ni[kad]
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

def flush(store,zvgeo=None,owners=None,lad=True,force=False):
    os.makedirs(OUT,exist_ok=True)
    if zvgeo:
        for pg,zv in store.items():neighbours(zv,zvgeo.get(pg,{}),owners)
    old={};oldSig={}
    for pg in store:
        path=f"{OUT}/{pg}.json.gz"
        if os.path.exists(path):
            with gzip.open(path,"rt",encoding="utf-8") as f:d=json.load(f)
            # --force: ignorē veco parakstu (nevis visu veco zv), lai LAD un cita paraksta-balstīta
            # izlaišana vienmēr pārrēķina no jauna, arī bez SCHEMA_VERSION izmaiņas.
            old[pg]=d.get("zv",{});oldSig[pg]=None if force else d.get("ladSig")
        else:old[pg]={};oldSig[pg]=None
    newSig={}
    if lad and zvgeo:
        with ThreadPoolExecutor(max_workers=4) as ex:
            futs={pg:ex.submit(lad_for_pagasts,zvgeo[pg],oldSig.get(pg)) for pg in store if zvgeo.get(pg)}
            for pg,fut in futs.items():
                try:
                    sig,per_zv,changed=fut.result();newSig[pg]=sig
                    if changed:
                        for k,v in per_zv.items():
                            if k in store[pg]:store[pg][k]["lad"]=v
                except Exception as e:print("  LAD bloki neizdevās",pg,e,flush=True)
    for pg,zv in store.items():
        o=old.get(pg,{})
        for k,v in zv.items():
            if k in o and "lielie" in o[k] and "lielie" not in v:v["lielie"]=o[k]["lielie"];v["kaimini"]=o[k].get("kaimini",[])
            if k in o and "lad" in o[k] and "lad" not in v:v["lad"]=o[k]["lad"]
        o.update(zv)
        path=f"{OUT}/{pg}.json.gz"
        payload={"pagasts":pg,"updated":datetime.date.today().isoformat(),"zv":o}
        sig=newSig.get(pg,oldSig.get(pg))
        if sig:payload["ladSig"]=sig
        with gzip.open(path,"wt",encoding="utf-8") as f:json.dump(payload,f,ensure_ascii=False,separators=(",",":"))
    store.clear()

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--filter",default="");ap.add_argument("--first",action="store_true")
    ap.add_argument("--no-iadt",action="store_true");ap.add_argument("--no-owners",action="store_true")
    ap.add_argument("--no-lad",action="store_true");ap.add_argument("--no-expl",action="store_true");ap.add_argument("--no-ni",action="store_true")
    ap.add_argument("--force",action="store_true",help="ignorē esošo ladSig parakstu, pārrēķina LAD blokus visiem pagastiem šajā darbā")
    ap.add_argument("--index",type=int,default=-1);a=ap.parse_args()
    iadt=None if a.no_iadt else load_iadt()
    owners=None if a.no_owners else load_owners()
    expl=None if a.no_expl else load_expl()
    ni=None if a.no_ni else load_ni()
    res=resources("meza-valsts-registra-meza-dati")
    if a.index>=0:
        if a.index>=len(res):print("index ārpus saraksta, nav darba");return
        res=[res[a.index]]
    for name,url in res:
        if a.filter and a.filter.lower() not in (name+url).lower():continue
        store={};zvgeo={}
        for shp in load_zip(url):
            process_shp(shp,iadt,store,owners,zvgeo,expl,ni);flush(store,zvgeo,owners,not a.no_lad,a.force);zvgeo={}
        if a.first:break
    n=len(os.listdir(OUT));sz=sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT))/1e6
    print(f"gatavs: {n} pagastu faili, {sz:.0f} MB",flush=True)
if __name__=="__main__":main()
