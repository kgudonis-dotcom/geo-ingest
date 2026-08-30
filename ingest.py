"""
Ielādē atvērtos ģeodatus Supabase (PostGIS).
Avoti (CKAN API data.gov.lv, resursu saraksts tiek nolasīts dinamiski, tāpēc URL maiņas nesalauž skriptu):
  - VMD Meža valsts reģistra meža dati (nogabali)     dataset: meza-valsts-registra-meza-dati
  - VZD Kadastra informācijas sistēmas telpiskie dati  dataset: kadastra-informacijas-sistemas-atverti-telpiskie-dati
  - DAP Ozols ĪADT / zonējums / mikroliegumi           dataset: ipasi-aizsargajamas-dabas-teritorijas (precizēt pēc pirmās palaišanas)
Palaiž: DATABASE_URL=postgresql://... python ingest.py [--only stands|parcels|protected] [--filter <teksts resursa nosaukumā>]
"""
import os, sys, io, re, json, zipfile, tempfile, argparse, requests
import geopandas as gpd
from sqlalchemy import create_engine, text

CKAN = "https://data.gov.lv/dati/api/3/action/package_show?id="
DATASETS = {
    "stands":    {"id": "meza-valsts-registra-meza-dati", "layer_hint": r"nogab|mezaudz|compart"},
    "parcels":   {"id": "kadastra-informacijas-sistemas-atverti-telpiskie-dati", "layer_hint": r"zemes_?vien|parcel|KKParcel"},
    "protected": {"id": "ipasi-aizsargajamas-dabas-teritorijas", "layer_hint": r"iadt|zon|mikrolieg"},
}
COLMAP = {  # lauku nosaukumu kandidāti; pēc pirmās palaišanas precizē pēc izdrukas
    "kadastrs": ["kadastrs", "kad_apz", "kadastra_a", "parcel_id", "cadnum", "zv_kad_apz", "code"],
    "kvartals": ["kvart", "kvartals", "kv", "kvart_nr"],
    "nogabals": ["nogab", "nogabals", "nog", "nog_nr"],
    "platiba":  ["platiba", "plat", "plat_ha", "area_ha", "shape_area"],
    "name":     ["nosaukums", "name", "iadt_nos"],
    "zone":     ["zona", "zone", "funkc_zona", "zonejums"],
}

def resources(ds_id):
    r = requests.get(CKAN + ds_id, timeout=60); r.raise_for_status()
    res = r.json()["result"]["resources"]
    return [(x.get("name") or x["url"], x["url"]) for x in res if re.search(r"\.zip$|shp", (x.get("url") or "") + (x.get("format") or ""), re.I)]

def pick(cols, key):
    low = {c.lower(): c for c in cols}
    for cand in COLMAP[key]:
        for lc, c in low.items():
            if lc.startswith(cand): return c
    return None

def load_zip(url):
    print("  lejupielādē", url)
    b = requests.get(url, timeout=600).content
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z: z.extractall(tmp)
    shps = [os.path.join(dp, f) for dp, _, fs in os.walk(tmp) for f in fs if f.lower().endswith(".shp")]
    return shps

def to_wgs(gdf):
    if gdf.crs is None: gdf = gdf.set_crs(3059)   # LKS-92
    return gdf.to_crs(4326)

def upsert(engine, table, gdf, kind=None):
    gdf = to_wgs(gdf)
    gdf["geometry"] = gdf.geometry.buffer(0)
    gdf = gdf[~gdf.geometry.is_empty]
    cols = list(gdf.columns)
    rows = []
    for _, r in gdf.iterrows():
        g = r.geometry
        if g.geom_type == "Polygon":
            from shapely.geometry import MultiPolygon; g = MultiPolygon([g])
        attrs = {c: (None if str(r[c]) == "nan" else (r[c].item() if hasattr(r[c], "item") else r[c])) for c in cols if c != "geometry"}
        if table == "parcels":
            k = pick(cols, "kadastrs"); rows.append({"kadastrs": str(r[k]), "platiba_ha": _num(r, pick(cols, "platiba")), "geom": g.wkt})
        elif table == "stands":
            rows.append({"kadastrs": _str(r, pick(cols, "kadastrs")), "kvartals": _str(r, pick(cols, "kvartals")), "nogabals": _str(r, pick(cols, "nogabals")),
                         "platiba_ha": _num(r, pick(cols, "platiba")), "attrs": json.dumps(attrs, default=str, ensure_ascii=False), "geom": g.wkt})
        else:
            rows.append({"kind": kind, "name": _str(r, pick(cols, "name")), "zone": _str(r, pick(cols, "zone")), "attrs": json.dumps(attrs, default=str, ensure_ascii=False), "geom": g.wkt})
    sql = {
        "parcels": "insert into parcels(kadastrs,platiba_ha,geom) values (:kadastrs,:platiba_ha,st_multi(st_geomfromtext(:geom,4326))) on conflict (kadastrs) do update set platiba_ha=excluded.platiba_ha, geom=excluded.geom, updated_at=now()",
        "stands": "insert into stands(kadastrs,kvartals,nogabals,platiba_ha,attrs,geom) values (:kadastrs,:kvartals,:nogabals,:platiba_ha,cast(:attrs as jsonb),st_multi(st_geomfromtext(:geom,4326)))",
        "protected": "insert into protected(kind,name,zone,attrs,geom) values (:kind,:name,:zone,cast(:attrs as jsonb),st_multi(st_geomfromtext(:geom,4326)))",
    }[table]
    with engine.begin() as con:
        for i in range(0, len(rows), 500):
            con.execute(text(sql), rows[i:i+500])
    print(f"  {table}: {len(rows)} rindas")

def _str(r, c): return None if c is None else str(r[c])
def _num(r, c):
    try: return None if c is None else float(r[c])
    except Exception: return None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--filter", default=""); ap.add_argument("--dry", action="store_true"); ap.add_argument("--first", action="store_true")
    a = ap.parse_args()
    engine = None if a.dry else create_engine(os.environ["DATABASE_URL"])
    for table, ds in DATASETS.items():
        if a.only and a.only != table: continue
        print("==", table, ds["id"])
        res = resources(ds["id"])
        if not res: print("  nav SHP resursu, pārbaudi datu kopas id"); continue
        if not a.dry and table != "parcels":
            with engine.begin() as con: con.execute(text(f"truncate {table}"))
        done=False
        for name, url in res:
            if a.filter and a.filter.lower() not in (name + url).lower(): continue
            if a.first and done: break
            done=True
            for shp in load_zip(url):
                gdf = gpd.read_file(shp)
                print(f"  {os.path.basename(shp)}: {len(gdf)} objekti, lauki: {list(gdf.columns)}")
                if a.dry: continue
                kind = "mikroliegums" if re.search(r"mikro", shp, re.I) else ("zona" if re.search(r"zon", shp, re.I) else "iadt")
                upsert(engine, table, gdf, kind)
    if engine:
        with engine.begin() as con:
            # nogabaliem bez kadastra: piešķir pēc telpiskās pārklāšanās ar zemes vienību
            con.execute(text("""update stands s set kadastrs = p.kadastrs from parcels p
                where (s.kadastrs is null or s.kadastrs='' or s.kadastrs='None') and st_intersects(s.geom,p.geom)
                and st_area(st_intersection(s.geom,p.geom)::geography) > 0.5*st_area(s.geom::geography)"""))
    print("gatavs")

if __name__ == "__main__":
    main()
