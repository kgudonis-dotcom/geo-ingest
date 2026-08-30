"""Ielādē LV atvērtos ģeodatus Supabase PostGIS. Lauki fiksēti pēc 2026-08 dry-run izdrukas."""
import os, io, re, json, zipfile, tempfile, argparse, requests
import geopandas as gpd
from shapely.geometry import MultiPolygon
from shapely import wkb
from sqlalchemy import create_engine, text

CKAN = "https://data.gov.lv/dati/api/3/action/package_show?id="
CLASSIFIERS_URL = "https://gis.vmd.gov.lv/Public/GetClasificators"
DATASETS = {
    "stands":    "meza-valsts-registra-meza-dati",
    "protected": "ipasi-aizsargajamas-dabas-teritorijas",
    "expl":      "kadastra-informacijas-sistemas-atverti-dati",
}
STAND_ATTRS = ["zkat","mt","izc","jakopj","jaatjauno","p_darbv","p_darbg","p_cirp","p_cirg","atj_gads","plant_audz",
 "s10","a10","h10","d10","g10","n10","s11","a11","h11","d11","g11","n11","s12","a12","h12","d12","g12","n12",
 "s13","a13","h13","d13","g13","n13","s14","a14","h14","d14","g14","n14"]
SIMPLIFY_M = 2.0

def resources(ds_id):
    r = requests.get(CKAN + ds_id, timeout=60); r.raise_for_status()
    return [(x.get("name") or x["url"], x["url"]) for x in r.json()["result"]["resources"]
            if (x.get("url") or "").lower().endswith(".zip")]

def load_zip(url):
    print("  lejupielādē", url, flush=True)
    b = requests.get(url, timeout=1800).content
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(io.BytesIO(b)) as z: z.extractall(tmp)
    return [os.path.join(dp, f) for dp, _, fs in os.walk(tmp) for f in fs if f.lower().endswith(".shp")]

def prep(gdf):
    if gdf.crs is None: gdf = gdf.set_crs(3059)
    gdf["geometry"] = gdf.geometry.simplify(SIMPLIFY_M, preserve_topology=True).buffer(0)
    gdf = gdf[~gdf.geometry.is_empty & gdf.geometry.notna()]
    return gdf.to_crs(4326)

def gwkb(g):
    if g.geom_type == "Polygon": g = MultiPolygon([g])
    return wkb.dumps(g, hex=True)

def ins(con, sql, rows, n=1000):
    for i in range(0, len(rows), n): con.execute(text(sql), rows[i:i+n])

def do_stands(engine, url):
    for shp in load_zip(url):
        gdf = gpd.read_file(shp)
        cols = {c.lower(): c for c in gdf.columns}
        gdf = prep(gdf)
        rows = []
        for r in gdf.itertuples(index=False):
            d = r._asdict() if hasattr(r, "_asdict") else dict(zip(gdf.columns, r))
            attrs = {k: d[cols[k]] for k in STAND_ATTRS if k in cols and str(d[cols[k]]) not in ("nan","None","0","0.0","")}
            rows.append({"kadastrs": str(d[cols["kadastrs"]]), "kvartals": str(d[cols["kvart"]]),
                "nogabals": (str(d[cols["nog"]]) + ("."+str(d[cols["anog"]]) if cols.get("anog") and str(d[cols["anog"]]) not in ("0","nan","None","") else "")),
                "platiba_ha": float(d[cols["nog_plat"]]) if cols.get("nog_plat") else None,
                "attrs": json.dumps(attrs, default=str, ensure_ascii=False), "geom": gwkb(d["geometry"])})
        with engine.begin() as con:
            ins(con, "insert into stands(kadastrs,kvartals,nogabals,platiba_ha,attrs,geom) values (:kadastrs,:kvartals,:nogabals,:platiba_ha,cast(:attrs as jsonb),st_setsrid(st_geomfromwkb(decode(:geom,'hex')),4326))", rows)
        print(f"  {os.path.basename(shp)}: {len(rows)} nogabali", flush=True)
        with engine.begin() as con:
            print("  db size:", con.execute(text("select pg_size_pretty(pg_database_size(current_database()))")).scalar(), flush=True)

def do_protected(engine, url):
    for shp in load_zip(url):
        kind = "zona" if re.search("zonejum", shp, re.I) else ("mikroliegums" if re.search("mikro", shp, re.I) else "iadt")
        gdf = prep(gpd.read_file(shp))
        cols = {c.lower(): c for c in gdf.columns}
        rows = []
        for r in gdf.itertuples(index=False):
            d = dict(zip(gdf.columns, r))
            name = str(d.get(cols.get("site_name") or cols.get("name"), "")) if kind=="zona" else str(d.get(cols.get("name"), ""))
            zone = str(d.get(cols.get("name"), "")) if kind=="zona" else str(d.get(cols.get("category"), ""))
            attrs = {k: str(v) for k, v in d.items() if k != "geometry" and str(v) not in ("nan","None","")}
            rows.append({"kind": kind, "name": name, "zone": zone, "attrs": json.dumps(attrs, ensure_ascii=False), "geom": gwkb(d["geometry"])})
        with engine.begin() as con:
            ins(con, "insert into protected(kind,name,zone,attrs,geom) values (:kind,:name,:zone,cast(:attrs as jsonb),st_setsrid(st_geomfromwkb(decode(:geom,'hex')),4326))", rows, 300)
        print(f"  {os.path.basename(shp)}: {len(rows)} {kind}", flush=True)

def do_expl(engine, url):
    """VZD teksta dati: zemes vienību lietošanas veidu eksplikācija -> expl(kadastrs, nilm, platiba_ha)."""
    import csv, io as _io
    b = requests.get(url, timeout=1800).content
    rows = []
    with zipfile.ZipFile(_io.BytesIO(b)) as z:
        names = z.namelist()
        cand = [n for n in names if re.search(r"lieto|nilm|expl", n, re.I) and n.lower().endswith((".csv",".txt"))]
        if not cand:
            print("  zip satur:", names[:15], "... lietošanas veidu fails nav atrasts", flush=True); return
        for n in cand:
            raw = z.read(n)
            for enc in ("utf-8-sig","utf-8","cp1257"):
                try: txt = raw.decode(enc); break
                except Exception: continue
            sniff = txt[:2000]; delim = ";" if sniff.count(";")>=sniff.count(",") else ","
            rd = csv.reader(_io.StringIO(txt), delimiter=delim)
            hdr = [h.strip().lower() for h in next(rd)]
            def col(*keys):
                for i,h in enumerate(hdr):
                    if any(k in h for k in keys): return i
                return None
            ik = col("apz","kadastr"); inl = col("nilm","lietošanas veida kods","lietosanas veida kods","veida kods"); ip = col("platīb","platib","area")
            print(f"  {n}: kolonnas {hdr[:8]} -> kad={ik} nilm={inl} plat={ip}", flush=True)
            if ik is None or inl is None or ip is None: continue
            for r in rd:
                try:
                    kad = re.sub(r"\D","",r[ik])
                    if len(kad)!=11: continue
                    ha = float(str(r[ip]).replace(",","."))
                    if ha>10000: ha = ha/10000  # m2 -> ha
                    rows.append({"kadastrs":kad,"nilm":str(r[inl]).strip(),"platiba_ha":ha})
                except Exception: pass
    if rows:
        with engine.begin() as con:
            ins(con, "insert into expl(kadastrs,nilm,platiba_ha) values (:kadastrs,:nilm,:platiba_ha)", rows, 5000)
        print(f"  expl: {len(rows)} rindas", flush=True)

def do_classifiers(engine):
    """VMD DBF_specifikacija: klasifikatoru lapas (APROB, MT, S, ZKAT, P_CIRP, P_DARBV, BV, BA, BON) -> classifiers tabula."""
    try:
        import pandas as pd
        r = requests.get(CLASSIFIERS_URL, timeout=120); r.raise_for_status()
        data = r.content
        if data[:2] not in (b"PK", b"\xd0\xcf"):  # ne xlsx/xls: varbūt lapa ar saiti
            m = re.search(rb'href="([^"]+\.(?:xlsx?|zip))"', data, re.I)
            if not m: print("  klasifikatoru fails nav atrasts, izlaižu", flush=True); return
        url2 = m.group(1).decode() if data[:2] not in (b"PK", b"\xd0\xcf") else None
        if url2:
            if url2.startswith("/"): url2 = "https://gis.vmd.gov.lv" + url2
            data = requests.get(url2, timeout=120).content
        import io as _io
        if data[:2] == b"PK" and b"[Content_Types]" not in data[:2000]:
            with zipfile.ZipFile(_io.BytesIO(data)) as z:
                name = next(n for n in z.namelist() if re.search(r"\.xlsx?$", n, re.I)); data = z.read(name)
        sheets = pd.read_excel(_io.BytesIO(data), sheet_name=None)
        rows = []
        for sh, df in sheets.items():
            key = re.sub(r"_?klasifikators.*", "", sh, flags=re.I).strip().upper()
            if df.shape[1] < 2: continue
            df = df.dropna(how="all")
            for _, rr in df.iterrows():
                code, val = str(rr.iloc[0]).strip(), str(rr.iloc[1]).strip()
                if code and code.lower() not in ("nan","kods","code"):
                    rows.append({"code_set": key, "code": code, "value": val})
        with engine.begin() as con:
            con.execute(text("create table if not exists classifiers(code_set text, code text, value text)"))
            con.execute(text("truncate classifiers"))
            ins(con, "insert into classifiers(code_set,code,value) values (:code_set,:code,:value)", rows)
        print(f"  classifiers: {len(rows)} rindas no {len(sheets)} lapām", flush=True)
    except Exception as e:
        print("  klasifikatoru ielāde neizdevās:", e, flush=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--filter", default=""); ap.add_argument("--dry", action="store_true"); ap.add_argument("--first", action="store_true")
    a = ap.parse_args()
    engine = None if a.dry else create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
    if engine and (not a.only or a.only == "classifiers"): do_classifiers(engine)
    for table, ds in DATASETS.items():
        if a.only and a.only != table: continue
        print("==", table, ds, flush=True)
        res = resources(ds)
        if engine: 
            with engine.begin() as con: con.execute(text(f"truncate {table}"))
        for name, url in res:
            if a.filter and a.filter.lower() not in (name + url).lower(): continue
            if a.dry:
                for shp in load_zip(url): print(" ", os.path.basename(shp), list(gpd.read_file(shp, rows=1).columns), flush=True)
            elif table == "stands": do_stands(engine, url)
            elif table == "expl": do_expl(engine, url)
            else: do_protected(engine, url)
            if a.first: break
    print("gatavs", flush=True)

if __name__ == "__main__":
    main()
