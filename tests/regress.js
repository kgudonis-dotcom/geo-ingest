// Regresijas tests: lietotne pret reāliem objektiem ar zināmu patiesību. Palaiž: node tests/regress.js (vajag jsdom, @turf/turf, xlsx)
const fs=require("fs");const zlib=require("zlib");const https=require("https");const path=require("path");
// moduļi: lokālie node_modules (GitHub darbplūsma) vai globālie (izstrāde)
const root=fs.existsSync(path.join(process.cwd(),"node_modules","jsdom"))?path.join(process.cwd(),"node_modules"):require("child_process").execSync("npm root -g").toString().trim();
const {JSDOM}=require(root+"/jsdom");
const html=fs.readFileSync("app/index.html","utf8").replace(/<script src="https:[^"]+"><\/script>/g,"").replace(/<link rel="stylesheet" href="https:[^"]+">/g,"");
// family:4/agent:false -- šai videi novērots, ka IPv6 uz raw.githubusercontent.com reizēm karājas/ETIMEDOUT, kaut IPv4 strādā uzreiz (05.09.2026, #74 diagnostikā atklāts un noķerts);
// agent:false izvairās no koplietota (potenciāli sastrēguša) savienojumu pūla garā, daudz-pieprasījumu procesā (#78).
const get=u=>new Promise((res,rej)=>{const req=https.get(u,{family:4,timeout:30000,agent:false},r=>{const b=[];r.on("data",d=>b.push(d));r.on("end",()=>res(Buffer.concat(b)));});req.on("error",rej);req.on("timeout",()=>req.destroy(new Error("timeout: "+u)));});
const BASE="https://raw.githubusercontent.com/kgudonis-dotcom/geo-ingest/data";
let fails=0;const ok=(c,m)=>{console.log((c?"OK  ":"FAIL")+" "+m);if(!c)fails++;};
// #78: kešs MODUĻA LĪMENĪ (ne app() iekšā) -- pastāv visam node procesam, ne tikai vienam w=await app() izsaukumam; tas pats etalona pagasts (piem. 60700020059)
// šajā failā tiek ielādēts 8x -- bez tā katrs izsaukums no jauna fetčoja/atspieda/parsēja to pašu vairāku MB pagasta failu (izmērīts: 81 -> 8 tīkla pieprasījumi).
const cache={};
const FIXDIR=path.join(__dirname,"fixtures","pagasti"); // #78: mazi fixture faili (tikai etalona ZV, dažus KB) -- aizstāj pilno (700 KB-1,6 MB) pagasta failu; skript tests/build_fixtures.js tos ģenerē no dzīvajiem datiem
let __lastWindow=null; // #79: katrs w=await app() rada JAUNU pilnu jsdom logu/dokumentu; bez iepriekšējā slēgšanas tie uzkrājas atmiņā (~28 izsaukumi/palaidienā -> arvien lēnāk/nestabilāk pret beigām)
async function app(){if(__lastWindow){try{__lastWindow.close();}catch(e){}__lastWindow=null;}
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/"});const w=dom.window;__lastWindow=w;w.turf=require(root+"/@turf/turf");w.XLSX=require(root+"/xlsx");w.pako={ungzip:(u8)=>zlib.gunzipSync(Buffer.from(u8)).toString()};
 w.fetch=async(url)=>{const m=url.match(/\/(pagasti|infra)\/(\d{4})\.json\.gz/);if(!m)return {ok:false,status:404};const k=m[1]+m[2];
  if(!cache[k]){
   const fixPath=m[1]==="pagasti"?path.join(FIXDIR,m[2]+".json.gz"):null;
   if(fixPath&&fs.existsSync(fixPath))cache[k]=fs.readFileSync(fixPath);
   else{try{cache[k]=await get(`${BASE}/${m[1]}/${m[2]}.json.gz`);}catch(e){return {ok:false,status:404};}}
  }
  const b=cache[k];if(b.length<100)return {ok:false,status:404};return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 w.eval("setLang('lv')");return w;}
(async()=>{
 // 1. Zapasnaja 19: VMD izsniedza KC apliecinājumus uz nog. 2,3,4,5,6,7,9 -> tur nedrīkst būt bloķētāju
 let w=await app();await w.eval("createFromPagasts('36680080031')");
 ok(w.eval("P().mer.length")===9,"Zapasnaja: 9 nogabali no VMD");
 ok(w.eval("P().mer.every(m=>!nogPlausibleIssue(m))")&&w.eval("dashData(P()).kraja")===w.eval("Math.round(P().mer.reduce((s,m)=>s+krajaMer(m),0))"),"Zapasnaja: neviens nogabals nav neticams, kopējā krāja nemainās (#45)");
 w.eval("for(const n of ['2','3','4','5','6','7','9']){const m=P().mer.find(x=>x.nogabals===n);m.cirsmaKods='KC';}recalcLinked()");
 const blocks=w.eval("runChecks(P()).nog.filter(x=>['2','3','4','5','6','7','9'].includes(x.m.nogabals)).flatMap(x=>x.f.filter(f=>f.t==='bloks').map(f=>x.m.nogabals+': '+f.s))");
 ok(blocks.length===0,"Zapasnaja: nav bloķētāju uz nogabaliem ar VMD apliecinājumu "+JSON.stringify(blocks));
 ok(w.eval("runChecks(P()).global.some(g=>/biotops/.test(g)&&!/izslēgta/.test(g))"),"Zapasnaja: biotops ir informācija, ne aizliegums");
 // #50 (comment 3, atlikušais 5.): Zapasnaja pēc REĀLA (ne manuāli uzspiesta) grupējuma — VMD apstiprināja KC uz nog. 2,3,4,5,6,7,9. Pārbaudām, ka buildParts katru nogabalu,
 // ko lietotne PATI (vecuma/D pamata, bonitāte/cirtmets ārpus šī uzdevuma robežām) atzīst par KC, ievieto savā cirsmā ar pareizu ha — nesajaukts, nepazudis. Pilnīga sakritība ar
 // VMD sarakstu NAV apgalvota (sk. atskaiti): app auto-KC un VMD apstiprinātais saraksts var atšķirties, jo tas ir bonitātes/cirtmeta jautājums, ne cirsmu ģeometrijas/dalījuma.
 w=await app();await w.eval("createFromPagasts('36680080031')");
 const zap=JSON.parse(w.eval(`JSON.stringify((()=>{const p=P();const approved=["2","3","4","5","6","7","9"];
  const autoKc=p.mer.filter(m=>approved.includes(m.nogabals)&&m.cirsmaKods==="KC").map(m=>m.nogabals);
  const eachOwnCirsma=autoKc.every(n=>{const m=p.mer.find(x=>x.nogabals===n);const c=p.cirsmas.find(cc=>cc.id===m.cirsma);return c&&Math.abs(c.platiba-num(m.platMezs||m.platKop))<0.05;});
  return {approved,autoKc,eachOwnCirsma,ncirsmas:p.cirsmas.length};})())`));
 ok(zap.autoKc.length>0&&zap.eachOwnCirsma,"Zapasnaja: katrs VMD apstiprinātais nogabals, ko lietotne pati atzīst par KC ("+zap.autoKc.join(",")+" no "+zap.approved.join(",")+"), pēc reālā (ne manuāla) grupējuma ir savā cirsmā ar pareizu ha (nav sajaukts/pazudis, "+zap.ncirsmas+" cirsmas kopā) — bonitāte/cirtmets (kāpēc tieši šis apakškopums) ir ārpus #49/#50 robežām");
 // 2. Ezermuiža
 w=await app();await w.eval("createFromPagasts('70600050074')");
 ok(w.eval("P().mer.length")===28,"Ezermuiža: 28 nogabali");
 ok(w.eval("P().mer.every(m=>!nogPlausibleIssue(m))")&&w.eval("dashData(P()).kraja")===w.eval("Math.round(P().mer.reduce((s,m)=>s+krajaMer(m),0))"),"Ezermuiža: neviens nogabals nav neticams, kopējā krāja nemainās (#45)");
 ok(w.eval("P().mer.filter(m=>m.geom).length")===28,"Ezermuiža: visiem ģeometrija");
 ok(w.eval("P().cirsmas.length")>=1,"Ezermuiža: cirsmas izveidotas");
 // 2a. Ezermuiža aizsargjoslas (#39): reāls gadījums, fiksēts 02.09.2026, pārbaudīt pret VMD
 await w.eval("loadInfra(P())");
 const ezInfra=w.eval("P().infra?{water:P().infra.water.length,usik:P().infra.usik.length}:null");
 ok(ezInfra&&(ezInfra.water+ezInfra.usik)>=1,"Ezermuiža: ir vismaz viena ūdenstece infra datos (got "+JSON.stringify(ezInfra)+")");
 const ezKc=w.eval("+Object.values(runChecks(P()).zoneByNog||{}).reduce((a,z)=>a+z.kc.ha,0).toFixed(2)");
 const ezMain=w.eval("+Object.values(runChecks(P()).zoneByNog||{}).reduce((a,z)=>a+z.main.ha,0).toFixed(2)");
 ok(ezKc===0&&ezMain===0,"Ezermuiža: aizsargjoslas kopā KC 0,00 ha, 10 m josla 0,00 ha (fiksēts 02.09.2026, pārbaudīt pret VMD; got kc="+ezKc+" main="+ezMain+")");
 // 3. PAF 70420080041: IRR pret Excel (67,0 %)
 w=await app();await w.eval("createFromPagasts('70420080041')");
 ok(w.eval("P().mer.length")===38,"70420080041: 38 nogabali");
 const irr=w.eval("(xirr([[0,-113968.87],[120,-41210],[90,93210],[365,111320],[365,0]])*100).toFixed(1)");ok(irr==="67.0","XIRR = Excel 67,0 % (got "+irr+")");
 // 4. Nodeva MK1250
 w.eval("valOf(P());P().val.pircejs='jur';P().val.pirkumaMan=true;P().val.pirkuma=111358;P().val.kadVert=0");
 ok(w.eval("valCalc(P()).nodevaVal")===2227.16,"Nodeva 2 % no 111 358 = 2227,16");
 // 4a. Zemes cenas €/ha, peļņa % un pirkuma €/ha ir kopīgas visiem objektiem (sadaļa Cenas, v0.36); objekta vecie lauki val.sale/val.buy netiek lietoti
 w.eval("S.valSale={kcW:3500};S.valBuy={};S.valKoef=.65;P().val.sale={kcW:1};P().val.buy={kcW:1};P().val.haMan.kcW=true;P().val.ha.kcW=6");
 const kcW=w.eval("JSON.stringify(valCalc(P()).rows.find(r=>r.k==='kcW'))");
 ok(kcW==='{"k":"kcW","l":"KC slapjš","ha":6,"sale":3500,"buy":2275,"saleSum":21000,"buySum":13650}',"Zemes cena no Cenām: KC slapjš 3500 × 0,65 = 2275 €/ha; 6 ha = 21 000 / 13 650 € (got "+kcW+")");
 w.eval("S.valBuy={kcW:2000}");
 ok(w.eval("valCalc(P()).rows.find(r=>r.k==='kcW').buy")===2000,"Pirkuma €/ha pārrakstīts Cenās = 2000");
 w.eval("S.valBuy={};S.valKoef=.7");
 ok(w.eval("valCalc(P()).rows.find(r=>r.k==='kcW').buy")===2450,"Peļņa 30 %: 3500 × 0,7 = 2450");
 ok(w.eval("landPrices().rows.find(r=>r.k==='jPEBs').sale")===4200&&w.eval("newVal().sale")===undefined,"Noklusējums 4200 €/ha; objektam vairs nav savu cenu");
 ok(w.eval("priceSnapNow().land.buy.kcW")===2450&&w.eval("priceSnapStale({prices:S.prices,land:priceSnapNow().land})")===false&&w.eval("priceSnapStale({prices:S.prices,land:{koef:.65,sale:{},buy:{}}})")===true&&w.eval("priceSnapStale({prices:S.prices})")===false,"Cenu momentuzņēmums ietver zemes cenas un atpazīst to izmaiņas");
 w.eval("setLandPrice('kcW','buy','1900');setLandPrice('kcW','sale','');setLandPrice(null,'koef',null)");
 ok(w.eval("S.valBuy.kcW")===1900&&w.eval("S.valSale.kcW")===undefined&&w.eval("S.valKoef")===undefined&&w.eval("landPrices().by.kcW.sale")===3500&&w.eval("landPrices().by.jPEBs.buy")===2730,"setLandPrice: teksts → skaitlis; tukšs lauks → noklusējums / auto (kcW 3500, jPEBs 4200 × 0,65 = 2730)");
 // 4b. LAD lauku bloki (liz_block_ha) un VZD eksplikācija -> auto "LIZ blokā"/"LIZ parasts" (v0.36)
 w.eval("P().lad=null;P().expl=null"); // simulē vecu pagastu failu bez šiem laukiem (neatkarīgi no tā, vai pagastu pārbūve tos jau aizpildījusi)
 ok(w.eval("valCalc(P()).rows.find(r=>r.k==='lizB').ha")===0&&w.eval("valCalc(P()).rows.find(r=>r.k==='lizP').ha")===0,"LIZ blokā/parasts = 0 (tukšs), kamēr avota datu nav; Novērtējuma zemes summa nemainās");
 w.eval("P().lad={ha:8.5,blocks:['61234-11111','61234-22222']};P().expl={liz:12,mezs:20}");
 const liz=w.eval("JSON.stringify({b:valCalc(P()).rows.find(r=>r.k==='lizB'),p:valCalc(P()).rows.find(r=>r.k==='lizP')})");
 ok(liz==='{"b":{"k":"lizB","l":"LIZ blokā","ha":8.5,"sale":2500,"buy":1625,"saleSum":21250,"buySum":13813},"p":{"k":"lizP","l":"LIZ parasts","ha":3.5,"sale":2000,"buy":1300,"saleSum":7000,"buySum":4550}}',"LIZ blokā 8,5 ha (LAD) + LIZ parasts 3,5 ha (VZD LIZ 12 − 8,5) (got "+liz+")");
 w.eval("P().lad={ha:20,blocks:['x']};P().expl={liz:12}");
 ok(w.eval("valCalc(P()).rows.find(r=>r.k==='lizB').ha")===20&&w.eval("valCalc(P()).rows.find(r=>r.k==='lizP').ha")===0,"LIZ parasts nekad negatīvs: bloks 20 ha > VZD LIZ 12 ha -> lizB=20, lizP=0");
 // 4c. iadtRulesFor (#42): rokas noteikums, auto noteikums (spēkā), spēku zaudējis ieraksts neko nesamazina
 w=await app();
 w.eval("var t1={dapList:[{kind:'iadt',name:'Rāznas nacionālais parks',zone:'',ha:5},{kind:'zona',zone:'Dabas lieguma zona',ha:5}]}");
 const razna=w.eval("JSON.stringify(iadtRulesFor(t1))");
 ok(razna==='[{"iadt":"Rāznas nacionālais parks","key":"Rāznas nacionālais parks","zone":"dabas lieguma zona","src":"MK 447 (2007, red. 2024)","r":{"kcMax":null,"galvena":false,"kopsanaAge":{"Priede":60,"Ozols":60,"Egle":50,"Bērzs":50,"Melnalksnis":50,"Osis":50,"Apse":30},"season":"15.04-31.07","notes":["sausos kokus un kritalas >25 cm neizvāc","sanitārajā cirtē necērt augtspējīgus","atjaunošana stādot tikai ar DAP atļauju"]}}]',"iadtRulesFor: Rāzna -> rokas noteikums (nevis auto), src ar MK numuru (got "+razna+")");
 w.eval("IADT_AUTO={items:{'999':{name:'Testa liegums',url:'https://likumi.lv/ta/id/999','spēkā':true,rules:{'dabas lieguma zona':{kcMax:null}}}}}");
 w.eval("var t2={dapList:[{kind:'iadt',name:'Testa liegums',zone:'',ha:2},{kind:'zona',zone:'Dabas lieguma zona',ha:2}]}");
 const autoRule=w.eval("JSON.stringify(iadtRulesFor(t2))");
 ok(autoRule==='[{"iadt":"Testa liegums","key":"auto","zone":"dabas lieguma zona","src":"automātiski no https://likumi.lv/ta/id/999 (pārbaudīt)","r":{"kcMax":null,"notes":["auto: kcMax=null"]},"auto":true}]',"iadtRulesFor: teritorija bez rokas noteikuma, ar spēkā auto ierakstu -> atgriež auto noteikumu (got "+autoRule+")");
 w.eval("IADT_AUTO={items:{'888':{name:'Testa vecais liegums',url:'https://likumi.lv/ta/id/888','spēkā':false,rules:{'dabas lieguma zona':{kcMax:null}}}}}");
 w.eval("var t3={dapList:[{kind:'iadt',name:'Testa vecais liegums',zone:'',ha:2}]}");
 const zaudejis=w.eval("JSON.stringify(iadtRulesFor(t3))");
 ok(zaudejis==="[]","iadtRulesFor: spēku zaudējis auto ieraksts (spēkā=false) neko nesamazina, cērtamais nemainās (got "+zaudejis+")");
 // 4d. zoneChecks/zoneFeatures ar zināmiem datiem (#39): USIK garuma kategorija vs. bez USIK (minimālā + brīdinājums, BIG_RIVERS regex izņemts)
 w=await app();
 w.eval(`var _lon0=25.000,_lat0=57.000,_dlon=0.00521,_dlat=0.00284;
  var _geom=[[_lon0,_lat0],[_lon0+_dlon,_lat0],[_lon0+_dlon,_lat0+_dlat],[_lon0,_lat0+_dlat],[_lon0,_lat0]];
  var _stand={id:"s1",geom:_geom,platMezs:10,platKop:10,cirsmaKods:"KC",suga:"Priede",kvartals:"1",nogabals:"1"};
  var _usikLine=[[_lon0-0.001,_lat0+_dlat*0.25],[_lon0+_dlon+0.001,_lat0+_dlat*0.25]];
  var _osmLine=[[_lon0-0.001,_lat0+_dlat*0.75],[_lon0+_dlon+0.001,_lat0+_dlat*0.75]];
  var _p={mer:[_stand],cirsmas:[],infra:{usik:[{cat:"25-100",name:"Testupe",geom:[_usikLine]}],water:[{t:"river",name:"Nezinama upite",geom:[_osmLine]}],watera:[]}};`);
 const standHa=w.eval("+(turf.area(merFeature(_stand))/10000).toFixed(2)");
 ok(standHa===9.96,"Fixture: nogabals ~9,96 ha (got "+standHa+")");
 const kcFeats=w.eval("JSON.stringify(zoneFeatures(_p).kc.map(f=>({label:f.properties.label,w:f.properties.w,unconfirmed:f.properties.unconfirmed})))");
 ok(kcFeats==='[{"label":"upe Testupe (25-100 km)","w":50,"unconfirmed":false},{"label":"upe Nezinama upite (garums nav apstiprināts)","w":10,"unconfirmed":true}]',"zoneFeatures: USIK 25-100 km -> 50 m josla (KC band), bez USIK -> minimālā 10 m ar unconfirmed karodziņu, BIG_RIVERS regex vairs netiek lietots (got "+kcFeats+")");
 w.eval("var _out={nog:[{m:_stand,f:[]}],global:[]};zoneChecks(_p,_out);");
 const kHa=w.eval("_out.zoneByNog.s1.kc.ha"),mHa=w.eval("_out.zoneByNog.s1.main.ha");
 ok(kHa===3.79&&mHa===1.26,"zoneChecks: KC josla 3,79 ha, 10 m josla 1,26 ha (got kc="+kHa+" main="+mHa+")");
 ok(kHa>=0&&kHa<=standHa&&mHa>=0&&mHa<=standHa,"joslas ha robežās starp 0 un nogabala platību");
 const warnFind=w.eval("JSON.stringify(_out.nog[0].f.find(f=>f.t==='warn'))");
 ok(warnFind==='{"t":"warn","s":"Ūdensteces garums nav apstiprināts (nav MK 397 klasifikatorā), pieņemta minimālā aizsargjosla (Aizsargjoslu lik. 7.p.), pārbaudīt."}',"zoneChecks: dzeltens brīdinājums par neapstiprinātu garumu (got "+warnFind+")");
 const m3=w.eval(`Math.round(${kHa}*200)`);
 ok(m3===758,"atliktie m³ = joslas daļa × nogabala krāja: 3,79 ha × 200 m³/ha = 758 m³ (got "+m3+")");
 // 5. #44: objekts = NĪ ar vairākām ZV - agregācija (krāja, cērtamais, LAD/eksplikācijas ha, PAF zemes summa) = abu ZV summas
 w=await app();
 await w.eval("createFromPagasts('36680080031')");
 const zvA=w.eval("P().id");
 const statsExpr=p=>"(()=>{const p="+p+";return {mer:p.mer.length,kraja:+p.mer.reduce((s,m)=>s+krajaMer(m),0).toFixed(2),cut:+calcProp(p).m3.toFixed(2),ladHa:p.lad?p.lad.ha:0,explLiz:p.expl?(p.expl.liz||0):0,explMezs:p.expl?(p.expl.mezs||0):0,land:+valCalc(p).landPrice.toFixed(2),zv:p.zv.slice().sort()};})()";
 const A=JSON.parse(w.eval("JSON.stringify("+statsExpr("P()")+")"));
 await w.eval("createFromPagasts('70600050074')");
 const B=JSON.parse(w.eval("JSON.stringify("+statsExpr("P()")+")"));
 await w.eval(`addZV('${zvA}','70600050074')`);
 const C=JSON.parse(w.eval("JSON.stringify("+statsExpr(`S.props.find(x=>x.id==='${zvA}')`)+")"));
 ok(JSON.stringify(C.zv)==='["36680080031","70600050074"]',"2 ZV objektā: abas ZV pievienotas p.zv (got "+JSON.stringify(C.zv)+")");
 ok(C.mer===A.mer+B.mer,"2 ZV: nogabalu skaits summējas "+C.mer+" = "+A.mer+" + "+B.mer);
 ok(Math.abs(C.kraja-(A.kraja+B.kraja))<0.5,"2 ZV: krāja summējas ("+C.kraja+" vs "+(A.kraja+B.kraja).toFixed(2)+")");
 ok(Math.abs(C.cut-(A.cut+B.cut))<0.5,"2 ZV: cērtamais summējas ("+C.cut+" vs "+(A.cut+B.cut).toFixed(2)+")");
 ok(Math.abs(C.ladHa-(A.ladHa+B.ladHa))<0.05,"2 ZV: LAD lauku bloku ha (LIZ blokā) summējas ("+C.ladHa+" vs "+(A.ladHa+B.ladHa).toFixed(2)+")");
 ok(Math.abs(C.explLiz-(A.explLiz+B.explLiz))<0.05&&Math.abs(C.explMezs-(A.explMezs+B.explMezs))<0.05,"2 ZV: VZD eksplikācijas ha (LIZ, mežs) summējas (got C="+JSON.stringify(C)+" A+B liz="+(A.explLiz+B.explLiz).toFixed(2)+" mezs="+(A.explMezs+B.explMezs).toFixed(2)+")");
 ok(Math.abs(C.land-(A.land+B.land))<5,"2 ZV: PAF zemes pirkuma summa (valCalc landPrice) summējas ("+C.land+" vs "+(A.land+B.land).toFixed(2)+")");
 // 6. #44: viens ZV kā līdz šim (bez māsas ZV) - siblingZV neizraisa izvēles UI, izveide notiek uzreiz (jau pārbaudīts iepriekš ar Zapasnaja/Ezermuiža/PAF - visi testi augstāk paliek zaļi bez izmaiņām)
 // 7. #44: Arhivēšana - arhivēts objekts nav sarakstā/Fondā, atjaunots atgriežas
 w=await app();
 await w.eval("createFromPagasts('36680080031')");
 const pid=w.eval("P().id");
 const nBefore=w.eval("fundStats(S.props).n");
 w.eval(`archiveProp('${pid}')`); // #44: divkāršs klikšķis apstiprinājumam (arhivēt ar apstiprinājumu) — 1. klikšķis tikai iestata ARM, nearhivē
 ok(w.eval(`S.props.find(p=>p.id==='${pid}').archived`)!==true,"archiveProp: 1. klikšķis vēl nearhivē (gaida apstiprinājumu)");
 w.eval(`archiveProp('${pid}')`); // 2. klikšķis izpilda
 ok(w.eval(`S.props.find(p=>p.id==='${pid}').archived`)===true,"archiveProp: 2. klikšķis atzīmē kā arhivētu");
 ok(w.eval(`S.props.filter(p=>!p.archived).some(p=>p.id==='${pid}')`)===false,"arhivēts objekts nav redzams noklusētajā (nearhivētā) sarakstā");
 const nAfterArchive=w.eval("fundStats(S.props).n");
 ok(nAfterArchive===nBefore-1,"arhivēts objekts neskaita Fondā: n "+nAfterArchive+" = "+nBefore+" - 1");
 w.eval(`restoreProp('${pid}')`);
 ok(w.eval(`S.props.find(p=>p.id==='${pid}').archived`)===false,"restoreProp: objekts atjaunots no arhīva");
 const nAfterRestore=w.eval("fundStats(S.props).n");
 ok(nAfterRestore===nBefore,"atjaunots objekts atkal skaitās Fondā");
 // 8. #45: nogabalu ticamības pārbaude (VMD dbf ×100 kļūda). 60700020059 kv.2 nog.4: B16, D12, H11, 3,05 ha, reālajos datos krāja 25095 m³ (8228 m³/ha), G 1700 -> patiesie ~251 m³, G 17. NĪ "Bojāri" ir 2 ZV, ņem tikai šo.
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 const tgt="P().mer.find(m=>m.kvartals==='2'&&m.nogabals==='4')";
 ok(w.eval("P().mer.length")===56,"60700020059: 56 nogabali");
 const pl=JSON.parse(w.eval("JSON.stringify(nogPlausibleIssue("+tgt+"))"));
 ok(pl&&pl.krha>900&&pl.g>80,"kv.2 nog.4 atzīmēts kā neticams (krāja/ha > 900 vai G > 80): "+JSON.stringify(pl));
 ok(w.eval("runChecks(P()).nog.find(x=>x.m.kvartals==='2'&&x.m.nogabals==='4').f.some(f=>f.t==='bloks'&&/Krāja ārpus iespējamā \\(\\d+ m³\\/ha\\), avota kļūda/.test(f.s))"),"runChecks: sarkans karodziņš 'Krāja ārpus iespējamā (X m³/ha), avota kļūda'");
 const rawTot=w.eval("Math.round(P().mer.reduce((s,m)=>s+krajaMer(m),0))"),chkTot=w.eval("dashData(P()).kraja"),fundTot=w.eval("fundStats(S.props).kraja");
 ok(Math.abs(chkTot-12146)<=125&&chkTot===fundTot&&rawTot-chkTot>20000,"kopējā krāja bez neticamā nogabala ≈ 12 146 m³ Pārskatā un Fondā (got Pārskats "+chkTot+", Fonds "+fundTot+", bez pārbaudes "+rawTot+")");
 ok(w.eval("fixEligible("+tgt+")")===true,"×0,01 labojums piedāvāts (abi pārkāpj, pēc /100 abi ticami)");
 w.eval("fixByHundred("+tgt+".id)"); // 1. klikšķis: tikai apbruņo (arm), nedrīkst mainīt datus
 ok(w.eval(tgt+".G")===1700&&w.eval("ARM")==="fix1"+w.eval(tgt+".id"),"1. klikšķis uz 'Labot ×0,01' tikai apstiprina, dati vēl nemainās (arm)");
 w.eval("fixByHundred("+tgt+".id)"); // 2. klikšķis (apstiprinājums) piemēro labojumu
 const after=JSON.parse(w.eval("JSON.stringify((()=>{const m="+tgt+";return {krajaImp:m.krajaImp,G:m.G,man:m.man,plaus:nogPlausibleIssue(m)};})())"));
 ok(after.G===17&&Math.abs(after.krajaImp-250.95)<0.01&&after.plaus===null&&after.man&&/labots ×0,01/.test(after.man.krajaImp)&&/labots ×0,01/.test(after.man.G),"pēc ×0,01: G 17, krāja 250,95 m³, vairs nav neticams, lauki atzīmēti kā laboti ar roku (got "+JSON.stringify(after)+")");
 const chkAfter=w.eval("dashData(P()).kraja");
 ok(Math.abs(chkAfter-12397)<=125&&chkAfter>chkTot,"pēc ×0,01 kopējā krāja ≈ 12 397 m³ (got "+chkAfter+")");
 ok(w.eval("P().log.some(l=>/labots ×0,01/.test(l.text))"),"vēstures ieraksts par ×0,01 labojumu");
 ok(w.eval("fixEligible("+tgt+")")===false,"pēc labojuma ×0,01 vairs netiek piedāvāts");
 // 9. #46 pabeigšana: bonitāte pēc MK 384 (21.06.2016) 3. piel. 4./5./6. tabula (nevis Orlova aproksimācija).
 // Avoti pārbaudīti neatkarīgi (vestnesis.lv + likumi.lv, 447 rindas identiskas), pilnā tabula data/mk384_bonitate.json.
 ok(w.eval("cirtmetsKC('Priede',108,'')")===""&&w.eval("cirtmetsKC('Priede',108,'I')")==="KC"&&w.eval("cirtmetsKC('Priede',108,'IV')")===""&&w.eval("cirtmetsKC('Priede',121,'IV')")==="KC","cirtmetsKC: tukša bonitāte -> nav cirtmeta; I bon. 101 g; IV bon. 121 g (MK935)");
 ok(w.eval("cirtmetsKC('Bērzs',51,'I')")===""&&w.eval("cirtmetsKC('Bērzs',71,'I')")==="KC"&&w.eval("cirtmetsKC('Bērzs',51,'IV')")==="KC","cirtmetsKC: Bērzs 51 g ar I bon. nav KC (slieksnis 71), ar IV bon. ir");
 // MK 384 3.piel. 4.tabula (priede u.c.), rinda vecums=106: Ia≥32,I 28-31,II 24-27,III 20-23,IV 17-19,V 13-16,Va≤12
 ok(w.eval("bonOf({suga:'Priede',H:30,vecums:106}).bon")==="I","Priede 106 g, H 30 -> I (MK384 4.tab.)");
 ok(w.eval("bonOf({suga:'Priede',H:22,vecums:106}).bon")==="III","Priede 106 g, H 22 -> III (MK384 4.tab.)");
 // MK 384 3.piel. 5.tabula (bērzs u.c.), rinda vecums=60: Ia 27,I 23,II 20,III 17,IV 13,V 10
 ok(w.eval("bonOf({suga:'Bērzs',H:22,vecums:60}).bon")==="II","Bērzs 60 g, H 22 -> II (MK384 5.tab.)");
 // MK 384 3.piel. 6.tabula (baltalksnis, pīlādzis), rinda vecums=30: Ia 18,I 16,II 14,III 11,IV 9,V 6
 ok(w.eval("bonOf({suga:'Baltalksnis',H:15,vecums:30}).bon")==="II","Baltalksnis 30 g, H 15 -> II (MK384 6.tab.)");
 ok(w.eval("bonOf({suga:'Priede',H:20,vecums:15}).bon")===""&&w.eval("bonOf({suga:'Priede',H:20,vecums:15}).src")==="jauns","vecums < tabulas minimuma (21 priedei) -> nav nosakāms, klusi (bez karodziņa)");
 ok(w.eval("bonOf({suga:'Priede',H:36,vecums:250}).bon")===w.eval("bonOf({suga:'Priede',H:36,vecums:160}).bon"),"vecums > tabulas maksimuma (160) -> pēdējā rinda");
 ok(w.eval("bonOf({bon:'II',H:20,vecums:60}).est")===false&&w.eval("bonOf({suga:'Priede',H:28,vecums:106}).est")===true&&w.eval("bonOf({H:0,vecums:0}).bon")==="","bonOf: dati > MK384 tabula > nav zināma");
 const bonFlagOld=w.eval("runChecks(P()).nog.filter(x=>x.f.some(f=>f.t==='warn'&&/aptuvena/.test(f.s))).length");
 ok(bonFlagOld===0,"vecās 'bonitāte aptuvena' (Orlova aproksimācija) dzeltenā karodziņa vairs nav — funkcija izņemta");
 // 60700020059: 18 priedes 101-111 g ar REĀLIEM H no pagasta faila (bez simulētas bonitātes) -> visām MK384 dod bon I-III -> visas KC
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 const pinesExpr="P().mer.filter(m=>m.suga==='Priede'&&m.vecums>=101&&m.vecums<=111)";
 ok(w.eval(pinesExpr+".length")===18,"60700020059: 18 priedes 101-111 g (got "+w.eval(pinesExpr+".length")+")");
 const pineBon=JSON.parse(w.eval("JSON.stringify("+pinesExpr+".map(m=>bonOf(m)))"));
 ok(pineBon.every(b=>b.src==="mk384"&&/^(Ia|I|II|III|IV|V|Va)$/.test(b.bon)),"visām 18 priedēm bonitāte no MK384 tabulas (nevis datos, nevis nezināma), got "+JSON.stringify(pineBon.map(b=>b.bon)));
 const pineKC=w.eval(pinesExpr+".filter(m=>m.cirsmaKods==='KC').length"),pineM3=w.eval("Math.round("+pinesExpr+".reduce((s,m)=>s+krajaMerChecked(m),0))");
 ok(pineKC===18&&Math.abs(pineM3-8086)<=150,"ar reālu H no pagasta faila (MK384) visas 18 priedes ir KC, krāja ≈ 8086 m³ (got "+pineKC+" gab., "+pineM3+" m³)");
 ok(w.eval(pinesExpr+".every(m=>runChecks(P()).nog.find(x=>x.m===m).f.some(f=>f.t==='info'&&/MK 384 3\\. piel\\./.test(f.s)))")===true,"katrai priedei zils informatīvs karogs 'bonitāte X (MK 384 3. piel. N. tab.)'");
 // #45 turpinājums: G > 1,5× normālais (MK384 2.tab.) ir jutīgāks slieksnis nekā fiksēts 80; 80 paliek kā aizsargs, ja normālais nav nosakāms
 ok(w.eval("normalG('Priede',15)")===32,"MK384 2.tab.: priedei H=15 normālais G = 32 m²/ha");
 ok(w.eval("gExceeds('Priede',15,50)")===true&&w.eval("gExceeds('Priede',15,45)")===false,"G=50 > 1,5×32=48 -> pārkāpj (jauns, zem 80); G=45 -> nepārkāpj");
 ok(w.eval("gExceeds('Priede',null,75)")===false&&w.eval("gExceeds('Priede',null,85)")===true,"bez H (normālais nav nosakāms): 80 paliek aizsargs (75 nepārkāpj, 85 pārkāpj)");
 ok(w.eval("nogPlausibleIssue({suga:'Priede',H:15,platMezs:1,G:50,krajaImp:20})")!==null,"nogPlausibleIssue: G=50 pie H=15 (>1,5×normālā) atzīmē nogabalu, kaut arī G<80 un krāja/ha ticama");
 // 10. #22: cirsmas pēc ģeometriskas piegulības (MK935 18.p.), nevis krājas summas; limits pa nogabalu (MK935 15./16./23.p.); atdalošās joslas.
 // Cēlonis (diagnoze 03.09.2026): adjacency atslēga bija "kv-nog" (bez ZV), bet salīdzināta pret kailu m.nogabals -> daudz-ZV objektos (60700020059, NĪ "Bojāri", 2 ZV)
 // NEKAD neatrada atbilstību, tāpēc buffers vienmēr bija tukšs masīvs. Labots: atslēga vienmēr zv/kv/nog (mKey), cirsmas veido pēc savienoto komponenšu grafa.
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 const r22=JSON.parse(w.eval(`JSON.stringify((()=>{const r=runChecks(P());
  const grpOf=k=>r.split.findIndex(g=>g.nog.some(e=>mKey(e.m)===k));
  const rawTokens=String(P().kaimini||"").split(/[;,]/).map(x=>x.trim()).filter(Boolean);
  const allResolved=kaiminiPairs(P(),r.nog); // visi pāri, kam abas puses atrastas (nav filtrēts pēc garuma)
  const pairs=allResolved.filter(pr=>pr.len>ADJ_MIN_M);
  const unbuffered=pairs.filter(pr=>{const ga=grpOf(mKey(pr.xa.m)),gb=grpOf(mKey(pr.xb.m));if(ga<0||gb<0||ga===gb)return false;
   return !r.buffers.some(b=>(b.victim===pr.xa.m&&b.other===pr.xb.m)||(b.victim===pr.xb.m&&b.other===pr.xa.m));}).map(pr=>pr.xa.m.nogabals+"-"+pr.xb.m.nogabals);
  const overLimit=r.split.filter(g=>g.ha>5.001||g.slapjieHa>2.001).map(g=>g.ha);
  const nog15=r.nog.find(x=>x.m.kvartals==="2"&&x.m.nogabals==="15");
  const nog15sp=r.oversized.find(sp=>sp.x.m.kvartals==="2"&&sp.x.m.nogabals==="15");
  return {rawTokenCount:rawTokens.length,resolvedCount:allResolved.length,numPairs:pairs.length,unbuffered,overLimit,numGroups:r.split.length,numBuffers:r.buffers.length,deferredM3:r.deferredM3,
   kcTotal:r.kc.sausie.m3+r.kc.slapjie.m3,blockedM3:r.blockedM3,splitsFailed:r.splits.map(s=>s.nog),
   nog15bloks:nog15.f.some(f=>f.t==="bloks"&&/23\\.p\\./.test(f.s)),nog15warn:nog15.f.find(f=>f.t==="warn"&&/sadalījuma līnija jāprecizē skicē/.test(f.s)),
   nog15ier:nog15.f.find(f=>f.t==="ier"&&/divi piegājieni — KC tagad/.test(f.s)),geomRings:ringsOf(nog15.m.geom).length,
   nog15sp:nog15sp?{kcHa:nog15sp.kcHa,stripHa:nog15sp.stripHa,restHa:nog15sp.restHa,restM3:nog15sp.restM3,proportional:!!nog15sp.proportional,mode:nog15sp.mode,widthM:nog15sp.widthM}:null};})())`));
 ok(r22.rawTokenCount>0&&r22.resolvedCount===r22.rawTokenCount,"60700020059 (2 ZV, NĪ 'Bojāri'): kaiminiPairs atrisina VISUS p.kaimini pārus (agrāk 0, jo atslēgā trūka ZV) (got "+r22.resolvedCount+"/"+r22.rawTokenCount+")");
 ok(r22.numPairs>50,"no tiem piegulošie (robeža > 50 m, MK935 18.p.) ir vairāk par 50 (got "+r22.numPairs+")");
 ok(r22.overLimit.length===0,"neviena cirsma nepārsniedz MK935 15./16.p. limitu (got "+JSON.stringify(r22.overLimit)+")");
 ok(r22.unbuffered.length===0,"nevienam piegulošam cirsmu pārim nav joslas/atlikšanas (got "+JSON.stringify(r22.unbuffered)+")");
 ok(r22.numBuffers>0&&r22.deferredM3>0,"atdalošās joslas izveidotas, atliktie m³ > 0 (got buffers="+r22.numBuffers+", deferredM3="+r22.deferredM3+")");
 // #22 turpinājums: kopš pagastu pārbūves 03.09.2026 12:07 (SCHEMA_VERSION 2, caurumi saglabāti) kv.2 nog.15 ģeometrija ir 2 gredzeni,
 // poligona platība 5,506 ha ≈ VMD 5,53 ha, tāpēc strādā ĢEOMETRISKAIS dalījums, nevis proporcionālais fallback.
 // #48 (04.09.2026): noklusējums vairs NAV 23.p. 90 m josla, bet "divi piegājieni" — KC tagad = limits 5,00 ha, atlikums ≈0,50 ha kā ≥20 m josla (20.p.).
 // Vecās vērtības (viens piegājiens, 23.p.): KC 4,14 / 90 m josla 1,30 / atlikums 0,06 — tagad tikai pēc stratēģijas izvēles cirsmā (pārbaudīts Nalobnes blokā).
 ok(r22.geomRings===2,"kv.2 nog.15: ģeometrija ar caurumu (2 gredzeni) pēc pagastu pārbūves (got "+r22.geomRings+")");
 ok(!r22.nog15bloks&&!r22.nog15warn&&!!r22.nog15ier,"kv.2 nog.15: ģeometriskais dalījums 'divi piegājieni' (ier), nav ne sarkana bloka, ne dzeltena proporcionālā karoga (got bloks="+r22.nog15bloks+", warn="+!!r22.nog15warn+", ier="+!!r22.nog15ier+")");
 ok(r22.nog15sp&&!r22.nog15sp.proportional&&r22.nog15sp.mode==="divi"&&r22.nog15sp.widthM===20&&Math.abs(r22.nog15sp.kcHa-5.0)<=0.05&&Math.abs(r22.nog15sp.stripHa+r22.nog15sp.restHa-0.5)<=0.1,"kv.2 nog.15 (#48 noklusējums): divi piegājieni, KC tagad ≈5,00 ha (= limits), atlikums ≈0,50 ha, josla ≥20 m, nekādas 90 m (got "+JSON.stringify(r22.nog15sp)+")");
 ok(r22.splitsFailed.length===0,"vairs nav neviena 'jāsadala ar roku' sarkanā bloka (proporcionālais fallback aizstāj) (got "+JSON.stringify(r22.splitsFailed)+")");
 const total22=r22.kcTotal+r22.deferredM3+r22.blockedM3;
 ok(Math.abs(total22-9340)<=100,"KC kopā + atliktie + bloķētie ≈ 9340 m³ (pirms-sadalīšanas summa, iekšēji konsekventa; PIEZĪME: issue #22 komentārā minētie 9079 m³ bija no 2 jau izveidotām rokas cirsmām, ne visu 56 nogabalu pilnās KC kopsummas — atskaitē paskaidrots) (got "+total22+")");
 // Zapasnaja/Ezermuiža/70420080041: pateikt, vai mainās
 w=await app();await w.eval("createFromPagasts('36680080031')");
 const zap22=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());return {numBuffers:r.buffers.length,deferredM3:r.deferredM3};})())"));
 ok(zap22.numBuffers>0&&zap22.deferredM3>0,"Zapasnaja: TAS PATS #22 labojums ietekmē arī šo objektu — tagad ir reālas joslas (agrāk 0, tas pats atslēgas defekts) (got buffers="+zap22.numBuffers+", deferredM3="+zap22.deferredM3+")");
 w=await app();await w.eval("createFromPagasts('70600050074')");
 const ez22=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());return {numBuffers:r.buffers.length,deferredM3:r.deferredM3};})())"));
 // #74: baltalksnis nog.26 (0 g krājas, 1,97 ha, 9 g) tagad "vienmēr" KC (Meža likuma 9.p. tabulā nav cirtmeta) un ir piegulošs kādam citam KC nogabalam — 1 josla, bet 0 m³ (G=0, nekas nav cērtams)
 ok(ez22.numBuffers===1&&ez22.deferredM3===0,"Ezermuiža: nog.26 (baltalksnis, 0 g krājas) tagad arī 'KC' un piegulošs — 1 josla parādās, bet 0 m³ atliekas (G=0) (agrāk 0 joslu, #74 aizstāj #60 25 g slieksni ar 'vienmēr') (got buffers="+ez22.numBuffers+", deferredM3="+ez22.deferredM3+")");
 w=await app();await w.eval("createFromPagasts('70420080041')");
 const paf22=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());return {numBuffers:r.buffers.length,deferredM3:r.deferredM3};})())"));
 ok(paf22.numBuffers===0&&paf22.deferredM3===0,"70420080041 (PAF): nemainās (got buffers="+paf22.numBuffers+", deferredM3="+paf22.deferredM3+")");
 // Sintētisks: viens 7 ha nogabals damaksnī (limits 5 ha) -> ģeometriski sadalās KC daļā + 90 m josla (MK935 23.p.) + atlikumā
 w=await app();
 w.eval(`var _lon0=25.000,_lat0=57.000,_dlon=350/(111320*Math.cos(_lat0*Math.PI/180)),_dlat=200/111320;
  var _g=[[_lon0,_lat0],[_lon0+_dlon,_lat0],[_lon0+_dlon,_lat0+_dlat],[_lon0,_lat0+_dlat],[_lon0,_lat0]];
  var _sm={id:"synt1",zv:"99999999999",kvartals:"1",nogabals:"1",mezaTips:"Damaksnis",platMezs:7,platKop:7,suga:"Priede",krajaImp:1400,G:25,H:28,vecums:100,cirsmaKods:"KC",geom:_g,formula:[{s:"Priede",k:10}]};`);
 const synHa=w.eval("+(turf.area(merFeature(_sm))/10000).toFixed(2)");
 ok(Math.abs(synHa-7)<0.1,"sintētiskais nogabals ~7 ha (got "+synHa+")");
 const sp22=JSON.parse(w.eval("JSON.stringify(splitOversizedNogabals({m:_sm,kr:krajaMer(_sm),krha:krajaMer(_sm)/7},5))"));
 ok(sp22&&sp22.kcHa<=5&&sp22.kcHa>0&&sp22.stripHa>0&&sp22.restHa>0,"sintētisks 7 ha damaksnī -> KC daļa ≤5 ha, josla > 0, atlikums > 0 (got "+JSON.stringify(sp22)+")");
 ok(sp22&&Math.abs((sp22.kcHa+sp22.stripHa+sp22.restHa)-7)<0.2,"daļu summa ≈ pilnā platība 7 ha (got "+(sp22?+(sp22.kcHa+sp22.stripHa+sp22.restHa).toFixed(2):null)+")");
 ok(sp22&&sp22.year===new Date().getFullYear()+3,"josla atlikta uz +3 g (MK935 20.p. atjaunošanās vecums), got gads "+(sp22&&sp22.year));
 // Proporcionālais fallback vairs nav sasniedzams ar reālo nog.15 (ģeometrija tagad uzticama) -> sintētiski: tā pati 7 ha ģeometrija, bet VMD deklarē 9 ha (>10 % atšķirība) -> ģeometriskais atsakās, proporcionālais pārņem
 const spProp=JSON.parse(w.eval("JSON.stringify((()=>{const m=Object.assign({},_sm,{platMezs:9,platKop:9});const x={m,kr:1800,krha:200};return {geo:splitOversizedNogabals(x,5),prop:splitOversizedProportional(x,5)};})())"));
 ok(spProp.geo===null&&spProp.prop&&spProp.prop.proportional&&spProp.prop.kcHa===5&&Math.abs(spProp.prop.restHa-4)<0.01&&spProp.prop.restM3===800,"ģeometrija ≠ VMD platība (7 pret 9 ha): ģeometriskais atsakās, proporcionālais dod cirsmā 5 ha, atlikums 4 ha / 800 m³ (got "+JSON.stringify({geo:spProp.geo,kcHa:spProp.prop&&spProp.prop.kcHa,restHa:spProp.prop&&spProp.prop.restHa,restM3:spProp.prop&&spProp.prop.restM3})+")");
 // #39: zoneByNog piesaiste — cēlonis NAV #22 atslēgas kļūda (zoneFeatures/stripHaOf strādā ar ģeometriju, ne string-atslēgām),
 // bet TĀ PATI "paturi tikai lielāko fragmentu" kļūda kā #22 sākotnējā ģeometrijā — build_infra.py watera eksportā liela ūdensobjekta
 // (piem. Daugavas) bbox-apgriešana to sadala vairākos fragmentos, un kods paturēja TIKAI lielāko, izmetot nogabaliem tuvāko.
 w=await app();
 w.eval(`var _standRing=[[27.000,57.000],[27.001,57.000],[27.001,57.001],[27.000,57.001],[27.000,57.000]];
  var _stand={id:"s1",zv:"1",kvartals:"1",nogabals:"1",platMezs:1,platKop:1,cirsmaKods:"KC",suga:"Priede",geom:_standRing};
  var _smallFrag=[[[27.0012,57.0003],[27.0018,57.0003],[27.0018,57.0007],[27.0012,57.0007],[27.0012,57.0003]]]; // mazs fragments PIE nogabala
  var _bigFrag=[[[30.000,60.000],[30.100,60.000],[30.100,60.050],[30.000,60.050],[30.000,60.000]]]; // liels fragments TĀLU (vecais kods paturētu tikai šo)
  var _wateraDaugava={t:"riverbank",name:"Daugava",ha:100,geom:[_smallFrag,_bigFrag]};
  var _p39={mer:[_stand],cirsmas:[],infra:{water:[],usik:[],watera:[_wateraDaugava]}};`);
 const synt39=JSON.parse(w.eval(`JSON.stringify((()=>{const Z=zoneFeatures(_p39);const f=Z.kc[0];
  return {label:f.properties.label,w:f.properties.w,intersects:turf.booleanIntersects(merFeature(_stand),f)};})())`));
 ok(synt39.intersects===true&&/upe Daugava/.test(synt39.label),"sintētisks Daugavas gadījums: mazs fragments pie nogabala vairs netiek izmests, josla > 0 (got "+JSON.stringify(synt39)+")");
 // #39 turpinājums (03.09.2026): TAS PATS "paturi tikai vienu formātu" defekts arī loadInfra watera filtrā (nevis tikai zoneFeatures) —
 // inBB(w.geom) sagaidīja plakanu gredzenu, bet kopš infra pārbūves watera[].geom vienmēr MultiPolygon; reālajā datu bāzē tas izmeta VISUS 108 poligonus pagastā 6070. Testē caur loadInfra pašu (ar mocked fetch).
 w=await app();
 w.eval(`var _standRing39w=[[27.000,57.000],[27.001,57.000],[27.001,57.001],[27.000,57.001],[27.000,57.000]];
  var _p39w={id:"synt39w",zv:["99990010001"],mer:[{id:"s1",zv:"9999",kvartals:"1",nogabals:"1",platMezs:1,platKop:1,cirsmaKods:"KC",suga:"Priede",geom:_standRing39w}],cirsmas:[],deferPairs:[]};`);
 const infraGz=zlib.gzipSync(Buffer.from(JSON.stringify({pagasts:"9999",updated:"2026-09-03",roads:[],water:[],usik:[],watera:[{t:"water",name:"Testezers",ha:5,geom:[[[[27.0005,57.0005],[27.0015,57.0005],[27.0015,57.0015],[27.0005,57.0015],[27.0005,57.0005]]]]}]})));
 w.fetch=async(url)=>/\/infra\/9999\.json\.gz/.test(url)?{ok:true,arrayBuffer:async()=>infraGz.buffer.slice(infraGz.byteOffset,infraGz.byteOffset+infraGz.byteLength)}:{ok:false,status:404};
 await w.eval(`(async()=>{window.__err39w=null;try{await loadInfra(_p39w);}catch(e){window.__err39w=e.message;}})()`);
 
 const w39=JSON.parse(w.eval("JSON.stringify({watera:(_p39w.infra&&_p39w.infra.watera)||[],err:window.__err39w})"));
 ok(w39.watera.length===1&&!w39.err,"loadInfra: MultiPolygon watera formāts vairs netiek izmests bbox filtrā, vismaz 1 poligons paliek (got "+JSON.stringify(w39)+")");
 // reālie dati: vecais plakans watera formāts (pirms infra pārbūves) joprojām strādā bez kļūdas (atpakaļsaderība)
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 await w.eval("loadInfra(P())");
 const liveZ=w.eval("(()=>{try{const Z=zoneFeatures(P());return Z?Z.kc.length:-1;}catch(e){return 'ERR:'+e.message;}})()");
 ok(typeof liveZ==="number"&&liveZ>=0,"60700020059: zoneFeatures nesalūzt uz reāliem (vēl vecā formāta, pirms infra pārbūves) datiem (got "+liveZ+")");
 // #22 turpinājums: pagasta faila geom tagad gredzenu saraksts [ārējais,caurums,...] (SCHEMA_VERSION 2) — merFeature/turf.area caurumu atskaita; vecais plakanais formāts joprojām strādā
 w.eval(`var _o=[[25,57],[25.001650165,57],[25.001650165,57.000898456],[25,57.000898456],[25,57]];
  var _h=[[25.00066,57.00036],[25.00066,57.00054],[25.00099,57.00054],[25.00099,57.00036],[25.00066,57.00036]];
  var _mHole={id:"synt2",geom:[_o,_h]};var _mFlat={id:"synt3",geom:_o};`);
 const holeHa=w.eval("+(turf.area(merFeature(_mHole))/10000).toFixed(3)"),outerHa=w.eval("+(turf.area(merFeature(_mFlat))/10000).toFixed(3)");
 ok(holeHa<outerHa-0.03,"jauns formāts (gredzenu saraksts): caurums atskaitīts no platības (ārējais "+outerHa+" ha, ar caurumu "+holeHa+" ha)");
 ok(outerHa>0.9&&outerHa<1.1,"vecais plakanais gredzens joprojām strādā (merFeature atpazīst abus formātus) (got "+outerHa+" ha)");
 // #21: izvešanas ceļi — viena krautuve, efektīvākais (Dijkstra) ceļš pa ceļu tīklu katram cērtamajam nogabalam, svērtais vidējais, izmaksu formula
 // sintētisks gadījums: L veida ceļš K -[364 m]-> E -[557 m]-> N (NE taisnā līnijā); nog. A pie E (mazs, 100 m³), nog. B pie N (liels, 300 m³)
 w=await app();
 w.eval(`var _K=[25.0000,57.0000],_E=[25.0060,57.0000],_N=[25.0060,57.0050];
  var _roads21=[{t:"unclassified",geom:[[_K,_E,_N]]}];
  var _standA21={id:"a1",zv:"1",kvartals:"1",nogabals:"A",platMezs:1,platKop:1,cirsmaKods:"KC",suga:"Priede",krajaImp:100,
   geom:[[25.0064,57.0001],[25.0068,57.0001],[25.0068,57.0004],[25.0064,57.0004],[25.0064,57.0001]]};
  var _standB21={id:"b1",zv:"1",kvartals:"1",nogabals:"B",platMezs:1,platKop:1,cirsmaKods:"KC",suga:"Priede",krajaImp:300,
   geom:[[25.0055,57.0053],[25.0059,57.0053],[25.0059,57.0056],[25.0055,57.0056],[25.0055,57.0053]]};
  var _cA21={id:"cA21",tips:"Kc"},_cB21={id:"cB21",tips:"Kc"};_standA21.cirsma="cA21";_standB21.cirsma="cB21";
  var _p21={mer:[_standA21,_standB21],cirsmas:[_cA21,_cB21],infra:{roads:_roads21},krautuve:{lon:_K[0],lat:_K[1],manual:true}};`);
 const c21=JSON.parse(w.eval("JSON.stringify(izvedCalc(_p21))"));
 const dA=c21.byNog.find(r=>r.m.nogabals==="A"),dB=c21.byNog.find(r=>r.m.nogabals==="B");
 // neatkarīgi apstiprināts (turf.distance, haversine, ne app pašas wgsToLks): ceļš K-E 363,4 m, E-N 556,0 m, piesaiste A->E 45,8 m, B->N 53,2 m -> gaidāms distA≈409, distB≈973 (LKS-92 vs haversine atšķirība <0,5 %)
 ok(c21.ok&&Math.abs(dA.dist-410.4)<3,"#21 nog. A: attālums pa ceļu (ne taisnā līnijā) ≈410 m (got "+(dA&&dA.dist.toFixed(1))+")");
 ok(Math.abs(dB.dist-974.4)<3,"#21 nog. B: attālums pa ceļu (garāks zars) ≈974 m (got "+(dB&&dB.dist.toFixed(1))+")");
 ok(dA.path.length>2&&dB.path.length>2,"#21 maršruts iet pa ceļa virsotnēm (L līkumu), ne taisnā līnijā (got ceļa punktu skaits "+dA.path.length+", "+dB.path.length+")");
 const expAvg=(410.36383407973153*100+974.4119280670265*300)/400;
 ok(Math.abs(c21.avgDist-expAvg)<0.01&&Math.abs(c21.totalM3-400)<0.01,"#21 svērtais vidējais attālums (svars=m³): (410,4×100+974,4×300)/400 ≈833,4 m (got "+c21.avgDist.toFixed(1)+", totalM3 "+c21.totalM3+")");
 w.eval("S.settings.izvedBase=6;S.settings.izvedExtra=0.25;S.settings.izvedBaseDist=300;");
 const iz21=JSON.parse(w.eval("JSON.stringify(izvedIzmaksas(_p21))"));
 ok(iz21.ok&&Math.abs(iz21.costM3-7.3335)<0.01&&Math.abs(iz21.cost-2933.4)<1,"#21 izmaksu formula: 6+max(0,833,4−300)/100×0,25 ≈7,33 €/m³ × 400 m³ ≈2933 € (got "+iz21.costM3.toFixed(3)+" €/m³, "+iz21.cost.toFixed(1)+" €)");
 // 7.p.: infra vai krautuve trūkst -> izmaksa 0, dzeltens karodziņš, ne kļūda
 const izNoKr=JSON.parse(w.eval("JSON.stringify(izvedIzmaksas(Object.assign({},_p21,{krautuve:null})))"));
 ok(izNoKr.ok===false&&izNoKr.cost===0&&/krautuve/.test(izNoKr.reason),"#21 bez krautuves: izmaksa 0, iemesls skaidrs (got "+JSON.stringify(izNoKr)+")");
 const izNoInfra=JSON.parse(w.eval("JSON.stringify(izvedIzmaksas(Object.assign({},_p21,{infra:{roads:[]}})))"));
 ok(izNoInfra.ok===false&&izNoInfra.cost===0&&/infrastruktūr/.test(izNoInfra.reason),"#21 bez ceļu datiem: izmaksa 0, iemesls skaidrs (got "+JSON.stringify(izNoInfra)+")");
 // reāls objekts ar infra datiem (60700020059, 03.09.2026, pēc infra pārbūves commit 8ea4b8e): krautuve automātiski uz ceļa pieslēguma, 24 cērtamie nogabali
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 await w.eval("loadInfra(P())");
 const krReal=JSON.parse(w.eval("JSON.stringify(P().krautuve)"));
 ok(krReal&&typeof krReal.lon==="number"&&typeof krReal.lat==="number","60700020059: krautuve piedāvāta automātiski (got "+JSON.stringify(krReal)+")");
 const c21r=JSON.parse(w.eval("JSON.stringify(izvedCalc(P()))"));
 ok(c21r.ok&&c21r.byNog.length===24&&Math.abs(c21r.totalM3-9638)<1,"60700020059: 24 cērtamie nogabali, kopā ≈9638 m³ (got "+(c21r.byNog&&c21r.byNog.length)+", "+(c21r.totalM3&&c21r.totalM3.toFixed(0))+")");
 ok(Math.abs(c21r.avgDist-1248.8)<2,"60700020059: svērtais vidējais izvešanas attālums ≈1249 m pa ceļu tīklu uz vienu krautuvi (got "+c21r.avgDist.toFixed(1)+")");
 const iz21r=JSON.parse(w.eval("JSON.stringify(izvedIzmaksas(P()))"));
 ok(iz21r.ok&&Math.abs(iz21r.cost-80689)<50,"60700020059: izvešanas izmaksas ≈80 689 € (bāzes likmes, #21) (got "+iz21r.cost.toFixed(0)+")");
 // #19: LiDAR/Sentinel salīdzinājums — sintētisks zināms pāris (sakrīt un nesakrīt), karodziņš un izcēlums
 w=await app();
 w.eval(`var _sMatch={kv:"2",nog:"5",ndvi_prev:0.75,ndvi_now:0.74,delta:-0.01,flag:"",checked:"2026-09-01"};
  var _sLoss={kv:"2",nog:"6",ndvi_prev:0.75,ndvi_now:0.40,delta:-0.35,flag:"zudums",checked:"2026-09-01"};
  var _mOk={id:"o1",kvartals:"2",nogabals:"5",lidCover:70,sentinel:_sMatch}; // LiDAR pilns (70%) + Sentinel bez izmaiņām -> sakrīt
  var _mMismatch1={id:"o2",kvartals:"2",nogabals:"6",lidCover:65,sentinel:_sLoss}; // Sentinel zudums, bet LiDAR vēl pilns (65%) -> NESAKRĪT
  var _sNoLoss={kv:"2",nog:"7",ndvi_prev:0.75,ndvi_now:0.73,delta:-0.02,flag:"",checked:"2026-09-01"};
  var _mMismatch2={id:"o3",kvartals:"2",nogabals:"7",lidCover:15,sentinel:_sNoLoss}; // LiDAR reti (15%), bet Sentinel zudumu nerāda -> NESAKRĪT (otra puse)
  var _mNoData={id:"o4",kvartals:"2",nogabals:"8",lidCover:null,sentinel:_sMatch}; // nav LiDAR -> nav salīdzinājuma
 `);
 ok(w.eval("lidarSentinelMismatch(_mOk)")===null,"#19 LiDAR 70% + Sentinel bez izmaiņām: sakrīt, nav karodziņa (got "+JSON.stringify(w.eval("lidarSentinelMismatch(_mOk)"))+")");
 const mm1=w.eval("lidarSentinelMismatch(_mMismatch1)");
 ok(typeof mm1==="string"&&/zudum/.test(mm1)&&/65/.test(mm1)&&/piesardzīgi/.test(mm1),"#19 Sentinel zudums + LiDAR 65% (pilns): nesakrīt, teksts min zudumu, LiDAR % un piesardzības piezīmi (got "+mm1+")");
 const mm2=w.eval("lidarSentinelMismatch(_mMismatch2)");
 ok(typeof mm2==="string"&&/15/.test(mm2)&&/piesardzīgi/.test(mm2),"#19 LiDAR 15% (reti) + Sentinel bez zuduma: nesakrīt otrā virzienā (got "+mm2+")");
 ok(w.eval("lidarSentinelMismatch(_mNoData)")===null,"#19 bez LiDAR datiem: nav salīdzinājuma, nav kļūdas (got "+JSON.stringify(w.eval("lidarSentinelMismatch(_mNoData)"))+")");
 ok(w.eval("sentinelCol(_mMismatch1)")==="#c0392b"&&w.eval("sentinelCol(_mOk)")==="#2c6a47","#19 sentinelCol: sarkans zudumam, zaļš bez izmaiņām (got "+w.eval("sentinelCol(_mMismatch1)")+", "+w.eval("sentinelCol(_mOk)")+")");
 ok(w.eval("lidarCol(_mMismatch2)")==="#c0392b"&&w.eval("lidarCol(_mOk)")==="#2c6a47","#19 lidarCol: sarkans <30%, zaļš ≥50% (got "+w.eval("lidarCol(_mMismatch2)")+", "+w.eval("lidarCol(_mOk)")+")");
 // reāls objekts: karte rāda nesakritības izcēlumu un LiDAR "nav pieejams" pogu, kad neviens nogabals to nenorāda
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 const hBase=w.eval("S.mapLayer=null;vDash()");
 ok(/LiDAR šim apgabalam nav pieejams/.test(hBase),"60700020059: bez ievadīta LiDAR seguma poga LiDAR segums ir atspējota ar paskaidrojumu (nogabaliem nav LiDAR)");
 const nogB=w.eval("P().mer.filter(m=>m.geom)[1]");
 w.eval(`(()=>{const mB=P().mer.find(m=>m.id==='${nogB.id}');mB.lidCover=65;mB.sentinel={kv:mB.kvartals,nog:String(mB.nogabals).split(".")[0],ndvi_prev:0.75,ndvi_now:0.40,delta:-0.35,flag:"zudums",checked:"2026-09-04"};})();`);
 const hSent=w.eval("S.mapLayer='sentinel';vDash()");
 ok(new RegExp("nog\\. "+nogB.nogabals).test(hSent)&&/nesakrīt/.test(hSent),"60700020059: pēc LiDAR/Sentinel injekcijas kartes tekstā parādās nesakritības nogabals "+nogB.nogabals+" (got satur nog. numuru: "+new RegExp("nog\\. "+nogB.nogabals).test(hSent)+")");
 // #50/E: Sentinel bojājuma karodziņš (sanitārā cirte pamatota) — Sentinel-2 (vainaga zudums) un Sentinel-1 (vējgāze) abi ceļi, sintētiski (bez dzīvas Copernicus piekļuves šajā vidē)
 const dmgTest=JSON.parse(w.eval(`JSON.stringify((()=>{
  const m1={sentinel:{flag:"zudums",checked:"2026-08-01"}};
  const m2={vejgaze:{flag:"iespējama vējgāze/snieglauze (PĀRBAUDĪT ar roku)",stormDate:"2026-07-20",checked:"2026-08-05"}};
  const m3={};
  return {d1:sentinelDamageFlag(m1),d2:sentinelDamageFlag(m2),d3:sentinelDamageFlag(m3)};})())`));
 ok(dmgTest.d1&&dmgTest.d1.src==="Sentinel-2"&&/sanitārā cirte.*pamatota/.test(dmgTest.d1.note),"sentinelDamageFlag: Sentinel-2 vainaga zudums -> 'sanitārā cirte pamatota' (Sentinel-2) (got "+JSON.stringify(dmgTest.d1)+")");
 ok(dmgTest.d2&&dmgTest.d2.src==="Sentinel-1"&&/PĀRBAUDĪT ar roku/.test(dmgTest.d2.note),"sentinelDamageFlag: Sentinel-1 vējgāzes karodziņš -> pamatots, bet ar 'PĀRBAUDĪT ar roku' piezīmi (slieksnis nav validēts) (got "+JSON.stringify(dmgTest.d2)+")");
 ok(dmgTest.d3===null,"sentinelDamageFlag: bez datiem -> null (got "+JSON.stringify(dmgTest.d3)+")");
 w.eval(`(()=>{const m=P().mer.find(m=>m.id==='${nogB.id}');m.vejgaze={flag:"iespējama vējgāze/snieglauze (PĀRBAUDĪT ar roku)",stormDate:"2026-07-20",checked:"2026-08-05"};})();`);
 const rcDmg=w.eval(`JSON.stringify(runChecks(P()).nog.find(x=>x.m.id==='${nogB.id}').f.filter(f=>f.t==="info"&&/^Bojājums/.test(f.s)).map(f=>f.s))`);
 ok(/Bojājums \(Sentinel-2\)/.test(rcDmg)||/Bojājums \(Sentinel-1\)/.test(rcDmg),"runChecks: nogabalam ar Sentinel/vējgāzes datiem parādās 'Bojājums (...)' info karodziņš (#50/E2 obligātā pārbaude) (got "+rcDmg+")");
 // #49: cirsmas kā nogabalu DAĻAS (poligoni), piegājieni kā ĪSTAS cirsmas ar parts[]/stage/dependsOn. Nalobnes mežs (NĪ 78880060236, ZV 78880060148, pagasts 7888).
 // Reālais 04.09.2026 plāns (1,96 + 0,61 ha) ir ar roku zīmēts, tests to NEpiesien; fiksē likuma noklusējumu: nog.1 2,52 ha (mežaTips ārpus MK935 15.1 saraksta) = MK935 15.2 (2 ha).
 w=await app();await w.eval("createFromPagasts('78880060148',['78880060148'])");
 const nal=JSON.parse(w.eval(`JSON.stringify((()=>{const p=P();const r=runChecks(p);const o=r.oversized[0];const c1=p.cirsmas.find(c=>c.tips==="Kc"&&c.stage!==2&&c.nogabali==="1");const c2b=p.cirsmas.find(c=>c.tips==="Kc"&&c.stage!==2&&c.nogabali==="2");const c3=p.cirsmas.find(c=>c.tips==="Kc"&&c.stage!==2&&c.nogabali==="3");const c2=p.cirsmas.find(c=>c.stage===2);
  const m1=p.mer.find(m=>m.nogabals==="1"),m2=p.mer.find(m=>m.nogabals==="2"),m3=p.mer.find(m=>m.nogabals==="3");
  const stage1Hatch=p.cirsmas.filter(c=>c.stage!==2).reduce((a,c)=>a+(c.parts||[]).filter(pp=>pp.kind==="josla").length,0);
  const totalJoslas=p.cirsmas.reduce((a,c)=>a+(c.parts||[]).filter(pp=>pp.kind==="josla").length,0);
  const t=calcProp(p);
  const warnFlags=r.nog.find(x=>x.m===m1).f.filter(f=>f.t==="warn").map(f=>f.s);
  const adjAll13=kaiminiPairs(p,r.nog);const pr13=adjAll13.find(pr=>(pr.xa.m===m1&&pr.xb.m===m3)||(pr.xa.m===m3&&pr.xb.m===m1));
  return {nOver:r.oversized.length,mode:o&&o.mode,widthM:o&&o.widthM,kcHa:o&&o.kcHa,side:o&&o.side,cutLenM:o&&o.cutLenM,ier:r.nog.find(x=>x.m===m1).f.find(f=>f.t==="ier").s,warnFlags,fullBoundary13:pr13&&+pr13.len.toFixed(1),sideAutoLen:o&&o.sideAuto&&o.sideAuto.nb&&o.sideAuto.nb.len,
   c1Plat:c1.platiba,c1AtlHa:c1.atliktsHa,c1Atl:Math.round(c1.atlikts),c1Parts:c1.parts.map(pp=>[pp.kind,+pp.ha.toFixed(2)]),
   c2bPlat:c2b&&c2b.platiba,c2bBruto:c2b&&Math.round(c2b.bruto),c2bDPlan:c2b&&p.mer.find(m=>m.cirsma===c2b.id).dPlan,
   c3Plat:c3&&c3.platiba,c3Bruto:c3&&Math.round(c3.bruto),c3Parts:c3&&c3.parts.map(pp=>[pp.kind,+pp.ha.toFixed(2)]),
   c2Plat:c2&&c2.platiba,c2Bruto:c2&&Math.round(c2.bruto),c2DepOk:c2&&c2.dependsOn===c1.id,c2Nog:c2&&c2.nogabali,c2Blocked:c2&&c2.blockedNote,c2Id:c2&&c2.id,c2Parts:c2&&c2.parts.map(pp=>[pp.kind,+pp.ha.toFixed(2)]),
   stage1Hatch,totalJoslas,m1D:m1.D,m2:{kods:m2.cirsmaKods,D:m2.D,Dmean:m2.Dmean,n:m2.Dentries.length,dp:dPaths(m2),dPlan:m2.dPlan},m3:{kods:m3.cirsmaKods,cirsma:m3.cirsma,dp:dPaths(m3),dPlan:m3.dPlan},
   tHa:t.ha,tM3:t.m3,def2:t.deferred2,summary:summaryTable(p,t),cardText:dPathText(m2),svgHatch:(planSvg(p).match(/<path[^>]*fill="url\\(#hatch\\)"/g)||[]).length};})())`));
 ok(nal.nOver===1&&nal.mode==="divi"&&nal.widthM===20&&Math.abs(nal.kcHa-2.00)<=0.03,"Nalobnes nog.1 noklusējums: divi piegājieni, KC tagad 2,00 ha (= limits 2 ha, MK935 15.2) (got "+JSON.stringify({mode:nal.mode,widthM:nal.widthM,kcHa:nal.kcHa})+")");
 ok(/divi piegājieni/.test(nal.ier)&&/tiklīdz VMD/.test(nal.ier)&&!/3 g pēc atjaunošanas/.test(nal.ier)&&!/23\.p/.test(nal.ier),"Nalobnes nog.1 karodziņš: 15.p. limits, VMD reģistrācijas gaidīšana (NE 3 g pēc atjaunošanas, #50 labojums), bez 23.p. (got "+nal.ier+")");
 ok(nal.side==="R","Nalobnes nog.1: griezuma virziens R (rietumu) — vienīgais, kas dod VIENU saistītu atlikuma poligonu (#50/A) (got '"+nal.side+"')");
 // #52: MK935 18.p. piegulošas = kopīga robeža VIRS 50 m; mērķis ir 1./2. piegājiena kontaktu TURĒT ≤ 50 m, ne maksimizēt. Nalobnes nog.1: NEVIENS
 // viengabala griezuma virziens neuztur ≤ 50 m (mazākais ir 127 m) — tāpēc josla starp piegājieniem PALIEK (tā pati esošā #48/#49 mehānika), bez īpaša brīdinājuma.
 // Pilnā nog.1↔nog.3 robeža ≈55 m (regresijas vērtība, LVM GEO mēra 66,9 m — cita ģeometrijas versija, tas pats secinājums: pieguloši).
 ok(nal.cutLenM===127,"Nalobnes nog.1: 1./2. piegājiena kontakts (rietumu mala) = 127 m > 50 m, fiksēts kā regresijas vērtība — josla starp piegājieniem paliek (got "+nal.cutLenM+")");
 ok(nal.warnFlags.length===0,"Nalobnes: nav dzeltena brīdinājuma (4785f28/#51 loģika atcelta) (got "+JSON.stringify(nal.warnFlags)+")");
 ok(nal.fullBoundary13!=null&&nal.fullBoundary13>=50&&Math.abs(nal.fullBoundary13-55)<=3,"Nalobnes: pilnā nog.1↔nog.3 robeža ≈55 m (regresijas vērtība, ≥50 m) (got "+nal.fullBoundary13+")");
 // #60: nog.3 (Priede D32 ≥ 7.piel. 31 cm, cirtmets nesasniegts) tagad IR pati par sevi automātiski piedāvāta KC ("Kailcirte pēc caurmēra") — vairs nav "nākotnes"
 // kandidāts atlikuma apvienošanai (bestRestSide cands izslēdz jau-KC nogabalus), tāpēc sideAutoLen (nākotnes kaimiņa robeža) tagad ir null.
 ok(nal.sideAutoLen==null,"Nalobnes: sideAutoLen null — nog.3 vairs nav 'nākotnes' apvienošanas kandidāts, jo tā PATI tagad ir KC (#60) (got "+nal.sideAutoLen+")");
 ok(Math.abs(nal.c1Plat-nal.kcHa)<=0.01,"Nalobnes 1. piegājiena cirsma (nog.1): platība = KC daļas ha ("+nal.c1Plat+")");
 // #60: nog.1 un nog.3 abi tā paša (slapjā) mežaTips — nog.1 PATS jau aizņem visu 2 ha slapjo limitu (MK935 15.2/16.p.), tāpēc kopā ar nog.3 (0,43 ha) PĀRSNIEDZ 2 ha —
 // josla paliek nepieciešama (nevis #60 kopplatības izņēmums); nog.1 cirsmai tagad DIVAS joslas: pati sadalīšanas strēle (0,74) + jaunā starp-grupu josla pret nog.3 (0,17).
 ok(nal.c1Parts.length===3&&nal.c1Parts.some(x=>x[0]==="KC")&&nal.c1Parts.filter(x=>x[0]==="josla").length===2,"Nalobnes nog.1 1. piegājiena cirsmai c.parts = [KC, josla (pati sadalīšana), josla (starp-grupu pret nog.3)] — abas slapjās, kopā > 2 ha limitu (got "+JSON.stringify(nal.c1Parts)+")");
 ok(nal.c3Plat!=null&&Math.abs(nal.c3Plat-0.43)<=0.02&&nal.c3Bruto>90&&nal.c3Bruto<150&&nal.c3Parts.length===1&&nal.c3Parts[0][0]==="KC","Nalobnes nog.3: sava 1. piegājiena 'Kailcirte pēc caurmēra' cirsma ≈0,43 ha / ≈118 m³, bez joslas savā cirsmā (#60) (got "+JSON.stringify({plat:nal.c3Plat,bruto:nal.c3Bruto,parts:nal.c3Parts})+")");
 ok(nal.c2Parts&&nal.c2Parts.length===2&&nal.c2Parts.filter(x=>x[0]==="KC").length===1&&nal.c2Parts.filter(x=>x[0]==="josla").length===1,"Nalobnes 2. piegājiena cirsmai c.parts = [KC (nog.1 atlikums), josla (nog.1 pašas sadalīšanas strēle)] — nog.3 vairs NAV klāt (tā pati tagad sava 1. piegājiena cirsma, #60) (got "+JSON.stringify(nal.c2Parts)+")");
 ok(nal.totalJoslas===3&&nal.stage1Hatch===2,"Nalobnes: 3 joslas kopā (nog.1 pati sadalīšana + nog.1↔nog.2 starp-grupu + nog.1↔nog.3 starp-grupu), 2 no tām 1. piegājienā ir 'atlikta'/svītrota kartē — 2. piegājiena josla nav (got kopā "+nal.totalJoslas+", 1. piegājienā "+nal.stage1Hatch+")");
 ok(nal.svgHatch===nal.stage1Hatch,"planSvg zīmē hatch <path> tieši tik, cik ir 1. piegājiena joslu ("+nal.stage1Hatch+") — 2. piegājiena josla rādās kā parasta cērtama daļa, ne svītrota (got "+nal.svgHatch+")");
 // D-cirte: valdošās sugas D = G-svērtais pa visiem sugas ierakstiem (nog.2 egle: D25/G11 un D32/G5 -> 27,2 cm), nevis lielākā G ieraksta 25 cm
 ok(nal.m2.n===2&&Math.abs(nal.m2.D-27.2)<=0.05&&nal.m2.dp.dc===29&&nal.m2.dp.reach===false,"Nalobnes nog.2 egle: G-svērtais D 27,2 cm (2 ieraksti) < 29 cm (MK935 7. piel., bon. I) -> kombinētais ceļš (got D="+nal.m2.D+", dc="+nal.m2.dp.dc+")");
 ok(Math.abs(nal.m2.Dmean-28.5)<=0.05&&nal.m2.dp.mean14===29,"Nalobnes nog.2: nesvērtais vidējais 28,5 -> 29 (MK935 14.p.) rādās tikai informatīvi (got "+nal.m2.Dmean+" -> "+nal.m2.dp.mean14+")");
 const iz=nal.m2.dp.izlase;
 ok(iz&&iz.ok===true&&Math.abs(iz.removeG-7.25)<=0.05&&Math.abs(iz.removeM3-101)<=4&&iz.gAfter>=iz.gkrit&&iz.newD===29,"Nalobnes nog.2 kombinētā ceļa aplēse: izcērt tievāko egles ≈7,25 m²/ha (≈101 m³), G pēc tam "+(iz&&iz.gAfter)+" ≥ Gkrit "+(iz&&iz.gkrit)+" (MK935 1. piel., H 22 m), D -> 29 (got "+JSON.stringify(iz)+")");
 // #50/B: nog.2 (D zem sliekšņa) NAV automātiski atsevišķa "Sanitārā" cirsma — mērķis ir KC, sanitārā ir tikai pamatojuma daļa; abi ceļa m³ (sanitārā+KC) VIENĀ KC cirsmā, 1. piegājienā, ar 20 m joslu pret nog.1 KC
 ok(nal.m2.kods==="KC"&&nal.m2.dPlan&&nal.m2.dPlan.path==="izlaseKc"&&nal.m2.dPlan.auto===true,"Nalobnes nog.2: cirsmaKods 'KC' (ne 'Izlase'), dPlan.path 'izlaseKc', piedāvāts automātiski jau izveidē (got "+JSON.stringify(nal.m2.dPlan)+")");
 ok(!!nal.c2bPlat&&Math.abs(nal.c2bPlat-1.35)<=0.02&&nal.c2bBruto>280&&nal.c2bBruto<340,"Nalobnes nog.2 KC cirsma ≈1,35 ha / ≈312 m³ (visa nogabala krāja, ne tikai sanitārās izlases daļa — abi ceļi kopā) (got "+nal.c2bPlat+" ha, "+nal.c2bBruto+" m³)");
 ok(/KC pamatojums: sanitārā izlases cirte, tad KC/.test(nal.cardText)&&/piedāvāts automātiski/.test(nal.cardText),"Nalobnes nog.2 kartītē (merCard/dPathText) redzams KC pamatojums VMD iesniegumam, ne izvēles pogas (jau izvēlēts automātiski) (got "+nal.cardText+")");
 ok(nal.m3.dp&&nal.m3.dp.reach===true&&nal.m3.dp.dc===31,"Nalobnes nog.3 priede D 32 ≥ 31 (7. piel., bon. II): D-ceļš pieejams (got "+JSON.stringify(nal.m3.dp)+")");
 // #60: nog.3 PATI tagad automātiski ir KC "Kailcirte pēc caurmēra" (D 32 ≥ 31 cm, cirtmets vēl nesasniegts, nav ĪADT, nav pēdējos 3 g kopšanas, 0,43 ha ≥ 0,3 ha) — sava cirsma, nevis 2. piegājiena piedeva
 ok(nal.m3.kods==="KC"&&nal.m3.dPlan&&nal.m3.dPlan.path==="kcD"&&nal.m3.dPlan.auto===true&&!!nal.m3.cirsma&&nal.m3.cirsma!==nal.c2Id,"Nalobnes nog.3: cirsmaKods 'KC', dPlan.path 'kcD', piedāvāts automātiski, SAVĀ 1. piegājiena cirsmā (ne 2. piegājienā) (got "+JSON.stringify({kods:nal.m3.kods,dPlan:nal.m3.dPlan,cirsma:nal.m3.cirsma,c2Id:nal.c2Id})+")");
 ok(Math.abs(nal.m1D-24.9)<=0.1,"Nalobnes nog.1 bērzs: svērtais D 24,9 (D26/G11 + D19/G2), agrāk 26 (got "+nal.m1D+")");
 // 2. piegājiens: ĪSTA cirsma (stage 2), dependsOn = 1. piegājiena cirsmas id = nog.1 atlikums + tā sadalīšanas josla (nog.3 vairs nav klāt, #60)
 ok(nal.c2DepOk===true&&nal.c2Nog==="1;1",'Nalobnes 2. piegājiena cirsma: dependsOn = nog.1 1. piegājiena cirsmas id, nogabali "1;1" (nog.1 atlikums + tā josla, nog.3 tagad savā cirsmā) (got nog='+nal.c2Nog+", depOk="+nal.c2DepOk+")");
 ok(nal.c2Plat>=0.45&&nal.c2Plat<=0.55&&nal.c2Bruto>95&&nal.c2Bruto<140,"Nalobnes 2. piegājiens ≈0,50 ha / ≈115 m³ (nog.1 atlikums 0,25 ha + josla 0,25 ha, #60: nog.3 vairs nav klāt) (got "+nal.c2Plat+" ha, "+nal.c2Bruto+" m³)");
 ok(!nal.c2Blocked,"Nalobnes 2. piegājiens: nav bloķēto kaimiņu (got '"+nal.c2Blocked+"')");
 ok(/Kc 1\/1<\/td>/.test(nal.summary)&&/Kc 1\/2<\/td>/.test(nal.summary)&&/2\. piegājiens/.test(nal.summary)&&/pēc 1\. piegājiena CA noslēgšanas/.test(nal.summary)&&!/Sanitārā izlase/.test(nal.summary),"Nalobnes Kopsavilkums: 1. piegājiena Kc rindas (nog.1, nog.2, ...) un 2. piegājiena rinda, BEZ atsevišķas 'Sanitārā izlase' rindas (#50/B)");
 // #60: KOPĀ (1. piegājiens) tagad ietver arī nog.3 (KC pēc caurmēra) — 2,00 + 1,35 + 0,43 = 3,78 ha
 ok(Math.abs(nal.tHa-3.78)<=0.01&&nal.tM3>0,"Nalobnes: KOPĀ (1. piegājiens) ha = nog.1 KC 2,00 + nog.2 KC 1,35 + nog.3 KC pēc caurmēra 0,43 = 3,78 ha (#60) (got "+nal.tHa+")");
 ok(nal.def2&&Math.abs(nal.def2.ha-0.50)<=0.05&&nal.def2.m3>95&&nal.def2.m3<140,"Nalobnes: 2. piegājiens (≈0,50 ha / ≈115 m³, bez nog.3, #60) skaitās calcProp t.deferred2 (atliktā vērtība), NAV ieskaitīts t.ha/t.m3 (got "+JSON.stringify(nal.def2)+")");
 // #49 precizējums 4 (MultiPolygon kā VIENA daļa): Nalobnes reālajai ģeometrijai vairs nesanāk dabiski (Block A tagad IZVAIRĀS no fragmentācijas) — tāpēc tiešs sintētisks tests partSvgPath/partLatLngs līmenī
 const multiTest=JSON.parse(w.eval(`JSON.stringify((()=>{
  const poly={type:"MultiPolygon",coordinates:[[[[26.90,56.41],[26.901,56.41],[26.901,56.411],[26.90,56.411],[26.90,56.41]]],[[[26.91,56.42],[26.911,56.42],[26.911,56.421],[26.91,56.421],[26.91,56.42]]]]};
  const X=x=>x.toFixed(1),Y=y=>y.toFixed(1);
  const d=partSvgPath(poly,X,Y);const pathCount=(d.match(/M/g)||[]).length;
  const ll=partLatLngs(poly);
  return {pathIsOneString:typeof d==="string"&&d.length>0,mCount:pathCount,llFragments:ll.length};
 })())`));
 ok(multiTest.pathIsOneString&&multiTest.mCount===2&&multiTest.llFragments===2,"partSvgPath/partLatLngs: MultiPolygon (2 fragmenti) -> VIENS <path> ar 2 'M' apakšceļiem (SVG), VIENS Leaflet slānis ar 2 fragmentiem masīvā (ne 2 atsevišķi <polygon>/slāņi) (#49 precizējums 4) (got "+JSON.stringify(multiTest)+")");
 // pārslēgšana uz vienu piegājienu -> 23.p., 90 m, KC daļa < limits; atpakaļ uz divi. Strategy tagad dzīvo uz NOGABALA (m.strategy), ne cirsmas — cirsma katru buildParts atjaunojas.
 const nog1Id=w.eval("P().mer.find(m=>m.nogabals==='1').id");
 w.eval(`setStrategy('${nog1Id}','viens')`);
 const nalV=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());const o=r.oversized[0];const c=P().cirsmas.find(c=>c.tips==='Kc'&&c.stage!==2);return {mode:o.mode,widthM:o.widthM,kcHa:o.kcHa,stripHa:o.stripHa,cPlat:c.platiba,ier:r.nog.find(x=>x.m.nogabals==='1').f.find(f=>f.t==='ier').s};})())"));
 ok(nalV.mode==="viens"&&nalV.widthM===90&&nalV.kcHa<2&&Math.abs(nalV.kcHa-1.63)<=0.05&&Math.abs(nalV.stripHa-0.81)<=0.05&&/23\.p/.test(nalV.ier)&&Math.abs(nalV.cPlat-nalV.kcHa)<=0.01,"Nalobnes 'Viens piegājiens': 23.p., 90 m josla, KC daļa ≈1,63 ha, cirsma rāda to pašu (got "+JSON.stringify(nalV)+")");
 // #50/D labojums: "viens piegājiens" atlikums (otra puse) TAGAD arī ir sava īsta 1. piegājiena cirsma (agrāk trūka — bija zināms robs)
 const nalV2=JSON.parse(w.eval("JSON.stringify((()=>{const p=P();const restC=p.cirsmas.filter(c=>c.tips==='Kc'&&c.stage===1&&c.nogabali==='1');return {n:restC.length,haSum:+restC.reduce((a,c)=>a+c.platiba,0).toFixed(2)};})())"));
 ok(nalV2.n===2&&Math.abs(nalV2.haSum-1.70)<=0.05,"Nalobnes 'Viens piegājiens': nog.1 TAGAD ir 2 cirsmas tajā pašā piegājienā (KC daļa + atlikuma daļa), kopā ≈1,70 ha — abas uzreiz cērtamas (got "+JSON.stringify(nalV2)+")");
 w.eval(`setStrategy('${nog1Id}','divi')`);
 const nalD=JSON.parse(w.eval("JSON.stringify((()=>{const c=P().cirsmas.find(c=>c.tips==='Kc'&&c.stage!==2);return {cPlat:c.platiba};})())"));
 ok(Math.abs(nalD.cPlat-2.00)<=0.01,"Nalobnes: atpakaļ uz 'divi piegājieni' -> KC daļa atkal 2,00 ha (got "+nalD.cPlat+")");
 // #50/B: D-ceļa izvēle nog.2 ar roku (chooseDPath 'izlaseKc') — m.cirsmaManual pasargā no assignAutoCirtesVeids; rezultāts tāds pats (KC), tikai dPlan.auto vairs nav true (izvēlēts ar roku)
 const n2id=w.eval("P().mer.find(m=>m.nogabals==='2').id");w.eval(`chooseDPath('${n2id}','izlaseKc')`);
 const nalI=JSON.parse(w.eval("JSON.stringify((()=>{const m2=P().mer.find(m=>m.nogabals==='2');const c=P().cirsmas.find(cc=>cc.id===m2.cirsma);return {kods:m2.cirsmaKods,plan:m2.dPlan&&m2.dPlan.path,auto:!!(m2.dPlan&&m2.dPlan.auto),manual:!!m2.cirsmaManual,cPlat:c&&c.platiba};})())"));
 ok(nalI.kods==="KC"&&nalI.plan==="izlaseKc"&&nalI.auto===false&&nalI.manual===true&&Math.abs(nalI.cPlat-1.35)<=0.02,"Nalobnes nog.2 pēc izvēles ar roku (chooseDPath 'izlaseKc'): cirsmaKods 'KC', dPlan.auto=false (izvēlēts ar roku, ne automātiski), m.cirsmaManual iestatīts, cirsma ≈1,35 ha (got "+JSON.stringify(nalI)+")");
 // pārrēķins esošam (saglabātam) objektam: simulē objektu no PIRMS #49 (bez parts, sanitārā/2.piegājiens vēl nav atvasināti), tad migrateSplit
 w=await app();await w.eval("createFromPagasts('78880060148',['78880060148'])");
 w.eval("(()=>{const p=P();p.splitVer=undefined;p.cirsmas=[];for(const m of p.mer){m.cirsma='';if(m.dPlan){m.cirsmaKods='';delete m.dPlan;}delete m.strategy;delete m.restSide;delete m.cirsmaManual;}})()"); // nog.1 (vecuma-KC, bez dPlan) paliek; nog.2 (D-ceļa dPlan) un nog.3 (#60: D-ceļa dPlan) tiek atiestatīti uz tukšu, kā tas būtu pirms #49/#50/#60
 const mig=JSON.parse(w.eval("JSON.stringify((()=>{const ch=migrateSplit(P());const p=P();return {ch,ncirsmas:p.cirsmas.length,ver:p.splitVer,log:p.log[0].text,stages:p.cirsmas.map(c=>c.stage).sort(),partsVer:PARTS_VER};})())"));
 // #60: nog.3 tagad ARĪ automātiski pārrēķinās uz KC pēc caurmēra (sava cirsma) — 4 cirsmas (nog.1, nog.2, nog.3 1. piegājienā + 2. piegājiens), ne 3
 ok(mig.ch===true&&mig.ncirsmas===4&&JSON.stringify(mig.stages)==="[1,1,1,2]"&&/pārrēķinātas pēc jaunajiem noteikumiem/.test(mig.log)&&mig.ver===mig.partsVer,"Esošs objekts: atverot pārbūvē uz #49/#50/#60 modeli (4 cirsmas: nog.1 KC + nog.2 KC (kombinētais ceļš) + nog.3 KC pēc caurmēra + 2. piegājiens, versija atjaunota) (got "+JSON.stringify(mig)+")");
 w.eval("(()=>{const p=P();p.splitVer=undefined;const c=p.cirsmas.find(c=>c.tips==='Kc'&&c.stage!==2);c.manual=true;c.platiba=1.96;})()");
 const mig2=JSON.parse(w.eval("JSON.stringify((()=>{const ch=migrateSplit(P());return {plat:P().cirsmas.find(c=>c.tips==='Kc'&&c.stage!==2&&c.manual).platiba};})())"));
 ok(mig2.plat===1.96,"Esošs objekts: ar roku labota cirsma (1,96 ha, c.manual) pārrēķinā netiek aiztikta (got "+JSON.stringify(mig2)+")");
 // sintētisks nogabals: valdošā suga (augstākais G) egle D25, otra suga bērzs D32 -> valdošās sugas D paliek egles D (≈25), nesajaucas ar bērza D32 (#49 diagnoze: kods jau pareizs, testā nofiksēts)
 const dTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[]};
  mergeZvInto(p,"9999",[{props:{kvartals:"1",nogabals:"99",platiba_ha:1,mt:24,s10:3,a10:60,h10:22,d10:25,g10:20,s11:4,a11:40,h11:18,d11:32,g11:5}}]);
  const m=p.mer[0];return {suga:m.suga,D:m.D};})())`));
 ok(dTest.suga==="Egle"&&Math.abs(dTest.D-25)<0.5,"Sintētisks nogabals: valdošā suga egle D25/G20 + bērzs D32/G5 (mazāks G) -> valdošās sugas D paliek ≈25, NEsajaucas ar bērza 32 (got "+JSON.stringify(dTest)+")");
 // #50/D: cirsmu plāna scenāriji — vismaz A/B/C, noklusējums (lielākā vērtība bez sarkana karodziņa) = B, objekts NAV mainīts pirms applyScenario
 w=await app();await w.eval("createFromPagasts('78880060148',['78880060148'])");
 const scenTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p=P();const before=JSON.stringify(p.cirsmas);const scs=buildScenarios(p);const afterUnchanged=JSON.stringify(p.cirsmas)===before;
  return {n:scs.length,keys:scs.map(s=>s.key).sort(),recommendedKey:(scs.find(s=>s.recommended)||{}).key,allZeroRed:scs.every(s=>s.red===0),afterUnchanged,scenarioB:scs.find(s=>s.key==="B"),scenarioC:scs.find(s=>s.key==="C")};})())`));
 ok(scenTest.n>=3&&JSON.stringify(scenTest.keys)==='["A","B","C"]',"Nalobnes: buildScenarios dod vismaz 3 scenārijus A/B/C (got "+JSON.stringify(scenTest.keys)+")");
 ok(scenTest.afterUnchanged,"Nalobnes: buildScenarios NEMAINA reālo objektu (klons, ne tiešā mutācija) (got afterUnchanged="+scenTest.afterUnchanged+")");
 ok(scenTest.recommendedKey==="B","Nalobnes: noklusējuma (ieteicamais) scenārijs ir 'B' (lielākā max cena bez sarkana karodziņa; A dod to pašu vērtību, bet ar dzeltenu 'VMD var neatzīt' karodziņu) (got "+scenTest.recommendedKey+")");
 ok(scenTest.scenarioC&&scenTest.scenarioC.ha<scenTest.scenarioB.ha&&scenTest.scenarioC.m3>0,"Nalobnes scenārijs C (viens piegājiens 90 m): mazāka kopējā ha nekā B (90 m josla 'apēd' vairāk) (got C="+JSON.stringify(scenTest.scenarioC)+", B.ha="+scenTest.scenarioB.ha+")");
 w.eval("applyScenario('C')");
 const afterC=JSON.parse(w.eval("JSON.stringify((()=>{const p=P();return {scenario:p.scenario,log:p.log[0].text,ha:calcProp(p).ha};})())"));
 ok(afterC.scenario==="C"&&/scenārijs: C/.test(afterC.log)&&Math.abs(afterC.ha-scenTest.scenarioC.ha)<=0.01,"Nalobnes: applyScenario('C') iestata p.scenario, ieraksta vēsturē, un reālais objekts tagad dod TO PAŠU ha, ko rādīja scenārija priekšskats (got "+JSON.stringify(afterC)+")");
 // #48 hotfix (04.09.2026): b88919d ražošanā Cirsmu sadaļa krita ar "CSTAT is not defined" (rindas komentārs aprija const CSTAT), regress to nenoķēra, jo
 // neviens tests nerenderēja cilnes ar ATVĒRTU cirsmas kartīti. Renderē visas cilnes reāliem objektiem; jebkurš ReferenceError/TypeError krīt šeit.
 const viewErr=(view,openId)=>w.eval(`(()=>{S.view='${view}';S.open=${openId?"'"+openId+"'":"null"};try{const fn={dash:vDash,cirs:vCirs,mer:vMer,val:vVal,docs:vDocs}[S.view];const h=fn();return h.length>500?"":"tukšs ("+h.length+")";}catch(e){return e.constructor.name+": "+e.message;}})()`);
 w=await app();await w.eval("createFromPagasts('78880060148',['78880060148'])");
 for(const v of ["dash","cirs","mer","val","docs"]){const e=viewErr(v,null);ok(e==="","Nalobnes cilne '"+v+"' renderējas bez kļūdas"+(e?" (got "+e+")":""));}
 const cids=JSON.parse(w.eval("JSON.stringify(P().cirsmas.map(c=>c.id+'|'+cTips(c)))"));
 for(const cid of cids){const [id,tips]=cid.split("|");const e=viewErr("cirs",id);ok(e==="","Nalobnes Cirsmas ar atvērtu kartīti ("+tips+") renderējas — CSTAT, stratēģija, atlikuma puse"+(e?" (got "+e+")":""));}
 const rendered=w.eval("(()=>{S.view='cirs';S.open=P().cirsmas[0].id;render();return document.getElementById('main').innerHTML;})()");
 ok(!/Kļūda attēlojot sadaļu/.test(rendered)&&/Statuss/.test(rendered),"Nalobnes render(): Cirsmu sadaļa nav tukša un bez 'Kļūda attēlojot sadaļu'");
 // #50/C: "Mērījumi cilne neatveras" — iepriekšējie testi izsauca vMer()/vCirs() TIEŠI, apejot #nav pogas klikšķa apstrādātāju (document.getElementById("nav").onclick),
 // tāpēc kļūda tur (piem. #48 CSTAT tipa regresija) paliktu nepamanīta. Šeit simulē ĪSTU peles klikšķi uz katras nav pogas un pārbauda, ka skats mainās un saturs nav tukšs.
 w.eval("S.view='dash';S.open=null;render();");
 for(const v of ["fund","dash","cirs","mer","val","docs","cen"]){
  const btn=w.document.querySelector(`#nav button[data-v="${v}"]`);
  let err="";try{btn.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));}catch(e){err=e.message;}
  const view=w.eval("S.view");const len=w.eval("document.getElementById('main').innerHTML.length");
  ok(err===""&&view===v&&len>200,"Nalobnes cilne '"+v+"' pēc ĪSTA klikšķa uz nav pogu maina S.view un satur saturu (got kļūda='"+err+"', S.view='"+view+"', main len="+len+")");
 }
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 for(const v of ["dash","cirs","mer","val","docs"]){const e=viewErr(v,null);ok(e==="","60700020059 cilne '"+v+"' renderējas bez kļūdas"+(e?" (got "+e+")":""));}
 {const cid=w.eval("P().cirsmas[0].id");const e=viewErr("cirs",cid);ok(e==="","60700020059 Cirsmas ar atvērtu kartīti renderējas"+(e?" (got "+e+")":""));}
 // #60: (1) KC pēc caurmēra kā automātisks scenārijs (ĪADT izņēmums), (2) cirsmu dalīšana pēc cirtes izpildes veida, (3) piegulošu cirsmu kopplatība (MK935 16.p.).
 // Marija mežs (68840080082, pagasts 6884): jauns etalons pēc VMD apliecinājumiem — nog.1 KC 1,81; nog.3+4 KC 2,25; nog.8 KC pēc caurmēra ≈2,6; nog.9+10 KC 3,55;
 // nog.12 KC pēc caurmēra ≈1,27; nog.7/nog.11 (sanitārās VMD lēmumā) lietotne pati nepiedāvā.
 w=await app();await w.eval("createFromPagasts('68840080082',['68840080082'])");
 const mar=JSON.parse(w.eval(`JSON.stringify((()=>{const p=P();const r=runChecks(p);
  const byNog=n=>p.cirsmas.find(c=>c.tips==="Kc"&&(";"+c.nogabali+";").includes(";"+n+";"));
  const c1=byNog("1"),c34=byNog("3"),c8=byNog("8"),c910=byNog("9"),c12=byNog("12");
  const m7=p.mer.find(m=>m.nogabals==="7"),m11=p.mer.find(m=>m.nogabals==="11");
  return {c1:c1&&{plat:c1.platiba,nog:c1.nogabali},c34:c34&&{plat:c34.platiba,nog:c34.nogabali,same:c34===byNog("4")},
   c8:c8&&{plat:c8.platiba,nog:c8.nogabali,dPlan:p.mer.find(m=>m.cirsma===c8.id).dPlan},
   c910:c910&&{plat:c910.platiba,nog:c910.nogabali,same:c910===byNog("10")},
   c12:c12&&{plat:c12.platiba,nog:c12.nogabali,dPlan:p.mer.find(m=>m.cirsma===c12.id).dPlan},
   m7kods:m7.cirsmaKods,m11kods:m11.cirsmaKods,
   buffers:r.buffers.map(b=>b.a+"-"+b.b),global910v12:r.global.filter(x=>/nog\\. 10-12/.test(x))};})())`));
 ok(mar.c1&&Math.abs(mar.c1.plat-1.81)<=0.02&&mar.c1.nog==="1","Marija nog.1: sava cirsma ≈1,81 ha (nog.1↔3 robeža 35 m ≤ 50 — atsevišķas cirsmas bez joslas) (got "+JSON.stringify(mar.c1)+")");
 ok(mar.c34&&mar.c34.same&&Math.abs(mar.c34.plat-2.25)<=0.02,"Marija nog.3+4: VIENA cirsma ≈2,25 ha (nog.4 KC pēc vecuma, nog.3 baltalksnis bez cirtmeta ierobežojuma ≥25 g, abi 'vecuma' veids) (got "+JSON.stringify(mar.c34)+")");
 ok(mar.c8&&Math.abs(mar.c8.plat-2.6)<=0.03&&mar.c8.dPlan&&mar.c8.dPlan.path==="kcD"&&mar.c8.dPlan.auto===true,"Marija nog.8: sava 'Kailcirte pēc caurmēra' cirsma ≈2,6 ha, piedāvāta automātiski (#60/1) (got "+JSON.stringify(mar.c8)+")");
 ok(mar.c910&&mar.c910.same&&Math.abs(mar.c910.plat-3.55)<=0.02,"Marija nog.9+10: VIENA cirsma ≈3,55 ha (nog.9 baltalksnis, nog.10 KC pēc vecuma, abi 'vecuma' veids) (got "+JSON.stringify(mar.c910)+")");
 ok(mar.c12&&Math.abs(mar.c12.plat-1.27)<=0.03&&mar.c12.dPlan&&mar.c12.dPlan.path==="kcD"&&mar.c12.dPlan.auto===true,"Marija nog.12: sava 'Kailcirte pēc caurmēra' cirsma ≈1,27 ha, piedāvāta automātiski (#60/1) (got "+JSON.stringify(mar.c12)+")");
 ok(mar.m7kods!=="KC"&&mar.m11kods!=="KC","Marija nog.7 (suga bez 7.piel. sliekšņa) un nog.11 (0,14 ha < 0,3 ha) lietotne pati nepiedāvā automātiskajā scenārijā — 'sanitārās' paliek zināms VMD lēmums, ne prasība (got nog7="+mar.m7kods+", nog11="+mar.m11kods+")");
 ok(mar.buffers.every(b=>b!=="10-12"&&b!=="12-10"),"Marija: nav joslas starp nog.9+10 (3,55 ha) un nog.12 (1,27 ha) cirsmām (got "+JSON.stringify(mar.buffers)+")");
 ok(mar.global910v12.length===1&&/kopējā platība/.test(mar.global910v12[0])&&/nepārsniedz limitu/.test(mar.global910v12[0]),"Marija (MK935 16.p.): nog.9+10 un nog.12 piegulošas (kontakts > 50 m), kopējā platība ≤ 5 ha limitu — abas cērtamas vienlaikus, informatīvs ieraksts, ne josla (got "+JSON.stringify(mar.global910v12)+")");
 // Ezermuiža (70600050074, Vestienas AAA): ĪADT individuālie noteikumi liedz KC pēc caurmēra automātiskajā scenārijā — dzeltens brīdinājums, nevis auto-KC
 w=await app();await w.eval("createFromPagasts('70600050074',['70600050074'])");
 const ez60=JSON.parse(w.eval(`JSON.stringify((()=>{const p=P();const r=runChecks(p);
  const kcd=p.mer.filter(m=>m.cirsmaKods==="KC"&&m.dPlan&&m.dPlan.path==="kcD");
  const warn=r.nog.find(x=>x.m.nogabals==="4").f.filter(f=>f.t==="warn"&&/caurmēru/.test(f.s));
  return {blocked:dCirteBlocked(p),kcdCount:kcd.length,warn};})())`));
 ok(ez60.blocked===true&&ez60.kcdCount===0&&ez60.warn.length===1,"Ezermuiža (Vestienas AAA): dCirteBlocked=true, nevienam nogabalam nav automātiski piedāvāta 'Kailcirte pēc caurmēra' — caurmēra KC nedrīkst parādīties (#60), nog.4 (D 27 ≥ 27 cm) dzeltens brīdinājums (got "+JSON.stringify(ez60)+")");
 // #60 (Baltalksnim MK935 1.pielikumā nav noteikts cirtmets — likumi.lv/mezataksacija.lv) ietekmē arī citus etalona objektus: jaunas Kailcirte-pēc-vecuma cirsmas
 // baltalksņa nogabaliem ≥ 25 g (RULES.youngKeep), pieguloši esošam KC — pārbaudīts pret reālu ģeometriju/datiem, fiksēts kā regresijas vērtība.
 w=await app();await w.eval("createFromPagasts('36680080031',['36680080031'])");
 const zap60=JSON.parse(w.eval("JSON.stringify((()=>{const t=calcProp(P());return {ha:+t.ha.toFixed(2),ncirsmas:P().cirsmas.length};})())"));
 ok(Math.abs(zap60.ha-6.82)<=0.05&&zap60.ncirsmas===8,"Zapasnaja: baltalksnis nog.6 (0,24 ha, 48 g) tagad sava KC cirsma — kopā ≈6,82 ha, 8 cirsmas (agrāk 6,58 ha/7, #60) (got "+JSON.stringify(zap60)+")");
 w=await app();await w.eval("createFromPagasts('70420080041',['70420080041'])");
 const o41_60=JSON.parse(w.eval("JSON.stringify((()=>{const t=calcProp(P());return {ha:+t.ha.toFixed(2),ncirsmas:P().cirsmas.length};})())"));
 // #74: SP_CODES pilnīgums (previously-dropped elementi tagad summējas G) + Baltalksnis "vienmēr" (nevis 25 g slieksnis) kopā dod lielāku ha/cirsmu skaitu nekā #60-era starprezultāts
 ok(Math.abs(o41_60.ha-12.15)<=0.1&&o41_60.ncirsmas===11,"70420080041: baltalksņa nogabali (jebkurā vecumā, ne tikai ≥25 g) tagad KC cirsmās + SP_CODES papildinājums (#74) — kopā ≈12,15 ha, 11 cirsmas (#60 starprezultāts bija ≈10,32 ha/10) (got "+JSON.stringify(o41_60)+")");
 w=await app();await w.eval("createFromPagasts('70600050074',['70600050074'])");
 const ez60b=JSON.parse(w.eval("JSON.stringify((()=>{const t=calcProp(P());return {ha:+t.ha.toFixed(2),ncirsmas:P().cirsmas.length};})())"));
 ok(Math.abs(ez60b.ha-12.39)<=0.1&&ez60b.ncirsmas===7,"Ezermuiža: baltalksņa nogabali nog.5/20/22/26 (jebkurā vecumā, ĪADT neietekmē — MK264 nedefinē cirtmetu) + SP_CODES papildinājums (#74) — kopā ≈12,39 ha, 7 cirsmas (#60 starprezultāts bija ≈10,42 ha/8) (got "+JSON.stringify(ez60b)+")");
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");
 const b59_60=JSON.parse(w.eval("JSON.stringify((()=>{const t=calcProp(P());return {ha:+t.ha.toFixed(2),ncirsmas:P().cirsmas.length};})())"));
 ok(Math.abs(b59_60.ha-30.53)<=0.05&&b59_60.ncirsmas===19,"60700020059: nav baltalksņa/caurmēra-sliekšņa nogabalu — nemainās (#60) (got "+JSON.stringify(b59_60)+")");
 // #74: cirtmetu tabula pēc Meža likuma 9.panta (data/cirtmeti_meza_likums.json), MT/SP/ZKAT klasifikatoru labojumi, "suga nav atpazīta" un ĪADT zonas brīdinājumi.
 w=await app();
 const ozTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[]};
  mergeZvInto(p,"9999",[
   {props:{kvartals:"1",nogabals:"1",platiba_ha:1,bon:"I",s10:10,a10:101,h10:24,d10:40,g10:20}},
   {props:{kvartals:"1",nogabals:"2",platiba_ha:1,bon:"II",s10:10,a10:101,h10:24,d10:40,g10:20}},
   {props:{kvartals:"1",nogabals:"3",platiba_ha:1,bon:"II",s10:10,a10:121,h10:24,d10:40,g10:20}}
  ]);
  return p.mer.map(m=>({nog:m.nogabals,bon:m.bon,vecums:m.vecums,kods:m.cirsmaKods}));})())`));
 ok(ozTest[0].kods==="KC"&&ozTest[1].kods===""&&ozTest[2].kods==="KC","Ozols cirtmets pēc bonitātes (Meža likuma 9.p., #74): bon I 101 g -> KC; bon II 101 g -> VĒL NAV (līdz 121 g); bon II 121 g -> KC — iepriekš lietotne kļūdaini deva 101 g visām bonitātēm (got "+JSON.stringify(ozTest)+")");
 const baTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[]};
  mergeZvInto(p,"9999",[{props:{kvartals:"1",nogabals:"1",platiba_ha:1,bon:"I",s10:9,a10:1,h10:5,d10:2,g10:5}}]);
  const m=p.mer[0];return {kods:m.cirsmaKods,vecums:m.vecums};})())`));
 ok(baTest.kods==="KC","Baltalksnis: Meža likuma 9.panta tabulā NAV (cirtmets nav noteikts) -> KC atļauta VIENMĒR, arī ļoti jaunam (1 g), ja bonitāte zināma (#74, precizē #60 25 g praktisko slieksni) (got "+JSON.stringify(baTest)+")");
 const spTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[]};
  mergeZvInto(p,"9999",[{props:{kvartals:"1",nogabals:"1",platiba_ha:1,s10:1,a10:80,h10:25,d10:30,g10:20,s11:21,a11:40,h11:18,d11:15,g11:5}}]);
  const m=p.mer[0];return {suga:m.suga,G:m.G};})())`));
 ok(Math.abs(spTest.G-25)<0.01,"SP_CODES: VMD kods 21 (Blīgzna) agrāk TRŪKA un elements tika KLUSI IZLAISTS no summām (G pazuda) — tagad 'Citas sugas', G pareizi summējas 20+5=25 (#74) (got "+JSON.stringify(spTest)+")");
 const mtTest=JSON.parse(w.eval(`JSON.stringify({m15:MT_CODES[15],m16:MT_CODES[16],m17:MT_CODES[17],m21:MT_CODES[21],m24:MT_CODES[24],m31:MT_CODES[31]||null})`));
 ok(mtTest.m15==="Dumbrājs"&&mtTest.m16==="Liekņa"&&mtTest.m17==="Viršu ārenis"&&mtTest.m21==="Platlapju ārenis"&&mtTest.m24==="Šaurlapju kūdrenis"&&mtTest.m31===null,
  "MT_CODES labots pret VMD MT_klasifikatoru (#74): iepriekš trūka 15/16, kodi 17-25 bija nobīdīti (rādīja NEPAREIZU nosaukumu), kūdreņi bija uz neesošiem kodiem 31-34 (got "+JSON.stringify(mtTest)+")");
 const zkTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[]};
  mergeZvInto(p,"9999",[{props:{kvartals:"1",nogabals:"1",platiba_ha:1,zkat:14}},{props:{kvartals:"1",nogabals:"2",platiba_ha:1,zkat:10}}]);
  return p.mer.map(m=>m.veids);})())`));
 ok(zkTest[0]==="Izcirtums"&&zkTest[1]==="Mežaudze","ZKAT_CODES labots (#74): zkat=14 -> 'Izcirtums' (agrāk VIENMĒR 'Mežaudze' neatkarīgi no koda — ternārā abi zari bija identiski), zkat=10 -> 'Mežaudze' (got "+JSON.stringify(zkTest)+")");
 const sugaTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[],dapList:[]};
  mergeZvInto(p,"9999",[{props:{kvartals:"1",nogabals:"1",platiba_ha:1,bon:"I"}}]);
  p.mer[0].krajaImp=150;p.mer[0].G=20;
  const r=runChecks(p);return r.nog[0].f.filter(f=>f.t==="warn").map(f=>f.s);})())`));
 ok(sugaTest.some(s=>/suga nav atpazīta/.test(s)),"runChecks: tukša suga, BET ir reāli taksācijas dati (krāja/G) -> dzeltens 'suga nav atpazīta' (atšķirībā no apzinātās 'Citas sugas' kategorijas) (#74) (got "+JSON.stringify(sugaTest)+")");
 const iadtTest=JSON.parse(w.eval(`JSON.stringify((()=>{const p={zv:[],mer:[],cirsmas:[],log:[],dapList:[]};
  mergeZvInto(p,"9999",[],{protected:[{kind:"zona",name:"",zone:"Kāda pavisam cita zona",overlap_ha:1}]});
  const r=runChecks(p);return {iadt:p.iadt,unrec:p.iadtZoneUnrecognized,warn:r.global.some(g=>/NAV atpazīts/.test(g))};})())`));
 ok(iadtTest.iadt===""&&iadtTest.unrec==="Kāda pavisam cita zona"&&iadtTest.warn===true,'ĪADT zonas teksts neatpazīts nevienā no 5 regex kategorijām -> p.iadtZoneUnrecognized + runChecks brīdinājums (agrāk klusi "Nav ĪADT", bez limita) (#74) (got '+JSON.stringify(iadtTest)+")");
 // 11. Koda sadaļu integritāte
 const src=fs.readFileSync("app/index.html","utf8");for(const fn of ["zoneChecks","iadtChecks","neighbourCuts","planSvg","skiceHtml","reportHtml","iesniegumsHtml","exportXlsx","valCalc","runChecks","tallyCalc","finishCirsma","deadlines","landPrices","priceSnapNow","nogPlausibleIssue","krajaMerChecked","fixEligible","fixByHundred","bonOf","cirtmetsKC","bonFromRow","normalG","gExceeds","mKey","matchNogToken","kaiminiPairs","splitOversizedNogabals","splitOversizedProportional","toggleDeferPair","ringsOf","outerRingOf","wateraPolys","roadGraph","dijkstraPath","nearestGraphNode","krautuveAuto","nogCutM3","izvedNogabali","izvedCalc","izvedIzmaksas","moveKrautuve","resetKrautuve","loadSentinel","lidarSentinelMismatch","sentinelCol","lidarCol","dPaths","chooseDPath","strategyOfM","setStrategy","recalcProp","migrateSplit","autoCirsmas","bestRestSide","restSideAuto","sharedBoundaryM","futureKC","setRestSide","cTips","buildParts","finalizePartsCirsma","assignAutoCirtesVeids","recentActivity","partSvgPath","partLatLngs","partCentroid","partFeature","rebuildAutoParts","buildScenarios","applyScenario","scenariosHtml","fragCount","sentinelDamageFlag","dCirteBlocked","kcVeids"])ok(new RegExp("function "+fn+"\\(").test(src),"funkcija eksistē: "+fn);
 ok(!/function bonitate\(/.test(src),"vecā bonitate(H,age) Orlova aproksimācija ir izņemta (#46 pabeigšana)");
 ok(fs.existsSync("data/mk384_bonitate.json"),"data/mk384_bonitate.json eksistē");
 ok(!/onchange="vf\('(sale|buy)\./.test(src)&&/setLandPrice\('\$\{r\.k\}','sale'/.test(src),"Novērtējumā nav cenu lauku; cenas €/ha ir sadaļā Cenas (setLandPrice)");
 ok(!/BIG_RIVERS/.test(src),"BIG_RIVERS regex izņemts (#39)");
 console.log(fails?`\n${fails} FAIL`:"\nVISI TESTI OK");process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
