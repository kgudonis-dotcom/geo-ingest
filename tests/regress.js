// Regresijas tests: lietotne pret reāliem objektiem ar zināmu patiesību. Palaiž: node tests/regress.js (vajag jsdom, @turf/turf, xlsx)
const fs=require("fs");const zlib=require("zlib");const https=require("https");const path=require("path");
// moduļi: lokālie node_modules (GitHub darbplūsma) vai globālie (izstrāde)
const root=fs.existsSync(path.join(process.cwd(),"node_modules","jsdom"))?path.join(process.cwd(),"node_modules"):require("child_process").execSync("npm root -g").toString().trim();
const {JSDOM}=require(root+"/jsdom");
const html=fs.readFileSync("app/index.html","utf8").replace(/<script src="https:[^"]+"><\/script>/g,"").replace(/<link rel="stylesheet" href="https:[^"]+">/g,"");
const get=u=>new Promise((res,rej)=>https.get(u,r=>{const b=[];r.on("data",d=>b.push(d));r.on("end",()=>res(Buffer.concat(b)));}).on("error",rej));
const BASE="https://raw.githubusercontent.com/kgudonis-dotcom/geo-ingest/data";
let fails=0;const ok=(c,m)=>{console.log((c?"OK  ":"FAIL")+" "+m);if(!c)fails++;};
async function app(){const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/"});const w=dom.window;w.turf=require(root+"/@turf/turf");w.XLSX=require(root+"/xlsx");w.pako={ungzip:(u8)=>zlib.gunzipSync(Buffer.from(u8)).toString()};
 const cache={};w.fetch=async(url)=>{const m=url.match(/\/(pagasti|infra)\/(\d{4})\.json\.gz/);if(!m)return {ok:false,status:404};const k=m[1]+m[2];if(!cache[k]){try{cache[k]=await get(`${BASE}/${m[1]}/${m[2]}.json.gz`);}catch(e){return {ok:false,status:404};}}
  const b=cache[k];if(b.length<100)return {ok:false,status:404};return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
 w.eval("setLang('lv')");return w;}
(async()=>{
 // 1. Zapasnaja 19: VMD izsniedza KC apliecinājumus uz nog. 2,3,4,5,6,7,9 -> tur nedrīkst būt bloķētāju
 let w=await app();await w.eval("createFromPagasts('36680080031')");await new Promise(r=>setTimeout(r,1500));
 ok(w.eval("P().mer.length")===9,"Zapasnaja: 9 nogabali no VMD");
 ok(w.eval("P().mer.every(m=>!nogPlausibleIssue(m))")&&w.eval("dashData(P()).kraja")===w.eval("Math.round(P().mer.reduce((s,m)=>s+krajaMer(m),0))"),"Zapasnaja: neviens nogabals nav neticams, kopējā krāja nemainās (#45)");
 w.eval("for(const n of ['2','3','4','5','6','7','9']){const m=P().mer.find(x=>x.nogabals===n);m.cirsmaKods='KC';}recalcLinked()");
 const blocks=w.eval("runChecks(P()).nog.filter(x=>['2','3','4','5','6','7','9'].includes(x.m.nogabals)).flatMap(x=>x.f.filter(f=>f.t==='bloks').map(f=>x.m.nogabals+': '+f.s))");
 ok(blocks.length===0,"Zapasnaja: nav bloķētāju uz nogabaliem ar VMD apliecinājumu "+JSON.stringify(blocks));
 ok(w.eval("runChecks(P()).global.some(g=>/biotops/.test(g)&&!/izslēgta/.test(g))"),"Zapasnaja: biotops ir informācija, ne aizliegums");
 // 2. Ezermuiža
 w=await app();await w.eval("createFromPagasts('70600050074')");await new Promise(r=>setTimeout(r,1500));
 ok(w.eval("P().mer.length")===28,"Ezermuiža: 28 nogabali");
 ok(w.eval("P().mer.every(m=>!nogPlausibleIssue(m))")&&w.eval("dashData(P()).kraja")===w.eval("Math.round(P().mer.reduce((s,m)=>s+krajaMer(m),0))"),"Ezermuiža: neviens nogabals nav neticams, kopējā krāja nemainās (#45)");
 ok(w.eval("P().mer.filter(m=>m.geom).length")===28,"Ezermuiža: visiem ģeometrija");
 ok(w.eval("P().cirsmas.length")>=1,"Ezermuiža: cirsmas izveidotas");
 // 2a. Ezermuiža aizsargjoslas (#39): reāls gadījums, fiksēts 02.09.2026, pārbaudīt pret VMD
 w.eval("loadInfra(P())");await new Promise(r=>setTimeout(r,3000));
 const ezInfra=w.eval("P().infra?{water:P().infra.water.length,usik:P().infra.usik.length}:null");
 ok(ezInfra&&(ezInfra.water+ezInfra.usik)>=1,"Ezermuiža: ir vismaz viena ūdenstece infra datos (got "+JSON.stringify(ezInfra)+")");
 const ezKc=w.eval("+Object.values(runChecks(P()).zoneByNog||{}).reduce((a,z)=>a+z.kc.ha,0).toFixed(2)");
 const ezMain=w.eval("+Object.values(runChecks(P()).zoneByNog||{}).reduce((a,z)=>a+z.main.ha,0).toFixed(2)");
 ok(ezKc===0&&ezMain===0,"Ezermuiža: aizsargjoslas kopā KC 0,00 ha, 10 m josla 0,00 ha (fiksēts 02.09.2026, pārbaudīt pret VMD; got kc="+ezKc+" main="+ezMain+")");
 // 3. PAF 70420080041: IRR pret Excel (67,0 %)
 w=await app();await w.eval("createFromPagasts('70420080041')");await new Promise(r=>setTimeout(r,1500));
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
 await w.eval("createFromPagasts('36680080031')");await new Promise(r=>setTimeout(r,1500));
 const zvA=w.eval("P().id");
 const statsExpr=p=>"(()=>{const p="+p+";return {mer:p.mer.length,kraja:+p.mer.reduce((s,m)=>s+krajaMer(m),0).toFixed(2),cut:+calcProp(p).m3.toFixed(2),ladHa:p.lad?p.lad.ha:0,explLiz:p.expl?(p.expl.liz||0):0,explMezs:p.expl?(p.expl.mezs||0):0,land:+valCalc(p).landPrice.toFixed(2),zv:p.zv.slice().sort()};})()";
 const A=JSON.parse(w.eval("JSON.stringify("+statsExpr("P()")+")"));
 await w.eval("createFromPagasts('70600050074')");await new Promise(r=>setTimeout(r,1500));
 const B=JSON.parse(w.eval("JSON.stringify("+statsExpr("P()")+")"));
 await w.eval(`addZV('${zvA}','70600050074')`);await new Promise(r=>setTimeout(r,2000));
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
 await w.eval("createFromPagasts('36680080031')");await new Promise(r=>setTimeout(r,1500));
 const pid=w.eval("P().id");
 const nBefore=w.eval("fundStats(S.props).n");
 w.eval(`archiveProp('${pid}')`);
 ok(w.eval(`S.props.find(p=>p.id==='${pid}').archived`)===true,"archiveProp: objekts atzīmēts kā arhivēts");
 ok(w.eval(`S.props.filter(p=>!p.archived).some(p=>p.id==='${pid}')`)===false,"arhivēts objekts nav redzams noklusētajā (nearhivētā) sarakstā");
 const nAfterArchive=w.eval("fundStats(S.props).n");
 ok(nAfterArchive===nBefore-1,"arhivēts objekts neskaita Fondā: n "+nAfterArchive+" = "+nBefore+" - 1");
 w.eval(`restoreProp('${pid}')`);
 ok(w.eval(`S.props.find(p=>p.id==='${pid}').archived`)===false,"restoreProp: objekts atjaunots no arhīva");
 const nAfterRestore=w.eval("fundStats(S.props).n");
 ok(nAfterRestore===nBefore,"atjaunots objekts atkal skaitās Fondā");
 // 8. #45: nogabalu ticamības pārbaude (VMD dbf ×100 kļūda). 60700020059 kv.2 nog.4: B16, D12, H11, 3,05 ha, reālajos datos krāja 25095 m³ (8228 m³/ha), G 1700 -> patiesie ~251 m³, G 17. NĪ "Bojāri" ir 2 ZV, ņem tikai šo.
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
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
 // 9. #46: bonitāte no VMD, cirtmets pēc bonitātes, H/vecuma rezerve ar karodziņu.
 // 60700020059: 18 priedes 101-111 g. Ar reālu I bonitāti (VMD BON lauks) -> KC (cirtmets 101 g); bez bonitātes cirtmetu NENOSAKA.
 // PIEZĪME: data zarā pagastu failos bon lauka vēl nav (jāpārbūvē ar #46 build_pagasti.py), tāpēc reālo bonitāti šeit uzliek testā.
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
 const pinesExpr="P().mer.filter(m=>m.suga==='Priede'&&m.vecums>=101&&m.vecums<=111)";
 ok(w.eval(pinesExpr+".length")===18,"60700020059: 18 priedes 101-111 g (got "+w.eval(pinesExpr+".length")+")");
 ok(w.eval(pinesExpr+".every(m=>m.cirsmaKods!=='KC')")===true,"bez bonitātes vecās priedes nav KC (cirtmets nav noteikts, nevis kluss 121 g slieksnis)");
 ok(w.eval("cirtmetsKC('Priede',108,'')")===""&&w.eval("cirtmetsKC('Priede',108,'I')")==="KC"&&w.eval("cirtmetsKC('Priede',108,'IV')")===""&&w.eval("cirtmetsKC('Priede',121,'IV')")==="KC","cirtmetsKC: tukša bonitāte -> nav cirtmeta; I bon. 101 g; IV bon. 121 g (MK935)");
 ok(w.eval("cirtmetsKC('Bērzs',51,'I')")===""&&w.eval("cirtmetsKC('Bērzs',71,'I')")==="KC"&&w.eval("cirtmetsKC('Bērzs',51,'IV')")==="KC","cirtmetsKC: Bērzs 51 g ar I bon. nav KC (slieksnis 71), ar IV bon. ir");
 const bonFlag=w.eval("runChecks(P()).nog.filter(x=>x.f.some(f=>f.t==='warn'&&/bonitāte .* aptuvena/.test(f.s))).length");
 ok(bonFlag>0,"nogabaliem bez bonitātes ir dzeltens karodziņš 'bonitāte aptuvena' (got "+bonFlag+")");
 ok(w.eval("bonOf({bon:'II',H:20,vecums:60}).est")===false&&w.eval("bonOf({H:28,vecums:106}).est")===true&&w.eval("bonOf({H:0,vecums:0}).bon")==="","bonOf: dati > aproksimācija > nav zināma");
 w.eval(pinesExpr+".forEach(m=>{m.bon='I';m.cirsmaKods=cirtmetsKC(m.suga,m.vecums,bonOf(m).bon);});recalcLinked()"); // simulē VMD BON lauku pēc pagastu pārbūves
 const pineKC=w.eval(pinesExpr+".filter(m=>m.cirsmaKods==='KC').length"),pineM3=w.eval("Math.round("+pinesExpr+".reduce((s,m)=>s+krajaMerChecked(m),0))");
 ok(pineKC===18&&Math.abs(pineM3-8086)<=120,"ar reālu I bonitāti visas 18 priedes ir KC, krāja ≈ 8086 m³ (got "+pineKC+" gab., "+pineM3+" m³)");
 ok(w.eval(pinesExpr+".every(m=>!runChecks(P()).nog.find(x=>x.m===m).f.some(f=>/bonitāte .* aptuvena/.test(f.s)))")===true,"ar reālu bonitāti dzeltenā karodziņa vairs nav");
 // 10. Koda sadaļu integritāte
 const src=fs.readFileSync("app/index.html","utf8");for(const fn of ["zoneChecks","iadtChecks","neighbourCuts","planSvg","skiceHtml","reportHtml","iesniegumsHtml","exportXlsx","valCalc","runChecks","tallyCalc","finishCirsma","deadlines","landPrices","priceSnapNow","nogPlausibleIssue","krajaMerChecked","fixEligible","fixByHundred","bonOf","cirtmetsKC"])ok(new RegExp("function "+fn+"\\(").test(src),"funkcija eksistē: "+fn);
 ok(!/onchange="vf\('(sale|buy)\./.test(src)&&/setLandPrice\('\$\{r\.k\}','sale'/.test(src),"Novērtējumā nav cenu lauku; cenas €/ha ir sadaļā Cenas (setLandPrice)");
 ok(!/BIG_RIVERS/.test(src),"BIG_RIVERS regex izņemts (#39)");
 console.log(fails?`\n${fails} FAIL`:"\nVISI TESTI OK");process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
