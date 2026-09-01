"""Ceļi un grāvji pa pagastiem no OpenStreetMap (Geofabrik Latvia, SHP ekstrakts).
Izvade: infra/<PPPP>.json.gz  {"roads":[{t,surface,name,geom:[[lon,lat]...]}], "water":[{t,name,geom}]}
Pagasta apgabals = pagasti/<PPPP>.json.gz zemes vienību aptverošais taisnstūris + 2 km."""
import os, io, json, gzip, zipfile, tempfile, glob, requests, datetime
import geopandas as gpd
from shapely.geometry import box, mapping
URL="https://download.geofabrik.de/europe/latvia-latest-free.shp.zip"
ROAD_TYPES={"motorway","trunk","primary","secondary","tertiary","unclassified","residential","service","track","living_street","road","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link","path"}
def main():
    print("lejupielādē",URL,flush=True);b=requests.get(URL,timeout=1800).content;tmp=tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z:z.extractall(tmp)
    roads=gpd.read_file(os.path.join(tmp,"gis_osm_roads_free_1.shp"));roads=roads[roads.fclass.isin(ROAD_TYPES)]
    water=gpd.read_file(os.path.join(tmp,"gis_osm_waterways_free_1.shp"))
    print("OSM ceļi",len(roads),"ūdensteces",len(water),flush=True);roads.sindex;water.sindex
    os.makedirs("infra",exist_ok=True);n=0
    for f in sorted(glob.glob("pagasti/*.json.gz")):
        pg=os.path.basename(f)[:4]
        with gzip.open(f,"rt",encoding="utf-8") as h:d=json.load(h)
        pts=[c for zv in d["zv"].values() for st in zv["stands"] for c in st["geom"]]
        if not pts:continue
        xs=[p[0] for p in pts];ys=[p[1] for p in pts];bb=box(min(xs)-0.03,min(ys)-0.018,max(xs)+0.03,max(ys)+0.018)
        r=roads.iloc[list(roads.sindex.query(bb,predicate="intersects"))];w=water.iloc[list(water.sindex.query(bb,predicate="intersects"))]
        def lines(g):
            gm=mapping(g);return gm["coordinates"] if gm["type"]=="MultiLineString" else [gm["coordinates"]]
        out={"pagasts":pg,"updated":datetime.date.today().isoformat(),"src":"OpenStreetMap (Geofabrik)",
             "roads":[{"t":x.fclass,"surface":getattr(x,"surface",None) or None,"name":x.name or None,"geom":[[[round(a,6),round(b_,6)] for a,b_ in ln] for ln in lines(x.geometry.intersection(bb))]} for x in r.itertuples() if not x.geometry.intersection(bb).is_empty],
             "water":[{"t":x.fclass,"name":x.name or None,"geom":[[[round(a,6),round(b_,6)] for a,b_ in ln] for ln in lines(x.geometry.intersection(bb))]} for x in w.itertuples() if not x.geometry.intersection(bb).is_empty]}
        with gzip.open(f"infra/{pg}.json.gz","wt",encoding="utf-8") as h:json.dump(out,h,ensure_ascii=False,separators=(",",":"))
        n+=1
    print("gatavs:",n,"pagastu infra faili,",round(sum(os.path.getsize(x) for x in glob.glob('infra/*.json.gz'))/1e6),"MB",flush=True)
if __name__=="__main__":main()
