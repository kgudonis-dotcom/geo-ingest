# FF Forest meža sistēma: vienošanās, izpilde un rinda
Atjaunots: 2026-09-01. Šis fails ir vienīgā patiesība par to, kas norunāts, kas gatavs un kas nav. Glabājas repo `kgudonis-dotcom/geo-ingest` (STATUSS.md) un tiek atjaunots pēc katra darba.

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
### Lietotne cirsma-app (v0.21)
- Cirsmu vērtēšana: sugas × sortimenti pēc caurmēra, cenas, izmaksas, marža, max cena; Vigodas Excel reproducēts līdz centam.
- MK935 pilnās tabulas (Gmin/Gkrit, koku skaits H<12, galvenās cirtes caurmērs P/E/B), KKC Gkrit+2, aizliegtās sugas, 3 g pēc kopšanas, jauktā cirsma, eko koki, ĪADT zonas, kaimiņu svaigie izcirtumi (MK935 19./20.p.).
- Buferjoslas: maināms platums (90 → 50), īsti poligoni, atliktie m³, robežu plāns ar svītrojumu.
- Objekts no kadastra numura (pagastu faili vai Supabase): nogabali, taksācija, sastāvs, krāja, ģeometrija, kaimiņi, DAP slāņi (ĪADT, zonas, mikroliegumi, biotopi, atradnes, koki, pieminekļi), robežnieki, kaimiņu izcirtumi.
- Imports: Kadastra atskaite xlsx, VMD PDF (2 veidi), dastojums (Mežvērte PDF, MK935 10. piel. xls, tabulas) ar Liepas tilpuma formulu; KML skices ģenerators (Python).
- Pārskats (Mans mežs paraugs): KPI, satelītkarte pa kategorijām, steidzamās darbības, dabas vērtības, sugu un meža tipu grafiki.
- Novērtējums (PAF): 12 zemes rindas auto, cenas rediģējamas + globālie noklusējumi, darījums, nodeva pēc likuma, termiņi, IRR (XIRR sakrīt ar Excel 67,0 %), bruto peļņa, prasītās cenas, "Kāpēc šie skaitļi".
- Izvades: vērtējuma atskaite PDF, Excel (7 lapas), iesniegums koku ciršanai VMD ar izvietojuma karti un skicēm, cirsmas skice (LKS-92 koordinātas).
- Fonds: visi objekti kartē pēc statusa, KPI, sugas, vecuma grupas, zemes sadalījums, tabula, Excel; "Kas deg" 30 dienu saraksts.
- CRM: statusi Jauns → Vērtēšanā → Piedāvāts → Vienošanās → Nopirkts/Atteikts → Pārdots; auto uzdevumi pa lomām; komanda Iestatījumos; komentāri; vēsture (audits); cirsmas statusi un "Pabeigt cirsmu" ar auto-labojumu nogabaliem; rezultāts šodien (naudas izmaksas %, mērķa bruto); cenu momentuzņēmums un pārrēķins.
- LiDAR salīdzinājuma loģika (manuālie lauki), LV/RU valodas, bezsaiste (SW + Cache API pagastu failiem).
### Mājaslapa
- Meža vērtības kalkulators (kalkulators.js/css + paraugs tavā dizainā), summa aiz kontaktformas, mk:result notikums.
### Datu ķēde geo-ingest (publisks repo)
- Pagastu faili visai Latvijai: 485 + Vidzeme (kopā ~590 pagasti, ~230 tūkst. meža ZV) ar kaimiņiem un DAP; paralēla būve, inkrementāla apvienošana, drošinātājs pret tukšu publicēšanu, sacensības labojums.
- Mērķa eksports pēc kadastra (Ezermuiža pierādīts), skices no VMD ģeometrijas.
- Sentinel-2 vainaga zuduma darbs strādā (tests 78680040067).
- Izlūkošana: sasniedzamība un datu avoti dokumentēti logos.
- Supabase shēma un ielāde (rezerve), 876 ĪADT + 2517 zonas datubāzē.

## 3. Rit / gaida
- OSM ceļi un grāvji pa pagastiem (build-infra): kļūda labota, jāpalaiž vēlreiz (pirmajā reizē 79 pagasti).
- LVM īpašnieki un ceļi: LVM dati nav atjaunoti kiberuzbrukuma dēļ; būve ņem no Release "mirror", kad būs faili (spoguļa skripts gatavs, vai ar roku no LVM GEO platformas).
- VZD eksplikācija: skripts gatavs, jāpalaiž atkārtoti.

## 4. Neizpildīts, rindā (secībā)
1. Sentinel automātiski taviem objektiem + kaimiņiem (kadastru saraksts no lietotnes → nakts darbs → zils karodziņš nogabalā).
2. LVC ceļi ar šķīdoņa ierobežojumiem, ATIS aizsargjoslas, VMD mizgrauža monitorings, LĢIA INSPIRE hidrogrāfija un reljefs 20 m.
3. Izvešanas ceļu modelis 1. posms: OSM ceļi + grāvji + mitrums no meža tipiem → trase, pievešanas attālums auto izmaksās; 2. posms reljefs.
4. Cirsmu sadalījums pēc atrašanās vietas (ne pēc krājas); "Manas cirsmas" plānošana ar filtriem (pie ceļa, sausa/slapja, izvešana, sezona) un mazo cirsmu apvienošanu.
5. Supabase kopīgā CRM datubāze ar lomām (RLS), pieteikšanās bez parolēm, bezsaistes rinda; kontaktu bāze (pircēji, pārdevēji) ar vēsturi.
6. Mežizstrāde: StanForD .hpr/.fpr imports, forvardera dati, manuālā ievade; API pēc partneru līgumiem.
7. Loģistika: šoferu telefona ekrāns (sortiments, m³, no kuras krautuves, kurp), PVZ ģenerēšana, krautuves atlikums.
8. Analīze: plāns pret faktu, pircēja uzmērījumu (brāķa) imports, rezultāti pa cilvēkiem (pircējs, meistars, operators, izvedējs, šoferis), naudas plūsmas prognoze fondam, investoru atskaite.
9. Līgumu auto-ģenerēšana no tavām veidnēm; grāmatvedības eksports (Jumis/Moneo).
10. AI pārskatītājs (teksta atzinums, ~25–35 tūkst. tokenu/vērtējums).
11. Sīkumi: LKS-2020 skicēs (pāreja 01.10.2026), ortofoto fons skicēm, VMD klasifikatoru tabula, dabas vērtības pa nogabaliem, pircēju portāls (atlikts).
12. Publicēšana: lietotne uz Netlify/Cloudflare Pages, lai strādā ārpus priekšskatījuma un telefonā.

## 5. Vajag no tevis
- Līgumu paraugi (visi veidi), viens .hpr harvestera fails, Jumis vai Moneo izvēle + importa faila paraugs, pircēju/pārdevēju saraksts sākumam.
- LVM: kad dati atjaunoti, vai nu palaist spoguli, vai augšupielādēt zip failus Release "mirror".
- Netlify/Cloudflare konts publicēšanai (vai atļauja man to izdarīt ar tavu GitHub).
- Jauns GitHub talons ap 1. decembri (pašreizējais līdz ~30.11.2026).

## 6. Zināmie ierobežojumi
- lvmgeo.lvm.lv, gis.vmd.gov.lv, melioracija.lv no GitHub nesasniedzami; data.gov.lv, geolatvija.lv, karte.lad.gov.lv sasniedzami.
- VMD apliecinājumi vairs nav publiski; aizstāti ar kaimiņu svaigajiem izcirtumiem un manuālu ievadi.
- Copernicus kvota: tikai saviem objektiem.
- Lietotne Claude priekšskatījumā ir ierobežota (ārējie pieprasījumi, druka); lietot no faila vai publicēta.
