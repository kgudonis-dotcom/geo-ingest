# Meža vērtības kalkulators (mājaslapai)

Trīs faili: `kalkulators.js` (dzinējs + attēlojums, bez atkarībām), `kalkulators.css`, `index.html` (paraugs ar tavu dizainu).

## Integrācija
```html
<link rel="stylesheet" href="/kalkulators.css">
<div id="mk"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js"></script> <!-- gzip rezerve vecākiem pārlūkiem -->
<script src="/kalkulators.js"></script>
<script>MezaKalkulators.mount(document.getElementById("mk"),{contactUrl:"https://formspree.io/f/XXXX",showValue:false});</script>
```
Opcijas: `dataBase` (pagastu failu adrese), `contactUrl` (kur POST kontaktformu; Formspree, Netlify Forms vai savs API), `showValue` (rādīt vērtības diapazonu vai pogu "Uzzināt summu"), `kadastrs` (aizpilda un rēķina uzreiz), `prices`, `costM3`, `marza` (pārraksta noklusējumus).
Notikums `mk:result` uz konteinera ar `detail.result` (visi aprēķinātie skaitļi), ja gribi sūtīt uz CRM vai analītiku.

## Kas notiek zem motora pārsega
Kadastra pirmie 4 cipari = pagasts → ielādē `pagasti/PPPP.json.gz` no GitHub (tas pats fails, ko lieto iekšējā lietotne) → zemes vienības nogabali ar taksāciju un ģeometriju → krāja no G×H×f pa elementiem → cirtes veids pēc MK935 (cirtmets, galvenās cirtes caurmērs, Gkrit+2 kopšanai), eko koki → sortimenti pēc caurmēra un cenas → max cena (mīnus izmaksas 27,5 €/m³ un marža 5 %). Vērtību rāda kā diapazonu −15 % / +10 % vai slēpj aiz kontaktformas.

## Datu pieejamība
Strādā tiem pagastiem, kuru faili ir uzbūvēti (datu zars `data`); pārējiem rāda "sazinies" ziņu. Nekas netiek sūtīts uz serveri, kamēr lietotājs neaizpilda formu.
