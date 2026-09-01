"""Izlūkošana: atrod data.gov.lv datu kopas izvešanas ceļu modelim (ceļi, grāvji, hidrogrāfija, reljefs) un izdrukā resursu URL + SHP laukus."""
import requests, re, io, zipfile, tempfile, os
Q=["LVM meža autoceļi","autoceļi LVC valsts ceļi","meliorācijas kadastrs grāvji","ūdensteces hidrogrāfija LĢIA","digitālais reljefa modelis LĢIA","LAD lauku bloki"]
S="https://data.gov.lv/dati/api/3/action/package_search"
for q in Q:
    print("\n==",q)
    try:r=requests.get(S,params={"q":q,"rows":6},timeout=60).json()["result"]["results"]
    except Exception as e:print(" x",e);continue
    for d in r:
        print(f" - {d['name']} | {d.get('title','')[:70]} | org={d.get('organization',{}).get('name')} | freq={d.get('frequency','')}")
        for res in d.get("resources",[])[:6]:
            print(f"     · {res.get('format','')} {res.get('url','')[:110]}")
# DAP Ozols: ArcGIS REST "Dabas vērtību ģeotelpiskie dati" (ikdienas)
try:
    j=requests.get("https://data.gov.lv/dati/api/3/action/package_search",params={"q":"Dabas vērtību ģeotelpiskie dati","rows":3},timeout=60).json()
    for x in j["result"]["results"]:
        print("\n== DAP:",x["name"],x.get("title","")[:60])
        for res in x.get("resources",[]):print("   ·",res.get("format"),res.get("url","")[:140])
        for res in x.get("resources",[]):
            u=res.get("url","")
            if "rest/services" in u or "arcgis" in u.lower():
                try:
                    r=requests.get(u,params={"f":"json"},timeout=30);print("   REST",r.status_code,u[:100]);jj=r.json()
                    print("   folders:",jj.get("folders"),"services:",[s["name"] for s in jj.get("services",[])][:20],"layers:",[l.get("name") for l in jj.get("layers",[])][:30])
                except Exception as e:print("   X REST",u[:80],type(e).__name__)
except Exception as e:print("DAP meklēšana neizdevās:",e)
# ĢeoLatvija / LĢIA: INSPIRE hidrogrāfija, reljefa modelis, topo 1:50k, LAD bloki
for u in ["https://geo-dpps.viss.gov.lv/api/DPPSPackage/client/Pakalpojum_292_OZr5ZQ/fbc1515c-c78c-4642-a1cb-14ef0f899f60",
          "https://geo-dpps.viss.gov.lv/api/DPPSPackage/client/Latvijas_m_259_AxFwk2/27d156d8-e181-4e6b-8695-647bf731a0b2",
          "https://geolatvija.lv/api/v1/atom/3dd3b0c4-c37f-446c-83fe-eb0d95a03abf/serviceatoma",
          "https://data.gov.lv/dati/api/3/action/package_search?q=hidrogr%C4%81fija&rows=5",
          "https://data.gov.lv/dati/api/3/action/package_search?q=reljefa%20modelis&rows=5",
          "https://data.gov.lv/dati/api/3/action/package_search?q=topogr%C4%81fisk%C4%81%20karte%2050%20000&rows=5"]:
    try:
        r=requests.get(u,timeout=60);print("\n== ",r.status_code,r.headers.get("content-type","")[:40],u[:100]);t=r.text
        if "json" in r.headers.get("content-type",""):
            try:
                j=r.json();res=j.get("result",{}).get("results",[])
                for x in res:print("  -",x["name"],"|",x.get("title","")[:60]);[print("      ·",q.get("format"),q.get("url","")[:120]) for q in x.get("resources",[])[:5]]
                if not res:print("  ",t[:600])
            except Exception:print("  ",t[:600])
        else:print("  ",re.sub(r"\s+"," ",t)[:700])
    except Exception as e:print("X  ",u[:80],type(e).__name__)
# sasniedzamības pārbaude no GitHub skrējēja
# jaunais LVM ģeoserveris: WFS iespējas un slāņi
for u in ["https://geoserver.lvmgeo.lv/wmsvector62531a9bfcfa4015856924e94076a179?service=WFS&request=GetCapabilities","https://geoserver.lvmgeo.lv/wmsvector62531a9bfcfa4015856924e94076a179?service=WMS&request=GetCapabilities","https://lvmgeoserver.lvm.lv/geoserver/publicwfs/ows?service=WFS&request=GetCapabilities"]:
    try:
        r=requests.get(u,timeout=30);t=r.text;print("\n== ",r.status_code,u[:80]);names=re.findall(r"<(?:wfs:)?Name>([^<]+)</(?:wfs:)?Name>|<Layer[^>]*>\s*<Name>([^<]+)</Name>",t)
        print("   slāņi:",[a or b for a,b in names][:80]);print("   WFS:", "WFS_Capabilities" in t or "FeatureTypeList" in t)
    except Exception as e:print("X  ",u[:80],type(e).__name__)
for host in ["https://lvmgeo.lvm.lv/","https://gis.vmd.gov.lv/","https://gis.vmd.gov.lv/arcgis/rest/services?f=json","https://melioracija.lv/","https://geolatvija.lv/","https://karte.lad.gov.lv/","https://data.gov.lv/"]:
    try:r=requests.get(host,timeout=15);print("OK ",r.status_code,host)
    except Exception as e:print("X  ",host,type(e).__name__)
# LVM GEO public SHP catalog (ceļi)
for u in ["https://lvmgeo.lvm.lv/PublicData/SHP/","https://lvmgeo.lvm.lv/PublicData/"]:
    try:
        t=requests.get(u,timeout=60).text;print("\n== LVM PublicData saraksts",u,":",re.findall(r'href="([^"]+\.zip)"',t)[:40])
    except Exception as e:print("lvmgeo saraksts nav pieejams:",e)
