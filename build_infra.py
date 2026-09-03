"""Ceļi un grāvji pa pagastiem no OpenStreetMap (Geofabrik Latvia, SHP ekstrakts).
Izvade: infra/<PPPP>.json.gz  {"roads":[{t,surface,name,geom:[[lon,lat]...]}], "water":[{t,name,geom}], "watera":[{t,name,ha,geom:[[ring0,caurums1,...],[poly2_ring0,...]]}]}
#39: watera["geom"] ir MultiPolygon.coordinates formātā (VISI poligonu fragmenti UN caurumi) — iepriekš bbox apgriešana lielu
ūdensobjektu (piem. Daugavu) sadalīja vairākos fragmentos, un kods paturēja TIKAI lielāko fragmentu bez caurumiem (#22 tipa kļūda),
tāpēc joslas bieži neaizsniedza nogabalus, kas robežojās ar mazāku (izmestu) fragmentu.
Pagasta apgabals = pagasti/<PPPP>.json.gz zemes vienību aptverošais taisnstūris + 2 km."""
import os, io, json, gzip, zipfile, tempfile, glob, requests, datetime
import geopandas as gpd
from shapely.geometry import box, mapping
URL="https://download.geofabrik.de/europe/latvia-latest-free.shp.zip"
ROAD_TYPES={"motorway","trunk","primary","secondary","tertiary","unclassified","residential","service","track","living_street","road","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link","path"}
USIK_DS="dati-par-udens-saimnieciskajiem-iecirkniem-un-udenstecu-garuma-kategorijam"  # VARAM: ūdensteču garuma kategorijas pēc Aizsargjoslu lik. 7.p. (MK 397 pielikumi)
def load_usik():
    """Ūdensteces >10 km ar garuma kategoriju (10-25 / 25-100 / >100 km) -> GeoDataFrame EPSG:4326 ar 'cat','name'."""
    try:
        res=[x for x in requests.get("https://data.gov.lv/dati/api/3/action/package_show?id="+USIK_DS,timeout=60).json()["result"]["resources"] if (x.get("url") or "").lower().endswith((".zip",".shp"))]
        gs=[]
        for r in res:
            b=requests.get(r["url"],timeout=600).content;tmp=tempfile.mkdtemp()
            with zipfile.ZipFile(io.BytesIO(b)) as z:z.extractall(tmp)
            for dp,_,fs in os.walk(tmp):
                for f in fs:
                    if not f.lower().endswith(".shp"):continue
                    g=gpd.read_file(os.path.join(dp,f));print("  ŪSIK",f,len(g),list(g.columns)[:14],flush=True)
                    if not len(g) or not g.geometry.iloc[0].geom_type.endswith("LineString"):continue
                    cols={c.lower():c for c in g.columns}
                    cc=next((cols[c] for c in cols if "kateg" in c or "garum" in c or c in("kat","kat_gar")),None)
                    nc=next((cols[c] for c in cols if "nosauk" in c or c=="name" or "upe" in c),None)
                    g=g.set_crs(3059) if g.crs is None else g;g=g.to_crs(4326)
                    gs.append(gpd.GeoDataFrame({"cat":g[cc].astype(str) if cc else "","name":g[nc].astype(str) if nc else "","geometry":g.geometry},crs=4326))
        if not gs:return None
        u=gpd.GeoDataFrame(pd.concat(gs,ignore_index=True),crs=4326);u.sindex;print("ŪSIK ūdensteces",len(u),"kategorijas:",u.cat.value_counts().head(8).to_dict(),flush=True);return u
    except Exception as e:print("ŪSIK neizdevās:",e,flush=True);return None

def nn(v):
    """NaN/None -> None, lai JSON ir derīgs"""
    try:
        return None if v is None or (isinstance(v,float) and v!=v) else v
    except Exception:return None

def main():
    print("lejupielādē",URL,flush=True);b=requests.get(URL,timeout=1800).content;tmp=tempfile.mkdtemp()
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
        pts=[c for zv in d["zv"].values() for st in zv["stands"] for c in st["geom"]]
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
