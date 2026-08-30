-- Supabase SQL editor: izpildi vienreiz
create extension if not exists postgis;

create table if not exists parcels (
  kadastrs text primary key,            -- zemes vienības kadastra apzīmējums (11 cipari)
  platiba_ha numeric,
  geom geometry(MultiPolygon, 4326),
  updated_at timestamptz default now()
);
create index if not exists parcels_geom on parcels using gist(geom);

create table if not exists stands (
  id bigserial primary key,
  kadastrs text,                        -- ja avotā ir; citādi nosaka pēc telpiskās pārklāšanās
  kvartals text,
  nogabals text,
  platiba_ha numeric,
  attrs jsonb,                          -- visi pārējie SHP lauki kā ir
  geom geometry(MultiPolygon, 4326),
  updated_at timestamptz default now()
);
create index if not exists stands_geom on stands using gist(geom);
create index if not exists stands_kad on stands(kadastrs);

create table if not exists protected (
  id bigserial primary key,
  kind text,                            -- 'iadt' | 'zona' | 'mikroliegums'
  name text,
  zone text,
  attrs jsonb,
  geom geometry(MultiPolygon, 4326)
);
create index if not exists protected_geom on protected using gist(geom);

-- Viens vaicājums rīkam: kontūra + nogabali + ĪADT
create or replace function geo_by_kadastrs(k text)
returns jsonb language sql stable as $$
  with p as (select * from parcels where kadastrs = k)
  select jsonb_build_object(
    'kadastrs', k,
    'parcel', (select st_asgeojson(geom)::jsonb from p),
    'platiba_ha', (select platiba_ha from p),
    'stands', coalesce((select jsonb_agg(jsonb_build_object(
        'kvartals', s.kvartals, 'nogabals', s.nogabals, 'platiba_ha', s.platiba_ha,
        'attrs', s.attrs, 'geom', st_asgeojson(s.geom)::jsonb))
      from stands s, p where st_intersects(s.geom, p.geom)
        and st_area(st_intersection(s.geom, p.geom)::geography) > 0.5 * st_area(s.geom::geography)), '[]'::jsonb),
    'protected', coalesce((select jsonb_agg(jsonb_build_object('kind', t.kind, 'name', t.name, 'zone', t.zone,
        'overlap_ha', round((st_area(st_intersection(t.geom, p.geom)::geography)/10000)::numeric, 2)))
      from protected t, p where st_intersects(t.geom, p.geom)), '[]'::jsonb),
    -- kaimiņu pāri ar kopējās robežas garumu metros (tikai nogabali šajā zemes vienībā)
    'adjacency', coalesce((select jsonb_agg(jsonb_build_object('a', a.nogabals, 'b', b.nogabals,
        'len_m', round(st_length(st_intersection(st_boundary(a.geom), st_boundary(b.geom))::geography)::numeric)))
      from stands a, stands b, p
      where a.id < b.id and st_intersects(a.geom, p.geom) and st_intersects(b.geom, p.geom)
        and st_touches(a.geom, b.geom)
        and st_length(st_intersection(st_boundary(a.geom), st_boundary(b.geom))::geography) > 5), '[]'::jsonb)
  );
$$;

-- publiska lasīšana bez paroles (anon atslēga ir publiska pēc definīcijas)
alter table parcels enable row level security;
alter table stands enable row level security;
alter table protected enable row level security;
create policy "public read parcels" on parcels for select using (true);
create policy "public read stands" on stands for select using (true);
create policy "public read protected" on protected for select using (true);
grant execute on function geo_by_kadastrs(text) to anon;
