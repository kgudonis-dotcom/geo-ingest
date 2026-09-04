"""Sentinel-2 vainaga zudums pa nogabaliem (Copernicus Data Space, Sentinel Hub Statistical API).
Salīdzina vasaras (jūn-aug) vidējo NDVI pērn un šogad; kritums > 0.25 = vainaga zudums (izcirtums, vējgāze, mizgrauzis).
Tests: python sentinel.py --kad 70600050074 ; Pilns: --pagasts 7060 (visas ZV) -> sentinel/<PPPP>.json.gz
#19: --kad pieņem arī komatu atdalītu sarakstu (var aptvert vairākus pagastus vienā palaidienā); --neighbors N katram
--kad ZV papildus apstrādā tās top-N kaimiņus (pēc robežas garuma, no zvd["kaimini"], tikai tā paša pagasta ietvaros —
nakts darbam (sentinel-nightly.yml, SENTINEL_WATCH). Izvade APVIENOJAS ar iepriekšējo sentinel/<PPPP>.json.gz, nevis
pārraksta — citādi katra nākamā palaišana dzēstu iepriekšējo vēsturi (bija kļūda pirms #19)."""
import os, sys, json, gzip, argparse, datetime, requests, time
TOKEN_URL="https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
STATS_URL="https://sh.dataspace.copernicus.eu/api/v1/statistics"
EVAL="""//VERSION=3
function setup(){return {input:[{bands:["B04","B08","SCL","dataMask"]}],output:[{id:"ndvi",bands:1},{id:"dataMask",bands:1}]};}
function evaluatePixel(s){var ok=(s.SCL==4||s.SCL==5||s.SCL==6||s.SCL==7)?1:0; // veģetācija, kaila augsne, ūdens, neklasificēts; bez mākoņiem/ēnām/sniega
 return {ndvi:[(s.B08-s.B04)/(s.B08+s.B04+1e-6)],dataMask:[s.dataMask*ok]};}"""
def token():
    r=requests.post(TOKEN_URL,data={"grant_type":"client_credentials","client_id":os.environ["CDSE_ID"],"client_secret":os.environ["CDSE_SECRET"]},timeout=60);r.raise_for_status();return r.json()["access_token"]
def stats(tok,rings,t0,t1):
    # rings: GeoJSON Polygon coordinates (ārējais + caurumi) — caurumu platība NDVI statistikā netiek ieskaitīta
    body={"input":{"bounds":{"geometry":{"type":"Polygon","coordinates":rings},"properties":{"crs":"http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},"data":[{"type":"sentinel-2-l2a","dataFilter":{"timeRange":{"from":t0+"T00:00:00Z","to":t1+"T23:59:59Z"},"maxCloudCoverage":40}}]},
          "aggregation":{"timeRange":{"from":t0+"T00:00:00Z","to":t1+"T23:59:59Z"},"aggregationInterval":{"of":"P1D"},"evalscript":EVAL,"resx":10,"resy":10},
          "calculations":{"ndvi":{"statistics":{"default":{"percentiles":{"k":[50]}}}}}}
    for i in range(3):
        r=requests.post(STATS_URL,headers={"Authorization":"Bearer "+tok},json=body,timeout=120)
        if r.status_code==429:time.sleep(5);continue
        if r.status_code!=200:return None,r.text[:200]
        vals=[]
        for it in r.json().get("data",[]):
            st=it.get("outputs",{}).get("ndvi",{}).get("bands",{}).get("B0",{}).get("stats",{})
            if st.get("sampleCount",0)>0 and st.get("noDataCount",0)<st["sampleCount"]*0.5 and st.get("percentiles"):vals.append(st["percentiles"]["50.0"])
        vals.sort();return (vals[len(vals)//2] if vals else None),None
    return None,"429"
def analyse(tok,kad,zv,yr):
    out=[]
    for st in zv["stands"]:
        # SCHEMA_VERSION 2 (#22): geom = [ārējais gredzens, caurums, ...]; vecais formāts = plakans gredzens. Ar veco kodu len(rings)<4 klusi izlaida VISUS nogabalus.
        g=st["geom"];rings=[g] if g and isinstance(g[0][0],(int,float)) else g
        if not rings or len(rings[0])<4:continue
        a,e1=stats(tok,rings,f"{yr-1}-06-01",f"{yr-1}-08-31");b,e2=stats(tok,rings,f"{yr}-06-01",f"{yr}-08-31")
        d=None if a is None or b is None else round(b-a,3)
        flag="zudums" if d is not None and d<-0.25 else ("kritums" if d is not None and d<-0.12 else "")
        out.append({"kv":st.get("kv"),"nog":st.get("nog"),"ndvi_prev":a and round(a,3),"ndvi_now":b and round(b,3),"delta":d,"flag":flag,"err":e1 or e2,"checked":datetime.date.today().isoformat()}) # #19: katram ierakstam sava pārbaudes diena (apvienotā failā ieraksti no dažādām naktīm)
        print(f"  {kad} kv{st.get('kv')} nog{st.get('nog')}: {a and round(a,2)} -> {b and round(b,2)} {flag} {e1 or e2 or ''}",flush=True)
    return out
def load_merge_write(pg,yr,res):
    # #19: apvieno ar iepriekšējo sentinel/<pg>.json.gz (ja ir), nevis pārraksta -- šī palaidiena atjauno tikai to ZV, ko tā apstrādāja
    old={}
    try:
        with gzip.open(f"sentinel/{pg}.json.gz","rt",encoding="utf-8") as f:old=json.load(f).get("zv",{})
    except (FileNotFoundError,OSError,json.JSONDecodeError):pass
    merged=dict(old);merged.update(res)
    os.makedirs("sentinel",exist_ok=True)
    with gzip.open(f"sentinel/{pg}.json.gz","wt",encoding="utf-8") as f:json.dump({"pagasts":pg,"year":yr,"updated":datetime.date.today().isoformat(),"zv":merged},f,ensure_ascii=False)
    return merged
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--kad");ap.add_argument("--pagasts");ap.add_argument("--limit",type=int,default=0)
    ap.add_argument("--neighbors",type=int,default=0,help="#19: katram --kad papildus apstrādā tā top-N kaimiņus (zvd.kaimini, tikai tā paša pagasta)")
    a=ap.parse_args()
    yr=datetime.date.today().year;tok=token();print("Copernicus autorizācija OK",flush=True)
    if a.kad:
        kads_in=[k.strip() for k in a.kad.split(",") if k.strip()] # #19: --kad tagad pieņem arī komatu atdalītu sarakstu, var aptvert vairākus pagastus
        by_pg={}
        for k in kads_in:by_pg.setdefault(k[:4],[]).append(k)
    else:
        pg0=(a.pagasts or "")[:4]
        by_pg={pg0:None} # None = visas ZV šajā pagastā (vecā --pagasts uzvedība)
    totalZV=0;totalFlag=0
    for pg,klist in by_pg.items():
        with gzip.open(f"pagasti/{pg}.json.gz","rt",encoding="utf-8") as f:d=json.load(f)
        kads=list(klist) if klist else list(d["zv"].keys())
        if a.neighbors and klist: # kaimiņu paplašināšana tikai --kad (nakts) ceļā, ne --pagasts (viss pagasts jau ir viss)
            seen=set(kads)
            for k in list(kads):
                zvd=d["zv"].get(k)
                if not zvd:continue
                for nb in (zvd.get("kaimini") or [])[:a.neighbors]:
                    nk=nb.get("kad")
                    if nk and nk not in seen and nk[:4]==pg:seen.add(nk);kads.append(nk)
        if a.limit:kads=kads[:a.limit]
        res={}
        for k in kads:
            if k not in d["zv"]:print("nav pagasta failā:",k);continue
            res[k]=analyse(tok,k,d["zv"][k],yr)
        merged=load_merge_write(pg,yr,res)
        totalZV+=len(res);totalFlag+=sum(1 for v in res.values() for x in v if x["flag"])
        print(f"  {pg}: {len(res)} ZV šajā palaidienā ({len(merged)} kopā failā)",flush=True)
    print(f"gatavs: {totalZV} ZV apstrādātas, {totalFlag} nogabali ar vainaga zudumu/kritumu",flush=True)
if __name__=="__main__":main()
