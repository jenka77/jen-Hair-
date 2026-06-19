-- ============================================================
-- Jen's & Flora — Supabase Storage
-- Bucket public pour images et vidéos des produits
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Créer le bucket (public = URLs lisibles sur le site)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products-media',
  'products-media',
  true,
  52428800, -- 50 Mo max par fichier
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Lecture publique (visiteurs du site)
drop policy if exists "Lecture publique products-media" on storage.objects;
create policy "Lecture publique products-media"
on storage.objects for select
using (bucket_id = 'products-media');

-- 3. Upload / modification / suppression réservés aux utilisateurs authentifiés
-- (vous uploadez via le Dashboard Supabase en étant connectée)
drop policy if exists "Upload products-media auth" on storage.objects;
create policy "Upload products-media auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products-media');

drop policy if exists "Update products-media auth" on storage.objects;
create policy "Update products-media auth"
on storage.objects for update
to authenticated
using (bucket_id = 'products-media');

drop policy if exists "Delete products-media auth" on storage.objects;
create policy "Delete products-media auth"
on storage.objects for delete
to authenticated
using (bucket_id = 'products-media');
