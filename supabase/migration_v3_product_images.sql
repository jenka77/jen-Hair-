-- ============================================================
-- Jen's & Flora — 3 images par produit + retrait Water/Loose Wave
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Deux images supplémentaires (nullable)
alter table products add column if not exists image_url_2 text;
alter table products add column if not exists image_url_3 text;

comment on column products.image_url is 'Image 1 (nullable)';
comment on column products.image_url_2 is 'Image 2 (nullable)';
comment on column products.image_url_3 is 'Image 3 (nullable)';

-- 2. Retirer les types Water Wave et Loose Wave
-- (supprime aussi leurs produits liés via ON DELETE CASCADE)
delete from categories
where slug in ('water-wave', 'loose-wave');

-- 3. Réordonner les sort_order restants (optionnel)
with ordered as (
  select slug, row_number() over (order by sort_order, slug) as new_order
  from categories
)
update categories c
set sort_order = o.new_order
from ordered o
where c.slug = o.slug;

-- 4. Mettre à jour la vue products_with_type (seulement si migration_v2 déjà lancée)
-- DROP obligatoire : PostgreSQL refuse CREATE OR REPLACE si on insère des colonnes au milieu.
drop view if exists products_with_type;

create view products_with_type as
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
  p.image_url_2,
  p.image_url_3,
  p.video_url,
  p.is_active,
  p.sort_order,
  p.created_at
from products p
join categories c on c.id = p.category_id;
