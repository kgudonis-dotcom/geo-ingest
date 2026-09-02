# FF Forest meža sistēma: vienošanās, izpilde un rinda
Atjaunots: 2026-09-02 (LAD bloki rindā, talons atjaunots). Šis fails ir vienīgā patiesība par to, kas norunāts, kas gatavs un kas nav. Glabājas repo `kgudonis-dotcom/geo-ingest` (STATUSS.md) un tiek atjaunots pēc katra darba.

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
### Mājaslapa
- Meža vērtības kalkulators (kalkulators.js/css + paraugs tavā dizainā), summa aiz kontaktformas, mk:result notikums.
### Datu ķēde geo-ingest (publisks repo)
- Pagastu faili visai Latvijai: 485 + Vidzeme (kopā ~590 pagasti, ~230 tūkst. meža ZV) ar kaimiņiem un DAP; paralēla būve, inkrementāla apvienošana, drošinātājs pret tukšu publicēšanu, sacensības labojums.
- Mērķa eksports pēc kadastra (Ezermuiža pierādīts), skices no VMD ģeometrijas.
- Sentinel-2 vainaga zuduma darbs strādā (tests 78680040067) un ir gatavs kā atsevišķs datu avots, bet automātiska iestrāde objektu sarakstos vēl nav pabeigta.
- Izlūkošana: sasniedzamība un datu avoti dokumentēti logos.
- Supabase shēma un ielāde (rezerve), 876 ĪADT + 2517 zonas datubāzē.
- LAD lauku bloki (2026-09-02, #41, #18): build_pagasti.py katram pagastam vaicā karte.lad.gov.lv ArcGIS REST (bbox, lapots, ≤4 paralēli pieprasījumi, 3 mēģinājumi), krusto ar ZV robežu -> zv[kad].lad={ha,blocks}. Lēts paraksts (bloku skaits + jaunākais VALID_FROM) pagasta bbox'am -> pagastu faila ladSig; ja sakrīt ar iepriekšējo, ģeometrijas vaicājumu izlaiž un "lad" pārnes no vecā faila (kešs, "nemainīts → nepārbūvē"). VZD zemes lietošanas mērķu eksplikācija (dataset kadastra-informacijas-sistemas-atvertie-dati, resurss parcel.zip, XML) -> zv[kad].expl={liz,krum,mezs,...} ha, bez keša (lejupielādē katru reizi, kā DAP/īpašnieku dati). app/: Novērtējumā "LIZ blokā" auto = lad.ha, "LIZ parasts" auto = max(0, expl.liz − lad.ha); ja pagastu failā lauka nav (vecs fails), rinda paliek tukša bez kļūdas. Objekta kartītē pie Dabas vērtībām informatīvi "LAD bloki: X ha (N bloki)". Regresijas tests tests/regress.js 4b. Jāpalaiž pagastu pārbūve (pagasti.yml), lai jaunie lauki nonāktu publicētajos failos.
- VZD eksplikācijas datu kopa Supabase ķēdē (ingest.py) mainīja formātu no CSV uz XML un datu kopas ID; labots atsevišķi (parses parcel.zip, filtrē pārējos šīs datu kopas resursus).

## 3. Rit / gaida
- OSM ceļi un grāvji pa pagastiem (build-infra): kļūda labota, jāpalaiž vēlreiz (pirmajā reizē 79 pagasti).
- LVM īpašnieki un ceļi: LVM dati nav atjaunoti kiberuzbrukuma dēļ; būve ņem no Release "mirror", kad būs faili (spoguļa skripts gatavs, vai ar roku no LVM GEO platformas).
- VZD eksplikācija: skripts gatavs, jāpalaiž atkārtoti.
- Aizsargjoslas (#39): dzinējs un platumi ar 37.p. atsaucēm gatavi, MK 397 kategorijas reģistrētajām ūdenstecēm. Atlicis: neregistrētām ūdenstecēm nomainīt regex uz minimālo likuma kategoriju + brīdinājums, regresijas tests ar zināmiem datiem, ATIS, LĢIA hidrogrāfija, purvu klasifikācija.
- ĪADT individuālie noteikumi (#40, #42): Rāzna, GNP, Daugavas loki, Veclaicene ir rokas noteikumos ar MK un pantu. Auto-slānis (114 noteikumi, 33 spēku zaudējuši) lietotni nesasniedz, jo iadt.yml nepublicē rules.json data zarā; jāizmeklē (#42), tikai spēkā esošie publicējami, regresijas tests.

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
