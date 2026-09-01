# Cirsmu vērtētājs, lauka rīks (PWA)

Darbojas telefonā, planšetē un datorā no vienas adreses. Dati glabājas ierīcē (localStorage), lapa strādā bez tīkla pēc pirmās atvēršanas (service worker), izmaiņas nosūta uz serveri, kad parādās tīkls.

## Palaišana
1. Ielikt visus failus vienā mapē uz jebkura HTTPS hostinga (Netlify, Cloudflare Pages, GitHub Pages, savs serveris). Bez HTTPS nedarbojas bezsaistes kešs.
2. Telefonā atvērt adresi, "Pievienot sākuma ekrānam". Turpmāk atveras kā lietotne.
3. Lokālai testēšanai: `python3 -m http.server 8080` mapē un atvērt http://localhost:8080.

## Sinhronizācija
Iestatījumos norāda servera adresi. Rīks sagaida divus REST ceļus:
- `PUT /props/:id` ar objekta JSON (ķermenī `updatedAt`)
- `GET /props` ar visu objektu sarakstu
Bez servera darbojas pilnībā, ar JSON rezerves kopiju un CSV eksportu.

## Imports
Objekti → Importēt. Pieņem Kadastra atskaiti (.xlsx/.csv) vai inventarizācijas PDF. Virsrakstu rindu un kolonnas atpazīst automātiski, var pārlabot; pēdējo atbilstību atceras. Rezultāts: objekts ar visiem nogabaliem sadaļā Mērījumi un automātiski izveidotām cirsmām (KC → Kc, KKC → KKC, grupējot pa kvartāliem, krāja sadalīta pa sugām pēc sastāva formulas). Atbalstītie formāti:
- Kadastra atskaite (.xlsx ar kolonnām kadastrs, kvartāls, nogabals, ..., cirsma, certamais, inv_gads): cirsmas no kolonnas `cirsma`, apjoms no `certamais` (KKC ar certamais 0 paliek ārpus cirsmām).
- VMD "Nogabalu raksturojošie rādītāji" PDF: krāja = m³/ha × ha, cirsmas kods pēc cirtmeta (P 101/121, E 81, B 71/51, M 71, A 41, Oz 101, Os 81), pārlabojams Mērījumos.
- Vecākā "INVENTARIZĀCIJAS DATI" PDF: krāja pa sugām tieši no dokumenta.
Citiem formātiem paliek manuāla kolonnu piekārtošana.
