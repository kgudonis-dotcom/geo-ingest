CREATE INDEX
ALTER TABLE
psql:schema.sql:78: NOTICE:  policy "public read expl" for relation "expl" does not exist, skipping
DROP POLICY
CREATE POLICY
ARGS=--only expl --first
== expl kadastra-informacijas-sistemas-atverti-dati
Traceback (most recent call last):
  File "/home/runner/work/geo-ingest/geo-ingest/ingest.py", line 175, in <module>
    main()
  File "/home/runner/work/geo-ingest/geo-ingest/ingest.py", line 161, in main
    res = resources(ds)
          ^^^^^^^^^^^^^
  File "/home/runner/work/geo-ingest/geo-ingest/ingest.py", line 21, in resources
    r = requests.get(CKAN + ds_id, timeout=60); r.raise_for_status()
                                                ^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.14/x64/lib/python3.12/site-packages/requests/models.py", line 1167, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 404 Client Error: NOT FOUND for url: https://data.gov.lv/dati/api/3/action/package_show?id=kadastra-informacijas-sistemas-atverti-dati
