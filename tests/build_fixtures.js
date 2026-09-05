// #78: ģenerē mazus tests/fixtures/pagasti/PPPP.json.gz failus etalona ZV (regress.js izmantotie 6 kadastri) no dzīvajiem pagastu failiem.
// Katrs fixture satur TIKAI vienu zv[kadastrs] ierakstu (nevis visu pagastu, 400-1100 ZV) — pārbaudīts, ka nevienam no šiem 6 kadastriem
// nav māsas ZV (kopīgs NĪ) TAJĀ PAŠĀ pagasta failā, izņemot 60700020059 un 68840080082, kuriem regress.js VIENMĒR dod pickedZv skaidri
// (siblingZV zars tāpēc netiek izsaukts) — tāpēc fixture drīkst saturēt tikai vienu ierakstu bez uzvedības izmaiņām.
// Palaišana (pēc vajadzības, ja etalona objekti mainās): node tests/build_fixtures.js
const fs=require("fs"),zlib=require("zlib"),https=require("https"),path=require("path");
const get=u=>new Promise((res,rej)=>{const req=https.get(u,{family:4,timeout:30000},r=>{const b=[];r.on("data",d=>b.push(d));r.on("end",()=>res(Buffer.concat(b)));});req.on("error",rej);});
const BASE="https://raw.githubusercontent.com/kgudonis-dotcom/geo-ingest/data";
const TARGETS=[["3668","36680080031"],["7060","70600050074"],["7042","70420080041"],["6070","60700020059"],["7888","78880060148"],["6884","68840080082"]];
const outDir=path.join(__dirname,"fixtures","pagasti");
(async()=>{
 fs.mkdirSync(outDir,{recursive:true});
 for(const [pag,kad] of TARGETS){
  const buf=await get(`${BASE}/pagasti/${pag}.json.gz`);
  const data=JSON.parse(zlib.gunzipSync(buf).toString());
  const zvd=data.zv[kad];
  if(!zvd){console.error("TRŪKST",pag,kad);process.exit(1);}
  const slim={pagasts:data.pagasts,updated:data.updated,ladSig:data.ladSig,zv:{[kad]:zvd}};
  const gz=zlib.gzipSync(JSON.stringify(slim),{level:9});
  fs.writeFileSync(path.join(outDir,pag+".json.gz"),gz);
  console.log(pag,kad,"->",gz.length,"baiti (agrāk pilnais pagasta fails 700 KB-1,6 MB)");
 }
})().catch(e=>{console.error(e);process.exit(1);});
