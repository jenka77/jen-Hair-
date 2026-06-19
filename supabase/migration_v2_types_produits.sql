-- ============================================================
-- Jen's & Flora — Migration v2
-- Renforce le lien entre TYPES (catégories) et PRODUITS
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================
--
-- Ce script NE crée PAS une table par type (bob, bone-straight…).
-- Il garde UNE table products + UNE table categories (types),
-- et ajoute un identifiant UUID explicite pour chaque type.
--
-- Avant : products.category_slug → categories.slug
-- Après : products.category_id  → categories.id  (+ category_slug conservé)

-- 1. Identifiant UUID pour chaque type (catégorie)
alter table categories add column if not exists id uuid default gen_random_uuid();

update categories
set id = gen_random_uuid()
where id is null;

alter table categories alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_id_unique'
  ) then
    alter table categories add constraint categories_id_unique unique (id);
  end if;
end $$;

-- 2. Clé étrangère category_id sur products
alter table products add column if not exists category_id uuid;

update products p
set category_id = c.id
from categories c
where p.category_slug = c.slug
  and p.category_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_id_fkey'
  ) then
    alter table products
      add constraint products_category_id_fkey
      foreign key (category_id) references categories(id)
      on delete restrict;
  end if;
end $$;

-- 3. Index pour les recherches par type
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_category_slug on products(category_slug);
create index if not exists idx_products_is_active on products(is_active);

-- 4. Synchronisation automatique category_slug ↔ category_id
create or replace function sync_product_category_link()
returns trigger
language plpgsql
as $$
declare
  resolved_slug text;
  resolved_id uuid;
begin
  if new.category_id is not null and (new.category_slug is null or new.category_slug = '') then
    select slug into resolved_slug from categories where id = new.category_id;
    if resolved_slug is null then
      raise exception 'Type introuvable pour category_id=%', new.category_id;
    end if;
    new.category_slug := resolved_slug;
  elsif new.category_slug is not null and new.category_slug <> '' and new.category_id is null then
    select id into resolved_id from categories where slug = new.category_slug;
    if resolved_id is null then
      raise exception 'Type introuvable pour category_slug=%', new.category_slug;
    end if;
    new.category_id := resolved_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_product_category_link on products;
create trigger trg_sync_product_category_link
before insert or update on products
for each row
execute function sync_product_category_link();

-- 5. Vue « product_types » (alias lisible pour vous dans Supabase)
create or replace view product_types as
select
  id,
  slug,
  name,
  description,
  is_learning,
  sort_order,
  created_at
from categories;

-- 6. Vue pratique : produits avec infos du type
create or replace view products_with_type as
select
  p.id as product_id,
  p.category_id,
  p.category_slug,
  c.name as type_name,
  c.description as type_description,
  p.name,
  p.description,
  p.wig_type,
  p.wig_size,
  p.color,
  p.lace_size,
  p.price,
  p.stock,
  p.image_url,
  p.video_url,
  p.is_active,
  p.sort_order,
  p.created_at
from products p
join categories c on c.id = p.category_id;

-- 7. Vérification (doit retourner 0 ligne si tout est OK)
select id, name, category_slug, category_id
from products
where category_id is null;
