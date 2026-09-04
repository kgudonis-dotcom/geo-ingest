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
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
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
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
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
   nog15ier:nog15.f.find(f=>f.t==="ier"&&/MK935 23\\.p\\.\\): sadalīts/.test(f.s)),geomRings:ringsOf(nog15.m.geom).length,
   nog15sp:nog15sp?{kcHa:nog15sp.kcHa,stripHa:nog15sp.stripHa,restHa:nog15sp.restHa,restM3:nog15sp.restM3,proportional:!!nog15sp.proportional}:null};})())`));
 ok(r22.rawTokenCount>0&&r22.resolvedCount===r22.rawTokenCount,"60700020059 (2 ZV, NĪ 'Bojāri'): kaiminiPairs atrisina VISUS p.kaimini pārus (agrāk 0, jo atslēgā trūka ZV) (got "+r22.resolvedCount+"/"+r22.rawTokenCount+")");
 ok(r22.numPairs>50,"no tiem piegulošie (robeža > 50 m, MK935 18.p.) ir vairāk par 50 (got "+r22.numPairs+")");
 ok(r22.overLimit.length===0,"neviena cirsma nepārsniedz MK935 15./16.p. limitu (got "+JSON.stringify(r22.overLimit)+")");
 ok(r22.unbuffered.length===0,"nevienam piegulošam cirsmu pārim nav joslas/atlikšanas (got "+JSON.stringify(r22.unbuffered)+")");
 ok(r22.numBuffers>0&&r22.deferredM3>0,"atdalošās joslas izveidotas, atliktie m³ > 0 (got buffers="+r22.numBuffers+", deferredM3="+r22.deferredM3+")");
 // #22 turpinājums: kopš pagastu pārbūves 03.09.2026 12:07 (SCHEMA_VERSION 2, caurumi saglabāti) kv.2 nog.15 ģeometrija ir 2 gredzeni,
 // poligona platība 5,506 ha ≈ VMD 5,53 ha, tāpēc strādā ĢEOMETRISKAIS dalījums (MK935 23.p., 90 m josla), nevis proporcionālais fallback.
 // Vērtības fiksētas pret data zaru 6d4419d: KC daļa 4,14 ha, josla 1,30 ha (487 m³), atlikums 0,06 ha; cirsma 1 = nog. 2/15 + 2/6 = 4,87 ha.
 ok(r22.geomRings===2,"kv.2 nog.15: ģeometrija ar caurumu (2 gredzeni) pēc pagastu pārbūves (got "+r22.geomRings+")");
 ok(!r22.nog15bloks&&!r22.nog15warn&&!!r22.nog15ier,"kv.2 nog.15: ģeometriskais dalījums (ier, MK935 23.p.), nav ne sarkana bloka, ne dzeltena proporcionālā karoga (got bloks="+r22.nog15bloks+", warn="+!!r22.nog15warn+", ier="+!!r22.nog15ier+")");
 ok(r22.nog15sp&&!r22.nog15sp.proportional&&r22.nog15sp.kcHa<=5&&Math.abs(r22.nog15sp.kcHa-4.14)<=0.15&&Math.abs(r22.nog15sp.stripHa-1.30)<=0.15&&r22.nog15sp.restHa<0.2,"kv.2 nog.15: ģeometriski KC daļa ≈4,14 ha (≤5), 90 m josla ≈1,30 ha, atlikums ≈0,06 ha (got "+JSON.stringify(r22.nog15sp)+")");
 ok(r22.splitsFailed.length===0,"vairs nav neviena 'jāsadala ar roku' sarkanā bloka (proporcionālais fallback aizstāj) (got "+JSON.stringify(r22.splitsFailed)+")");
 const total22=r22.kcTotal+r22.deferredM3+r22.blockedM3;
 ok(Math.abs(total22-9340)<=100,"KC kopā + atliktie + bloķētie ≈ 9340 m³ (pirms-sadalīšanas summa, iekšēji konsekventa; PIEZĪME: issue #22 komentārā minētie 9079 m³ bija no 2 jau izveidotām rokas cirsmām, ne visu 56 nogabalu pilnās KC kopsummas — atskaitē paskaidrots) (got "+total22+")");
 // Zapasnaja/Ezermuiža/70420080041: pateikt, vai mainās
 w=await app();await w.eval("createFromPagasts('36680080031')");await new Promise(r=>setTimeout(r,1500));
 const zap22=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());return {numBuffers:r.buffers.length,deferredM3:r.deferredM3};})())"));
 ok(zap22.numBuffers>0&&zap22.deferredM3>0,"Zapasnaja: TAS PATS #22 labojums ietekmē arī šo objektu — tagad ir reālas joslas (agrāk 0, tas pats atslēgas defekts) (got buffers="+zap22.numBuffers+", deferredM3="+zap22.deferredM3+")");
 w=await app();await w.eval("createFromPagasts('70600050074')");await new Promise(r=>setTimeout(r,1500));
 const ez22=JSON.parse(w.eval("JSON.stringify((()=>{const r=runChecks(P());return {numBuffers:r.buffers.length,deferredM3:r.deferredM3};})())"));
 ok(ez22.numBuffers===0&&ez22.deferredM3===0,"Ezermuiža: nemainās (nav piegulošu KC cirsmu pāru šajā objektā) (got buffers="+ez22.numBuffers+", deferredM3="+ez22.deferredM3+")");
 w=await app();await w.eval("createFromPagasts('70420080041')");await new Promise(r=>setTimeout(r,1500));
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
 w.eval(`window.__err39w=null;loadInfra(_p39w).catch(e=>window.__err39w=e.message);`);
 await new Promise(r=>setTimeout(r,1500));
 const w39=JSON.parse(w.eval("JSON.stringify({watera:(_p39w.infra&&_p39w.infra.watera)||[],err:window.__err39w})"));
 ok(w39.watera.length===1&&!w39.err,"loadInfra: MultiPolygon watera formāts vairs netiek izmests bbox filtrā, vismaz 1 poligons paliek (got "+JSON.stringify(w39)+")");
 // reālie dati: vecais plakans watera formāts (pirms infra pārbūves) joprojām strādā bez kļūdas (atpakaļsaderība)
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
 w.eval("loadInfra(P())");await new Promise(r=>setTimeout(r,4000));
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
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
 w.eval("loadInfra(P())");await new Promise(r=>setTimeout(r,8000));
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
 w=await app();await w.eval("createFromPagasts('60700020059',['60700020059'])");await new Promise(r=>setTimeout(r,1500));
 const hBase=w.eval("S.mapLayer=null;vDash()");
 ok(/LiDAR šim apgabalam nav pieejams/.test(hBase),"60700020059: bez ievadīta LiDAR seguma poga LiDAR segums ir atspējota ar paskaidrojumu (nogabaliem nav LiDAR)");
 const nogB=w.eval("P().mer.filter(m=>m.geom)[1]");
 w.eval(`(()=>{const mB=P().mer.find(m=>m.id==='${nogB.id}');mB.lidCover=65;mB.sentinel={kv:mB.kvartals,nog:String(mB.nogabals).split(".")[0],ndvi_prev:0.75,ndvi_now:0.40,delta:-0.35,flag:"zudums",checked:"2026-09-04"};})();`);
 const hSent=w.eval("S.mapLayer='sentinel';vDash()");
 ok(new RegExp("nog\\. "+nogB.nogabals).test(hSent)&&/nesakrīt/.test(hSent),"60700020059: pēc LiDAR/Sentinel injekcijas kartes tekstā parādās nesakritības nogabals "+nogB.nogabals+" (got satur nog. numuru: "+new RegExp("nog\\. "+nogB.nogabals).test(hSent)+")");
 // 11. Koda sadaļu integritāte
 const src=fs.readFileSync("app/index.html","utf8");for(const fn of ["zoneChecks","iadtChecks","neighbourCuts","planSvg","skiceHtml","reportHtml","iesniegumsHtml","exportXlsx","valCalc","runChecks","tallyCalc","finishCirsma","deadlines","landPrices","priceSnapNow","nogPlausibleIssue","krajaMerChecked","fixEligible","fixByHundred","bonOf","cirtmetsKC","bonFromRow","normalG","gExceeds","mKey","matchNogToken","kaiminiPairs","splitOversizedNogabals","splitOversizedProportional","toggleDeferPair","ringsOf","outerRingOf","wateraPolys","roadGraph","dijkstraPath","nearestGraphNode","krautuveAuto","nogCutM3","izvedNogabali","izvedCalc","izvedIzmaksas","moveKrautuve","resetKrautuve","loadSentinel","lidarSentinelMismatch","sentinelCol","lidarCol"])ok(new RegExp("function "+fn+"\\(").test(src),"funkcija eksistē: "+fn);
 ok(!/function bonitate\(/.test(src),"vecā bonitate(H,age) Orlova aproksimācija ir izņemta (#46 pabeigšana)");
 ok(fs.existsSync("data/mk384_bonitate.json"),"data/mk384_bonitate.json eksistē");
 ok(!/onchange="vf\('(sale|buy)\./.test(src)&&/setLandPrice\('\$\{r\.k\}','sale'/.test(src),"Novērtējumā nav cenu lauku; cenas €/ha ir sadaļā Cenas (setLandPrice)");
 ok(!/BIG_RIVERS/.test(src),"BIG_RIVERS regex izņemts (#39)");
 console.log(fails?`\n${fails} FAIL`:"\nVISI TESTI OK");process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
