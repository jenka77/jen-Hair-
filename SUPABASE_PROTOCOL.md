# Protocole Supabase — Jen's & Flora

Ce protocole explique comment remplacer progressivement les fichiers JSON par une base de données Supabase, sans rendre le projet lourd.

Le site reste compatible avec Vercel :

- les pages restent statiques ;
- les produits sont lus depuis Supabase ;
- les commandes sont enregistrées dans Supabase ;
- le stock est décrémenté automatiquement après commande ;
- si le backend ou Supabase est indisponible, la page catalogue affiche une erreur.

## 1. Créer le projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com).
2. Créez un compte.
3. Cliquez sur **New project**.
4. Choisissez un nom, par exemple `jens-flora`.
5. Choisissez une région proche de vos clientes, par exemple Europe.
6. Gardez le mot de passe de la base dans un endroit sûr.

## 2. Créer les tables

Dans Supabase :

1. Ouvrez votre projet.
2. Allez dans **SQL Editor**.
3. Créez une nouvelle requête.
4. Copiez-collez le SQL ci-dessous, puis cliquez sur **Run**.

```sql
create extension if not exists "pgcrypto";

create table if not exists categories (
  slug text primary key,
  name text not null,
  description text,
  is_learning boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references categories(slug) on delete cascade,
  name text not null,
  description text,
  wig_type text,
  wig_size text,
  color text,
  lace_size text,
  price numeric(10,2) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  image_url_2 text,
  image_url_3 text,
  video_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_contact text not null,
  pickup_mode text not null,
  delivery_address text,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'accepted',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create or replace function decrement_products_stock(items jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
  p_id uuid;
  qty integer;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    p_id := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::integer;

    update products
    set stock = greatest(stock - qty, 0)
    where id = p_id;
  end loop;
end;
$$;
```

## 3. Ajouter les catégories de perruques

Dans **SQL Editor**, lancez cette requête :

```sql
insert into categories (slug, name, description, is_learning, sort_order) values
('bone-straight', 'Bone Straight', 'Lisse absolu, brillance miroir et tombé impeccable.', false, 1),
('body-waves', 'Body Waves', 'Ondulations souples et volumineuses, naturellement chic.', false, 2),
('deep-waves', 'Deep Waves', 'Vagues profondes et marquées pour un effet sophistiqué.', false, 3),
('pixies-curls', 'Pixies Curls', 'Petites boucles serrées, pleines de caractère et de volume.', false, 4),
('bob', 'Bob', 'Carré intemporel et structuré, élégance affirmée.', false, 5),
('pixie-cut', 'Pixie Cut', 'Coupe courte audacieuse, féminine et moderne.', false, 6),
('layered-hair', 'Layered Hair', 'Coupe dégradée pour du mouvement et de la légèreté.', false, 7),
('extensions', 'Extensions (Mèches)', 'Mèches et bundles 100% naturels pour tissages et coiffures protectrices.', false, 8),
('entretien', 'Entretien des Cheveux', 'Soins et produits d''entretien pour préserver l''éclat de vos perruques et extensions.', false, 9),
('apprentissage', 'Apprentissage', 'Conseils, tutoriels et accompagnement pour poser, entretenir et sublimer votre perruque.', true, 10)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    is_learning = excluded.is_learning,
    sort_order = excluded.sort_order;
```

## 4. Autoriser la lecture publique et l'enregistrement des commandes

Dans **SQL Editor**, lancez :

```sql
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "Lecture publique categories" on categories;
create policy "Lecture publique categories"
on categories for select
using (true);

drop policy if exists "Lecture publique produits actifs" on products;
create policy "Lecture publique produits actifs"
on products for select
using (is_active = true);

drop policy if exists "Creation commandes publiques" on orders;
create policy "Creation commandes publiques"
on orders for insert
with check (true);

drop policy if exists "Creation lignes commandes publiques" on order_items;
create policy "Creation lignes commandes publiques"
on order_items for insert
with check (true);

grant execute on function decrement_products_stock(jsonb) to anon;
```

Important : les visiteurs peuvent lire les produits et créer une commande, mais ils ne peuvent pas modifier les produits directement. Vous modifiez les produits depuis votre tableau de bord Supabase.

## 5. Récupérer les clés Supabase

Dans Supabase :

1. Allez dans **Project Settings**.
2. Ouvrez **API**.
3. Copiez :
   - **Project URL** ;
   - **anon public key**.

Ensuite ouvrez `db.js` et remplacez :

```js
const SUPABASE_CONFIG = {
  URL: "VOTRE_SUPABASE_URL",
  ANON_KEY: "VOTRE_SUPABASE_ANON_KEY",
};
```

par vos vraies valeurs :

```js
const SUPABASE_CONFIG = {
  URL: "https://xxxxxxxx.supabase.co",
  ANON_KEY: "votre_anon_key",
};
```

Ces deux valeurs peuvent être visibles côté navigateur : c'est normal. La sécurité vient des règles RLS créées plus haut.

## 6. Ajouter un produit dans Supabase

Méthode simple :

1. Dans Supabase, allez dans **Table Editor**.
2. Ouvrez la table `products`.
3. Cliquez sur **Insert row**.
4. Remplissez les champs.

Correspondance avec vos anciens JSON :

| JSON | Supabase |
|---|---|
| `nom` | `name` |
| `description` | `description` |
| `type` | `wig_type` |
| `taille` | `wig_size` |
| `couleur` | `color` |
| `tailleLace` | `lace_size` |
| `prix` | `price` |
| `stock` | `stock` |
| `image` | `image_url` |
| `image2` | `image_url_2` (nullable) |
| `image3` | `image_url_3` (nullable) |
| `video` | `video_url` |

Exemple :

```text
category_slug : bob
name          : Bob Lisse
description   : Carré lisse et soyeux, signature chic.
wig_type      : Bob
wig_size      : 12 pouces
color         : Noir de jais (1)
lace_size     : 4x4 Closure Lace
price         : 189.00
stock         : 6
image_url     : 2.jpg
image_url_2   : (vide ou URL image 2)
image_url_3   : (vide ou URL image 3)
video_url     : media/bob-lisse.mp4
is_active     : true
sort_order    : 1
```

## 7. Images et vidéos

Vous avez deux options :

### Option simple
Gardez vos fichiers dans le projet :

```text
media/bob-lisse.jpg
media/bob-lisse.mp4
```

Puis dans Supabase :

```text
image_url = media/bob-lisse.jpg
video_url = media/bob-lisse.mp4
```

### Option plus professionnelle
Utilisez **Supabase Storage** ou Cloudinary pour stocker les images/vidéos, puis mettez l'URL complète :

```text
image_url = https://...
video_url = https://...
```

Guide détaillé pas à pas : **[SUPABASE_STORAGE_PROTOCOL.md](SUPABASE_STORAGE_PROTOCOL.md)**  
Script SQL du bucket : **`supabase/storage_products_media.sql`**

## 8. Tester

En local :

```bash
cd /home/jenka/Dokumente/jenF
python3 -m http.server 8000
```

Puis ouvrez :

```text
http://localhost:8000/maison.html
```

Cliquez sur un type, par exemple `Bob`.

Si Supabase est configuré, les produits viennent de la base.
Si le backend et Supabase sont indisponibles, les produits ne s'affichent pas.

## 9. Déploiement sur Vercel

1. Poussez le projet sur GitHub.
2. Importez le projet dans Vercel.
3. Ajoutez les variables d'environnement Supabase dans Vercel.
4. Déployez.

Dans Vercel :

```text
Project Settings → Environment Variables
```

Ajoutez :

```text
SUPABASE_URL = https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY = votre clé service_role / secret key Supabase
```

Important :

- `SUPABASE_URL` peut être publique.
- `SUPABASE_SERVICE_ROLE_KEY` est secrète.
- Ne mettez jamais `SUPABASE_SERVICE_ROLE_KEY` dans `db.js`.
- Cette clé sert au **backend Express** (`backend/`) pour enregistrer les commandes et décrémenter le stock.

Aucun serveur Python n'est nécessaire.

Le site utilise :

- Supabase pour les produits, commandes et stock ;
- Resend côté backend pour l'envoi des mails ;
- le backend pour gérer les routes `/api/paypal/create-order` et `/api/paypal/capture-order`.

## 10. Ce qu'il faut savoir

- Supabase est beaucoup plus léger à gérer qu'un serveur Python + base complète.
- Vous n'avez pas besoin d'écrire du backend pour commencer.
- Les stocks seront bien décrémentés pour tous les utilisateurs si la commande est enregistrée dans Supabase.
- Les produits sont gérés exclusivement via Supabase (plus de fichiers JSON locaux).

Pour une sécurité encore plus forte plus tard, on pourra ajouter :

- une vraie page admin avec authentification Supabase ;
- un CAPTCHA anti-spam ;
- des fonctions serverless Vercel pour contrôler les commandes côté serveur.
