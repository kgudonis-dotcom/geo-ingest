# geo-ingest: viena vieta ģeodatiem (nogabali + kadastrs + ĪADT), bez paroles

## Soļi
1. **Supabase**: supabase.com → New project (bezmaksas). Settings → Database → Connection string (URI) = DATABASE_URL. Settings → API → Project URL un `anon` key (publiska).
2. **Shēma**: SQL Editor → ielīmē `schema.sql` → Run.
3. **GitHub**: jauns privāts repo, ielieciet šos failus. Settings → Secrets → Actions → `DATABASE_URL`.
4. **Pirmā palaišana**: Actions → geo-ingest → Run workflow. Vai lokāli: `DATABASE_URL=... python ingest.py --dry` (tikai izdrukā laukus, neraksta), tad bez `--dry`.
5. **Pārbaude**: 
   `curl "https://<projekts>.supabase.co/rest/v1/rpc/geo_by_kadastrs" -H "apikey: <anon>" -H "Content-Type: application/json" -d '{"k":"70420080041"}'`
6. **Rīks**: Iestatījumos ieraksta Supabase URL un anon key; poga "Ielādēt ģeometriju" sauc šo RPC.

## Pēc pirmās palaišanas
`--dry` izdrukā katra SHP lauku nosaukumus. Ja kadastrs/kvartāls/nogabals nav atpazīti, papildini `COLMAP` ingest.py. DAP datu kopas id (`protected`) jāprecizē pēc data.gov.lv.

Ceturkšņa cron pārraksta stands un protected pilnībā, parcels atjauno pēc kadastra numura.
