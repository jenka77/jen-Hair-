-- Comptes clientes : lier les commandes à auth.users (Supabase Auth)
-- Les mots de passe sont gérés par Supabase Auth (jamais en clair dans orders).

alter table orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table orders
  add column if not exists customer_email text;

create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_customer_email_idx on orders (customer_email);

-- Lecture des commandes : uniquement le propriétaire connecté
drop policy if exists "Clients lisent leurs commandes" on orders;
create policy "Clients lisent leurs commandes"
on orders for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Clients lisent leurs lignes commande" on order_items;
create policy "Clients lisent leurs lignes commande"
on order_items for select
to authenticated
using (
  exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

-- Activer l'inscription e-mail dans Supabase Dashboard :
-- Authentication → Providers → Email → Enable Email provider
-- (Optionnel en dev : désactiver "Confirm email" pour tester sans validation)
