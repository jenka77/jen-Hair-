# Mise en ligne — Jen's & Floran

Ce guide explique **pas à pas** comment passer du site en local (`localhost:8000` + `localhost:4000`) à un site **accessible sur Internet** avec paiements PayPal, emails et base Supabase.

---

## 1. Vue d'ensemble

Votre projet est composé de **3 parties** :

```text
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (fichiers statiques)                              │
│  index.html, type.html, confirmation.html, script.js, …     │
│  Hébergement recommandé : Vercel ou Netlify                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ appels API (fetch)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js / Express)                                │
│  dossier backend/ — commandes, PayPal, emails               │
│  Hébergement recommandé : Render ou Railway                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ clé secrète
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL + Storage)                            │
│  produits, commandes, stock, images/vidéos                  │
└─────────────────────────────────────────────────────────────┘

Services externes :
  • PayPal  → paiements
  • Resend  → emails de confirmation
  • Nom de domaine (optionnel mais recommandé)
```

**En local**, vous lancez 2 terminaux :

```bash
# Terminal 1 — frontend
python3 -m http.server 8000

# Terminal 2 — backend
cd backend && npm run dev
```

**En ligne**, le frontend et le backend ont chacun une **URL publique HTTPS**.

---

## 2. Ce qu'il vous faut avant de commencer

### Comptes (gratuits ou presque)

| Service | Rôle | Lien |
|---------|------|------|
| **GitHub** | Héberger le code | [github.com](https://github.com) |
| **Supabase** | Base de données (déjà configuré) | [supabase.com](https://supabase.com) |
| **Vercel** | Frontend statique | [vercel.com](https://vercel.com) |
| **Render** | Backend Node.js | [render.com](https://render.com) |
| **PayPal Developer** | Paiements | [developer.paypal.com](https://developer.paypal.com) |
| **Resend** | Emails | [resend.com](https://resend.com) |

### Nom de domaine (recommandé)

Exemples pour votre marque :

- `jens-flora.de`
- `jens-flora.com`
- `shop.jens-flora.com`

Registrars courants : IONOS, Namecheap, OVH, Google Domains.

---

## 3. Préparer le code sur GitHub

GitHub sert de base pour déployer automatiquement sur Vercel et Render.

### 3.1 Créer un dépôt GitHub

1. Allez sur GitHub → **New repository**
2. Nommez-le par ex. `jens-flora`
3. Créez le dépôt (sans README si vous poussez un projet existant)

### 3.2 Pousser votre projet

```bash
cd ~/Dokumente/jenF
git init
git add .
git commit -m "Première version Jen's & Floran"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/jens-flora.git
git push -u origin main
```

### 3.3 Fichiers à NE JAMAIS publier

Vérifiez que `.gitignore` contient :

```text
backend/.env
.env
node_modules/
```

**Ne commitez jamais** `backend/.env` — il contient vos clés secrètes.

---

## 4. Déployer le backend sur Render

Render héberge votre API Node.js 24 h/24.

### 4.1 Créer le service

1. Connectez-vous sur [render.com](https://render.com)
2. **New +** → **Web Service**
3. Connectez votre dépôt GitHub `jens-flora`
4. Paramètres :

| Champ | Valeur |
|-------|--------|
| **Name** | `jens-flora-api` |
| **Region** | Frankfurt (EU) |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free (pour tester) ou Starter (production) |

### 4.2 Variables d'environnement (Render)

Dans **Environment** → **Add Environment Variable**, ajoutez **toutes** ces variables (copiez les vraies valeurs depuis votre `backend/.env` local) :

```text
PORT=10000
FRONTEND_URL=https://votre-site.vercel.app

SUPABASE_URL=https://bapnudbxblqawqcuvycy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

ADMIN_PASSWORD=votre_mot_de_passe_admin_fort

EMAIL_FROM=Jen's & Floran <contact@shop.jens-flora.com>
EMAIL_ADMIN=votre@email.com
RESEND_API_KEY=re_...

PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=live
```

**Important :**

- `FRONTEND_URL` = l'URL exacte de votre site (HTTPS, sans `/` à la fin)
- Mettez à jour `FRONTEND_URL` après avoir déployé le frontend (étape 5)
- Pour les vrais paiements : `PAYPAL_ENV=live` + clés **Live** PayPal
- Sur Render free, le serveur s'endort après 15 min d'inactivité (1er appel lent)

### 4.3 URL du backend

Après déploiement, Render vous donne une URL du type :

```text
https://jens-flora-api.onrender.com
```

Testez :

```bash
curl https://jens-flora-api.onrender.com/api/health
```

Réponse attendue :

```json
{"ok":true,"timestamp":"...","paypalEnv":"live"}
```

---

## 5. Déployer le frontend sur Vercel

Vercel héberge gratuitement vos fichiers HTML/CSS/JS.

### 5.1 Créer le projet

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Importez le dépôt GitHub `jens-flora`
3. Paramètres :

| Champ | Valeur |
|-------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `.` (racine du projet) |
| **Build Command** | *(laisser vide)* |
| **Output Directory** | `.` |

4. Cliquez **Deploy**

Vercel vous donne une URL du type :

```text
https://jens-flora.vercel.app
```

### 5.2 Modifier l'URL du backend dans le frontend

Ouvrez `db.js` et remplacez la fonction `resoudreApiBaseUrl()` :

```javascript
// URL publique de votre backend Render (sans / à la fin)
const API_BASE_URL_PROD = "https://jens-flora-api.onrender.com";

function resoudreApiBaseUrl() {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }
  return API_BASE_URL_PROD;
}
```

Puis committez et poussez — Vercel redéploie automatiquement.

### 5.3 Mettre à jour FRONTEND_URL sur Render

Retournez sur Render → Environment :

```text
FRONTEND_URL=https://jens-flora.vercel.app
```

Redémarrez le service backend (Manual Deploy → Clear cache & deploy).

Sans cela, le navigateur bloque les appels API (**erreur CORS**).

---

## 6. Connecter un nom de domaine

### 6.1 Domaine sur Vercel (frontend)

1. Vercel → votre projet → **Settings** → **Domains**
2. Ajoutez `www.jens-flora.de` et `jens-flora.de`
3. Vercel affiche les enregistrements DNS à créer chez votre registrar
4. Attendez la propagation DNS (5 min à 48 h)

### 6.2 Mettre à jour les URLs

Une fois le domaine actif :

| Où | Variable | Exemple |
|----|----------|---------|
| Render | `FRONTEND_URL` | `https://www.jens-flora.de` |
| `db.js` | `API_BASE_URL_PROD` | `https://jens-flora-api.onrender.com` |
| PayPal Developer | Return URLs | autorisées automatiquement via `FRONTEND_URL` |

---

## 7. Configurer PayPal en production

### 7.1 Passer en mode Live

1. [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials**
2. Onglet **Live** (pas Sandbox)
3. **Create App** → copiez Client ID et Secret
4. Mettez-les dans Render :

```text
PAYPAL_CLIENT_ID=...live...
PAYPAL_CLIENT_SECRET=...live...
PAYPAL_ENV=live
```

### 7.2 Compte PayPal Business

- Compte **Business** vérifié sur [paypal.com](https://www.paypal.com)
- Compte bancaire lié pour recevoir l'argent
- Testez avec une petite commande réelle (5 €)

### 7.3 Retour après paiement

PayPal renvoie automatiquement vers :

```text
https://votre-domaine.com/confirmation.html?paypal=success&order_id=...
```

Aucune configuration supplémentaire côté PayPal si `FRONTEND_URL` est correct.

---

## 8. Configurer les emails (Resend)

### 8.1 Domaine d'envoi

Vous utilisez déjà `contact@shop.jens-flora.com`. Dans Resend :

1. **Domains** → ajoutez `shop.jens-flora.com`
2. Ajoutez les enregistrements DNS (SPF, DKIM) chez votre registrar
3. Attendez le statut **Verified**

### 8.2 Variables

Sur Render :

```text
EMAIL_FROM=Jen's & Floran <contact@shop.jens-flora.com>
EMAIL_ADMIN=jenka7733@gmail.com
RESEND_API_KEY=re_...
```

### 8.3 Emails envoyés automatiquement

| Moment | Destinataire |
|--------|--------------|
| Commande payée | Cliente + Admin |
| Commande livrée / prête en boutique | *(à brancher plus tard via admin)* |

---

## 9. Supabase en production

Votre base est déjà sur Supabase. Vérifiez :

1. **Produits** : `is_active = true`, stock à jour
2. **Storage** : images/vidéos en URLs publiques
3. **Clé secrète** : uniquement dans Render (`SUPABASE_SERVICE_ROLE_KEY`), jamais dans le frontend
4. **Clé publique** (`sb_publishable_...`) : dans `db.js` — normal, elle est limitée

Guide détaillé : voir `SUPABASE_PROTOCOL.md`

---

## 10. Checklist avant d'ouvrir au public

### Technique

- [ ] `https://votre-backend.onrender.com/api/health` → `ok: true`
- [ ] `https://votre-site.com` s'affiche correctement
- [ ] Les produits se chargent depuis Supabase (pas les JSON locaux)
- [ ] Ajout au panier → commande → PayPal → page `confirmation.html`
- [ ] Email reçu par la cliente et par l'admin
- [ ] Stock décrémenté après paiement
- [ ] Site responsive sur mobile
- [ ] FR / DE / EN fonctionnent

### PayPal Live

- [ ] `PAYPAL_ENV=live`
- [ ] Clés Live (pas Sandbox)
- [ ] Test avec 1 vraie petite commande

### Légal (Allemagne / UE)

Avant vente commerciale, prévoir :

- [ ] Impressum (mentions légales)
- [ ] Datenschutzerklärung (politique de confidentialité)
- [ ] AGB (conditions générales de vente)
- [ ] Politique de retour / Widerruf
- [ ] Informations sur les frais de livraison (7,50 €)

---

## 11. Ordre recommandé des étapes

```text
1. GitHub          → code en ligne
2. Render          → backend + variables .env
3. db.js           → API_BASE_URL_PROD
4. Vercel          → frontend
5. Render          → FRONTEND_URL = URL Vercel
6. Test complet    → commande sandbox ou live
7. Domaine         → jens-flora.de sur Vercel
8. Resend          → domaine email vérifié
9. PayPal Live     → vrais paiements
10. Pages légales  → Impressum, AGB, etc.
```

---

## 12. Dépannage courant

### « NetworkError when attempting to fetch resource »

- Backend Render arrêté (plan free) → attendez 30 s et réessayez
- `FRONTEND_URL` incorrect sur Render → doit correspondre exactement à l'URL du site
- `API_BASE_URL_PROD` incorrect dans `db.js`
- Backend non redémarré après changement de `.env`

### PayPal ne s'ouvre pas

- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` manquants ou Sandbox en mode live
- Backend pas redémarré après modification des clés

### Page « Type introuvable » après paiement

- Ancienne session PayPal → passez une **nouvelle** commande
- Doit rediriger vers `confirmation.html` (vérifiez que `db.js` est à jour)

### Emails non reçus

- Domaine Resend non vérifié
- Vérifiez les spams
- Logs Render → onglet **Logs** du service backend

### Produits ne s'affichent pas

- Supabase : produits `is_active = true`
- Backend accessible : `/api/products?category=bob`
- Console navigateur (F12) → erreurs réseau

---

## 13. Coûts estimés (démarrage)

| Service | Coût mensuel approximatif |
|---------|---------------------------|
| Vercel (frontend) | 0 € |
| Render (backend free) | 0 € *(limité)* |
| Render (backend starter) | ~7 $ |
| Supabase (free tier) | 0 € |
| Resend (free tier) | 0 € (3000 emails/mois) |
| Domaine .de | ~5–15 € / an |
| PayPal | commission par vente (~2,9 % + 0,35 €) |

**Total démarrage : ~0–10 €/mois** + nom de domaine + frais PayPal.

---

## 14. Structure des fichiers importants

```text
jenF/
├── index.html              → page d'accueil
├── type.html               → catalogue par type
├── confirmation.html       → page après paiement
├── maison.html             → liste des types
├── db.js                   → URL backend + appels API  ← À MODIFIER
├── script.js               → panier, commande
├── confirmation.js         → logique page confirmation
├── i18n.js                 → traductions FR/DE/EN
├── backend/
│   ├── server.js           → point d'entrée API
│   ├── .env                → secrets LOCAUX (jamais sur GitHub)
│   └── src/
│       ├── routes/         → products, orders, paypal
│       └── services/       → email, paypal
├── SUPABASE_PROTOCOL.md    → config base de données
├── BACKEND_ROADMAP.md      → roadmap technique
└── DEPLOIEMENT.md          → ce fichier
```

---

## 15. Commandes utiles au quotidien

```bash
# Développement local
python3 -m http.server 8000          # frontend
cd backend && npm run dev            # backend

# Après modification du code
git add .
git commit -m "Description du changement"
git push                             # Vercel + Render redéploient

# Tester l'API backend en ligne
curl https://jens-flora-api.onrender.com/api/health
curl "https://jens-flora-api.onrender.com/api/products?category=bob"
```

---

## 16. Prochaines étapes (optionnel)

Une fois en ligne :

1. **Espace admin** — gérer statuts commande (préparation, livrée)
2. **Email automatique** quand commande prête / livrée
3. **Analytics** — Vercel Analytics ou Plausible
4. **Sauvegarde** — exports Supabase réguliers
5. **HTTPS partout** — automatique sur Vercel et Render

---

## Résumé en une phrase

**Frontend sur Vercel + Backend sur Render + Supabase + PayPal Live + Resend**, avec `db.js` pointant vers l'URL Render et `FRONTEND_URL` sur Render pointant vers Vercel.

Pour toute question sur Supabase : `SUPABASE_PROTOCOL.md`  
Pour la roadmap technique : `BACKEND_ROADMAP.md`
