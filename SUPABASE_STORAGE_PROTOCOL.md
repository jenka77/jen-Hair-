# Protocole Supabase Storage — Images & Vidéos

Ce guide explique comment héberger les **photos et vidéos** de vos produits sur **Supabase Storage**, puis les afficher sur le site Jen's & Flora.

---

## 1. Principe

```text
Vous uploadez un fichier  →  Supabase Storage  →  URL publique
                                                      ↓
                                            table products
                                            image_url / video_url
                                                      ↓
                                            site (cartes produits)
```

Le site lit `image_url`, `image_url_2`, `image_url_3` et `video_url` depuis la table `products`.  
Chaque image peut être **vide (null)**. La flèche sur la carte parcourt les images disponibles, puis la vidéo en dernier.

---

## 2. Créer le bucket (une seule fois)

### Option A — Interface Supabase (simple)

1. Ouvrez [supabase.com](https://supabase.com) → votre projet **jens-flora**
2. Menu **Storage** → **New bucket**
3. Paramètres :

| Champ | Valeur |
|-------|--------|
| **Name** | `products-media` |
| **Public bucket** | ✅ Activé |
| **File size limit** | `52428800` (50 Mo) — optionnel |
| **Allowed MIME types** | `image/jpeg, image/png, image/webp, video/mp4, video/webm` |

4. Cliquez **Create bucket**

### Option B — SQL (recommandé, reproductible)

1. **SQL Editor** → New query
2. Copiez le fichier :

```text
supabase/storage_products_media.sql
```

3. **Run**

Ce script crée le bucket `products-media`, autorise la **lecture publique** et réserve l’upload aux comptes **authentifiés** (vous, via le Dashboard).

---

## 3. Organisation des dossiers

Structure conseillée dans le bucket :

```text
products-media/
├── bob/
│   ├── straight-bob.jpg
│   └── straight-bob.mp4
├── bone-straight/
│   ├── straight-n1.jpeg
│   └── straight-n1.mp4
├── body-waves/
├── extensions/
├── entretien/
└── apprentissage/
```

**Règle :** un dossier par **slug** de catégorie (identique à `category_slug` dans la table `products`).

---

## 4. Uploader un fichier

### Via le Dashboard Supabase

1. **Storage** → bucket **`products-media`**
2. Ouvrez ou créez le dossier du type (ex. `bob/`)
3. **Upload file** → choisissez votre `.jpg` ou `.mp4`
4. Attendez la fin de l’upload

### Formats acceptés par le site

| Type | Extensions | Affichage sur le site |
|------|------------|------------------------|
| Image | `.jpg`, `.jpeg`, `.png`, `.webp` | Photo sur la carte produit |
| Vidéo | `.mp4`, `.webm` | Lecture directe sur la carte (bouton photo/vidéo) |
| Autre lien vidéo | YouTube, Pinterest… | Ouvre un **nouvel onglet** (pas idéal) |

**Recommandation :** utilisez **MP4** pour les vidéos (meilleure compatibilité).

### Tailles conseillées

| Média | Taille max conseillée |
|-------|------------------------|
| Photo | 1–3 Mo (1920 px max de large) |
| Vidéo | 10–30 Mo (courte démo produit) |

Compressez les fichiers lourds avant upload (ex. [squoosh.app](https://squoosh.app) pour images).

---

## 5. Récupérer l’URL publique

### Méthode 1 — Clic droit dans Supabase

1. **Storage** → `products-media` → votre fichier
2. Cliquez sur les **⋮** (trois points) → **Copy URL** / **Get URL**

### Méthode 2 — Construire l’URL vous-même

Format :

```text
https://VOTRE-PROJET.supabase.co/storage/v1/object/public/products-media/CHEMIN/FICHIER
```

Pour votre projet :

```text
https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.jpg
```

```text
https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.mp4
```

**Important :**

- Pas d’**espace** au début ou à la fin de l’URL
- URL **complète** commençant par `https://`
- Pas de lien vers une **page** Pinterest/Instagram — uniquement le fichier direct

---

## 6. Mettre à jour la table `products`

1. **Table Editor** → table **`products`**
2. Trouvez la ligne du produit
3. Remplissez :

| Colonne | Exemple |
|---------|---------|
| `image_url` | URL image 1 (nullable) |
| `image_url_2` | URL image 2 (nullable) |
| `image_url_3` | URL image 3 (nullable) |
| `video_url` | URL vidéo MP4 (nullable, toujours en dernier dans le carrousel) |

4. **Save**

### Exemple SQL

```sql
update products
set
  image_url = 'https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.jpg',
  video_url = 'https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.mp4'
where name = 'STRAIGHT BOB'
  and category_slug = 'bob';
```

---

## 7. Vérifier sur le site

1. Lancez le site en local :

```bash
cd ~/Dokumente/jenF
python3 -m http.server 8000
```

2. Ouvrez :

```text
http://127.0.0.1:8000/type.html?type=bob
```

3. Contrôlez :
   - l’**image** s’affiche sur la carte ;
   - le bouton **photo/vidéo** lance la vidéo (si MP4 direct).

4. **Ctrl + Shift + R** pour forcer le rechargement si vous ne voyez pas le changement.

---

## 8. Deux modes de stockage (comparaison)

| Mode | Où sont les fichiers | Valeur dans `image_url` | En production |
|------|----------------------|---------------------------|---------------|
| **Local** | Dossier `media/` du projet | `media/bobs1.jpg` | Fonctionne si le fichier est déployé avec le site sur Vercel |
| **Supabase Storage** | Cloud Supabase | URL `https://...supabase.co/storage/...` | ✅ Recommandé |

**Pour la mise en ligne**, préférez **Supabase Storage** : les médias ne dépendent pas du déploiement Vercel et restent centralisés avec vos produits.

---

## 9. Workflow complet (exemple)

Produit : **Straight Bob** dans la catégorie **bob**

1. Préparez `straight-bob.jpg` et `straight-bob.mp4`
2. Upload dans `products-media/bob/`
3. Copiez les 2 URLs publiques
4. Mettez à jour la ligne dans `products` :

```text
category_slug : bob
name          : STRAIGHT BOB
image_url     : https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.jpg
video_url     : https://bapnudbxblqawqcuvycy.supabase.co/storage/v1/object/public/products-media/bob/straight-bob.mp4
```

5. Rechargez la page type Bob sur le site

---

## 10. Remplacer une image ou une vidéo

### Remplacer le fichier (même nom)

1. Supprimez l’ancien fichier dans Storage (ou uploadez avec **Replace**)
2. Uploadez le nouveau **avec le même nom**
3. L’URL reste identique → rien à changer en base

### Nouveau nom de fichier

1. Uploadez le nouveau fichier
2. Copiez la **nouvelle URL**
3. Mettez à jour `image_url` ou `video_url` dans `products`

---

## 11. Dépannage

### L’image ne s’affiche pas

- [ ] Le bucket est **public**
- [ ] L’URL est complète (`https://...`)
- [ ] Pas d’espace avant/après l’URL dans Supabase
- [ ] Le fichier existe bien dans Storage
- [ ] Testez l’URL directement dans le navigateur

### La vidéo ne se lit pas sur la carte

- [ ] L’URL se termine par `.mp4` ou `.webm`
- [ ] Ce n’est pas un lien vers une page web (Pinterest, etc.)
- [ ] Fichier pas trop lourd (< 50 Mo)

### Erreur 403 / accès refusé

- [ ] Bucket non public → activez **Public bucket**
- [ ] Relancez `supabase/storage_products_media.sql` pour les policies

### Anciens fichiers `media/` locaux

Si vous aviez `image_url = media/bobs1.jpg`, ça fonctionne **en local** tant que le dossier `media/` existe.  
En ligne sur Vercel, migrez vers Supabase Storage avec les URLs complètes.

---

## 12. Limites Supabase (plan gratuit)

| Limite | Valeur approximative |
|--------|----------------------|
| Stockage total | 1 Go |
| Taille max fichier | 50 Mo (configurable) |
| Bande passante | 2 Go / mois |

Pour une boutique avec ~50 produits et des photos optimisées, le plan gratuit suffit largement au départ.

---

## 13. Fichiers utiles du projet

| Fichier | Rôle |
|---------|------|
| `supabase/storage_products_media.sql` | Création bucket + policies |
| `SUPABASE_PROTOCOL.md` | Tables produits / commandes |
| `DATABASE_SCHEMA.md` | Structure types ↔ produits |
| `db.js` | Lecture produits côté site |
| `type.js` | Affichage photo/vidéo sur les cartes |

---

## 14. Checklist rapide

- [ ] Bucket `products-media` créé et **public**
- [ ] Script `storage_products_media.sql` exécuté
- [ ] Dossiers par type (`bob/`, `bone-straight/`, …)
- [ ] Fichiers uploadés (JPG + MP4)
- [ ] URLs copiées dans `products.image_url` et `products.video_url`
- [ ] Test sur `type.html?type=...`
- [ ] Site en production utilise les URLs Supabase (pas seulement `media/`)

---

## Résumé en une phrase

**Uploadez dans Storage → bucket `products-media` → copiez l’URL publique → collez-la dans `image_url` / `video_url` de la table `products`.**
