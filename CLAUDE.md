# CLAUDE.md

## Projekta īss apraksts

FF Forest ir meža vērtēšanas un objektu vadības sistēma Latvijas meža zemes vienībām. Projekts no kadastra numura izveido objektu, nolasot VMD, DAP, kaimiņu un citu atvērto datu avotu datus, aprēķina cirsmas, krājas, sortimentus, nodevas, zemes vērtību, IRR un bruto peļņu, un sagatavo dokumentus un skices lietotnē.

Repo galvenie komponenti:
- lietotne: app/
- kalkulators: web/
- spoguļskripti: mirror/
- datu ķēde: Python skripti repozitorija saknē
- publiskie dati: pagasti/, infra/, sentinel/
- statusa dokuments: STATUSS.md
- tehniskā dokumentācija: DOKUMENTACIJA.md

## Darba un komunikācijas noteikumi

- Atbildes un komentāri vienmēr jāraksta latviski.
- Nelasi mapi data/ un failus, kas ir lielāki par 200 KB, ja vien lietotājs tos tieši neprasa.
- App kods atrodas app/; kalkulators atrodas web/; spoguļskripti atrodas mirror/.
- Sesijas sākumā vienmēr `git checkout main && git pull`; nekad nestrādā citā zarā, ja lietotājs to nav prasījis.
- Ja mainās pagastu faila shēma, workflow argumenti vai lietotāja funkcija, tajā pašā commit atjauno DOKUMENTACIJA.md attiecīgo sadaļu.
- Ja mainās pagasta JSON izvades shēma (jauns/dzēsts/pārdēvēts lauks zv ierakstā `build_pagasti.py`), paaugstini `SCHEMA_VERSION` par 1 tajā pašā commit — tā ir daļa no `lad_signature()` paraksta, tāpēc versijas maiņa liek paraksta-balstītajai izlaišanai (LAD) vienmēr pārrēķināt, nevis izmantot veco kešu.
- GitHub issues neveido pats; ja uzdevumam nav issue numura, jautā.
- Nekad negaidi fona procesus, CI darbus vai pārbūves ar polling, sleep vai ieplānotiem wakeup. Ja rezultāts nav gatavs uzreiz, pabeidz darbu ar to, kas ir, uzraksti atskaiti un pasaki, ko pārbaudīt vēlāk. Lietotājs pats pateiks, kad turpināt.
- Komandas un skriptus vienmēr palaid priekšplānā ar tiešu izvadi (nekad run_in_background), ar laika limitu līdz 10 minūtēm. Ja darbs ilgst ilgāk, sadali to mazākos soļos.
- Pēc katra darba (pat maziem labojumiem vai jauniem prototipiem) jāatjauno [STATUSS.md](STATUSS.md). Tajā jānorāda:
  - datums
  - kas ir pabeigts
  - kas vēl ir nepabeigts
  - prioritātes un riski
  - jauni ierobežojumi vai atkarības
- Ja tiek mainīti vērtēšanas noteikumi, formulas vai likumdošanas parametri, obligāti jāpievieno regresijas tests. Tas attiecas uz:
  - MK935 robežas un limitiem
  - Gkrit / Gmin / cirtmets / KKC noteikumi
  - sortimentu sadalījuma tabulas
  - cenu, izmaksu un maržas parametri
  - Liepa tilpuma koeficienti un citas aprēķinu formulas
  - jebkuras zemes, nodevas vai IRR kalkulācijas izmaiņas
- Ja maini vērtēšanas noteikumus, pievieno regresijas testu failam tests/regress.js un palaid to pirms pabeigšanas.
- Commit darīt tikai tad, kad lietotājs to tieši prasa.

## Regresijas testu prasības

- Tests jāraksta tā, lai pārbaudītu reālu uzvedību, ne tikai mock objektus.
- Ja izmaiņas ietekmē vērtēšanas logiku, tests ir jāpapildina ar konkrētu scenāriju, kurš sākotnēji var neizturēt un pēc labojuma jānokārto.
- Testa mērķis ir aizsargāt pret regresiju: viena izmaiņa nedrīkst sabojāt iepriekšējās vērtēšanas atbilstības vai eksporta rezultātus.
- Ja noteikumi ir mainīti, testu piemērs ir:
  - dot konkrētu objekta/veida datus
  - palaist vērtēšanas vai aprēķina funkciju
  - salīdzināt rezultātu ar zināmu, iepriekš pārbaudītu vērtību vai diapazonu

## Strādāšanas kārtība

1. Izprast problēmu un izsekot faktiskajam cēloņam.
2. Ja ir izmaiņas vērtēšanas politikā, vispirms pievienot vai atjaunināt regresijas testu tests/regress.js.
3. Palaist regresijas testu un pārliecināties, ka tas iziet.
4. Veikt minimālu labošanas solīšanu un tās pārbaudīt.
5. Pēc darba pabeigšanas atjaunot [STATUSS.md](STATUSS.md).
6. Ja darbs ietekmē publiskos rezultātus, attiecīgi atjaunināt arī dokumentāciju.

## Kopsavilkums

Projekts ir dzīvs produkts: sistēma ir funkcionāla, bet vēl ir atvērti lieli un mazi uzdevumi. Darba kārtībā vienmēr jāpatur prātā: datu kvalitāte, likuma ievērošana, testēšana, skaidra statusa atjaunošana un stingra darba apraksta ievērošana.
