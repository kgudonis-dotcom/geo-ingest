# FF Forest meža sistēma: vienošanās, izpilde un rinda
Atjaunots: 2026-09-03 (#22 turpinājums: pagastu ģeometrijas caurumi saglabāti, proporcionāls cirsmu dalījums). Šis fails ir vienīgā patiesība par to, kas norunāts, kas gatavs un kas nav. Glabājas repo `kgudonis-dotcom/geo-ingest` (STATUSS.md) un tiek atjaunots pēc katra darba.

## 1. Principi, par ko esam vienojušies
- Objekts sākas ar ZV kadastra numuru; viss pārējais (VMD dati, cirsmas, NĪ vērtība, skices, karodziņi) rodas automātiski. Imports un manuālā ievade tikai svaigai inventarizācijai un dabas apskates labojumiem.
- Krāsas nozīmē vienu un to pašu visur: dzeltens = labots ar roku, zils = labots automātiski, sarkans = aizliegums / nokavēts.
- Viens ekrāns = viens darbs; lielas pogas; lauka cilvēkiem nekādu iestatījumu. Mobile, bezsaiste ar sinhronizāciju vēlāk.
- Nekas netiek dzēsts: atteiktie objekti paliek arhīvā ar vēsturi (nenopirktais atgriežas tirgū).
- Lomas obligātas: Īpašnieks, Vērtētājs, Mežizstrādes vadītājs, Operators, Šoferis, Grāmatvedis, Jurists, Skatītājs. Apakšuzņēmēja operators redz tikai savu cirsmu.
- Datu arhitektūra: bezmaksas statiskie pagastu faili (kadastra pirmie 4 cipari) GitHub `data` zarā; Supabase paliek ieslēdzama rezerve un vēlāk kopīgā CRM datubāze.
- MK935 (red. 21.08.2026): KC limiti 5/2 ha, jaukta ≤5 ar slapjo ≤2, eko koki 8/ha KC un 5/ha citās, Gkrit tabulas; lietotāja noteikums KKC "cērt līdz Gkrit + 2"; VMD certamais autoritatīvs, ja ir.
- Naudas plūsmā koksne = MAX cena (ieņēmumi − izmaksas − marža); valsts nodeva pēc MK1250 (2 % / 1,5 % / 0,5 %, bāze lielākā no pirkuma un kadastrālās, griesti 50 000, kanceleja 14,23 + 7,11, ×1,5 pēc 6 mēn.).
- Darījuma vienība = objekts (NĪ, NĪ + cirsma, tikai cirsma); divi līgumi ir tikai juridiskā forma. Viena krautuve = viena cirsma. Koksne pārdota pie vārtiem ar savu PVZ; brāķis no pircēja uzmērījuma.
- Grāmatvedība: Jumis vai Moneo, integrācija caur eksporta failiem, vēlāk API.
- Plānošanas periodi: mēnesis, ceturksnis, pusgads, gads; investoru atskaite.
- Sentinel-2 lieto tikai saviem objektiem un kaimiņiem (Copernicus bezmaksas kvota), ne visai Latvijai.

## 2. Izpildīts
### Lietotne cirsma-app (v0.36)
- Cirsmu vērtēšana: sugas × sortimenti pēc caurmēra, cenas, izmaksas, marža, max cena; Vigodas Excel reproducēts līdz centam.
- MK935 pilnās tabulas (Gmin/Gkrit, koku skaits H<12, galvenās cirtes caurmērs P/E/B), KKC Gkrit+2, aizliegtās sugas, 3 g pēc kopšanas, jauktā cirsma, eko koki, ĪADT zonas, kaimiņu svaigie izcirtumi (MK935 19./20.p.).
- Lietotne ir gatava publiskai izmantošanai GitHub Pages / vienas dienas priekšskatījumam, ar bezsaistes kešošanu pagastu failiem un CRM plūsmu objektam.
- Buferjoslas: maināms platums (90 → 50), īsti poligoni, atliktie m³, robežu plāns ar svītrojumu.
- Objekts no kadastra numura (pagastu faili vai Supabase): nogabali, taksācija, sastāvs, krāja, ģeometrija, kaimiņi, DAP slāņi (ĪADT, zonas, mikroliegumi, biotopi, atradnes, koki, pieminekļi), robežnieki, kaimiņu izcirtumi.
- Imports: Kadastra atskaite xlsx, VMD PDF (2 veidi), dastojums (Mežvērte PDF, MK935 10. piel. xls, tabulas) ar Liepas tilpuma formulu; KML skices ģenerators (Python).
- Pārskats (Mans mežs paraugs): KPI, satelītkarte pa kategorijām, steidzamās darbības, dabas vērtības, sugu un meža tipu grafiki.
- Novērtējums (PAF): 12 zemes rindas auto (platību sadalījums jeb eksplikācija, ha labojamas, "auto" atgriež), darījums, nodeva pēc likuma, termiņi, IRR (XIRR sakrīt ar Excel 67,0 %), bruto peļņa, prasītās cenas, "Kāpēc šie skaitļi".
- Zemes cenas (v0.36, 2026-09-02): pārdošanas €/ha, peļņa % un pirkuma €/ha (auto = pārdošanas × (1 − peļņa), pārrakstāma) ir kopīgas visiem objektiem sadaļā Cenas, tāpat kā koksnes cenas; Novērtējumā paliek tikai ha pa kategorijām. Cenu momentuzņēmums nopirktajiem objektiem ietver arī zemes cenas. Regresijas tests tests/regress.js 4a.
- Izvades: vērtējuma atskaite PDF, Excel (7 lapas), iesniegums koku ciršanai VMD ar izvietojuma karti un skicēm, cirsmas skice (LKS-92 koordinātas).
- Fonds: visi objekti kartē pēc statusa, KPI, sugas, vecuma grupas, zemes sadalījums, tabula, Excel; "Kas deg" 30 dienu saraksts.
- CRM: statusi Jauns → Vērtēšanā → Piedāvāts → Vienošanās → Nopirkts/Atteikts → Pārdots; auto uzdevumi pa lomām; komanda Iestatījumos; komentāri; vēsture (audits); cirsmas statusi un "Pabeigt cirsmu" ar auto-labojumu nogabaliem; rezultāts šodien (naudas izmaksas %, mērķa bruto); cenu momentuzņēmums un pārrēķins.
- LiDAR salīdzinājuma loģika (manuālie lauki), LV/RU valodas, bezsaiste (SW + Cache API pagastu failiem).
- Objekts = NĪ (nekustamais īpašums) ar vairākām ZV (#44, 02.09.2026): datu modelis `obj.zv=[kadastri]`, `obj.ni={nr,name}` no VZD; veci objekti ar vienu kadastru migrējas automātiski (`migrateProp`). "Jauns objekts no VMD" pēc ZV ievades atrod tā paša NĪ "māsu" ZV **tajā pašā pagasta failā** un piedāvā izvēlei ar atzīmju rūtiņām (visas pēc noklusējuma atzīmētas); objekta kartītē poga "+ ZV" ļauj pievienot ZV arī ar roku (arī citā pagastā — sk. ierobežojumu zemāk). Nogabala identifikators kļuvis ZV-atkarīgs (cirsmu auto-grupēšana un MK935 KC limiti tagad pa cirsmu/ZV, nevis pa visu NĪ); LIZ blokā (`p.lad.ha`) un VZD eksplikācija (`p.expl.*`) summējas pa ZV. Objektu sarakstā/galvenē "NĪ nosaukums · NĪ nr. · N ZV", meklēšana arī pēc NĪ. Arhivēšana: "Arhivēt" (ar apstiprinājumu) paslēpj objektu sarakstā un Fondā, "Atjaunot" atgriež; īsta dzēšana tagad tikai jaunam objektam bez vērtējuma un vēstures. Izvades (PDF, Excel, iesniegums VMD, skices) rāda visas ZV pa rindām. Regresijas testi tests/regress.js: 2 ZV agregācija (krāja/cērtamais/LAD/eksplikācija/PAF summējas), 1 ZV nemainīgs (Zapasnaja/Ezermuiža/PAF), arhivēšana/atjaunošana.
- Nogabalu ticamības pārbaude (#45, 02.09.2026): VMD dbf datos gadās decimālās kļūdas (×100), piem. 60700020059 kv.2 nog.4 — B16, D12, H11, 3,05 ha, bet krāja 25 095 m³ (8 228 m³/ha) un G 1700. Dzīva pārbaude `nogPlausibleIssue(m)` (krāja/ha > 900 vai G > 80, `RULES.maxPlausibleM3Ha/maxPlausibleG`; MK935 "3× maksimālā" nosacījums nav ieviests, jo MK935 tabulas dod tikai minimālos/kritiskos sliekšņus) strādā vienādi VMD pagasta failam, xlsx importam un manuālai ievadei; ha=0 neapiet G pārbaudi. Neticams nogabals sarkans ar tekstu "Krāja ārpus iespējamā (X m³/ha), avota kļūda" (kartītē, Likumdošanas pārbaudē, vērtējuma atskaitē, VMD iesniegumā jauna kolonna "Piezīme") un izslēgts no kopsummām caur `krajaMerChecked` (Pārskats, Fonds, cirsmu m³ `rebuildCirsma`, `toCirsma`, iesnieguma novM3 daļa, KC mitruma grupu m³), kamēr nav labots; pats nogabals joprojām rāda avota skaitli. Ja gan krāja, gan G pārkāpj un pēc /100 abi ticami — poga "Labot ×0,01" **ar apstiprinājumu** (`arm`, divi klikšķi): krajaImp, G un m.sugas dala ar 100, laboti lauki dzelteni (`m.man`), vēstures ieraksts; nekad automātiski. Regresijas tests tests/regress.js 8.
- Bonitāte no VMD un cirtmets pēc bonitātes (#46, 02.09.2026): `build_pagasti.py` pievieno VMD `BON` lauku (kods 0–6 → Ia/I/II/III/IV/V/Va; avots: VMD klasifikatori https://gis.vmd.gov.lv/Public/GetClasificators, lapas "BON_klasifikators" un "Struktūra_KOPĀ"). Kods 0 = Ia tiek lasīts atsevišķi, jo vispārīgais `v()` palīgs "0" izmet. Lietotnē jauns `bonOf(m)`: bonitāte vispirms no datiem (VMD BON vai Kadastra atskaites kolonna "bonitāte", kas jau bija importā), tikai tad aptuvena no H/vecuma. `cirtmetsKC` ar tukšu bonitāti vairs neatgriež cirtmetu (agrāk klusi krita uz Priedei 121 g / Bērzam 51 g); `MK935.dCirte` visos izsaukumos saņem izšķirto bonitāti, tāpēc D-cirtes karodziņš beidzot nostrādā. Karodziņi: dzeltens "bonitāte X aptuvena (aproksimācija no H/vecuma, ne MK 384 skala), pārbaudīt"; sarkans "bonitāte nav zināma, cirtmets nav noteikts". Regresijas tests tests/regress.js 9: 18 priedes 101–111 g ar reālu I bonitāti = KC, 8086 m³; Bērzs 51 g ar I bon. nav KC; bez bonitātes ir dzeltens karodziņš. **Atvērts:** `bonitate(H,age)` joprojām ir Orlova tipa aproksimācija ar vienu formulu visām sugām — MK 384 3. pielikuma 4. tabulu "Mežaudžu bonitāšu skala" no likumi.lv neizdevās nolasīt viennozīmīgi (divi mēģinājumi deva pretrunīgus skaitļus), tā jāaizstāj ar īsto tabulu pa sugām. Pēc pagastu pārbūves visi Fonda objekti jāpārrēķina: KC var būt par zemu visur, kur ir vecas priedes.
- Dokumentācija un darba noteikumi (03.09.2026, tikai dokumenti, kods nemainīts): DOKUMENTACIJA.md pagastu faila shēmai pievienoti `lad {ha,blocks}` (LAD lauku bloki, karte.lad.gov.lv, ladSig kešs), `expl {liz,krum,mezs,purvs,udens,ekas,celi,cita}` (VZD parcel.zip XML), `ni {nr,name}` (VZD property.zip), `bon` (VMD BON klasifikators); jauna datu avotu tabula ar atjaunošanas biežumu; lietotnes sadaļā #45 nogabalu ticamības pārbaudes un #46 cirtmets-pēc-bonitātes apraksti; pagasti.yml rindā `--no-lad`/`--no-expl`/`--no-ni`. CLAUDE.md papildināts ar trim noteikumiem: sesijas sākumā vienmēr `git checkout main && git pull` un nekad nestrādāt citā zarā bez lietotāja prasības; ja mainās pagastu faila shēma/workflow argumenti/lietotāja funkcija, tajā pašā commit atjaunot DOKUMENTACIJA.md; GitHub issues neveidot pašam, jautāt, ja nav numura.
- #46 turpinājums, pagastu kešs (03.09.2026): **bon lauks joprojām TUKŠS pēc pārbūves 5eb4468 — cēlonis NAV kešs.** Lokāli lejupielādēti 2 no 5 VMD MVR reģionu ZIP (Centra, Dienvidu, kopā ~330 MB) un pārbaudīti abu DBF: 69 lauki katrā, NEVIENĀ nav lauka ar nosaukumu, kas satur "bon" — publiskajā data.gov.lv eksportā šī atribūta vienkārši nav ar to nosaukumu, ko `build_pagasti.py` meklē (`cols.get("bon")`). Iespējamie kandidāti `bv10..bv14`/`ba10..ba14` (pa katram no 5 sugas elementiem) satur 3 ciparu kodus (piem. 500, 624, 300, 900), kas NEATBILST 0–6 BON_CODES skalai — nozīme nav apstiprināta un NAV uzminēta/izmantota (CLAUDE.md noteikums neizdomāt, ja nav skaidrs). **Nākamais solis jāizlemj lietotājam:** vai meklēt bonitāti citā VMD avotā (piem. WFS/API, ne SHP eksports), vai palikt uz `bonOf()` H/vecuma aproksimācijas atzaru (jau ieviests #46, dzeltens karogs) kā pastāvīgo risinājumu. Blakus atrasta un **salabota** reāla kešošanas kļūda: `merge_pagasti.py` iepriekš kopēja tikai `zv`, izmetot `ladSig` — tāpēc paraksta-balstītā "nemainīts, nepārbūvē" izlaišana LAD blokiem praksē NEKAD nenostrādāja (`oldSig` vienmēr `None`, apstiprināts uz publicētajiem pagasti/7060, /3668, /7042 — visos `ladSig` trūka, kaut arī `lad` daudzām ZV bija pareizi aizpildīts). Labots: `merge_pagasti.py` tagad saglabā jaunāko `ladSig` apvienošanā; `build_pagasti.py` ieviests `SCHEMA_VERSION` konstante (=1, iekļauta `lad_signature()` parakstā — versijas maiņa liks pārrēķināt LAD kešu) un `--force` arguments (ignorē esošo parakstu). Pārbaudīts ar sintētisku merge testu (existing+fresh artefakti), ladSig un lad korekti saglabājas. **60700020059 (pagasts 6070): `lad=None` visām 56 ZV, kaut `expl.liz=2,4 ha`** — pārbaudīts uz reāliem publicētiem datiem: šis IR pareizi, nevis keša artefakts — LAD "lauku bloki" (ES tiešmaksu reģistrētie bloki) un VZD `expl.liz` (kadastra lietošanas mērķa klasifikācija) ir divi neatkarīgi avoti; ne katra LIZ platība ir reģistrēta LAD blokā. Citiem pagastiem (7060, 3668, 7042) `lad` DAŽĀM ZV ir aizpildīts pareizi, kas apstiprina, ka LAD mehānisms strādā, kad blokс tiešām eksistē.
- #46 pabeigšana, bonitāte pēc MK 384 (03.09.2026): tā kā VMD SHP eksportam nav `bon` lauka (sk. iepriekšējo ierakstu), bonitāti tagad nosaka pēc paša likuma tabulas, nevis avota lauka vai aproksimācijas. Avots: MK noteikumi Nr. 384 (21.06.2016) "Meža inventarizācijas un Meža valsts reģistra informācijas aprites noteikumi", 3. pielikums — pārbaudīts NEATKARĪGI divos avotos (vestnesis.lv oriģinālā publikācija un likumi.lv konsolidētā redakcija), 447 datu rindas identiskas šūna pret šūnu (vienīgā atšķirība: vestnesis.lv 4. tabulas virsrakstā trūkst "a" augšraksta pēdējai kolonnai — datu vērtības identiskas). Tabulas: 2. tab. (normālais šķērslaukums pēc H/sugas), 4. tab. (priede/egle/ozols/osis u.c. skuju/cietlapji), 5. tab. (bērzs/apse/melnalksnis u.c.), 6. tab. (baltalksnis/pīlādzis) — saglabātas `data/mk384_bonitate.json` un iekodētas `app/index.html` konstantē `MK384`. `bonOf(m)`: reāla bonitāte (VMD `bon`, ja kādreiz parādīsies) > MK384 tabula pēc H+vecuma (zils informatīvs karogs "bonitāte X (MK 384 3. piel. N. tab.)") > nezināma. Vecā `bonitate(H,age)` Orlova tipa aproksimācija un tās dzeltenais "aptuvena" karogs IZŅEMTI pilnībā. Dzeltens karogs paliek tikai, ja trūkst H vai vecuma; sarkans, ja suga MK384 nesedz (piem. "Citas sugas"); ja vecums zem tabulas minimuma (6/11/21 pēc sugu grupas) — klusi, bez karodziņa (pārāk jauna audze KC jautājumam). #45: `nogPlausibleIssue`/`gExceeds` papildināts ar MK384 2. tabulas normālo šķērslaukumu — sarkans arī, ja G > 1,5× normālais šai sugai/H, flat slieksnis 80 paliek kā aizsargs, ja normālais nav nosakāms. Regresijas tests tests/regress.js 9: Priede 106g H30→I, H22→III; Bērzs 60g H22→II; Baltalksnis 30g H15→II; vecums<min→nav nosakāms klusi; vecums>max→pēdējā rinda; 60700020059 18 priedes 101-111g ar REĀLIEM H no pagasta faila (bez simulētas bonitātes!) → visas 18 dabiski dabū bonitāti I un ir KC, krāja ≈ 8086 m³ (sakrīt ar #46 issue norādīto un ar iepriekšējās sesijas simulēto rezultātu); G>1,5×normāls (bet <80) tagad atzīmē nogabalu.
- Cirsmas pēc ģeometrijas, ne krājas (#22, 03.09.2026, reāls gadījums 60700020059/Bojāri). **Cēlonis:** nogabalu adjacency atslēga (`zv/kv/nog` pāri no `zvd.adj`, reāla ģeometrijas robeža) daudz-ZV objektos serializējās BEZ ZV daļas ("kv/nog"), bet `runChecks` salīdzināja pret kailu `m.nogabals` — nekad neatrada atbilstību (0 no 78 pāriem), tāpēc `buffers` vienmēr bija tukšs un cirsmas veidojās ar greedy bin-packing pēc krājas summas, ignorējot ģeometriju — tāpēc nogabali, kas saskaras (piem. kv.2 nog. 8/15/6/7/18), nonāca vienā "cirsmā" bez atdalošas joslas. Papildus atrasts un labots: adjacency atslēgā bija arī anog-sufikss, kas neatbilda `m.nogabals` formātam (57/78 pāri neatrisinājās arī pēc ZV labojuma). **Labots:** kanoniska atslēga `mKey(m)="zv/kv/nog"` visur; `kaiminiPairs` atrisina VISUS `p.kaimini` pārus (78/78); `runChecks` cirsmas veido kā savienotu komponenšu grafu pēc reālas piegulības (MK935 18.p., robeža > 50 m), katra grupa ≤ MK935 15./16.p. limitu (sausie 5 ha, slapjie 2 ha, jaukta ≤5 ar slapjo daļu ≤2). Nogabalu, kas PATS pārsniedz limitu, `splitOversizedNogabals` ģeometriski sadala (bisekcija + `turf.intersect` joslās) KC daļā + `SPLIT_SEP_M`=90 m nenocirstā joslā (MK935 23.p.) + atlikumā, griežot pa šaurāko virzienu; ja poligona platība ≥10 % atšķiras no VMD deklarētās (60700020059 kv.2 nog.15: ģeom. 7,34 ha pret deklarēto 5,53 ha — VMD datu topoloģijas/vienkāršošanas defekts), godīgi atsakās (`blockedM3`/`Ha`, sarkans "jāsadala ar roku"), nevis rāda nepareizu skaitli. Starp DAŽĀDĀM piegulošām gala-cirsmām **MK935 nenosaka konkrētu joslas platumu** (19./20.p. nosaka tikai kopējo limitu un 3 g atjaunošanās vecumu, ne metrus) — 20 m josla (`bufM()`) ir prakse VMD saskaņošanai, dzeltens karogs, ne likuma prasība; poga "Atlikt otru cirsmu bez joslas" (`toggleDeferPair`) ir likumā balstīta alternatīva (MK935 20.p.). Atliktais (joslas+atlikums) atskaitīts no "cērtams tagad" summas (`out.kc[mo].m3`); `kc.m3+deferredM3+blockedM3` = pilnā krāja (iekšēji konsekvents). Karte (`planSvg`): "nr · ha" uz katra cērtama nogabala, joslas svītrotas ar gadu (+3, MK935 20.p.), leģendā kopējais ha/m³/gads. Kopsavilkuma tabulā jauna kolonna "Atliktie m³ (joslas)" + Gads. Regresijas tests tests/regress.js: 60700020059 — visi 78 adjacency pāri atrisinās, 57 pieguloši (>50m), neviena cirsma nepārsniedz limitu, nav nebufferēta piegulošā pāra, kv.2 nog.15 godīgi bloķēts (nevis nepareizi sadalīts); Zapasnaja: TAS PATS labojums arī to ietekmē (agrāk 0 joslu, tagad 3 joslas/274 m³ atlikti); Ezermuiža/70420080041: nemainās. Sintētisks tests: 7 ha nogabals damaksnī → ģeometriski KC daļa ≤5 ha + 90 m josla + atlikums, daļu summa ≈ pilnā platība. **Atvērts:** kv.2 nog.15 (5,53 ha) jāsadala ar roku (ģeometrija neuzticama); "Atlikt bez joslas" pogai vēl nav UI apstiprinājuma dialoga (uzreiz pārslēdz).
- Pagastu ģeometrija: caurumi saglabāti (#22 turpinājums, 03.09.2026). **Atrasts iepriekšējā "ģeometrija neuzticama" gadījuma īstais cēlonis:** `build_pagasti.py` saglabāja TIKAI ārējo gredzenu (`mapping(gw)["coordinates"][0]`), izmetot iekšējos gredzenus (caurumus, piem. lauci vai ūdenstilpi nogabala vidū). Pierādīts uz reāla VMD SHP (dienvidu.zip, kadastrs 60700020059 kv.2 nog.15): ārējais gredzens 7,3669 ha, ar caurumu (1,8381 ha) atskaitītu = 5,5288 ha — SAKRĪT ar VMD deklarēto 5,53 ha līdz santimetram. Labots: `st["geom"]` tagad gredzenu saraksts `[ārējais, caurums1, ...]` (GeoJSON konvencija); `SCHEMA_VERSION` 1→2. Lietotnē `merFeature(m)` (jauna `ringsOf`/`outerRingOf` palīgfunkcijas) saprot abus formātus — vecu plakanu gredzenu UN jaunu gredzenu sarakstu — tāpēc visas caur to ejošās vietas (platība, krustojumi, aizsargjoslas, `splitOversizedNogabals`, `neighbourCuts`, ciršanas apliecinājumi) kļūst caurumu-apzinīgas bez katras atsevišķas pārrakstīšanas. `planSvg` un Leaflet kartes (Fonds, Pārskats) pārrakstītas, lai zīmētu caurumus kā izgriezumus (`<path fill-rule="evenodd">` / Leaflet daudzgredzenu poligoni). `unionRings` (skice) arī saglabā caurumus rezultātā. Regresijas tests: sintētisks nogabals ar caurumu (1 ha ārējais, 0,04 ha caurums) → `turf.area` pareizi atskaita caurumu; vecais plakanais formāts joprojām strādā. PAGASTI_ARGS `--no-owners --force` push'ots, lai izraisītu pilnu pārbūvi (arī `--force` ignorē LAD paraksta kešu). **Pēc pārbūves 60700020059 kv.2 nog.15 ģeometriskā sadalīšana (MK935 23.p., 90 m) sāks strādāt automātiski**, aizstājot proporcionālo fallback ar precīzu ģeometrisku joslu.
- Cirsmas: proporcionāls dalījums, ja ģeometrija nav uzticama (#22 turpinājums, 03.09.2026). Nogabals, kas viens pārsniedz limitu un kam ģeometriskā sadalīšana neizdodas (nav ģeometrijas vai poligona platība ≥10% atšķiras no VMD deklarētās — tā AGRĀK bija nog.15 problēma, tagad zināma un labota Python pusē, bet līdz pārbūvei publicētie dati vēl bez cauruma), vairs NAV sarkans bloks. Jauna funkcija `splitOversizedProportional(x,lim)`: proporcionāls dalījums pēc VMD deklarētās platības (limits/platība × krāja cirsmā, atlikums + prakses josla atlikti kopā); dzeltens karogs "sadalījuma līnija jāprecizē skicē". Sarkans paliek TIKAI, ja platība vai krāja nav zināma. 60700020059 kv.2 nog.15 (5,53 ha): cirsmā 5,00 ha, atlikts 0,53 ha (198 m³, cērtams +3 g). [Atjaunots 03.09. pēcpusdienā: pēc pagastu pārbūves 12:07 nog.15 ģeometrijai ir 2 gredzeni (5,506 ha ≈ VMD 5,53), tāpēc tagad strādā ģeometriskais MK935 23.p. dalījums: KC daļa 4,14 ha, 90 m josla 1,30 ha (487 m³), atlikums 0,06 ha; cirsma 1 = nog. 2/15 + 2/6 = 4,87 ha / 1783 m³; proporcionālais fallback paliek sintētiskajā testā (7 ha ģeometrija pret 9 ha VMD).] KC kopā (visas 56 nogabali) + atliktie + bloķētie ≈ 9339,8 m³ neatkarīgi no dalīšanas metodes (iekšēji konsekvents). **Piezīme:** issue #22 minētie "9079 m³" bija no 2 jau izveidotām rokas cirsmām (ne visu 56 nogabalu pilnās KC summas) — precīza sakritība ar šo skaitli netika panākta un nav sagaidāma, jo tie mēra dažādas lietas.
### Mājaslapa
- Meža vērtības kalkulators (kalkulators.js/css + paraugs tavā dizainā), summa aiz kontaktformas, mk:result notikums.
### Datu ķēde geo-ingest (publisks repo)
- Pagastu faili visai Latvijai: 485 + Vidzeme (kopā ~590 pagasti, ~230 tūkst. meža ZV) ar kaimiņiem un DAP; paralēla būve, inkrementāla apvienošana, drošinātājs pret tukšu publicēšanu, sacensības labojums.
- Mērķa eksports pēc kadastra (Ezermuiža pierādīts), skices no VMD ģeometrijas.
- Sentinel-2 vainaga zuduma darbs strādā (tests 78680040067) un ir gatavs kā atsevišķs datu avots, bet automātiska iestrāde objektu sarakstos vēl nav pabeigta.
- Izlūkošana: sasniedzamība un datu avoti dokumentēti logos.
- Supabase shēma un ielāde (rezerve), 876 ĪADT + 2517 zonas datubāzē.
- LAD lauku bloki (liz_block_ha, bloku ID) un VZD eksplikācija (parcel.zip XML: LIZ, krūmāji, mežs, purvs, ūdens, ēkas, ceļi, cita) visos 587 pagastu failos (pilnā pārbūve 02.09.2026, 41 min). Lietotnē "LIZ blokā" un "LIZ parasts" aizpildās automātiski.
- data zars: viens publicētājs scripts/publish_data.sh (tikai sava apakšmape, parasts commit, rebase-retry), iadt/, infra/, pagasti/ vienlaikus; auto ĪADT slānis (81 spēkā esoši noteikumi) un OSM ceļi/grāvji (587 pagasti) pirmo reizi sasniedz lietotni.
- LAD lauku bloki (2026-09-02, #41, #18): build_pagasti.py katram pagastam vaicā karte.lad.gov.lv ArcGIS REST (bbox, lapots, ≤4 paralēli pieprasījumi, 3 mēģinājumi), krusto ar ZV robežu -> zv[kad].lad={ha,blocks}. Lēts paraksts (bloku skaits + jaunākais VALID_FROM) pagasta bbox'am -> pagastu faila ladSig; ja sakrīt ar iepriekšējo, ģeometrijas vaicājumu izlaiž un "lad" pārnes no vecā faila (kešs, "nemainīts → nepārbūvē"). VZD zemes lietošanas mērķu eksplikācija (dataset kadastra-informacijas-sistemas-atvertie-dati, resurss parcel.zip, XML) -> zv[kad].expl={liz,krum,mezs,...} ha, bez keša (lejupielādē katru reizi, kā DAP/īpašnieku dati). app/: Novērtējumā "LIZ blokā" auto = lad.ha, "LIZ parasts" auto = max(0, expl.liz − lad.ha); ja pagastu failā lauka nav (vecs fails), rinda paliek tukša bez kļūdas. Objekta kartītē pie Dabas vērtībām informatīvi "LAD bloki: X ha (N bloki)". Regresijas tests tests/regress.js 4b. Jāpalaiž pagastu pārbūve (pagasti.yml), lai jaunie lauki nonāktu publicētajos failos.
- VZD eksplikācijas datu kopa Supabase ķēdē (ingest.py) mainīja formātu no CSV uz XML un datu kopas ID; labots atsevišķi (parses parcel.zip, filtrē pārējos šīs datu kopas resursus).
- VZD NĪ numurs un nosaukums katram ZV (#44, 02.09.2026): `build_pagasti.py` `load_ni()` lasa tā paša VZD datu kopas (`kadastra-informacijas-sistemas-atvertie-dati`) resursu `property.zip` (`PropertyItemData` → `CadastreObjectIdData/ProCadastreNr`, `PropertyBasicData/PropertyName`, `PropertyContentData/ObjectList/ObjectData[ObjectKindData="Zemes vienība"]/ObjectCadastreNrData`) → `zv[kad].ni={nr,name}`. Tas pats kešošanas princips kā `expl` (nav keša, lejupielādē katru reizi). Pārbaudīts pret reālu ierakstu: 70420080041 → NĪ 70600050059 "Ezermuiža". `--no-ni` izslēdz. Jāpalaiž pagastu pārbūve (pagasti.yml), lai `ni` lauks nonāktu publicētajos failos — palaista 02.09.2026 kopā ar #44 push (PAGASTI_ARGS touch), ~41 min.

## 3. Rit / gaida
- data zara publicēšana (#43): kopīgs publicētājs, publicēšana atsevišķā job ar concurrency piecās darbplūsmās; atlicis pagasti.yml tas pats sadalījums (gatavs lokāli, jācommito).

- LVM īpašnieki un ceļi: LVM dati nav atjaunoti kiberuzbrukuma dēļ; būve ņem no Release "mirror", kad būs faili (spoguļa skripts gatavs, vai ar roku no LVM GEO platformas).

- Aizsargjoslas (#39, 02.09.2026): dzinējs un platumi ar 37./7.p. atsaucēm gatavi, MK 397 kategorijas reģistrētajām ūdenstecēm. BIG_RIVERS regex izņemts: neregistrētai ūdenstecei (nav USIK ieraksta) tagad lieto AJ_DEFAULT minimālo ūdensteces kategoriju (stream, 10 m) ar to pašu 7.p. atsauci un dzeltenu brīdinājumu nogabalā/objekta kartītē "garums nav apstiprināts". Regresijas tests ar zināmiem datiem (USIK kategorija vs. bez tās, joslas ha robežas, atliktie m³) un reāls gadījums (Ezermuiža, fiksēts 02.09.2026, pārbaudīt pret VMD). Atlicis: ATIS imports nopirktajiem, LĢIA hidrogrāfija, purvu klasifikācija pēc augsnes.
- #39 turpinājums, zoneByNog (03.09.2026, 60700020059): reāls gadījums — Daugava/Melnupīte×3/ūdenstilpe ielādētas, bet joslas neaizsniedza nogabalus. **Cēlonis NAV** #22 tipa atslēgas kļūda (`zoneFeatures`/`stripHaOf` strādā tieši ar ģeometriju, ne string-atslēgām) — tā ir **TĀ PATI "paturi tikai lielāko fragmentu" kļūda kā #22 sākotnējā ģeometrijā, bet `build_infra.py`**: liela ūdensobjekta (Daugavas, `watera` slānis, `fclass=riverbank`, 2393,72 ha šajā bbox) apgriešana pret pagasta bbox to sadala VAIRĀKOS poligona fragmentos (rieta locījumi izgriež nesavienotus gabalus), un kods paturēja TIKAI lielāko fragmentu (`max(...,key=len)[0]`, arī bez caurumiem), izmetot fragmentus, kas varēja būt tuvāk nogabaliem. Papildus: USIK (MK 397 garuma kategorijas) šim pagastam ir tukšs (0 ierakstu), tāpēc Daugavas LĪNIJA (`water`, pati par sevi pilnīga, `lines()` fragmentus nezaudē) dabū tikai 10 m minimālo joslu — pēc lietotāja iepriekšējā lēmuma (01.09.), tas NAV mainīts. **Labots:** `build_infra.py` `watera["geom"]` tagad MultiPolygon.coordinates formātā (VISI fragmenti + caurumi, `all_polys()` palīgfunkcija, analoģiski #22 `build_pagasti.py` labojumam). Lietotnē `wateraPolys(geom)` atpazīst abus formātus; `zoneFeatures` veido `MultiPolygon` feature no visiem fragmentiem; `riverbank` tips tagad "upe", nevis kļūdaini "ezers"; karte (`planSvg`) zīmē ar `<path fill-rule="evenodd">`. Sintētisks regresijas tests (nogabals pie MAZA fragmenta, TĀLU LIELS fragments — precīzi atkārto Daugavas situāciju): vecais kods paturētu tikai lielo un josla būtu 0, jaunais — abi fragmenti, josla > 0 (apstiprināts). Pirmā INFRA_RUN pārbūve (run 33753777273, 12:11) **neko neuzbūvēja** — sk. nākamo ierakstu.
- #39/#22 CI (03.09.2026 pēcpusdiena, commit "CI: regress uz svaigiem datiem, infra pārbūve ar INFRA_RUN"). **build-infra 2 min, publish skipped — cēlonis NAV kešs/`--force` (build_infra.py kešam nav vispār):** Geofabrik proxy 0,6 s laikā atgrieza HTML "302 Found" lapu, nevis zip; `requests.get(...).content` bez statusa/satura pārbaudes padeva to `ZipFile` -> `BadZipFile`; darbplūsmas solis `python ... | tee` bez `pipefail` ziņoja tee statusu (0) -> "success", `has_result=false`, publish klusi izlaists. **Otrs, vecāks:** `ŪSIK neizdevās: File is not a zip file` ir KATRĀ būvē kopš koda tapšanas — VARAM datu kopa publicē shapefile kā atsevišķus .shp/.shx/.dbf/.prj/.cpg resursus, ne zip; `load_usik` mēģināja `ZipFile` uz kailu .shp, krita klusi, `usik` bija tukšs visiem pagastiem -> katra ūdenstece (arī Daugava) dabūja 10 m "garums nav apstiprināts". Papildus tur pat: `pd` importēts tikai `main()` iekšā (NameError uzreiz pēc zip labojuma), kategorijas kolonna netika atpazīta (nav "kateg"/"garum" vārda), nosaukums tiktu ņemts no NETIES_UPE (pieteka, ne pati upe). **Labots:** `fetch()` ar `raise_for_status`, redirect, zip maģisko baitu pārbaudi un 3 mēģinājumiem; infra.yml `set -o pipefail`; `load_usik` lasa atsevišķos komponentus pa "Pilna_garuma" komplektiem (4 baseini), nosaukums `NOS_GAL`, kategorija `JOSLA_KAT2` (metadatos "galīgā"), rezervē `JOSLA_KAT`. Kodu 0–4 nozīme NAV izdomāta — pārbaudīta pašos datos (Daugavas 739 + Gaujas 385 rindas, TIES_GAR sadalās bez pārklāšanās tieši pie 10/25/100 km: 4=<10, 3=10–25, 2=25–100, 1=>100, 0=baseina galvenā upe) un sakrīt ar Aizsargjoslu lik. 7.p.; nedokumentēts kods 11 (~15 īsas upes/baseinā) -> lieto tiešā garuma kategoriju. `zoneFeatures`: "<10" -> `A.stream` (agrāk regex kritu uz 50 m). Daugava = kods 0 -> ">100 km" -> 300 m (KC josla 50 m); Melnupīte 7,65 km -> "<10" -> 10 m, tagad apstiprināta. **app-tests sarkans (run 33753777344):** pagastu pārbūve 12:07 (caurumi) nomainīja kv.2 nog.15 dalījumu no proporcionālā uz ģeometrisko — regresijas vērtības atjaunotas (sk. #22 ierakstu), proporcionālajam pievienots sintētisks tests. Lokāli regress 130 OK uz tā paša data zara, ko lasa CI. INFRA_RUN palaists atkārtoti — iepriekšējās veiksmīgās būves 9–15 min, ar ŪSIK ~15–20 min. **Pēc tās jāpārbauda:** `infra/6070` usik > 0 un Daugava ">100", 60700020059 `zoneByNog` Daugavas josla > 0 ha.
- #39/#22 CI turpinājums (03.09.2026 ~14:00, run 33763718103 pēc 423489d): fetch/pipefail labojums strādā — Geofabrik lejupielādēts, ŪSIK pirmo reizi ielādēts (1846 ūdensteces: <10 1097, 10–25 499, 25–100 214, >100 36), bet būve krita `build_infra.py` pagasta bbox aprēķinā ar `TypeError: list - float`: kopš SCHEMA_VERSION 2 (12:07 pagastu pārbūve, caurumi) `stands[].geom` ir gredzenu saraksts, un `build_infra.py` un `sentinel.py` bija nepamanīti šīs shēmas lasītāji (12:11 infra būve krita jau uz Geofabrik, tāpēc to neredzēja). **Labots:** `geom_points()` build_infra.py (abi formāti; dry-run uz svaigā 6070: 7419 nogabali, bbox 26.9445 55.7673 27.3928 55.9131) un sentinel.py `rings` (ārējais + caurumi kā GeoJSON Polygon; ar veco kodu `len(geom)<4` klusi izlaida 7418 no 7419 nogabaliem, 60700020059 — visus 56). app-tests 423489d zaļš (13:53). INFRA_RUN pacelts atkārtoti; **pēc pārbūves jāpārbauda:** infra/6070 `usik` > 0 ar Daugavu ">100", 60700020059 zoneByNog Daugavas josla > 0 ha. Trešais tās pašas shēmas lasītājs — `web/kalkulators.js` (`loadPagasts` → `svgMap`): kopš pārbūves kalkulatora skice deva NaN/tukšu karti; labots atsevišķā commit ar `outerRing()` (tikai ārējais gredzens skicei). sentinel.yml kopš shēmas maiņas nav darbināts (pēdējais 01.09.), tukši dati nav publicēti.
- **Pārbaude pēc infra pārbūves (03.09.2026 17:30+, run 33765283134, commit 8ea4b8e): build 12,5 min + publish, abi zaļi; data zarā `infra/6070.json.gz` (publish 14:24): roads 1270, water 277, watera 108, `usik` 18 (<10: 10, 10–25: 4, 25–100: 3, >100: 1 = Daugava, 1 līnija 345 pt). Regress uz svaigiem datiem: VISI TESTI OK (130).** 60700020059 lietotnē: ŪSIK Daugava ">100" ielādējas (KC josla 50 m, main 10 m, full 300 m), bet **Daugavas josla = 0 ha, un tas ir ģeometriski pareizi**: tuvākais nogabals (2/2, 2/3) ir ≈458 m no Daugavas krasta poligona un ≈626 m no ŪSIK ass — 50 m josla to nesasniedz; 500 m "full" josla no krasta beidzas ≈8 m pirms nog. 2/3 (robežgadījums OSM krasta precizitātes robežās, lietotne `Z.full` tālāk nelieto). Vienīgā reālā josla: Melnupītes fragments šķērso nog. 3/22 (4 m) → zoneByNog 0,04 ha (10 m, "garums nav apstiprināts", jo Melnupīte nav ŪSIK failā). Cerība "Daugava > 0 ha" nāca no tā, ka Daugava *ielādējas* (loadInfra bbox ir paplašināts par dx/dy), ne no piegulības. **Jauns defekts (nelabots, jāsaskaņo):** `loadInfra` filtrs `watera.filter(w=>inBB(w.geom))` sagaida plakanu gredzenu, bet kopš #39 pārbūves `watera[].geom` ir MultiPolygon → **visi 108 ūdens poligoni tiek izmesti ielādē** (`P().infra.watera` = 0; ar labojumu `wateraPolys(w.geom).some(poly=>poly.some(ring=>inBB(ring)))` scratch kopijā → 1 riverbank 2393,72 ha ielādējas). 60700020059 rezultātu tas nemaina (Daugava par tālu), bet objektiem pie ezeriem/dīķiem ūdenstilpju joslas pazūd. Fix + regresijas tests (sintētisks watera MultiPolygon caur loadInfra) — 1 commit. Sīkums: `rebuildCirsma` (app/index.html ~444. r.) lasa globālo `P().infra`, ne padoto projektu — testa harnesā dod caught `TypeError` (novērots; pārlūkā pirmajam objektam — tikai pieņēmums, nav pārbaudīts) (`infra TypeError: Cannot read properties of undefined (reading 'infra')`), aizsargM3 tajā izsaukumā netiek pieskaitīts; jāpadod `p`. Kalkulators: `docs/web/kalkulators.js` (publicētā kopija) **nebija sinhronizēta** ar 8ea4b8e — e2e jsdom uz svaigā 6070: HEAD kopija 56 poligoni ar 227 NaN (tukša skice), labotā `web/` 56 poligoni, 0 NaN. Lokāli nokopēts `docs/web/kalkulators.js` = `web/kalkulators.js`, **vēl nav commitēts**.
- ĪADT individuālie noteikumi (#40, #42): Rāzna, GNP, Daugavas loki, Veclaicene ir rokas noteikumos ar MK numuru (Rāznas divām zonām trūkst tiešas panta atsauces piezīmēs — atsevišķs, nelabots datu trūkums). #42 izmeklēts un labots: iadt.yml savs publicēšanas solis 01.09. faktiski nostrādāja (git push apstiprināts logā), bet 21 min vēlāk infra.yml (un tāpat aplieci.yml/remerge.yml) pārraksta visu data zaru ar orphan force-push, kuru checkout saraksts neietver iadt/ — tāpēc tas pazuda; šis ir starp-workflow trūkums, ko nevar pilnībā novērst tikai iadt.yml (nepieciešams papildināt pārējo publicētāju checkout sarakstus, ārpus #42 robežām). iadt.yml tagad beidzas ar kļūdu, ja rules.json nav izveidots/tukšs vai push/publicēšana neizdodas; build_iadt_rules.py publicē tikai spēkā esošos noteikumus (zaudējušos izraksta logā atsevišķi); tests/regress.js 4c pārbauda iadtRulesFor (rokas, auto, zaudējis).

## 4. Neizpildīts, rindā (secībā)
1. Sentinel automātiski taviem objektiem + kaimiņiem (kadastru saraksts no lietotnes → nakts darbs → zils karodziņš nogabalā).
2. LVC ceļi ar šķīdoņa ierobežojumiem, ATIS aizsargjoslas, VMD mizgrauža monitorings, LĢIA INSPIRE hidrogrāfija un reljefs 20 m.
   Turpat: LAD lauku bloki pa ZV (liz_block_ha) un automātiska "LIZ blokā" / "LIZ parasts" aizpilde eksplikācijā (#41); tagad LIZ blokā ha jāievada ar roku, tāpēc zemes cena PAF ir nepilnīga.
3. Izvešanas ceļu modelis 1. posms: OSM ceļi + grāvji + mitrums no meža tipiem → trase, pievešanas attālums auto izmaksās; 2. posms reljefs.
4. Cirsmu sadalījums pēc atrašanās vietas (ne pēc krājas); "Manas cirsmas" plānošana ar filtriem (pie ceļa, sausa/slapja, izvešana, sezona) un mazo cirsmu apvienošanu.
5. Supabase kopīgā CRM datubāze ar lomām (RLS), pieteikšanās bez parolēm, bezsaistes rinda; kontaktu bāze (pircēji, pārdevēji) ar vēsturi.
6. Mežizstrāde: StanForD .hpr/.fpr imports, forvardera dati, manuālā ievade; API pēc partneru līgumiem.
7. Loģistika: šoferu telefona ekrāns (sortiments, m³, no kuras krautuves, kurp), PVZ ģenerēšana, krautuves atlikums.
8. Analīze: plāns pret faktu, pircēja uzmērījumu (brāķa) imports, rezultāti pa cilvēkiem (pircējs, meistars, operators, izvedējs, šoferis), naudas plūsmas prognoze fondam, investoru atskaite.
9. Līgumu auto-ģenerēšana no tavām veidnēm; grāmatvedības eksports (Jumis/Moneo).
10. AI pārskatītājs (teksta atzinums, ~25–35 tūkst. tokenu/vērtējums).
11. Sīkumi: LKS-2020 skicēs (pāreja 01.10.2026), ortofoto fons skicēm, VMD klasifikatoru tabula, dabas vērtības pa nogabaliem, pircēju portāls (atlikts), nopirkto objektu vērtējuma iesaldēšana ar cenu momentuzņēmumu (tagad tas ir tikai informatīvs).
12. Publicēšana: lietotne uz Netlify/Cloudflare Pages, lai strādā ārpus priekšskatījuma un telefonā.

## 5. Vajag no tevis
- Līgumu paraugi (visi veidi), viens .hpr harvestera fails, Jumis vai Moneo izvēle + importa faila paraugs, pircēju/pārdevēju saraksts sākumam.
- LVM: kad dati atjaunoti, vai nu palaist spoguli, vai augšupielādēt zip failus Release "mirror".
- Netlify/Cloudflare konts publicēšanai (vai atļauja man to izdarīt ar tavu GitHub).
- Jauns GitHub talons ap 1. decembri (pašreizējais atjaunots 02.09.2026, derīgs līdz 01.12.2026).

## 6. Zināmie ierobežojumi
- lvmgeo.lvm.lv, gis.vmd.gov.lv, melioracija.lv no GitHub nesasniedzami; data.gov.lv, geolatvija.lv, karte.lad.gov.lv sasniedzami.
- VMD apliecinājumi vairs nav publiski; aizstāti ar kaimiņu svaigajiem izcirtumiem un manuālu ievadi.
- Copernicus kvota: tikai saviem objektiem.
- Lietotne Claude priekšskatījumā ir ierobežota (ārējie pieprasījumi, druka); lietot no faila vai publicēta.
- Zemes cenas €/ha vairs nav pa objektiem: mainot tās sadaļā Cenas, uzreiz mainās visu objektu (arī nopirkto) vērtējums. Cenu momentuzņēmums (priceSnap, tagad arī ar zemes cenām) tikai fiksē, ar kādām cenām objekts pēdējoreiz vērtēts; poga "Pārrēķināt ar šodienas cenām" atjauno šo atzīmi, nevis iesaldē vērtējumu (iesaldēšana nopirktajiem ir atvērts uzdevums, sk. 4.11). Vecie objektu lauki val.sale / val.buy / val.buyKoef paliek datos, bet netiek lietoti.
- NĪ ar vairākām ZV (#44): "māsu" ZV atrašana ("Jauns objekts no VMD" izvēles saraksts) strādā tikai **tajā pašā pagasta failā**, jo nav apgrieztā indeksa NĪ→visi pagasti; ja NĪ ietver ZV citā pagastā, tā automātiski netiek piedāvāta — lietotnē parādās paziņojums, un lietotājs to pievieno ar roku ("+ ZV" objekta kartītē, strādā jebkurā pagastā). ĪADT zona (`p.iadt`) paliek objekta-vienskaitlī (pirmās ielādētās ZV zona) — ja NĪ ZV atrodas dažādās ĪADT zonās, precīzai pārbaudei jāskatās pa ZV atsevišķi (nav mainīts, ārpus #44 robežām). Kaimiņu robežojošo nogabalu teksts (`p.kaimini`) un ar to saistītā buferjoslu pāru sakritība, kā arī nogabals-only (bez ZV) sakritība dažos perifēros palīgos (`nogCategory`, `urgentActions`, apliecinājumu piesaiste) joprojām nav ZV-droši vairāku-ZV objektos — pirms-#44 ierobežojums, nav paplašināts.

## 2026-09-02 — ezermezs.lv mājaslapa (LV/RU/EN) uz Cloudflare Workers

### Kas ir pabeigts
- Jauna mape `site/` ar pilnu trīsvalodu mājaslapu: 11 lapas × 3 valodas = **33 lapas**
  (sākums, pērkam mežu, pērkam cirsmas, kā notiek darījums, nodokļi, BUJ, par mums,
  kontakti, pieteikums saņemts, privātuma politika, sīkdatņu politika).
- **Rīku ķēde ir tīrs Python** (bez Node.js, npm un wrangler — uz šī datora to nav):
  - `build.py` — ģenerē HTML, canonical, hreflang (ar x-default un savstarpējām atsaucēm),
    JSON-LD (@graph: Organization + WebSite + WebPage/Service/ContactPage/AboutPage/FAQPage
    + BreadcrumbList), `sitemap.xml` ar `xhtml:link` alternatīvām un patiesu `lastmod`
    (pēc satura jaucējsummas, nevis vienāds visiem), `robots.txt`, `_headers`, `_redirects`, 404.
  - `check.py` — regresijas pārbaude uzbūvētajai lapai: HTML struktūra, iekšējās saites,
    hreflang savstarpējība, JSON-LD derīgums, formas etiķetes un `aria-describedby`,
    dublēti title/description, sitemap atbilstība. Šobrīd **0 kļūdu**.
  - `test_build.py` — vienībtesti teksta apstrādei (XSS, marķējums, aizvietotāji, slugi).
  - `serve.py` — lokāls serveris, kas atdarina Workers maršrutēšanu un formas galapunktu.
  - `deploy.py` — publicēšana caur Cloudflare **oficiāli dokumentēto** Workers Static Assets
    Direct Upload REST API (sha256 manifests, grozu augšupielāde, skripta PUT).
  - `merge_content.py` — satura daļu apvienošana; savāc `_verify` no visiem trim līmeņiem.
- `worker.mjs` — Cloudflare Worker: `/` valodas izvēle pēc Accept-Language, `/api/pieteikums`
  (Turnstile serverpusē ar hostname pārbaudi, honeypot, ātruma ierobežojums, header injection
  aizsardzība), e-pasts uz info@ezermezs.lv, 404, drošības galvenes dinamiskajām atbildēm.
- **Pieteikuma anketa strādā arī bez JavaScript** (parasts POST → 303 uz pateicības lapu);
  ar JavaScript — `fetch`, inline validācija uz `blur`, kļūdu kopsavilkums ar `role="alert"`.
- SEO: apakšmapes `/lv/ /ru/ /en/`, pašreferencējošs canonical, unikāli title/description
  katrai lapai katrā valodā, ASCII slugi, bez automātiskas valodas pāradresācijas.
- GEO: statisks HTML (AI rāpuļi neizpilda JavaScript), atbilde-vispirms struktūra
  (`answer` bloka `lead` ir pašpietiekama), robots.txt apzināti atļauj OAI-SearchBot,
  Claude-SearchBot, PerplexityBot. `llms.txt` apzināti NAV pievienots.
- UX/UI: zīmola krāsas no cirsma-app, gaišā un tumšā tēma, 48 px pieskāriena mērķi,
  WCAG 2.2 AA formas, sistēmas fonti (nulle tīkla pieprasījumu, nav Google Fonts GDPR jautājuma),
  sīkdatņu banneris ar līdzvērtīgām "Pieņemt"/"Noraidīt" pogām, valodas ieteikuma josla bez pāradresācijas.
- `.github/workflows/site.yml` — publicēšana pēc push (arī bez Node).
- `.gitignore` (repo tāda nebija): `site/dist/`, `site/.cf.json`, `site/worker.config.json`, `_parts/`.

### Kas NAV pabeigts
- **Dizains no claude.ai/design (`Kontakti.dc.html`) nav nolasīts** — DesignSync prasa
  autorizāciju, un `/design-login` šajā sesijā nenostrādāja (mēģināts 4 reizes). Vizuālais
  slānis šobrīd ir mans, balstīts uz cirsma-app krāsu paleti; kad dizains būs pieejams,
  jāpārraksta `site/assets/styles.css` (saturs, HTML struktūra un aizmugure paliek).
- **Nav publicēts uz Cloudflare** — nav API tokena. Vajag `CLOUDFLARE_API_TOKEN`
  (Account → Workers Scripts → Edit) un `CLOUDFLARE_ACCOUNT_ID`.
- Meža vērtības kalkulators (`web/kalkulators.js`) nav integrēts: tā saskarnes teksti ir
  cieti iekodēti latviski, un trīsvalodu lapā tas prasa iepriekšēju i18n.
- `og.png` nav — `site/assets/og-source.svg` ir gatavs eksportam; `build.py` og:image tagus
  pievieno tikai tad, ja PNG fails eksistē (tāpēc nav bojātu tagu).

### Prioritātes un riski
1. **Tālruņa numurs `site.config.json` ir vietturis `+371 20 000 000`** — pirms publicēšanas
   jāaizstāj abās vietās (`phone_display`, `phone_e164`).
2. **Juridiskā persona jāapstiprina Uzņēmumu reģistrā.** Šobrīd lapā ir SIA "LATVIJAS EZERMEŽS",
   reģ. nr. 41503088587, Vidus iela 32, Daugavpils — no publiskiem katalogiem, nevis no ur.gov.lv.
   Katalogos figurē arī citas adreses. Nepareizi rekvizīti pārkāpj Informācijas sabiedrības
   pakalpojumu likuma 4. pantu.
3. `python site/build.py` katrā palaišanā izdrukā sadaļu **JĀAPSTIPRINA PIRMS PUBLICĒŠANAS**
   (~60 punkti) — apgalvojumi par pakalpojumu, termiņiem un datu apstrādi, ko satura ģenerators
   apzināti atzīmēja kā neapstiprinātus. Tie jāizskata pirms pirmās publicēšanas.
4. Nodokļu skaitļi lapā: cirsma 10 % IIN ar 25 % izdevumu normu = efektīvi 7,5 %; meža zeme —
   kapitāla pieaugums **25,5 % kopš 01.01.2025** (nevis 20 %, ko joprojām raksta daudzas lapas);
   60 mēnešu atbrīvojums attiecas tikai uz nekustamo īpašumu, nevis uz cirsmu. Ja likmes mainās,
   jālabo `site/content/*.json` visās trīs valodās.
5. Turnstile nav konfigurēts (`site.config.json` → `form.turnstile_sitekey` tukšs). Bez tā
   forma strādā, bet pret spamu sargā tikai honeypot un ātruma ierobežojums.
6. ezermezs.lv indeksā ir vecs ieraksts ar virsrakstu "latviešu", bet A ieraksta domēnam nav —
   lapa šobrīd nedarbojas. Jārēķinās ar pārindeksēšanas periodu.

### Jauni ierobežojumi un atkarības
- Cloudflare **Pages Functions neatbalsta `send_email` bindingu** — tāpēc izvēlēti Workers ar
  Static Assets, nevis Pages. Workers Direct Upload API turklāt ir oficiāli dokumentēts un lieto
  sha256 (Python stdlib); Pages prasītu ārēju `blake3` pakotni.
- E-pasta sūtīšanai pirms publicēšanas Cloudflare panelī jāapstiprina galamērķa adrese
  (Email → Destination addresses → info@ezermezs.lv). Sūtīšana uz verificētu adresi ir bez maksas.
  Rezerves ceļi kodā: Resend (`RESEND_API_KEY`) un Cloudflare Email REST API (`CF_EMAIL_TOKEN`).
- Repo atrodas OneDrive mapē: `shutil.rmtree` uz `dist/` krita ar WinError 5, tāpēc `build.py`
  tīra mapi ar atkārtojumiem. Windows konsolē skripti pārslēdz stdout uz UTF-8 (cp1252 dēļ).
- Vērtēšanas formulas, MK935 parametri un nodokļu likmes lietotnē **nav mainītas** →
  `tests/regress.js` papildinājums nav vajadzīgs. Mājaslapai ir savi vārti: `site/check.py`
  un `site/test_build.py`.

## 2026-09-02 (vēlāk) — dizaina imports no claude.ai/design

### Pabeigts
- DesignSync autorizācija beidzot nostrādāja. Projekts "Latvijas uzņēmuma tīmekļa vietne"
  (`bded12bd-…`) nolasīts; **visi 10 dizaina avota faili eksportēti pilnībā** uz `site/design/`:
  `SiteHeader/SiteFooter/LeadForm/Sakumlapa/Pakalpojumi/Par-mums/Noderigi/Kontakti` (.dc.html)
  + `support.js` + `image-slot.js`.
- `site/design/README.md` — kas eksportēts un kas ne.
- `site/DESIGN-DIFF.md` — pilns salīdzinājums starp dizainu un uzbūvēto lapu, 8 sadaļās.

### Nav eksportēts (MCP ierobežojums, nevis kļūda)
- 6 renderētie `.html` bundlēti eksporti un 6 `uploads/` faili pārsniedz DesignSync
  `get_file` **256 KiB** limitu — tie atgriežas aprauti (tieši 262 144 baiti) un ir
  atzīmēti ar `.TRUNCATED` (git ignorē). Dizainam tie nav vajadzīgi: tie ir bundlēti
  eksporti no tiem pašiem `.dc.html` avotiem, kas ir pilni.
- `Atsauksmes.html` ir vienīgā lapa bez `.dc.html` avota — vecākas paaudzes lapa.

### Galvenās atšķirības, kas prasa lēmumu
1. **Rekvizītu konflikts.** Dizains: juridiskā adrese **Dunduru iela 11, LV-5404**,
   dibināts **2017**, tālrunis **+371 27 155 991**. Mans config: Vidus iela 32, LV-5401,
   2020, vietturis. Katalogi Dunduru ielu rāda kā faktisko, ne juridisko adresi.
   **Jāpārbauda ur.gov.lv.** Config apzināti NAV mainīts, kamēr nav apstiprināts.
2. **Valodas: dizainā LV/RU/LTG** (latgaliski), es uzbūvēju LV/RU/EN.
3. **Lapu skaits: dizainā 5, manā 11.** Dizains apvieno pakalpojumus vienā lapā ar
   4 enkuriem un pievieno divus pakalpojumus, kuru man nav (mežizstrāde, apsaimniekošana),
   plus lapu `Noderīgi` ar meža vērtības kalkulatoru. Man ir `taxes`, `privacy`, `cookies`,
   kuru dizainā nav (kājenes saite ved uz `#`).
4. **Anketa: dizainā 3 lauki** (vārds, tālrunis, novads/kadastrs), bez piekrišanas rūtiņas;
   manā 7 lauki. Sekas: `worker.mjs` validācijā tālrunis kļūst obligāts.
5. **Krāsas un fonti pilnībā citi**: `#2F3D1F` zaļā, `#D9982F` akcents, `#2E627C` saites,
   Archivo + Source Sans 3. Ieteikums fontus self-hostēt (abi OFL), nevis ņemt no Google CDN.
6. **Dizains satur skaitļus un atsauksmes ar vārdiem**, ko satura ģenerators atteicās
   izdomāt (9+ gadi, 250 000+ m³, 12 milj. €, 4,9★/87 Google atsauksmes, 18 darbinieki,
   400+ darījumi, komandas vārdi, tehnikas modeļi). Ja tie ir dizainera paraugi, tie
   jāaizstāj vai jāizņem — izdomātas atsauksmes ir spam politikas pārkāpums.

### Riski
- Kamēr rekvizīti un skaitļi nav apstiprināti, publicēt nedrīkst.
- Vērtēšanas formulas nav mainītas → `tests/regress.js` papildinājums nav vajadzīgs.
  Mājaslapas vārti (`site/check.py`, `site/test_build.py`) joprojām iziet: 34 lapas, 0 kļūdu.

## 2026-09-02 (vēlāk) — ezermezs.lv pārbūvēta pēc dizaina lēmumiem

### Kas ir pabeigts
- Izpildīti visi trīs klienta lēmumi: (1) rekvizīti no dizaina — Dunduru iela 11, Daugavpils,
  LV-5404, dibināts 2017, tālrunis/WhatsApp +371 27 155 991; (2) valodas **LV/RU/LTG**
  (latgaliski), angļu versija atmesta; (3) lapu struktūra apvienota — paturēti `taxes`,
  `privacy`, `cookies`, `thanks`, pievienoti dizaina `forestry` (Mežizstrāde), `management`
  (Apsaimniekošana) un `useful` (Noderīgi ar kalkulatoru/valsts saitēm/padomiem). Kopā
  **14 lapu atslēgas × 3 valodas = 42 lapas**.
- **Vizuālā sistēma pārtaisīta pilnībā pēc dizaina**: krāsas (#2F3D1F zaļais, #D9982F
  dzintara, #2E627C saites), Archivo + Source Sans 3 fonti — **self-hostēti** (lejupielādēti
  no Google Fonts CSS2 API, WOFF2, `site/assets/fonts/` + `fonts.css`), nevis CDN.
- **Jauni bloku tipi** `build.py`: `team` (komandas kartītes), `reviews` (atsauksmes ar
  5 zvaigznēm un Google reitingu), `hero.image`/`cards[].image` (Pexels foto ar CSP
  atļauju), `cards[].href` (stretched-link modelis — vesela karte klikšķināma, derīga HTML),
  `pills` (kompakta procesa soļu ķēde tekstā).
- **Pieteikuma anketa vienkāršota** pēc dizaina: 3 lauki (vārds, tālrunis, novads/kadastrs),
  bez e-pasta, bez piekrišanas rūtiņas (teksts zem pogas). `worker.mjs`/`site.js`/`serve.py`
  pieskaņoti — tālrunis tagad vienīgais un obligātais kontakta kanāls.
- **Saturs pārrakstīts** ar darbplūsmu (32 aģenti, LV → paralēli RU/LTG → QA katrai no
  8 grupām): sākumlapa, 4 pakalpojumu lapas, process+nodokļi (nodokļu likmes **saglabātas
  nemainīgas** no iepriekšējās versijas — 10 %/25 % izdevumu norma/7,5 % cirsmai,
  25,5 % kopš 01.01.2025 zemei, 60 mēnešu atbrīvojums NEATTIECAS uz cirsmu — pārbaudīts
  pēc būves, ka "20 %" parādās TIKAI kā skaidri atzīmēta novecojusi likme), BUJ+par mums+
  kontakti, Noderīgi, privātuma+sīkdatņu politika (struktūra/tonis pēc SIA "Psihologs Tavā
  kabatā" (gudone.lv) parauga, adaptēts Ezermeža situācijai un Cloudflare/Turnstile).
- Uzņēmuma dati (9+ gadi, 250 000+ m³, 12 milj. €, 35 novadi, komanda, tehnika, 3 atsauksmes
  ar vārdiem, 4,9★/87 Google atsauksmes) pārņemti tieši no klienta paša dizaina — tas ir
  klienta paša saturs par savu uzņēmumu, nevis izdomāts.
- **Divas reālas kļūdas atrastas un izlabotas ceļā**: (1) `@page#enkurs` formāts (piem.
  `@contacts#pieteikums`), ko pats ieteicu CONTENT_SPEC.md, nebija atbalstīts
  `Site.resolve_href` — pievienots regresijas tests `test_build.py`; (2) `check.py` domēna
  atpazīšana bija cietkodēta uz "/en/" un lauza katras lapas canonical pārbaudi, tiklīdz
  valodu sarakstā vairs nebija "en" — izlabots ar `urlparse`.
- Pilna ķēde pārbaudīta ar reālo saturu: `build.py` (0 brīdinājumu), `check.py` (43 lapas,
  0 kļūdu), `test_build.py` (visi izturēti), `deploy.py --dry-run` (56 faili, fonti manifestā).
- `site/DESIGN-DIFF.md` papildināts ar "Rezolūcija" sadaļu, kas fiksē pieņemtos lēmumus.

### Kas NAV pabeigts
- **Nav publicēts** — nav Cloudflare API tokena.
- **Latgaliešu saturs nav pārbaudīts ar dzimtās valodas runātāju.** Aģenti raksta autentiskā
  latgaliešu rakstu valodā (ne mehāniska burtu aizstāšana), bet automātiski ģenerēts LTG
  teksts jāpārbauda pirms publicēšanas — vairāki `_verify` punkti to skaidri atzīmē.
- Meža vērtības kalkulators (`web/kalkulators.js`) Noderīgi lapā **nav integrēts** — vietā ir
  teksts un CTA uz kontaktiem (kalkulatora JS i18n ir atsevišķs, vēl neveikts darbs).
- `og.png` nav ģenerēts no `og-source.svg` (nav attēlu rīku šajā vidē) — krāsas atjauninātas,
  gaida manuālu eksportu.

### Prioritātes un riski
1. **`site/VERIFY.md` satur 187 punktus** — lielākā daļa ir dublēti pa 2-3 valodām par vienu
   un to pašu apgalvojumu (piem., procesu soļu secība, apsekošanas ilgums, captcha lauka
   nepieciešamība). Jāizskata pirms pirmās publicēšanas, prioritāri sadaļa 1 (PVN numurs).
2. Rekvizīti un skaitļi nāk no klienta paša dizaina, tāpēc uzskatāmi par apstiprinātiem, bet
   tie **noveco** — pirms katras publicēšanas reizes vērts pārliecināties, ka darbinieku
   skaits/tehnika/apjomi joprojām atbilst realitātei.
3. Vērtēšanas formulas lietotnē nav mainītas → `tests/regress.js` papildinājums nav vajadzīgs.
   Mājaslapai savi vārti: `site/check.py` + `site/test_build.py`, abi zaļi.

### Jauni ierobežojumi un atkarības
- Fontu self-hostēšana: Archivo un Source Sans 3 ir **mainīgie fonti** (variable fonts) —
  Google Fonts CSS2 API atgriež VIENU fizisko failu vairākiem deklarētajiem svariem
  (600/700/800 vienam un tam pašam .woff2); tas ir pareizi un paredzēti, ne kļūda.
- `copy_assets()` tagad rekursīvi kopē `assets/` apakšmapes (vajadzīgs `fonts/` mapei).
- CSP `img-src` tagad atļauj `https://images.pexels.com` — hero un pakalpojumu kartēs ir
  klienta izvēlēti Pexels foto (bezmaksas licence), paredzēti kā aizstājami ar īstiem foto.
