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
# sasniedzamības pārbaude no GitHub skrējēja
for host in ["https://lvmgeo.lvm.lv/","https://gis.vmd.gov.lv/","https://gis.vmd.gov.lv/arcgis/rest/services?f=json","https://melioracija.lv/","https://geolatvija.lv/","https://karte.lad.gov.lv/","https://data.gov.lv/"]:
    try:r=requests.get(host,timeout=15);print("OK ",r.status_code,host)
    except Exception as e:print("X  ",host,type(e).__name__)
# LVM GEO public SHP catalog (ceļi)
for u in ["https://lvmgeo.lvm.lv/PublicData/SHP/","https://lvmgeo.lvm.lv/PublicData/"]:
    try:
        t=requests.get(u,timeout=60).text;print("\n== LVM PublicData saraksts",u,":",re.findall(r'href="([^"]+\.zip)"',t)[:40])
    except Exception as e:print("lvmgeo saraksts nav pieejams:",e)
