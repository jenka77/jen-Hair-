# Roadmap Backend — Jen's & Flora

Ce document décrit les étapes pour transformer le site actuel en un vrai site de réservation/e-commerce fiable, avec backend, base de données, commandes enregistrées, stock sécurisé, paiement et espace admin.

## Objectif

Le site doit permettre :

- d'afficher les produits depuis une base de données ;
- de recevoir des commandes fiables ;
- d'enregistrer chaque commande dans la base ;
- de décrémenter le stock de manière sécurisée ;
- d'envoyer un email de confirmation à la cliente ;
- d'envoyer une notification à l'admin ;
- de gérer les produits et commandes depuis un espace admin protégé ;
- de relier plus tard PayPal à une vraie commande.

## Architecture Recommandée

```text
Frontend actuel
  |
  | appels API
  v
Backend Node.js / Express
  |
  | clé secrète
  v
Supabase PostgreSQL
  |
  | stockage fichiers
  v
Supabase Storage / Cloudinary

Emails : Resend / Brevo / EmailJS serveur
Paiement : PayPal Checkout
Hébergement backend : Render / Railway / Fly.io / VPS
```

## Pourquoi un vrai backend ?

Le frontend seul ne suffit pas pour un commerce réel, car il ne peut pas protéger :

- le stock ;
- les commandes ;
- les prix ;
- la clé secrète Supabase ;
- les paiements ;
- les modifications de produits.

Un backend sert d'intermédiaire fiable entre la cliente et la base de données.

## Étape 1 — Choisir l'hébergement backend

Options recommandées :

### Option simple

```text
Render
```

Avantages :

- facile à configurer ;
- supporte Node.js ;
- compatible avec Supabase ;
- bon pour débuter.

### Option alternative

```text
Railway
```

Avantages :

- très rapide à déployer ;
- bon pour backend + variables secrètes.

### Option avancée

```text
VPS
```

Avantages :

- contrôle total ;
- plus technique.

Pour commencer, je recommande **Render** ou **Railway**.

## Étape 2 — Créer un dossier backend

Dans le projet :

```text
jenF/
  frontend actuel
  backend/
```

Structure proposée :

```text
backend/
  package.json
  server.js
  .env
  src/
    supabase.js
    routes/
      products.js
      orders.js
      admin.js
    services/
      email.js
      paypal.js
      stock.js
    middleware/
      auth.js
```

## Étape 3 — Installer les dépendances backend

Dans `backend/` :

```bash
npm init -y
npm install express cors dotenv @supabase/supabase-js zod
```

Pour les emails :

```bash
npm install resend
```

ou si vous utilisez Brevo :

```bash
npm install sib-api-v3-sdk
```

## Étape 4 — Créer les variables d'environnement

Créer :

```text
backend/.env
```

Contenu :

```env
PORT=4000
FRONTEND_URL=http://localhost:8000

SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_cle_secrete_supabase

ADMIN_PASSWORD=mot_de_passe_admin_solide

EMAIL_FROM=Jen's & Flora <contact@votre-domaine.com>
EMAIL_ADMIN=jenka7733@gmail.com
RESEND_API_KEY=votre_cle_resend

PAYPAL_CLIENT_ID=votre_client_id_paypal
PAYPAL_CLIENT_SECRET=votre_secret_paypal
```

Important :

- `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être dans le frontend.
- `.env` ne doit jamais être publié sur GitHub.

## Étape 5 — Connecter Supabase côté serveur

Créer :

```text
backend/src/supabase.js
```

Exemple :

```js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

Le backend utilise la clé secrète pour gérer les commandes et le stock.

## Étape 6 — Créer les routes produits

Objectif :

```text
GET /api/categories
GET /api/products?category=bob
GET /api/products/:id
```

Ces routes :

- lisent les catégories ;
- lisent les produits actifs ;
- renvoient les données au frontend.

Le frontend ne lira plus directement Supabase.

## Étape 7 — Créer la route commande

Route principale :

```text
POST /api/orders
```

Elle reçoit :

```json
{
  "customer": {
    "name": "Nom complet",
    "phone": "+49152...",
    "email": "cliente@email.com",
    "pickupMode": "delivery",
    "address": "Adresse"
  },
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

Le backend doit :

1. vérifier que les champs client sont valides ;
2. récupérer les produits depuis Supabase ;
3. vérifier que chaque produit existe ;
4. vérifier que chaque produit est actif ;
5. vérifier que le stock est suffisant ;
6. recalculer le prix côté serveur ;
7. ajouter les frais de livraison si besoin ;
8. créer la commande ;
9. créer les lignes de commande ;
10. décrémenter le stock ;
11. envoyer les emails ;
12. renvoyer un numéro de commande.

## Étape 8 — Sécuriser la décrémentation du stock

La décrémentation doit être faite côté serveur ou dans une fonction SQL Supabase.

Principe :

```text
Si stock >= quantité demandée :
  créer commande
  décrémenter stock
Sinon :
  refuser la commande
```

Il faut éviter :

```text
stock = stock - quantité
```

sans vérifier le stock disponible.

## Étape 9 — Ajouter le statut de commande

Dans `orders`, utiliser par exemple :

```text
pending
accepted
paid
preparing
ready
delivered
cancelled
```

Flux recommandé au départ :

```text
accepted → preparing → delivered
```

Avec paiement PayPal plus tard :

```text
pending_payment → paid → preparing → delivered
```

## Étape 10 — Envoyer les emails côté backend

Ne pas dépendre uniquement d'EmailJS frontend.

Le backend doit envoyer :

### Email cliente

Contenu :

- numéro de commande ;
- nom ;
- téléphone ;
- email ;
- articles ;
- taille ;
- couleur ;
- lace ;
- quantité ;
- sous-total ;
- frais de livraison ;
- total ;
- mode de récupération ;
- adresse si livraison.

### Email admin

Contenu :

- même détail ;
- lien vers la commande dans l'admin ;
- indication de stock décrémenté.

## Étape 11 — Ajouter PayPal proprement

Au lieu d'un simple lien PayPal, le backend doit créer une transaction :

```text
POST /api/paypal/create-order
POST /api/paypal/capture-order
```

Flux :

1. la cliente valide son panier ;
2. backend crée une commande `pending_payment` ;
3. backend crée une commande PayPal avec le montant exact ;
4. la cliente paie ;
5. PayPal confirme ;
6. backend marque la commande `paid` ;
7. backend décrémente ou confirme le stock ;
8. email envoyé.

## Étape 12 — Créer un espace admin

Routes admin :

```text
POST /api/admin/login
GET /api/admin/orders
PATCH /api/admin/orders/:id
POST /api/admin/products
PATCH /api/admin/products/:id
DELETE /api/admin/products/:id
```

Fonctions admin :

- voir les commandes ;
- changer le statut ;
- ajouter un produit ;
- modifier un produit ;
- supprimer/désactiver un produit ;
- ajuster le stock ;
- uploader images/vidéos.

## Étape 13 — Protéger l'admin

Au minimum :

- mot de passe admin ;
- session ou token JWT ;
- routes admin protégées.

Plus tard :

- Supabase Auth ;
- rôles utilisateur ;
- journal des modifications.

## Étape 14 — Gérer les images et vidéos

Options :

### Supabase Storage

Bon choix si vous utilisez déjà Supabase.

Avantages :

- intégré ;
- URLs publiques ;
- gestion par bucket.

### Cloudinary

Très bon pour images/vidéos optimisées.

Avantages :

- compression automatique ;
- formats modernes ;
- rapide.

## Étape 15 — Adapter le frontend

Le frontend devra appeler :

```text
GET /api/products?category=bob
POST /api/orders
```

Au lieu de lire directement Supabase.

Le panier reste côté frontend, mais la validation finale se fait côté backend.

## Étape 16 — Déploiement

### Backend sur Render/Railway

Déployer le dossier `backend/`.

Ajouter les variables :

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
EMAIL_ADMIN
RESEND_API_KEY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
```

### Frontend sur Vercel

Mettre l'URL du backend :

```js
const API_BASE_URL = "https://votre-backend.onrender.com";
```

## Étape 17 — Tests indispensables

Tester :

- commande avec retrait ;
- commande avec livraison ;
- frais de livraison ;
- stock suffisant ;
- stock insuffisant ;
- plusieurs articles ;
- même article plusieurs fois ;
- email cliente ;
- email admin ;
- commande enregistrée en base ;
- stock décrémenté ;
- panier vidé après succès ;
- panier conservé après erreur.

## Étape 18 — Pages légales

Avant mise en ligne commerciale, prévoir :

- Mentions légales / Impressum ;
- Politique de confidentialité ;
- Conditions générales de vente ;
- Politique de retour ;
- Politique de livraison ;
- Cookies si vous ajoutez analytics/tracking.

## Priorité de réalisation

### Phase 1 — Backend minimal fiable

- `POST /api/orders`
- validation panier ;
- insertion commande ;
- insertion lignes commande ;
- décrémentation stock ;
- emails.

### Phase 2 — Admin

- login admin ;
- liste commandes ;
- modification statut ;
- gestion produits.

### Phase 3 — Paiement PayPal

- création ordre PayPal ;
- capture paiement ;
- statut `paid`.

### Phase 4 — Optimisation

- médias ;
- analytics ;
- SEO ;
- traductions produits ;
- automatisations.

## Conclusion

Le plus urgent est :

```text
Créer un vrai backend pour POST /api/orders
```

Tant que cette route n'est pas fiable, le site peut recevoir des commandes par email, mais il ne sera pas encore solide comme site commercial.

Une fois cette route faite, le site devient beaucoup plus fiable :

- commandes sauvegardées ;
- stocks sécurisés ;
- emails cohérents ;
- base de données propre ;
- évolutif vers paiement PayPal.

