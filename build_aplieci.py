"""Izsniegto ciršanas apliecinājumu cirsmas no VMD ģeoportāla (ArcGIS REST), katru dienu.
Izvade: aplieci/<tileX>_<tileY>.json (10 km LKS-92 režģis) ar GeoJSON features (WGS84) + atribūtiem; aplieci/index.json ar slāņa aprakstu."""
import os, re, json, datetime, requests, math
BASES=["https://gis.vmd.gov.lv/arcgis/rest/services","https://gis.vmd.gov.lv/server/rest/services"]
OUT="aplieci"
def get(url,**p):
    p.setdefault("f","json");r=requests.get(url,params=p,timeout=120);r.raise_for_status();return r.json()
def walk(base):
    found=[];seen=set()
    def rec(url):
        try:j=get(url)
        except Exception as e:print("  x",url,e);return
        for f in j.get("folders",[]):rec(f"{base}/{f}")
        for s in j.get("services",[]):
            su=f"{base}/{s['name']}/{s['type']}"
            if su in seen:continue
            seen.add(su)
            try:sj=get(su)
            except Exception:continue
            for l in sj.get("layers",[]):
                nm=f"{s['name']}/{l.get('name','')}"
                if re.search(r"cirsm|apliec",nm,re.I):found.append((f"{su}/{l['id']}",nm))
    rec(base);return found
def to_wgs(x,y):  # LKS-92 -> WGS84 (aptuveni caur pyproj)
    from pyproj import Transformer
    return Transformer.from_crs(3059,4326,always_xy=True).transform(x,y)
def main():
    os.makedirs(OUT,exist_ok=True);layers=[]
    for b in BASES:
        try:layers+=walk(b)
        except Exception as e:print("bāze nav pieejama",b,e)
    print("kandidātslāņi:",layers,flush=True)
    json.dump({"updated":datetime.datetime.utcnow().isoformat(),"layers":layers},open(f"{OUT}/index.json","w"),ensure_ascii=False)
    if not layers:print("apliecinājumu slānis nav atrasts; index.json ar tukšu sarakstu");return
    url,name=layers[0]
    info=get(url);print("slānis:",name,"lauki:",[f["name"] for f in info.get("fields",[])],"maxRec:",info.get("maxRecordCount"),flush=True)
    step=min(int(info.get("maxRecordCount") or 1000),2000);off=0;tiles={}
    from shapely.geometry import shape
    from shapely.ops import transform
    from pyproj import Transformer
    tr=Transformer.from_crs(4326,3059,always_xy=True)
    while True:
        j=get(f"{url}/query",where="1=1",outFields="*",outSR=4326,resultOffset=off,resultRecordCount=step,f="geojson")
        feats=j.get("features",[])
        for f in feats:
            try:g=shape(f["geometry"]);c=transform(tr.transform,g).centroid;tk=f"{int(c.x//10000)}_{int(c.y//10000)}"
            except Exception:continue
            f["properties"]={k:v for k,v in f["properties"].items() if v not in (None,"")}
            tiles.setdefault(tk,[]).append(f)
        print("  ",off,len(feats),flush=True)
        if len(feats)<step or not j.get("properties",{}).get("exceededTransferLimit",True):break
        off+=step
        if off>500000:break
    for tk,fs in tiles.items():
        json.dump({"type":"FeatureCollection","features":fs},open(f"{OUT}/{tk}.json","w"),ensure_ascii=False,separators=(",",":"))
    print(f"gatavs: {sum(len(v) for v in tiles.values())} cirsmas, {len(tiles)} flīzes",flush=True)
if __name__=="__main__":main()
