# geo-ingest: FF Forest meža sistēma
Lietotne: https://kgudonis-dotcom.github.io/geo-ingest/ · Kalkulators: https://kgudonis-dotcom.github.io/geo-ingest/web/
Dokumentācija: [DOKUMENTACIJA.md](DOKUMENTACIJA.md) · Kopsavilkums un principi: [STATUSS.md](STATUSS.md) · Darbu dēlis: [Issues](../../issues)

| Mape / fails | Kas |
|---|---|
| `app/` | lietotnes avots (index.html, sw.js, manifest.json) |
| `docs/` | publicētā kopija (GitHub Pages) + `docs/web/` kalkulators |
| `web/` | mājaslapas kalkulatora avots |
| `mirror/` | LVM/VMD spoguļa skripts datoram Latvijā |
| `build_pagasti.py`, `merge_pagasti.py` | VMD + DAP + īpašnieki → `pagasti/PPPP.json.gz` (data zars) |
| `build_infra.py` | OSM ceļi un grāvji → `infra/` |
| `sentinel.py` | Sentinel-2 vainaga zudums → `sentinel/` |
| `export_geo.py`, `ingest.py`, `schema.sql`, `discover.py`, `build_aplieci.py` | eksports, Supabase rezerve, izlūkošana |
| `.github/workflows/` | darbplūsmas (palaiž, izmainot trigera failus: PAGASTI_ARGS, INFRA_RUN, SENTINEL_RUN, EXPORT_REQ, DISCOVER, RUN_ARGS, REMERGE) |
| `logs/` | katra darba izdruka |
| zars `data` | gatavie dati, ko lasa lietotne |
