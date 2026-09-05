// #72/#76: nogabalu atlases izsekošanas diagnostika — VIENA rinda par KATRU nogabalu ZV robežās, ar precīzu iekļaušanas/izslēgšanas
// iemeslu (funkcijas nosaukums + nosacījums). NEKO nemaina app/index.html funkcijās — tikai LASA reālo aprēķinu stāvokli pēc
// createFromPagasts(). Palaišana: node tests/diag_object.js <kadastrs> [pagasta kods, ja kadastra pirmie 4 cipari neatbilst]
// Datu avots: tests/fixtures/pagasti/PPPP.json.gz (jau ir šajā repo no #75 darba — satur Runcīši 68840020027 un Marija 68840080082,
// abas pagastā 6884). Ja fixture nav, MĒĢINA dzīvo datu zaru (https://raw.githubusercontent.com/.../data/pagasti/PPPP.json.gz).
const fs=require("fs"),zlib=require("zlib"),https=require("https"),path=require("path");
const root=fs.existsSync(path.join(process.cwd(),"node_modules","jsdom"))?path.join(process.cwd(),"node_modules"):require("child_process").execSync("npm root -g").toString().trim();
const {JSDOM}=require(root+"/jsdom");
const get=u=>new Promise((res,rej)=>{const req=https.get(u,{family:4,timeout:30000,agent:false},r=>{const b=[];r.on("data",d=>b.push(d));r.on("end",()=>res(Buffer.concat(b)));});req.on("error",rej);req.on("timeout",()=>req.destroy(new Error("timeout: "+u)));});
const BASE="https://raw.githubusercontent.com/kgudonis-dotcom/geo-ingest/data";
const FIXDIR=path.join(__dirname,"fixtures","pagasti");

let __lastWindow=null; // #72: katrs w=await app() rada JAUNU pilnu jsdom logu — bez iepriekšējā slēgšanas tie uzkrājas atmiņā (--scan rada 14, sk. tests/regress.js #79 tā paša labojuma)
async function app(){
 if(__lastWindow){try{__lastWindow.close();}catch(e){}__lastWindow=null;}
 const html=fs.readFileSync("app/index.html","utf8").replace(/<script src="https:[^"]+"><\/script>/g,"").replace(/<link rel="stylesheet" href="https:[^"]+">/g,"");
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/"});const w=dom.window;__lastWindow=w;
 w.turf=require(root+"/@turf/turf");w.XLSX=require(root+"/xlsx");w.pako={ungzip:(u8)=>zlib.gunzipSync(Buffer.from(u8)).toString()};
 w.fetch=async(url)=>{const m=url.match(/\/(pagasti|infra)\/(\d{4})\.json\.gz/);if(!m)return {ok:false,status:404};const k=m[1]+m[2];
  const fixPath=m[1]==="pagasti"?path.join(FIXDIR,m[2]+".json.gz"):null;
  let buf;if(fixPath&&fs.existsSync(fixPath))buf=fs.readFileSync(fixPath);else{try{buf=await get(`${BASE}/${m[1]}/${m[2]}.json.gz`);}catch(e){return {ok:false,status:404};}}
  if(buf.length<100)return {ok:false,status:404};return {ok:true,arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 w.eval("setLang('lv')");return w;}

// #72: --scan režīms — cik plaši gāja dPaths()/assignAutoCirtesVeids() agrā-return kļūda (labota commit 945f067), pār VISIEM regresijas etaloniem.
// NEKO app/index.html nemaina — "pirms" logs pārraksta window.dPaths/window.assignAutoCirtesVeids uz PRE-945f067 kodu (git show c315de1) TIKAI šī loga globālajā
// scope, PIRMS createFromPagasts izsaukuma; "pēc" logs ir parasts, pašreizējais (fixed) kods. Abi logi ir NEATKARĪGI (--scan neatstāj nevienu app funkciju mainītu).
const OLD_DPATHS_ASSIGN_945F067=`
window.dPaths=function(m){
 const dc=MK935.dCirte(m.suga,bonOf(m).bon);if(!dc)return null;
 const Dw=num(m.D);const ents=(m.Dentries&&m.Dentries.length?m.Dentries:[{d:Dw,g:num(m.G),h:num(m.H)}]).map(e=>({d:num(e.d),g:num(e.g),h:num(e.h)||num(m.H)}));
 const mean=m.Dmean!=null?num(m.Dmean):Dw;const mean14=Math.floor(mean+0.5);
 const out={dc,Dw,reach:Dw>=dc,mean,mean14,entries:ents,ageKC:cirtmetsKC(m.suga,m.vecums,bonOf(m).bon)==="KC",izlase:null,blockedRecent:recentActivity(m)};
 if(out.reach)return out; // PIRMS 945f067: neaplēš izlasi, ja D jau sasniegts, NEATKARĪGI no platības — šī bija kļūda
 const ha=num(m.platMezs||m.platKop),Gtot=num(m.G),gl=MK935.gLimits(m.suga,m.H);
 if(!gl){out.izlase={ok:false,why:"H < 12 m vai nav H: kritisko šķērslaukumu (MK935 1. piel.) nevar noteikt"};return out;}
 const sorted=ents.slice().sort((a,b)=>a.d-b.d);let removedG=0,removedM3=0,reached=false;
 for(let i=0;i<sorted.length;i++){const e=sorted[i];if(e.d>=dc){reached=true;break;}
  const rest=sorted.slice(i+1);const rg=rest.reduce((t,z)=>t+z.g,0),rdg=rest.reduce((t,z)=>t+z.d*z.g,0);
  const keep=(rdg-dc*rg)/(dc-e.d);
  const hf=veidaugstums(m.suga,e.h)??0;
  if(keep<=0){removedG+=e.g;removedM3+=e.g*hf*ha;continue;}
  const cut=e.g-Math.min(e.g,keep);removedG+=cut;removedM3+=cut*hf*ha;reached=true;break;}
 const gAfter=+(Gtot-removedG).toFixed(1);
 if(!reached)out.izlase={ok:false,why:"pat izcērtot visus tievākos "+m.suga+" ierakstus svērtais D "+dc+" cm netiek sasniegts"};
 else if(Gtot<=gl.gkrit)out.izlase={ok:false,why:"G "+Gtot+" m²/ha jau pie kritiskā "+gl.gkrit+" (MK935 1. piel., H "+Math.round(num(m.H))+" m) — izlases cirte nav iespējama",gkrit:gl.gkrit};
 else if(gAfter<gl.gkrit)out.izlase={ok:false,why:"lai D sasniegtu "+dc+" cm, jāizcērt "+removedG.toFixed(1)+" m²/ha, bet tad G "+gAfter+" < kritiskais "+gl.gkrit+" (MK935 1. piel.)",removeG:+removedG.toFixed(2),removeM3:Math.round(removedM3),gAfter,gkrit:gl.gkrit};
 else out.izlase={ok:true,removeG:+removedG.toFixed(2),removeM3:Math.round(removedM3),gAfter,gkrit:gl.gkrit,newD:dc};
 return out;
};
window.assignAutoCirtesVeids=function(p,dPolicy){
 dPolicy=dPolicy||"combined";
 const dBlocked=dCirteBlocked(p);
 for(const m of p.mer){
  if(m.cirsma||m.cirsmaManual||m.cirsmaKods||m.hasCert||!m.geom||/aizliegts/i.test(m.ierob||""))continue;
  const d=dPaths(m);if(!d||d.ageKC)continue;
  if(d.reach){
   if(dBlocked||d.blockedRecent)continue;
   if(num(m.platMezs||m.platKop)<REMNANT_HA)continue; // PIRMS 945f067: platība par mazu -> vienkārši izmests, izlase nekad nemēģināta
   m.cirsmaKods="KC";m.dPlan={path:"kcD",dc:d.dc,Dw:d.Dw,entries:d.entries.length,auto:true};continue;
  }
  if(dPolicy==="meanD"){if(d.mean14>=d.dc){m.cirsmaKods="KC";m.dPlan={path:"kcMean",dc:d.dc,mean14:d.mean14,auto:true};}continue;}
  if(d.izlase&&d.izlase.ok){m.cirsmaKods="KC";m.dPlan=Object.assign({path:"izlaseKc",dc:d.dc,auto:true},d.izlase);}
 }
};
`;
const SCAN_BENCHMARKS=[ // tests/regress.js izsaukumu formas (ar/bez pickedZv) — precīzi tās pašas, lai objekts būtu identisks regresijas etalonam
 {kad:"36680080031",picked:false,label:"Zapasnaja"},
 {kad:"70600050074",picked:false,label:"Ezermuiža"},
 {kad:"70420080041",picked:false,label:"70420080041"},
 {kad:"60700020059",picked:true,label:"60700020059"},
 {kad:"78880060148",picked:true,label:"Nalobnes"},
 {kad:"68840080082",picked:true,label:"Marija"},
 {kad:"68840020027",picked:false,label:"Runcīši"},
];
const SNAP_EXPR="JSON.stringify({n:P().mer.length,ha:+calcProp(P()).ha.toFixed(2),m3:Math.round(calcProp(P()).m3),"
 +"perNog:P().mer.map(m=>({k:(m.zv||'')+'/'+m.kvartals+'/'+m.nogabals,kods:m.cirsmaKods||'',path:m.dPlan&&m.dPlan.path||''}))})";
async function scanOne(b){
 const call=b.picked?`createFromPagasts('${b.kad}',['${b.kad}'])`:`createFromPagasts('${b.kad}')`;
 const wAfter=await app();
 try{await wAfter.eval(call);}catch(e){return {kad:b.kad,label:b.label,error:"PĒC: "+String(e&&e.message||e)};}
 const after=JSON.parse(wAfter.eval(SNAP_EXPR));
 const wBefore=await app();
 wBefore.eval(OLD_DPATHS_ASSIGN_945F067);
 try{await wBefore.eval(call);}catch(e){return {kad:b.kad,label:b.label,error:"PIRMS: "+String(e&&e.message||e)};}
 const before=JSON.parse(wBefore.eval(SNAP_EXPR));
 const beforeMap=new Map(before.perNog.map(x=>[x.k,x]));
 const affected=after.perNog.filter(x=>{const bx=beforeMap.get(x.k);return !bx||bx.kods!==x.kods||bx.path!==x.path;});
 return {kad:b.kad,label:b.label,n:after.n,before,after,dHa:+(after.ha-before.ha).toFixed(2),dM3:after.m3-before.m3,
  affected:affected.map(x=>x.k.split("/").pop())};
}
async function scan(){
 const rows=[];
 for(const b of SCAN_BENCHMARKS)rows.push(await scanOne(b));
 return rows;
}

async function diag(kadastrs,pagCode){
 pagCode=pagCode||kadastrs.slice(0,4);
 const w=await app();
 try{await w.eval(`createFromPagasts('${kadastrs}',['${kadastrs}'])`);}
 catch(e){console.log("KĻŪDA ielādējot objektu:",String(e&&e.message||e));return;}
 const out=w.eval(`JSON.stringify((()=>{
  const fmt2=(n)=>n==null?"–":(+n).toFixed(2).replace(".00","");
  const p=P();
  const r=runChecks(p);
  const zone=RULES.iadt[p.iadt||""]||RULES.iadt[""];
  const rows=p.mer.slice().sort((a,b)=>{const na=parseFloat(a.nogabals),nb=parseFloat(b.nogabals);return (isNaN(na)?0:na)-(isNaN(nb)?0:nb)||String(a.nogabals).localeCompare(String(b.nogabals));}).map(m=>{
   const bo=bonOf(m);
   const ct=cirtmetsAge(m.suga,bo.bon); // Meža likuma 9.p. cirtmets, gadi (null = nav noteikts šai sugai/bonitātei)
   const dc=MK935.dCirte(m.suga,bo.bon); // MK935 7.piel. galvenās cirtes caurmērs, cm (null = nav tabulā)
   const dp=dPaths(m); // pilna D-cirtes aplēse (ja dc zināms)
   const x=r.nog.find(y=>y.m===m);
   const bloks=(x?x.f:[]).filter(f=>f.t==="bloks").map(f=>f.s);
   const allF=(x?x.f:[]).map(f=>"["+f.t+"] "+f.s);
   const c=m.cirsma?p.cirsmas.find(cc=>cc.id===m.cirsma):null;
   // #72/#76: precīzs iemesls — funkcijas nosaukums + nosacījums, VISI iemesli (ne pirmais)
   const reasons=[];
   if(!c){
    if(!m.geom)reasons.push("mergeZvInto(): m.geom nav (ģeometrija netika piesaistīta)");
    if(!m.suga)reasons.push("mergeZvInto(): valdošā suga tukša/neatpazīta (SP_CODES)");
    if(m.suga&&!bo.bon)reasons.push("bonOf(): bonitāte nenoteikta (src="+bo.src+"), tāpēc cirtmetsKC()/MK935.dCirte() nevar strādāt");
    if(m.suga&&bo.bon&&ct==null)reasons.push("cirtmetsAge(): suga '"+m.suga+"' Meža likuma 9.p. tabulā nav (nav cirtmeta)");
    if(ct!=null&&num(m.vecums)<ct)reasons.push("assignAutoCirtesVeids()/cirtmetsKC(): vecums "+m.vecums+" g < cirtmets "+ct+" g (Meža likums 9.p.), vecuma ceļš neizpildās");
    if(m.cirsmaKods!=="KC"){
     if(dc==null)reasons.push("MK935.dCirte(): suga '"+m.suga+"' MK935 7.piel. tabulā nav (nav D-cirtes sliekšņa)");
     else if(dp&&!dp.reach)reasons.push("assignAutoCirtesVeids()/dPaths(): svērtais D "+fmt2(dp.Dw)+" cm < MK935 7.piel. slieksnis "+dc+" cm — D-cirtes ceļš arī neizpildās");
     else if(dp&&dp.reach){
      if(dCirteBlocked(p))reasons.push("dCirteBlocked(): ĪADT individuālie noteikumi šajā zonā liedz kailcirti pēc caurmēra pirms cirtmeta (nav noklusējuma scenārijā)");
      const block=recentActivity(m);if(block)reasons.push("recentActivity(): "+block.note+" (MK935 7.piel. piezīme — pēdējos 3 g bijusi kopšana)");
      if(!(num(m.platMezs||m.platKop)>=0.3))reasons.push("assignAutoCirtesVeids(): platība "+fmt2(num(m.platMezs||m.platKop))+" ha < 0,3 ha (REMNANT_HA) — par mazu patstāvīgai D-cirtes ierosināšanai noklusējuma scenārijā");
     }
    }
    if(m.cirsmaKods==="KC"&&bloks.length)reasons.push("runChecks(): "+bloks.length+" 'bloks' karodziņš(-i) — nogabals izslēgts no kcAll (exclude=true): "+bloks.join(" | "));
    if(m.cirsmaKods==="KC"&&!bloks.length){
     const ha=num(m.platMezs||m.platKop);const mo=moistureOf(m.mezaTips);const lim=kcLimit(mo);
     if(lim&&ha>lim+0.3){
      const sp=(r.oversized||[]).find(o=>o.x.m===m);
      if(!sp)reasons.push("splitOversizedNogabals()/splitOversizedProportional(): nogabals "+fmt2(ha)+" ha > limits "+lim+"+0,3 ha, ĢEOMETRISKA sadalīšana NEIZDEVĀS (platība/krāja neuzticama) UN proporcionālais fallback arī neizdevās — out.splits[]/failedSplit, jāsadala ar roku");
      else reasons.push("splitOversizedNogabals(): nogabals sadalīts (mode="+sp.mode+"), KC daļa "+fmt2(sp.kcHa)+" ha PALIEK CIRSMĀ, atlikums "+fmt2(sp.restHa+sp.stripHa)+" ha atlikts 2. piegājienam — ŠIS nogabals VAR būt daļēji iekļauts, sk. p.cirsmas ar stage=2");
     }
     if(!reasons.length){
      const dw=(r.deferredWhole||[]).find(g=>g.group.nog.some(n=>n.m===m));
      if(dw)reasons.push("runChecks() #79: ekonomiskais slieksnis — "+dw.otherNog+" kaimiņa josla atstātu tikai "+fmt2(dw.remHa)+" ha/"+Math.round(dw.remM3)+" m³ tagad cērtamu (zem sliekšņa splitMinHa/splitMinM3) — VESELS nogabals atlikts 2. piegājienam, sk. p.cirsmas ar stage=2 un blockedNote");
      else reasons.push("runChecks(): cirsmaKods='KC', nav bloku, nav oversized/deferred — NAV ATRASTS SKAIDRS IEMESLS pamestībai (iespējams grupēts citā cirsmā, pārbaudīt p.kaimini/adjAll manuāli)");
     }
    }
    if(m.cirsmaKods==="KKC")reasons.push("(informatīvi) cirsmaKods='KKC' — automātiskā sistēma (assignAutoCirtesVeids) KKC NEKAD nepiešķir automātiski, tikai lietotājs ar roku (mf('cirsmaKods','KKC')) vai imports; ja šeit KKC, tas nozīmē dati tā ievesti, ne mūsu lēmums");
    if(!m.cirsmaKods)reasons.push("(rezultāts) m.cirsmaKods tukšs — nogabals NEKAD nesasniedza automātiskas ierosināšanas nosacījumus (nedz vecuma, nedz caurmēra ceļu; sk. iepriekšējās rindas)");
   }
   return {
    nog:m.nogabals,kvartals:m.kvartals,ha:+num(m.platMezs||m.platKop).toFixed(2),
    suga:m.suga||"(tukša)",vecums:m.vecums||null,H:m.H||null,D:m.D||null,G:m.G||null,
    bonitate:bo.bon||"–",bonSrc:bo.src,
    kraja:Math.round(krajaMer(m)),
    cirtmets:ct,vecumsSasniegts:ct==null?null:(num(m.vecums)>=ct),
    dSlieksnis:dc,dSvertais:dp?+num(dp.Dw).toFixed(1):null,dSasniegts:dp?dp.reach:null,
    aizliegumi:bloks,
    cirsmaKods:m.cirsmaKods||"",dPlanPath:m.dPlan?m.dPlan.path:null,
    iekluts:!!c,cirsmaId:c?c.id:null,cirsmaTips:c?(c.tips+(c.sanIzlase?" (izlase)":"")+(c.stage===2?" · 2.piegājiens":"")):null,cirsmaNogabali:c?c.nogabali:null,
    iemesli:reasons,allFlags:allF,
   };});
  return {rows,ncirsmas:p.cirsmas.length,haKopa:+p.cirsmas.reduce((a,c)=>a+num(c.platiba),0).toFixed(2),m3Kopa:Math.round(p.cirsmas.reduce((a,c)=>a+calcCirsma(c).m3,0)),
   cirsmasList:p.cirsmas.map(c=>({id:c.id,tips:c.tips,san:!!c.sanIzlase,stage:c.stage||1,nogabali:c.nogabali,ha:c.platiba})),
   nMer:p.mer.length,iadt:p.iadt||"(nav)"};
 })())`);
 return JSON.parse(out);
}
function fmt2(n){return n==null?"–":(+n).toFixed(2).replace(".00","");}

(async()=>{
 const kad=process.argv[2];const pag=process.argv[3];
 if(kad==="--scan"){
  const rows=await scan();
  const cols=["kadastrs","objekts","nogabali kopā","pirms 945f067 (ha / m³)","pēc 945f067 (ha / m³)","starpība (ha / m³, tikai 1. piegājiens)","ietekmētie nogabali (cirsmaKods/dPlan mainījies)"];
  console.log(cols.join(" | "));console.log("-".repeat(160));
  for(const r of rows){
   if(r.error){console.log(r.kad+" | "+r.label+" | – | KĻŪDA: "+r.error+" | – | – | –");continue;}
   console.log([r.kad,r.label,r.n,fmt2(r.before.ha)+" ha / "+r.before.m3+" m³",fmt2(r.after.ha)+" ha / "+r.after.m3+" m³","+"+fmt2(r.dHa)+" ha / +"+r.dM3+" m³",
    r.affected.length?r.affected.length+" (nog. "+r.affected.join(", ")+")":"0"].join(" | "));
  }
  console.log("-".repeat(160));
  console.log("PIEZĪME: 'starpība ha/m³' skaita TIKAI 1. piegājiena cirsmas (calcProp() konvencija, tāpat kā app 'Sistēma: X ha' rāda). Ja ietekmētais nogabals pēc labojuma nonāk 2. piegājienā (atliktā vērtība), starpība var rādīt +0, kaut nogabals reāli mainīja klasifikāciju — tāpēc pievienota atsevišķa 'ietekmētie nogabali' kolonna, kas skaita KATRU cirsmaKods/dPlan.path izmaiņu neatkarīgi no piegājiena.");
  const errs=rows.filter(r=>r.error);
  if(errs.length)console.log("KĻŪDAS: "+errs.length+" no "+rows.length+" etaloniem neielādējās (sk. augšā) — skaitlis NAV pilnīgs.");
  else console.log("Visi "+rows.length+" etaloni veiksmīgi ielādēti abos (pirms/pēc) režīmos.");
  process.exit(0);
 }
 if(!kad){console.error("Lietošana: node tests/diag_object.js <kadastrs> [pagasta kods] VAI node tests/diag_object.js --scan");process.exit(1);}
 const d=await diag(kad,pag);
 if(!d)process.exit(1);
 const cols=["nog","kv","ha","suga","vecums","H","D","G","bonitāte(avots)","krāja_m³","cirtmets(g,9.p.)","vec>=cirtmets?","D_slieksnis(7.piel.)","D>=slieksnis?","aizliegumi","IEKĻAUTS/IZSLĒGTS"];
 console.log(cols.join(" | "));
 console.log("-".repeat(220));
 for(const x of d.rows){
  const status=x.iekluts?("IEKĻAUTS cirsmā #"+x.cirsmaId+" ("+x.cirsmaTips+", nog. "+x.cirsmaNogabali+")"):("IZSLĒGTS: "+(x.iemesli.length?x.iemesli.join("; "):"(nav noteikts iemesls)"));
  console.log([
   x.nog,x.kvartals,x.ha,x.suga,x.vecums??"–",x.H??"–",x.D??"–",x.G??"–",
   x.bonitate+"("+x.bonSrc+")",x.kraja,
   x.cirtmets??"–",x.vecumsSasniegts==null?"–":(x.vecumsSasniegts?"JĀ":"NĒ"),
   x.dSlieksnis??"–",x.dSasniegts==null?"–":(x.dSasniegts?"JĀ ("+x.dSvertais+" cm)":"NĒ ("+(x.dSvertais??"–")+" cm)"),
   x.aizliegumi.length?x.aizliegumi.join(" | "):"–",
   status,
  ].join(" | "));
 }
 console.log("-".repeat(220));
 console.log("Sistēma: "+d.ncirsmas+" cirsmas, "+d.haKopa+" ha, "+d.m3Kopa+" m³");
 console.log("  cirsmu saraksts: "+d.cirsmasList.map(c=>"#"+c.id+" "+c.tips+(c.san?"(izlase)":"")+(c.stage===2?"·2.piegājiens":"")+" nog."+c.nogabali+" "+c.ha+"ha").join(" ; "));
 process.exit(0); // jsdom/https atstāj atvērtus handle'us — bez tā process nekad neiziet, lai gan darbs jau pabeigts
})().catch(e=>{console.error("KĻŪDA:",e);process.exit(1);});
