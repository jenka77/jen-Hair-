-- Réponses admin aux avis (phase 1)

alter table site_reviews
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists reply_visible boolean not null default true;

comment on column site_reviews.admin_reply is 'Réponse de Sa''a Mokolo / Jen''s & Flora';
comment on column site_reviews.reply_visible is 'Afficher la réponse sur le site public';
