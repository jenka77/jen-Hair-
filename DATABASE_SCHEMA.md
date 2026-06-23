# Schéma base de données — Jen's & Floran

## Votre idée vs la bonne pratique

### Ce que vous aviez en tête

> Une table pour chaque type (Bob, Bone Straight…), et dans `products` chaque produit aurait son identifiant + l'identifiant du type.

### Ce qu'il ne faut **pas** faire

Créer **12 tables séparées** (`bob_products`, `bone_straight_products`, etc.) :

| Problème | Conséquence |
|----------|-------------|
| Duplication | Mêmes colonnes répétées 12 fois |
| Commandes | Impossible de lier facilement `order_items` à un produit |
| Requêtes | « Tous les produits en stock » = 12 requêtes ou UNION complexe |
| Site | Le backend et le frontend devraient gérer 12 structures différentes |
| Évolution | Ajouter un type = créer une nouvelle table + modifier le code |

### Ce que vous avez **déjà** (et qui est correct)

```text
┌─────────────────────┐         ┌──────────────────────────────┐
│  categories         │         │  products                    │
│  ( = vos TYPES )    │         │                              │
├─────────────────────┤         ├──────────────────────────────┤
│ slug (PK)           │◄────────│ category_slug (clé étrangère)│
│ name                │    1:N  │ id (PK, UUID)                │
│ description         │         │ name, price, stock, …        │
│ is_learning         │         │                              │
└─────────────────────┘         └──────────────────────────────┘
```

- **`categories`** = une ligne par type (Bob, Bone Straight, Extensions…)
- **`products`** = une ligne par article, liée à son type via `category_slug`

C'est exactement le modèle relationnel standard : **1 table des types + 1 table des produits**.

---

## Schéma complet actuel

```text
categories ──< products ──< order_items >── orders
```

| Table | Rôle |
|-------|------|
| `categories` | Types de perruques / extensions / entretien / apprentissage |
| `products` | Articles vendables (prix, stock, image, vidéo…) |
| `orders` | Commandes clientes |
| `order_items` | Lignes d'une commande (référence `product_id`) |

---

## Amélioration proposée (migration v2)

Pour avoir un **identifiant UUID explicite** par type (en plus du `slug` lisible), exécutez :

```text
supabase/migration_v2_types_produits.sql
```

Dans Supabase → **SQL Editor** → coller le fichier → **Run**.

### Après migration

```text
categories
  id          uuid   ← NOUVEAU identifiant unique du type
  slug        text   ← identifiant lisible (bob, bone-straight…)
  name        text

products
  id          uuid   ← identifiant unique du produit
  category_id uuid   ← NOUVEAU → categories.id
  category_slug text ← conservé pour compatibilité site
  name, price, stock…
```

Un **trigger** synchronise automatiquement `category_slug` et `category_id` : vous pouvez remplir l'un ou l'autre dans Supabase.

### Vues utiles dans Supabase

| Vue | Usage |
|-----|--------|
| `product_types` | Alias de `categories` (plus clair pour vous) |
| `products_with_type` | Produits + nom du type en une seule liste |

---

## Comment ajouter un produit (après migration)

Dans **Table Editor → products → Insert row** :

**Option A — via le slug (comme avant)**

```text
category_slug : bob
name          : Straight Bob
price         : 80
stock         : 2
…
```

Le trigger remplit `category_id` automatiquement.

**Option B — via l'UUID du type**

1. Ouvrez `product_types` ou `categories`
2. Copiez l'`id` du type « Bob »
3. Dans `products`, mettez cet `id` dans `category_id`

Le trigger remplit `category_slug` automatiquement.

---

## Correspondance site ↔ base

| Page site | Paramètre URL | Colonne filtre |
|-----------|---------------|----------------|
| `type.html?type=bob` | `bob` | `category_slug = 'bob'` |
| API backend | `?category=bob` | idem |

Le frontend **continue d'utiliser le slug** (`bob`, `bone-straight`…) — pas besoin de changer les pages.

---

## Exemple de requêtes SQL

**Tous les produits du type Bob :**

```sql
select p.*
from products p
join categories c on c.id = p.category_id
where c.slug = 'bob'
  and p.is_active = true
order by p.sort_order;
```

**Compter les produits par type :**

```sql
select c.slug, c.name, count(p.id) as nb_produits
from categories c
left join products p on p.category_id = c.id and p.is_active = true
group by c.slug, c.name
order by c.sort_order;
```

**Produits en rupture de stock :**

```sql
select * from products_with_type where stock = 0;
```

---

## Étapes pour appliquer la réorganisation

1. Ouvrez [Supabase](https://supabase.com) → votre projet
2. **SQL Editor** → New query
3. Copiez le contenu de `supabase/migration_v2_types_produits.sql`
4. Cliquez **Run**
5. Vérifiez : la dernière requête du script doit retourner **0 ligne**
6. Explorez les vues `product_types` et `products_with_type`

Aucun changement obligatoire sur le site : tout continue de fonctionner.

---

## Quand créer une table séparée ?

Uniquement si un type a des **champs totalement différents** des autres.

Exemple théorique :

- Perruques : `wig_size`, `lace_size`
- Entretien : `volume_ml`, `ingredients`

Même là, on préfère souvent **une table `products` + colonnes optionnelles** ou **JSON `extra_fields`**, plutôt que 12 tables.

Pour Jen's & Floran, **une seule table `products` suffit**.

---

## Fichiers liés

- `SUPABASE_PROTOCOL.md` — création initiale des tables
- `SUPABASE_STORAGE_PROTOCOL.md` — images et vidéos sur Supabase Storage
- `supabase/migration_v2_types_produits.sql` — migration UUID types ↔ produits
- `supabase/migration_v3_product_images.sql` — 3 images par produit + retrait Water/Loose Wave
- `supabase/storage_products_media.sql` — script création bucket médias
- `backend/src/routes/products.js` — API produits
