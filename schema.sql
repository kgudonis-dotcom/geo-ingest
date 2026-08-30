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

-- Viens vaicājums rīkam: kontūra (nogabalu apvienojums) + nogabali + ĪADT + kaimiņi
create or replace function geo_by_kadastrs(k text)
returns jsonb language sql stable as $$
  with s as (select * from stands where kadastrs = k),
       p as (select st_union(geom) g, sum(platiba_ha) ha from s)
  select jsonb_build_object(
    'kadastrs', k,
    'parcel', (select st_asgeojson(g)::jsonb from p),
    'platiba_ha', (select round(ha::numeric,2) from p),
    'stands', coalesce((select jsonb_agg(jsonb_build_object(
        'kvartals', kvartals, 'nogabals', nogabals, 'platiba_ha', platiba_ha,
        'attrs', attrs, 'geom', st_asgeojson(geom)::jsonb) order by kvartals, nogabals) from s), '[]'::jsonb),
    'protected', coalesce((select jsonb_agg(jsonb_build_object('kind', t.kind, 'name', t.name, 'zone', t.zone,
        'overlap_ha', round((st_area(st_intersection(t.geom, p.g)::geography)/10000)::numeric, 2)))
      from protected t, p where st_intersects(t.geom, p.g)), '[]'::jsonb),
    'adjacency', coalesce((select jsonb_agg(jsonb_build_object('a', a.kvartals||'-'||a.nogabals, 'b', b.kvartals||'-'||b.nogabals,
        'len_m', round(st_length(st_intersection(st_boundary(a.geom), st_boundary(b.geom))::geography)::numeric)))
      from s a, s b where a.id < b.id and st_intersects(a.geom, b.geom)
        and st_length(st_intersection(st_boundary(a.geom), st_boundary(b.geom))::geography) > 5), '[]'::jsonb)
  );
$$;

-- publiska lasīšana bez paroles (anon atslēga ir publiska pēc definīcijas)
alter table parcels enable row level security;
alter table stands enable row level security;
alter table protected enable row level security;
drop policy if exists "public read parcels" on parcels;
create policy "public read parcels" on parcels for select using (true);
drop policy if exists "public read stands" on stands;
create policy "public read stands" on stands for select using (true);
drop policy if exists "public read protected" on protected;
create policy "public read protected" on protected for select using (true);
grant execute on function geo_by_kadastrs(text) to anon;

create table if not exists classifiers(code_set text, code text, value text);
alter table classifiers enable row level security;
drop policy if exists "public read classifiers" on classifiers;
create policy "public read classifiers" on classifiers for select using (true);
