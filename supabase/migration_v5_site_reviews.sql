-- Avis utilisateurs sur le fonctionnement du site (type catalogue n°11)

insert into categories (slug, name, description, is_learning, sort_order) values
(
  'commentaires',
  'Vos avis',
  'Partagez votre expérience et notez le site pour nous aider à l''améliorer.',
  false,
  11
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

create table if not exists site_reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_email text,
  user_id uuid references auth.users(id) on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null check (char_length(trim(comment)) >= 10),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_reviews_created_at_idx on site_reviews (created_at desc);
create index if not exists site_reviews_user_id_idx on site_reviews (user_id);

alter table site_reviews enable row level security;

drop policy if exists "Lecture publique avis publiés" on site_reviews;
create policy "Lecture publique avis publiés"
on site_reviews for select
using (is_published = true);
