/* Meža vērtības kalkulators, publiskais modulis. Izmanto tos pašus atvērtos datus un noteikumus kā cirsma-app.
   Lietošana: MezaKalkulators.mount(document.getElementById("mk"), { dataBase, contactUrl, showValue:false }) */
(function(){
const DEF={dataBase:"https://raw.githubusercontent.com/kgudonis-dotcom/geo-ingest/data",contactUrl:"",showValue:false,
 prices:{Priede:[["26<",115,.30],["18-26",110,.30],["8-18",80,.15],["Pm",50,.15],["Malka",42,.10]],Egle:[["26<",103,.30],["18-26",103,.28],["8-18",87,.12],["Pm",45,.20],["Malka",40,.10]],Bērzs:[["24<",135,.30],["22-24",130,.15],["Pm",43,.50],["Malka",40,.05]],Apse:[["25<",120,.10],["Tara",50,.15],["Pm",35,.55],["Malka",35,.20]],Melnalksnis:[["22<",0,0],["Tara",50,.25],["Malka",40,.75]],Osis:[["Tara",40,1]],Ozols:[["Tara",40,1]],Baltalksnis:[["Tara",50,.10],["Malka",40,.90]],"Citas sugas":[["Tara",55,.15],["Malka",40,.85]]},
 costM3:27.5,marza:.05,ecoKC:8,ecoKKC:5,ecoM3:1.2,kkcMargin:2};
const SP_CODES={1:"Priede",3:"Egle",4:"Bērzs",6:"Melnalksnis",8:"Apse",9:"Baltalksnis",10:"Ozols",11:"Osis"};
const MT={1:"Sils",2:"Mētrājs",3:"Lāns",4:"Damaksnis",5:"Vēris",6:"Gārša",7:"Grīnis",8:"Slapjais mētrājs",9:"Slapjais damaksnis",10:"Slapjais vēris",11:"Slapjā gārša",12:"Purvājs",14:"Niedrājs",17:"Dumbrājs",18:"Liekņa",21:"Viršu ārenis",22:"Mētru ārenis",23:"Šaurlapju ārenis",24:"Platlapju ārenis",31:"Viršu kūdrenis",32:"Mētru kūdrenis",33:"Šaurlapju kūdrenis",34:"Platlapju kūdrenis"};
const FF={Priede:.45,Egle:.47,Bērzs:.44,Apse:.46,Melnalksnis:.45,Osis:.45,Ozols:.45,Baltalksnis:.45,"Citas sugas":.45};
const SORT_D={Priede:[[0,{Malka:1}],[10,{"8-18":.2,Pm:.6,Malka:.2}],[16,{"18-26":.3,"8-18":.3,Pm:.3,Malka:.1}],[22,{"26<":.2,"18-26":.35,"8-18":.2,Pm:.15,Malka:.1}],[28,{"26<":.4,"18-26":.3,"8-18":.1,Pm:.1,Malka:.1}]],Egle:null,Bērzs:[[0,{Malka:.6,Pm:.4}],[12,{Pm:.8,Malka:.2}],[20,{"22-24":.15,Pm:.65,Malka:.2}],[26,{"24<":.3,"22-24":.15,Pm:.45,Malka:.1}],[32,{"24<":.45,"22-24":.15,Pm:.3,Malka:.1}]],Apse:[[0,{Malka:.6,Pm:.4}],[14,{Tara:.1,Pm:.6,Malka:.3}],[24,{"25<":.15,Tara:.15,Pm:.5,Malka:.2}],[32,{"25<":.3,Tara:.15,Pm:.4,Malka:.15}]],Melnalksnis:[[0,{Malka:1}],[16,{Tara:.2,Malka:.8}],[24,{"22<":.1,Tara:.3,Malka:.6}]],Osis:[[0,{Tara:1}]],Ozols:[[0,{Tara:1}]],Baltalksnis:[[0,{Malka:1}],[14,{Tara:.15,Malka:.85}]],"Citas sugas":[[0,{Malka:1}],[14,{Tara:.15,Malka:.85}]]};SORT_D.Egle=SORT_D.Priede;
const G={P:[[10,7],[11,8],[12,8],[12,8],[13,8],[14,8],[14,8],[15,8],[16,9],[17,9],[18,9],[19,9],[21,9],[22,9],[22,9],[22,9],[22,9],[22,9],[22,9],[23,9],[23,9],[23,10],[23,10],[23,10]],E:[[11,6],[12,6],[12,7],[14,7],[15,7],[16,8],[17,8],[18,8],[18,8],[19,8],[20,9],[20,9],[21,9],[22,10],[22,10],[23,10],[23,10],[24,10],[25,10],[25,11],[26,11],[26,11],[26,11],[26,11]],B:[[8,4],[9,5],[10,5],[10,5],[11,6],[11,6],[12,6],[12,6],[13,6],[14,7],[14,7],[16,7],[16,7],[17,8],[17,8],[17,8],[18,8],[18,8],[19,8],[19,8],[20,9],[20,9],[21,9],[21,9]],A:[[10,5],[10,6],[11,6],[11,6],[12,6],[12,7],[13,7],[13,7],[14,8],[15,8],[16,8],[16,8],[18,9],[19,9],[19,9],[20,10],[21,10],[22,10],[22,10],[23,10],[23,10],[24,11],[24,11],[24,11]],Oz:[[9,5],[10,5],[10,6],[11,6],[12,6],[12,6],[14,7],[15,7],[16,7],[17,7],[17,8],[18,8],[18,8],[19,8],[20,8],[20,9],[21,9],[21,9],[22,9],[22,9],[22,9],[23,10],[23,10],[23,10]],Os:[[7,4],[8,4],[8,5],[9,5],[10,5],[10,6],[11,6],[13,6],[13,6],[14,6],[14,6],[14,6],[14,7],[15,7],[15,7],[15,7],[16,7],[16,7],[16,7],[16,7],[16,7],[16,7],[16,7],[16,7]]};
const grp=sp=>({Priede:"P",Egle:"E",Bērzs:"B",Ozols:"Oz",Osis:"Os"})[sp]||"A";
const gl=(sp,H)=>{H=Math.round(H||0);if(H<12)return null;const r=G[grp(sp)][Math.min(H,35)-12];return {gmin:r[0],gkrit:r[1]};};
const cirtmets=(sp,age,bon)=>{const t={Priede:/^(Ia|I|II|III)$/.test(bon)?101:121,Egle:81,Bērzs:/^(Ia|I|II|III)$/.test(bon)?71:51,Melnalksnis:71,Apse:41,Ozols:101,Osis:81};return !!(t[sp]&&age>=t[sp]);};
const DC={Priede:{Ia:39,I:35,II:31,III:30,IV:30,V:30},Egle:{Ia:31,I:29,II:29,III:27,IV:26,V:26},Bērzs:{Ia:31,I:27,II:25,III:25,IV:25,V:25}};
const dry=t=>["Sils","Mētrājs","Lāns","Damaksnis","Vēris","Gārša"].includes(t);
const n=v=>{const x=parseFloat(String(v??"").replace(",","."));return isFinite(x)?x:0;};
const fmt=(x,d=0)=>isFinite(x)?x.toLocaleString("lv-LV",{minimumFractionDigits:d,maximumFractionDigits:d}):"–";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function sortShares(sp,D){const t=SORT_D[sp]||SORT_D["Citas sugas"];let row=t[0];for(const r of t)if(D>=r[0])row=r;return row[1];}
async function loadPagasts(base,code){const r=await fetch(`${base}/pagasti/${code}.json.gz`,{cache:"force-cache"});if(!r.ok)throw new Error("HTTP "+r.status);const buf=await r.arrayBuffer();
 if(typeof DecompressionStream!=="undefined"){const txt=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();return JSON.parse(txt);}
 if(window.pako)return JSON.parse(window.pako.ungzip(new Uint8Array(buf),{to:"string"}));throw new Error("gzip");}
// SCHEMA_VERSION 2 (#22, 03.09.2026): pagasti geom = [ārējais gredzens, caurumi...]; vecais formāts = plakans gredzens. Skicei ņem ārējo gredzenu (bez tā svgMap deva NaN un tukšu karti).
const outerRing=g=>(!g||!g.length)?g:(Array.isArray(g[0][0])?g[0]:g);
function analyse(zv,cfg){const stands=zv.stands||[];const rows=[];let haAll=0,haMez=0,kraja=0;const sp={},mtg={};
 for(const st of stands){const ha=n(st.plat);haAll+=ha;const mt=MT[n(st.mt)]||String(st.mt||"");const els=[];
  for(let i=0;i<5;i++){const s=SP_CODES[n(st["s1"+i])];if(!s)continue;els.push({s,a:n(st["a1"+i]),h:n(st["h1"+i]),d:n(st["d1"+i]),g:n(st["g1"+i])});}
  const nog={kv:st.kv,nog:st.nog+(st.anog&&String(st.anog)!=="0"?"."+st.anog:""),ha,mt,els,geom:outerRing(st.geom),cat:"nm",m3:0,cut:0,val:0};
  if(els.length){haMez+=ha;const lead=els.reduce((x,y)=>y.g>x.g?y:x);nog.suga=lead.s;nog.age=lead.a;nog.H=lead.h;nog.D=lead.d;nog.G=els.reduce((t,e)=>t+e.g,0);
   nog.m3=Math.round(els.reduce((t,e)=>t+e.g*e.h*(FF[e.s]||.45),0)*ha);kraja+=nog.m3;
   for(const e of els){const share=e.g*e.h*(FF[e.s]||.45)/Math.max(1e-9,els.reduce((t,x)=>t+x.g*x.h*(FF[x.s]||.45),0));sp[e.s]=sp[e.s]||{m3:0,cut:0};sp[e.s].m3+=nog.m3*share;}
   const g=/purv|Niedr|Dumbr|Liek/i.test(mt)?"Purvainis":/kūdr/i.test(mt)?"Kūdrenis":/āren/i.test(mt)?"Ārenis":dry(mt)?"Sausenis":"Slapjainis";mtg[g]=(mtg[g]||0)+ha;
   const kcAge=cirtmets(lead.s,lead.a,"");const dc=DC[lead.s]?DC[lead.s].I:null;const kcD=dc&&lead.d>=dc;
   let cutM3=0;if(kcAge||kcD){nog.cat=kcAge?"kcv":"kcd";cutM3=Math.max(0,nog.m3-cfg.ecoKC*ha*cfg.ecoM3);}
   else{const L=gl(lead.s,lead.h);if(L&&nog.G>L.gmin+2&&lead.h>=12){nog.cat="kkc";cutM3=Math.max(0,nog.m3*Math.max(0,(nog.G-(L.gkrit+cfg.kkcMargin))/nog.G)-cfg.ecoKKC*ha*cfg.ecoM3);}
    else nog.cat=(lead.a<=5)?"atj":"j";}
   if(st.saimn_d_ie&&String(st.saimn_d_ie)!=="0"){nog.ier=true;}
   nog.cut=Math.round(cutM3);
   if(cutM3>0){let val=0;for(const e of els){const share=e.g*e.h*(FF[e.s]||.45)/Math.max(1e-9,els.reduce((t,x)=>t+x.g*x.h*(FF[x.s]||.45),0));const m3=cutM3*share;sp[e.s].cut+=m3;const ss=sortShares(e.s,e.d||lead.d);const pl=Object.fromEntries((cfg.prices[e.s]||cfg.prices["Citas sugas"]).map(r=>[r[0],r[1]]));for(const k in ss)val+=m3*ss[k]*(pl[k]??pl.Malka??40);}
    nog.val=Math.round(val*(1-cfg.marza)-cutM3*cfg.costM3);}}
  else{if(/lauc|purv|ūden|appl/i.test(String(st.zkat)+" "+mt))nog.cat="nm";}
  rows.push(nog);}
 const cut=rows.reduce((a,r)=>a+r.cut,0),val=rows.reduce((a,r)=>a+Math.max(0,r.val),0);
 const dap=zv.iadt||[];const lead=Object.entries(sp).sort((a,b)=>b[1].m3-a[1].m3)[0];
 return {rows,haAll:+haAll.toFixed(2),haMez:+haMez.toFixed(2),kraja,cut,val,sp,mtg,dap,lead:lead?lead[0]:"",kcHa:+rows.filter(r=>r.cat==="kcv"||r.cat==="kcd").reduce((a,r)=>a+r.ha,0).toFixed(2),kkcHa:+rows.filter(r=>r.cat==="kkc").reduce((a,r)=>a+r.ha,0).toFixed(2)};}
const CAT={atj:["Meža atjaunošana","#27ae60"],kcv:["Kailcirte pēc vecuma","#e67e22"],kcd:["Kailcirte pēc caurmēra","#d4a017"],kkc:["Krājas kopšanas cirte","#16a085"],j:["Jaunaudze / paliekošais","#7f8c8d"],nm:["Nemeža zeme","#bdc3c7"]};
function svgMap(rows){const pts=rows.filter(r=>r.geom).flatMap(r=>r.geom);if(!pts.length)return "";const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
 const lat=(miny+maxy)/2,kx=Math.cos(lat*Math.PI/180);const W=600,pad=10;const sc=Math.min((W-2*pad)/((maxx-minx)*kx||1e-9),(W-2*pad)/((maxy-miny)||1e-9));const H=(maxy-miny)*sc+2*pad;
 const X=x=>((x-minx)*kx*sc+pad).toFixed(1),Y=y=>((maxy-y)*sc+pad).toFixed(1);let h=`<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mk-map">`;
 for(const r of rows){if(!r.geom)continue;const col=CAT[r.cat][1];h+=`<polygon points="${r.geom.map(([x,y])=>X(x)+","+Y(y)).join(" ")}" fill="${col}" fill-opacity="${r.cat==="j"||r.cat==="nm"?.2:.55}" stroke="#444" stroke-width=".8"><title>${esc(r.nog)}. nog. ${esc(r.mt)} ${esc(r.suga||"")} ${r.age||""} g, ${fmt(r.ha,2)} ha</title></polygon>`;
  const cx=r.geom.reduce((a,b)=>a+b[0],0)/r.geom.length,cy=r.geom.reduce((a,b)=>a+b[1],0)/r.geom.length;h+=`<text x="${X(cx)}" y="${Y(cy)}" font-size="9" text-anchor="middle">${esc(r.nog)}</text>`;}
 return h+"</svg>";}
function svgBars(sp){const rows=Object.entries(sp).sort((a,b)=>b[1].m3-a[1].m3);const W=560,H=200,pad=40,mx=Math.max(1,...rows.map(r=>r[1].m3));const step=(W-2*pad)/rows.length,bw=Math.min(60,step*.6);
 let h=`<svg viewBox="0 0 ${W} ${H}" class="mk-chart">`;rows.forEach(([k,v],i)=>{const x=pad+i*step+(step-bw)/2,ht=(H-60)*v.m3/mx,hc=(H-60)*v.cut/mx;h+=`<rect x="${x}" y="${H-30-ht}" width="${bw}" height="${ht}" fill="#9fd3b5"/><rect x="${x}" y="${H-30-hc}" width="${bw}" height="${hc}" fill="#1F4D33"/><text x="${x+bw/2}" y="${H-14}" font-size="10" text-anchor="middle">${esc(k)}</text><text x="${x+bw/2}" y="${H-34-ht}" font-size="9" text-anchor="middle">${fmt(v.m3)}</text>`;});
 return h+`<rect x="${pad}" y="4" width="10" height="10" fill="#1F4D33"/><text x="${pad+14}" y="13" font-size="10">Cērtamais m³</text><rect x="${pad+110}" y="4" width="10" height="10" fill="#9fd3b5"/><text x="${pad+124}" y="13" font-size="10">Kopējā krāja m³</text></svg>`;}
function render(el,kad,a,cfg,updated){const inv=[...new Set(a.rows.map(r=>r.inv).filter(Boolean))];
 const valRange=a.val>0?`${fmt(Math.round(a.val*.85/1000)*1000)} – ${fmt(Math.round(a.val*1.1/1000)*1000)} €`:"–";
 el.innerHTML=`<div class="mk-res">
 <div class="mk-kpi"><div><small>Z.V. kadastra apzīmējums</small><b>${esc(kad)}</b></div><div><small>Valdošā suga</small><b>${esc(a.lead||"–")}</b></div><div><small>Kopplatība</small><b>${fmt(a.haAll,2)} ha</b></div><div><small>Meža zemes platība</small><b>${fmt(a.haMez,2)} ha</b></div><div><small>Kopējā krāja</small><b>${fmt(a.kraja)} m³</b></div><div><small>Cērtamais apjoms</small><b>${fmt(a.cut)} m³</b></div><div><small>Atļautā kailcirte / kopšana</small><b>${fmt(a.kcHa,2)} / ${fmt(a.kkcHa,2)} ha</b></div><div class="mk-val"><small>Orientējošā cirsmu vērtība</small><b>${cfg.showValue?valRange:'<button class="mk-btn" data-mk="contact">Uzzināt summu</button>'}</b></div></div>
 <div class="mk-grid"><div class="mk-card"><h4>Nogabalu karte</h4>${svgMap(a.rows)}<div class="mk-lg">${Object.values(CAT).map(v=>`<span><i style="background:${v[1]}"></i>${v[0]}</span>`).join("")}</div></div>
 <div class="mk-card"><h4>Sadalījums pa sugām</h4>${Object.keys(a.sp).length?svgBars(a.sp):""}<h4>Dabas vērtības</h4>${a.dap.length?`<ul>${a.dap.map(d=>`<li>${esc(d.kind)}: ${esc(d.name)}${d.zone?" ("+esc(d.zone)+")":""} ${fmt(d.ha,2)} ha</li>`).join("")}</ul>`:'<p class="mk-muted">Pēc DAP datiem nav.</p>'}</div></div>
 <div class="mk-card"><h4>Nogabali</h4><div class="mk-scroll"><table><tr><th>Nog.</th><th>ha</th><th>Meža tips</th><th>Suga</th><th>Vec.</th><th>H</th><th>D</th><th>Krāja m³</th><th>Cērtamais m³</th><th>Kategorija</th></tr>${a.rows.map(r=>`<tr><td>${esc(r.nog)}</td><td>${fmt(r.ha,2)}</td><td>${esc(r.mt)}</td><td>${esc(r.suga||"")}</td><td>${r.age||""}</td><td>${r.H||""}</td><td>${r.D||""}</td><td>${fmt(r.m3)}</td><td>${fmt(r.cut)}</td><td><i class="mk-dot" style="background:${CAT[r.cat][1]}"></i>${CAT[r.cat][0]}${r.ier?" · ierobežojumi":""}</td></tr>`).join("")}</table></div></div>
 <div class="mk-contact" id="mk-contact"><h4>Saņemt precīzu piedāvājumu</h4><p class="mk-muted">Aprēķins balstīts VMD atvērtajos datos (${esc(updated||"")}) un vidējās tirgus cenās, tas ir orientējošs un neaizstāj novērtējumu dabā. Galīgo piedāvājumu sagatavojam 48 stundu laikā pēc apsekošanas.</p>
 <form class="mk-form" data-mk="form"><input name="vards" placeholder="Vārds, uzvārds" required><input name="talrunis" placeholder="Tālrunis" required><input name="epasts" type="email" placeholder="E-pasts"><input type="hidden" name="kadastrs" value="${esc(kad)}"><input type="hidden" name="apreķins" value="${esc(JSON.stringify({haAll:a.haAll,haMez:a.haMez,kraja:a.kraja,cut:a.cut,val:Math.round(a.val),lead:a.lead,kcHa:a.kcHa,kkcHa:a.kkcHa}))}"><button class="mk-btn" type="submit">Sazinies ar mani</button></form><div data-mk="msg"></div></div></div>`;
 el.querySelector('[data-mk="contact"]')?.addEventListener("click",()=>el.querySelector("#mk-contact").scrollIntoView({behavior:"smooth"}));
 el.querySelector('[data-mk="form"]').addEventListener("submit",async ev=>{ev.preventDefault();const f=ev.target;const msg=el.querySelector('[data-mk="msg"]');
  if(!cfg.contactUrl){msg.textContent="Kontakta adrese nav iestatīta (contactUrl).";return;}
  try{const r=await fetch(cfg.contactUrl,{method:"POST",headers:{"Accept":"application/json"},body:new FormData(f)});msg.textContent=r.ok?"Paldies! Sazināsimies 48 stundu laikā.":"Neizdevās nosūtīt, zvani mums.";if(r.ok)f.reset();}catch(e){msg.textContent="Neizdevās nosūtīt, zvani mums.";}});}
async function run(el,input,cfg){const kad=String(input).replace(/\D/g,"");const out=el.querySelector('[data-mk="out"]');if(kad.length!==11){out.innerHTML='<p class="mk-err">Kadastra apzīmējumam jābūt 11 cipariem.</p>';return;}
 out.innerHTML='<p class="mk-muted">Nolasa VMD datus...</p>';
 try{const d=await loadPagasts(cfg.dataBase,kad.slice(0,4));const zv=d.zv&&d.zv[kad];if(!zv){out.innerHTML='<p class="mk-err">Šis kadastrs atvērtajos datos nav atrasts (nav meža zemes vai dati vēl nav ielādēti). Sazinies ar mums, novērtēsim manuāli.</p>';return;}
  const a=analyse(zv,cfg);render(out,kad,a,cfg,d.updated);out.dispatchEvent(new CustomEvent("mk:result",{bubbles:true,detail:{kadastrs:kad,result:a}}));}
 catch(e){console.error(e);out.innerHTML='<p class="mk-err">Datus pagaidām nevar ielādēt. Sazinies ar mums.</p>';}}
window.MezaKalkulators={mount(el,opts={}){const cfg=Object.assign({},DEF,opts);el.innerHTML=`<div class="mk"><label class="mk-label">Z.V. kadastra apzīmējums</label><div class="mk-row"><input class="mk-in" inputmode="numeric" placeholder="piem. 70420080041" data-mk="kad"><button class="mk-btn" data-mk="go">Novērtēt īpašumu</button></div><div data-mk="out"></div></div>`;
  const inp=el.querySelector('[data-mk="kad"]');const go=()=>run(el,inp.value,cfg);el.querySelector('[data-mk="go"]').addEventListener("click",go);inp.addEventListener("keydown",e=>{if(e.key==="Enter")go();});
  if(opts.kadastrs){inp.value=opts.kadastrs;go();}},analyse,loadPagasts};
})();
