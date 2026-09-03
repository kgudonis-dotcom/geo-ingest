"""Ceļi un grāvji pa pagastiem no OpenStreetMap (Geofabrik Latvia, SHP ekstrakts).
Izvade: infra/<PPPP>.json.gz  {"roads":[{t,surface,name,geom:[[lon,lat]...]}], "water":[{t,name,geom}], "watera":[{t,name,ha,geom:[[ring0,caurums1,...],[poly2_ring0,...]]}]}
#39: watera["geom"] ir MultiPolygon.coordinates formātā (VISI poligonu fragmenti UN caurumi) — iepriekš bbox apgriešana lielu
ūdensobjektu (piem. Daugavu) sadalīja vairākos fragmentos, un kods paturēja TIKAI lielāko fragmentu bez caurumiem (#22 tipa kļūda),
tāpēc joslas bieži neaizsniedza nogabalus, kas robežojās ar mazāku (izmestu) fragmentu.
Pagasta apgabals = pagasti/<PPPP>.json.gz zemes vienību aptverošais taisnstūris + 2 km."""
import os, io, json, gzip, zipfile, tempfile, glob, requests, datetime, time
import geopandas as gpd, pandas as pd  # pd moduļa līmenī: agrāk importēts tikai main() iekšā, tāpēc load_usik() pd.concat kristu ar NameError
UA={"User-Agent":"Mozilla/5.0 (compatible; ff-forest geo-ingest; +https://github.com/kgudonis-dotcom/geo-ingest)"}
def fetch(url,timeout,tries=3,expect_zip=False):
    """HTTP GET ar pārbaudi un atkārtojumiem. 03.09.2026: Geofabrik proxy atgrieza HTML "302 Found" lapu 0,6 s laikā, requests.get(...).content
    to padeva ZipFile -> BadZipFile, un tā kā nekas nepārbaudīja ne statusu, ne saturu, būve avarēja klusi. Tagad: raise_for_status,
    redirect seko, zip maģisko baitu pārbaude (ja expect_zip), un 3 mēģinājumi ar pauzi 10/30 s."""
    last=None
    for i in range(tries):
        try:
            r=requests.get(url,timeout=timeout,headers=UA,allow_redirects=True);r.raise_for_status();b=r.content
            if expect_zip and not zipfile.is_zipfile(io.BytesIO(b)):
                raise ValueError(f"nav zip: status {r.status_code}, content-type {r.headers.get('content-type')}, {len(b)} B, sākums {b[:40]!r}")
            return b
        except Exception as e:
            last=e;print(f"  lejupielāde neizdevās ({i+1}/{tries}): {e}",flush=True)
            if i<tries-1:time.sleep(10*(3**i))
    raise RuntimeError(f"lejupielāde neizdevās pēc {tries} mēģinājumiem: {url}: {last}")
from shapely.geometry import box, mapping
URL="https://download.geofabrik.de/europe/latvia-latest-free.shp.zip"
ROAD_TYPES={"motorway","trunk","primary","secondary","tertiary","unclassified","residential","service","track","living_street","road","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link","path"}
USIK_DS="dati-par-udens-saimnieciskajiem-iecirkniem-un-udenstecu-garuma-kategorijam"  # VARAM: ūdensteču garuma kategorijas pēc Aizsargjoslu lik. 7.p. (MK 397 pielikumi)
# #39 (03.09.2026): ŪSIK kods 0-4 -> Aizsargjoslu lik. 7.p. garuma klase. Nav dokumentēts metadatos ("skat. Metodiku"), bet pārbaudīts pašos datos:
# Daugavas (739 rindas) un Gaujas (385) baseinā TIES_GAR sadalās pa kodiem bez pārklāšanās tieši pie 10/25/100 km:
# 4 = 0,28-9,98 km, 3 = 10,01-24,8 km, 2 = 25,1-98,4 km, 1 = 101,9-204 km, 0 = baseina galvenā upe (Daugava 355 km, Gauja 454 km).
# JOSLA_KAT2 ("galīgā kategorija pēc netiešā garuma", pēc metadatiem) ir noteicošā; tajā ir arī nedokumentēts kods 11 (~15 īsas upes/baseinā) ->
# tam lieto JOSLA_KAT (tiešais garums), NEVIS izdomātu nozīmi. Izvades 'cat' virknes sakrīt ar zoneFeatures regex: "<10", "10-25", "25-100", ">100".
USIK_CAT={0:">100",1:">100",2:"25-100",3:"10-25",4:"<10"}
def load_usik():
    """VARAM ŪSIK ūdensteces ar aizsargjoslas garuma kategoriju -> GeoDataFrame EPSG:4326 ar 'cat','name'.
    Datu kopa publicē shapefile kā ATSEVIŠĶUS resursus (.shp/.shx/.dbf/.prj/.cpg), ne zip — līdz 03.09.2026 kods mēģināja ZipFile uz kailu .shp,
    krita ar BadZipFile katrā būvē (klusi, "ŪSIK neizdevās") un usik bija tukšs visiem pagastiem -> katra upe dabūja 10 m "garums nav apstiprināts".
    Lieto tikai "Pilna_garuma" komplektus (viena rinda = viena upe pilnā garumā ar galīgo kategoriju); "Saskelta_iecirknos" (posmi) izlaiž, lai nedublētu."""
    try:
        res=requests.get("https://data.gov.lv/dati/api/3/action/package_show?id="+USIK_DS,timeout=60,headers=UA).json()["result"]["resources"]
        groups={}  # komplekta atslēga = resursa nosaukums bez paplašinājuma (Venta: visiem viens nosaukums; Lielupe/Gauja/Daugava: nosaukumā ir .shp/.dbf)
        for x in res:
            url=(x.get("url") or "");ext=os.path.splitext(url.lower())[1]
            if ext not in (".shp",".shx",".dbf",".prj",".cpg",".zip"):continue
            key=os.path.splitext(x.get("name") or os.path.basename(url))[0]
            groups.setdefault(key,{})[ext]=url
        gs=[]
        for key,files in groups.items():
            if "pilna_garuma" not in key.lower() and ".zip" not in files:continue
            tmp=tempfile.mkdtemp()
            if ".zip" in files:
                with zipfile.ZipFile(io.BytesIO(fetch(files[".zip"],600,expect_zip=True))) as z:z.extractall(tmp)
                shps=[os.path.join(dp,f) for dp,_,fs in os.walk(tmp) for f in fs if f.lower().endswith(".shp")]
            else:
                if not all(e in files for e in (".shp",".shx",".dbf")):print("  ŪSIK nepilns komplekts, izlaiž:",key,list(files),flush=True);continue
                for ext,url in files.items():
                    if ext in (".shp",".shx",".dbf",".prj",".cpg"):
                        with open(os.path.join(tmp,"usik"+ext),"wb") as h:h.write(fetch(url,600))
                shps=[os.path.join(tmp,"usik.shp")]
            for shp in shps:
                g=gpd.read_file(shp);print("  ŪSIK",key,len(g),list(g.columns)[:12],flush=True)
                if not len(g) or not g.geometry.iloc[0].geom_type.endswith("LineString"):continue
                cols={c.upper():c for c in g.columns}
                if "NOS_GAL" not in cols or "JOSLA_KAT" not in cols:print("  ŪSIK bez NOS_GAL/JOSLA_KAT kolonnām, izlaiž (neminēt kolonnas):",key,flush=True);continue
                k2=cols.get("JOSLA_KAT2")
                def cat(row):
                    for c in ((row[k2] if k2 else None),row[cols["JOSLA_KAT"]]):
                        try:
                            v=int(float(c))
                            if v in USIK_CAT:return USIK_CAT[v]
                        except (TypeError,ValueError):pass
                    return ""
                g=g.set_crs(3059) if g.crs is None else g;g=g.to_crs(4326)
                gs.append(gpd.GeoDataFrame({"cat":[cat(r) for _,r in g.iterrows()],"name":g[cols["NOS_GAL"]].astype(str),"geometry":g.geometry},crs=4326))
        if not gs:print("ŪSIK: nav neviena derīga komplekta",flush=True);return None
        u=gpd.GeoDataFrame(pd.concat(gs,ignore_index=True),crs=4326);u=u[u.cat!=""];u.sindex
        print("ŪSIK ūdensteces",len(u),"kategorijas:",u.cat.value_counts().to_dict(),flush=True);return u
    except Exception as e:print("ŪSIK neizdevās:",repr(e),flush=True);return None

def geom_points(geom):
    """pagasti stands geom -> plakans [lon,lat] saraksts. SCHEMA_VERSION 2: [[ring],[hole],...]; vecais: [[lon,lat],...]. 03.09.2026 pēc pagastu
    pārbūves bbox aprēķins krita ar TypeError (list - float), jo p[0] bija punkts, ne lon."""
    if not geom:return []
    return list(geom) if isinstance(geom[0][0],(int,float)) else [c for ring in geom for c in ring]
def nn(v):
    """NaN/None -> None, lai JSON ir derīgs"""
    try:
        return None if v is None or (isinstance(v,float) and v!=v) else v
    except Exception:return None

def main():
    print("lejupielādē",URL,flush=True);b=fetch(URL,timeout=1800,expect_zip=True);tmp=tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z:z.extractall(tmp)
    roads=gpd.read_file(os.path.join(tmp,"gis_osm_roads_free_1.shp"));roads=roads[roads.fclass.isin(ROAD_TYPES)]
    water=gpd.read_file(os.path.join(tmp,"gis_osm_waterways_free_1.shp"))
    watera=gpd.read_file(os.path.join(tmp,"gis_osm_water_a_free_1.shp"));watera=watera[watera.fclass.isin(["water","reservoir","wetland","riverbank"])]
    watera["ha"]=watera.to_crs(3059).area/10000;watera=watera[watera.ha>=0.1];watera.sindex
    print("OSM ceļi",len(roads),"ūdensteces",len(water),flush=True);roads.sindex;water.sindex
    import pandas as pd
    usik=load_usik()
    os.makedirs("infra",exist_ok=True);n=0
    for f in sorted(glob.glob("pagasti/*.json.gz")):
        pg=os.path.basename(f)[:4]
        with gzip.open(f,"rt",encoding="utf-8") as h:d=json.load(h)
        # SCHEMA_VERSION 2 (#22): geom ir gredzenu saraksts [ārējais,caurums,...]; vecajā formātā — plakans punktu saraksts. Abus saplacina līdz punktiem.
        pts=[c for zv in d["zv"].values() for st in zv["stands"] for c in geom_points(st["geom"])]
        if not pts:continue
        xs=[p[0] for p in pts];ys=[p[1] for p in pts];bb=box(min(xs)-0.03,min(ys)-0.018,max(xs)+0.03,max(ys)+0.018)
        r=roads.iloc[list(roads.sindex.query(bb,predicate="intersects"))];w=water.iloc[list(water.sindex.query(bb,predicate="intersects"))];wa=watera.iloc[list(watera.sindex.query(bb,predicate="intersects"))]
        us=usik.iloc[list(usik.sindex.query(bb,predicate="intersects"))] if usik is not None else None
        def lines(g):
            out=[]
            if g.is_empty:return out
            if g.geom_type=="LineString":out.append(list(g.coords))
            elif g.geom_type in("MultiLineString","GeometryCollection"):
                for p in g.geoms:out+=lines(p)
            return [[list(c)[:2] for c in ln] for ln in out if len(ln)>1]
        def all_polys(gm):
            """GeoJSON mapping (Polygon vai MultiPolygon) -> VISI poligonu fragmenti, katrs kā gredzenu saraksts [ārējais,caurums,...] (#39)."""
            return [gm["coordinates"]] if gm["type"]=="Polygon" else gm["coordinates"]
        out={"pagasts":pg,"updated":datetime.date.today().isoformat(),"src":"OpenStreetMap (Geofabrik)",
             "roads":[{"t":x.fclass,"surface":nn(getattr(x,"surface",None)),"name":nn(x.name),"geom":[[[round(a,6),round(b_,6)] for a,b_ in ln] for ln in lines(x.geometry.intersection(bb))]} for x in r.itertuples() if lines(x.geometry.intersection(bb))],
             "water":[{"t":x.fclass,"name":nn(x.name),"geom":[[[round(a,6),round(b_,6)] for a,b_ in ln] for ln in lines(x.geometry.intersection(bb))]} for x in w.itertuples() if lines(x.geometry.intersection(bb))],
             "usik":[{"t":"river","cat":nn(x.cat),"name":nn(x.name),"geom":[[[round(a,6),round(b_,6)] for a,b_ in ln] for ln in lines(x.geometry.intersection(bb))]} for x in us.itertuples() if lines(x.geometry.intersection(bb))] if us is not None else [],
             "watera":[{"t":x.fclass,"name":nn(x.name),"ha":round(x.ha,2),
                        "geom":[[[[round(a,6),round(b_,6)] for a,b_ in ring] for ring in poly] for poly in all_polys(mapping(x.geometry.intersection(bb)))]}
                       for x in wa.itertuples() if not x.geometry.intersection(bb).is_empty and mapping(x.geometry.intersection(bb))["type"] in ("Polygon","MultiPolygon")]}
        with gzip.open(f"infra/{pg}.json.gz","wt",encoding="utf-8") as h:json.dump(out,h,ensure_ascii=False,separators=(",",":"))
        n+=1
    print("gatavs:",n,"pagastu infra faili,",round(sum(os.path.getsize(x) for x in glob.glob('infra/*.json.gz'))/1e6),"MB",flush=True)
if __name__=="__main__":main()
