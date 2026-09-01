"""Visu ĪADT individuālo aizsardzības un izmantošanas noteikumu mežsaimniecības punkti no likumi.lv -> iadt/rules.json
Avots: likuma "Par īpaši aizsargājamām dabas teritorijām" saistīto dokumentu saraksts (m.likumi.lv/saistitie.php?id=59994).
Ekstrakcija ar regulārām izteiksmēm pēc standarta formulējumiem; katram ierakstam 'verify': true, kamēr nav pārbaudīts ar roku."""
import re, json, os, time, html, requests, datetime
H={"User-Agent":"Mozilla/5.0 (ff-forest geo-ingest)"}
LIST="https://m.likumi.lv/saistitie.php?id=59994&saistitie_id=rev-933"
def get(u):
    r=requests.get(u,headers=H,timeout=60);r.raise_for_status();return r.text
def clean(t):
    t=re.sub(r"<script.*?</script>|<style.*?</style>","",t,flags=re.S);t=re.sub(r"<[^>]+>"," ",t);t=html.unescape(t);return re.sub(r"[ \t\r]+"," ",t)
def links():
    out={}
    for page in range(1,12):
        try:t=get(LIST+f"&page={page}")
        except Exception:break
        found=re.findall(r'/ta/id/(\d+)-([a-z0-9\-]*individualie-aizsardzibas-un-izmantosanas-noteikumi)',t)
        if page==1:print("  saraksta lapa: garums",len(t),"saites",len(found),flush=True)
        if not found:break
        n=len(out)
        for i,slug in found:out[i]=slug
        if len(out)==n:break
    return out
ZONES=["regulējamā režīma zona","dabas rezervāta","dabas lieguma zona","dabas parka zona","ainavu aizsardzības zona","kultūrvēsturiskā zona","neitrālā zona","dabas lieguma teritorijā","dabas parka teritorijā","ainavu apvidus teritorijā","visā"]
def extract(text):
    """Sadala pa zonu nodaļām un meklē mežsaimniecības formulējumus."""
    rules={};text=text.replace("\xa0"," ")
    # sadalīšana: nodaļu virsraksti "III. Dabas lieguma zona" u.tml.
    parts=re.split(r"(?:^|\s)(?:[IVX]+\.\s*|\d+\.\s*(?=[A-ZĀČĒĢĪĶĻŅŠŪŽ]))((?:Regulējamā režīma|Dabas rezervāta|Dabas lieguma|Dabas parka|Ainavu aizsardzības|Kultūrvēsturiskā|Neitrālā)[^\n]{0,20}zona|Vispārīgie aprobežojumi[^\d]{0,60})",text)
    chunks=[("visā",parts[0])]
    for i in range(1,len(parts)-1,2):chunks.append((parts[i].strip().lower(),parts[i+1]))
    for zone,body in chunks:
        b=body[:20000];r={}
        if re.search(r"cirst kokus kailcirtē\b(?!,\s*kuras platība)|kailcirte[s]? (?:ir )?aizliegt|aizliegts veikt kailcirti",b,re.I):r["kcMax"]=None
        W={"viens":1,"vienu":1,"divi":2,"divus":2,"trīs":3,"četri":4,"pieci":5,"piecus":5,"0,1":0.1,"0,2":0.2,"0,3":0.3,"0,5":0.5}
        m=re.search(r"kailcirt\w*[^.]{0,80}?platība[^.]{0,40}?(?:nepārsniedz|ir|pārsniedz)\s*([\d,]+|viens|vienu|divi|divus|trīs|četri|pieci|piecus)\s*(?:ha|hektār)",b,re.I)
        if m:
            g=m.group(1).lower();v=W.get(g) if g in W else float(g.replace(",","."))
            if re.search(r"aizliegts[^.]{0,120}kailcirt[^.]{0,60}pārsniedz",b,re.I) or "nepārsniedz" in m.group(0) or "maksimāl" in b[max(0,m.start()-80):m.start()].lower():r["kcMax"]=v
        m=re.search(r"kailcirtes (?:cirsmas )?(?:maksimālā )?platība[^.]{0,120}?sila, mētrāja[^.]{0,200}?([\d,]+)\s*hektār",b,re.I)
        if m:r["kcMax"]=float(m.group(1).replace(",","."))
        if re.search(r"cirst kokus galvenajā cirtē(?! pirms| pēc)|galvenā cirte (?:ir )?aizliegta|aizliegts veikt galveno cirti",b,re.I) and not re.search(r"galvenajā cirtē (?:kokus cērt|saglabā)",b,re.I):r["galvena"]=False
        m=re.search(r"kopšanas cirt[^.]{0,160}?vecums pārsniedz:?(.{0,300})",b,re.I|re.S)
        if m:
            ages={};SP={"priež":"Priede","egļ":"Egle","bērz":"Bērzs","melnalkšņ":"Melnalksnis","oš":"Osis","liep":"Liepa","apš":"Apse","ozol":"Ozols"}
            for grp,age in re.findall(r"((?:(?:priež|egļ|bērz|melnalkšņ|oš|liep|apš|ozol)\w*[ ,un]*)+)audzēm\s*[–-]\s*(\d{2})\s*gad",m.group(1),re.I):
                for sp in re.findall(r"priež|egļ|bērz|melnalkšņ|oš|liep|apš|ozol",grp,re.I):ages[SP[sp.lower()]]=int(age)
            if ages:r["kopsanaAge"]=ages
        m=re.search(r"mežsaimniecisko darbību no (\d{1,2})\.\s*(\w+) līdz (\d{1,2})\.\s*(\w+)",b,re.I)
        if m:r["season"]=f"{m.group(1)}.{m.group(2)}-{m.group(3)}.{m.group(4)}"
        m=re.search(r"caurmērs 1,3 metru augstumā[^.]{0,60}?pārsniedz (\d{2}) centimetr",b,re.I)
        if m:r["bigD"]={"*":int(m.group(1))}
        m=re.search(r"saglabā vismaz (\d{1,2}) (?:augtspējīgus |dzīvotspējīgus )?(?:vecākos un lielāko izmēru )?(?:ekoloģiskos )?kokus",b,re.I)
        if m:r["eco"]=int(m.group(1))
        if re.search(r"rekonstruktīv\w+ cirt\w+ aizliegt|cirst kokus rekonstruktīvajā cirtē",b,re.I):r["rekonstr"]=False
        if re.search(r"izlases cirtē vairākos paņēmienos",b,re.I):r["izlase"]=True
        z="*" if zone.startswith("visā") or zone.startswith("vispārīg") else re.sub(r" teritorijā$","",zone)
        if r:rules[z]=r
    return rules
def main():
    os.makedirs("iadt",exist_ok=True);L=links();print("noteikumi:",len(L),flush=True);out={}
    for i,slug in L.items():
        try:
            t=clean(get(f"https://m.likumi.lv/doc.php?id={i}"))
            name=re.search(r"(?:Dabas parka|Dabas lieguma|Aizsargājamo ainavu apvidus|Dabas rezervāta|Nacionālā parka|Biosfēras rezervāta|Dabas pieminekļa|Ģeoloģiskā[^\"]{0,60})\s*\"([^\"]+)\"",t) or re.search(r"([A-ZĀ][\wāēīūšģķļņčž]+ nacionālā parka)",t)
            nm=name.group(1) if name else slug
            zaudejis="Zaudējis spēku" in t[:3000] or "zaudējis spēku" in t[:3000]
            out[i]={"name":nm,"slug":slug,"url":f"https://likumi.lv/ta/id/{i}","spēkā":not zaudejis,"rules":extract(t),"verify":True}
            print(" ",i,nm,"zaudējis" if zaudejis else "",list(out[i]["rules"].keys()),flush=True);time.sleep(0.6)
        except Exception as e:print(" x",i,e,flush=True)
    json.dump({"updated":datetime.date.today().isoformat(),"count":len(out),"items":out},open("iadt/rules.json","w"),ensure_ascii=False,indent=1)
    print("gatavs:",len(out))
if __name__=="__main__":main()
