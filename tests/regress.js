// Regresijas tests: lietotne pret reāliem objektiem ar zināmu patiesību. Palaiž: node tests/regress.js (vajag jsdom, @turf/turf, xlsx)
const {JSDOM}=require("jsdom");const fs=require("fs");const zlib=require("zlib");const https=require("https");
const root=require("child_process").execSync("npm root -g").toString().trim();
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
 // 5. Koda sadaļu integritāte
 const src=fs.readFileSync("app/index.html","utf8");for(const fn of ["zoneChecks","iadtChecks","neighbourCuts","planSvg","skiceHtml","reportHtml","iesniegumsHtml","exportXlsx","valCalc","runChecks","tallyCalc","finishCirsma","deadlines"])ok(new RegExp("function "+fn+"\\(").test(src),"funkcija eksistē: "+fn);
 console.log(fails?`\n${fails} FAIL`:"\nVISI TESTI OK");process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
