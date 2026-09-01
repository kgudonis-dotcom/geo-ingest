"""LVM / VMD datu spogulis no Latvijas -> GitHub Release "mirror" repo kgudonis-dotcom/geo-ingest.
Vajag: Python 3.9+, GitHub talons ar Contents: Read and write (vides mainīgais GH_TOKEN vai ievade).
Palaiž: python lvm_spogulis.py         (reizi dienā uzdevumu plānotājā vai ar roku)"""
import os, sys, json, time, urllib.request, urllib.error, re, datetime

REPO="kgudonis-dotcom/geo-ingest"; TAG="mirror"
LVM_BASE="https://lvmgeo.lvm.lv/PublicData/SHP/"
LVM_FILES=["LVM_NOGABALI.zip","SODRA_NOGABALI.zip","SIA_LATVIJAS_FINIERIS_MEZS_NOGABALI.zip","MOFO_MEZA_IPASUMI_NOGABALI.zip","SIA_KURSA_MRU_NOGABALI.zip",
 "STIGA_RM_NOGABALI.zip","SUSAB_NOGABALI.zip","LASKANA_MEZS_NOGABALI.zip","GREYTON_NOGABALI.zip","MPKS_MEZSAIMNIEKS_NOGABALI.zip","SIA_SUNDIN_NOGABALI.zip",
 "SIA_MANA_MEZS_NOGABALI.zip","SIA_ROSTERS_NOGABALI.zip","MEZA_PETISANAS_STACIJA_NOGABALI.zip","DAUGAVASMS_NOGABALI.zip","IRI_Asset_NOGABALI.zip",
 "VestmanForest_NOGABALI.zip","KM_Forestry_NOGABALI.zip","OSUKALNS_NOGABALI.zip","VAMOIC_NOGABALI.zip","SCA_NOGABALI.zip","Mezusili_NOGABALI.zip",
 "PKMEZS_NOGABALI.zip","Skogssallskapet_NOGABALI.zip","JS_NOGABALI.zip","BaltuKoks_NOGABALI.zip","Elforest_NOGABALI.zip","GMKoks_NOGABALI.zip",
 "Belwood_NOGABALI.zip","PAMPALI_NOGABALI.zip",
 "LVM_MEZA_AUTOCELI.zip","LVM_TILTI_CAURTEKAS.zip","LVM_STIGAS.zip","LVM_ZEMES_VIENIBAS.zip"]  # ceļu failu nosaukumi pēc LVM kataloga; ja 404, izlaiž
VMD_ARCGIS="https://gis.vmd.gov.lv/arcgis/rest/services"

def api(url,data=None,method=None,ctype="application/json",token=None):
    req=urllib.request.Request(url,data=data,method=method or ("POST" if data else "GET"))
    req.add_header("Authorization","Bearer "+token);req.add_header("Accept","application/vnd.github+json")
    if data is not None:req.add_header("Content-Type",ctype)
    with urllib.request.urlopen(req,timeout=600) as r:return json.load(r) if r.status!=204 else {}

def get_release(token):
    try:return api(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}",token=token)
    except urllib.error.HTTPError as e:
        if e.code!=404:raise
        return api(f"https://api.github.com/repos/{REPO}/releases",json.dumps({"tag_name":TAG,"name":"Datu spogulis no Latvijas","body":"LVM un VMD faili, ko GitHub nevar lejupielādēt pats."}).encode(),token=token)

def upload(rel,name,path,token):
    for a in rel.get("assets",[]):
        if a["name"]==name:api(f"https://api.github.com/repos/{REPO}/releases/assets/{a['id']}",method="DELETE",token=token)
    url=rel["upload_url"].split("{")[0]+f"?name={name}"
    with open(path,"rb") as f:data=f.read()
    api(url,data,ctype="application/zip" if name.endswith(".zip") else "application/json",token=token)
    print("  augšupielādēts",name,f"{len(data)/1e6:.1f} MB")

def download(url,dest):
    req=urllib.request.Request(url,headers={"User-Agent":"ff-forest-mirror"})
    with urllib.request.urlopen(req,timeout=1800) as r,open(dest,"wb") as f:
        while True:
            b=r.read(1<<20)
            if not b:break
            f.write(b)

def vmd_aplieci(dest):
    """Meklē VMD ArcGIS katalogā cirsmu / apliecinājumu slāni un noglabā visu kā GeoJSON."""
    def gj(u,**p):
        p.setdefault("f","json");q=urllib.parse.urlencode(p);return json.load(urllib.request.urlopen(u+"?"+q,timeout=120))
    import urllib.parse
    found=[];seen=set()
    def rec(u):
        try:j=gj(u)
        except Exception as e:print("  x",u,e);return
        for f in j.get("folders",[]):rec(f"{VMD_ARCGIS}/{f}")
        for s in j.get("services",[]):
            su=f"{VMD_ARCGIS}/{s['name']}/{s['type']}"
            if su in seen:continue
            seen.add(su)
            try:sj=gj(su)
            except Exception:continue
            for l in sj.get("layers",[]):
                nm=f"{s['name']}/{l.get('name','')}"
                if re.search(r"cirsm|apliec",nm,re.I):found.append((f"{su}/{l['id']}",nm))
    rec(VMD_ARCGIS);print("  VMD slāņi:",found)
    if not found:return None
    url,name=found[0];info=gj(url);step=min(int(info.get("maxRecordCount") or 1000),2000);off=0;feats=[]
    while True:
        j=gj(url+"/query",where="1=1",outFields="*",outSR=4326,resultOffset=off,resultRecordCount=step,f="geojson")
        fs=j.get("features",[]);feats+=fs;print("  ",off,len(fs))
        if len(fs)<step:break
        off+=step
        if off>500000:break
    json.dump({"type":"FeatureCollection","layer":name,"fields":[f["name"] for f in info.get("fields",[])],"updated":datetime.datetime.utcnow().isoformat(),"features":feats},open(dest,"w"),ensure_ascii=False)
    return len(feats)

def main():
    token=os.environ.get("GH_TOKEN") or input("GitHub talons (github_pat_...): ").strip()
    os.makedirs("tmp",exist_ok=True);rel=get_release(token);ok=0
    for name in LVM_FILES:
        try:
            print("lejupielādē",name);download(LVM_BASE+name,"tmp/"+name);upload(rel,name,"tmp/"+name,token);ok+=1;os.remove("tmp/"+name)
        except urllib.error.HTTPError as e:print("  izlaiž",name,e.code)
        except Exception as e:print("  kļūda",name,e)
    try:
        n=vmd_aplieci("tmp/vmd_aplieci.geojson")
        if n:upload(rel,"vmd_aplieci.geojson","tmp/vmd_aplieci.geojson",token);ok+=1
    except Exception as e:print("  VMD apliecinājumi neizdevās:",e)
    json.dump({"updated":datetime.datetime.utcnow().isoformat(),"files":ok},open("tmp/mirror_index.json","w"));upload(rel,"mirror_index.json","tmp/mirror_index.json",token)
    print("gatavs:",ok,"faili;",datetime.datetime.now())
if __name__=="__main__":main()
