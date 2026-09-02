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
 w.eval("for(const n of ['2','3','4','5','6','7','9']){const m=P().mer.find(x=>x.nogabals===n);m.cirsmaKods='KC';}recalcLinked()");
 const blocks=w.eval("runChecks(P()).nog.filter(x=>['2','3','4','5','6','7','9'].includes(x.m.nogabals)).flatMap(x=>x.f.filter(f=>f.t==='bloks').map(f=>x.m.nogabals+': '+f.s))");
 ok(blocks.length===0,"Zapasnaja: nav bloķētāju uz nogabaliem ar VMD apliecinājumu "+JSON.stringify(blocks));
 ok(w.eval("runChecks(P()).global.some(g=>/biotops/.test(g)&&!/izslēgta/.test(g))"),"Zapasnaja: biotops ir informācija, ne aizliegums");
 // 2. Ezermuiža
 w=await app();await w.eval("createFromPagasts('70600050074')");await new Promise(r=>setTimeout(r,1500));
 ok(w.eval("P().mer.length")===28,"Ezermuiža: 28 nogabali");
 ok(w.eval("P().mer.filter(m=>m.geom).length")===28,"Ezermuiža: visiem ģeometrija");
 ok(w.eval("P().cirsmas.length")>=1,"Ezermuiža: cirsmas izveidotas");
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
 ok(w.eval("P().lad")===null&&w.eval("P().expl")===null,"70420080041: pašreizējā pagastu failā vēl nav LAD/expl (vecs fails, bez kļūdas)");
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
 // 5. Koda sadaļu integritāte
 const src=fs.readFileSync("app/index.html","utf8");for(const fn of ["zoneChecks","iadtChecks","neighbourCuts","planSvg","skiceHtml","reportHtml","iesniegumsHtml","exportXlsx","valCalc","runChecks","tallyCalc","finishCirsma","deadlines","landPrices","priceSnapNow"])ok(new RegExp("function "+fn+"\\(").test(src),"funkcija eksistē: "+fn);
 ok(!/onchange="vf\('(sale|buy)\./.test(src)&&/setLandPrice\('\$\{r\.k\}','sale'/.test(src),"Novērtējumā nav cenu lauku; cenas €/ha ir sadaļā Cenas (setLandPrice)");
 console.log(fails?`\n${fails} FAIL`:"\nVISI TESTI OK");process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
