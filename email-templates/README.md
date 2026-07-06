# E-mails — Jen's & Floran

Modèles HTML pour les e-mails **Supabase Auth** et référence visuelle pour les **e-mails de commande** (Resend / backend).

## Fichiers

| Fichier | Usage |
|---------|--------|
| `confirm-signup.html` | Supabase → **Confirm signup** |
| `reset-password.html` | Supabase → **Reset password** |
| `order-confirmation.html` | Référence visuelle (envoi réel via `backend/src/services/emailTemplates.js`) |

## E-mails de commande (automatiques)

Envoyés par le **backend Render** via **Resend** après paiement PayPal ou changement de statut admin :

- **Confirmation** : logo, numéro de commande, bouton « Afficher votre commande », liste des articles (photo + nom + quantité, sans étoiles ni notes)
- **Préparation / Prête / Livrée** : même charte visuelle

Variables d'environnement Render :

- `RESEND_API_KEY`
- `EMAIL_FROM` (ex. `Jen's & Floran <commandes@jens-flora.com>`)
- `EMAIL_ADMIN`
- `SITE_URL` (optionnel, défaut `https://www.jens-flora.com`)

## Installation Supabase Auth

1. Ouvrez [Supabase Dashboard](https://supabase.com/dashboard) → projet **jens-flora**
2. **Authentication** → **Emails** → **Templates**
3. Pour chaque modèle :
   - Collez le **Subject** (objet) ci-dessous
   - Collez le contenu HTML du fichier correspondant dans **Message body**
   - Enregistrez

### Confirm signup

**Subject :**
```
Bienvenue chez Jen's & Floran — confirmez votre compte
```

**Body :** contenu de `confirm-signup.html`

### Reset password

**Subject :**
```
Réinitialisation de votre mot de passe — Jen's & Floran
```

**Body :** contenu de `reset-password.html`

## Logo

Les e-mails utilisent : `https://www.jens-flora.com/logo.png`

Assurez-vous que `logo.png` est **déployé sur Vercel** (à la racine du site).

## Variables Supabase (ne pas modifier)

- `{{ .ConfirmationURL }}` — lien de confirmation ou réinitialisation
- `{{ .Email }}` — adresse e-mail du client

## Durée de validité des liens

| Type | Texte dans l'e-mail | Réglage Supabase |
|------|---------------------|------------------|
| Confirmation compte | 24 heures | Auth → Settings → **Email OTP expiry** (défaut 86400 s) |
| Mot de passe oublié | 1 heure | Auth → Settings → **JWT expiry** / recovery (vérifier la valeur) |

Ajustez le texte dans les templates si vous changez ces valeurs.

## Test

1. Créez un compte test sur [www.jens-flora.com/compte.html](https://www.jens-flora.com/compte.html)
2. Ou demandez « Mot de passe oublié »
3. Vérifiez l'affichage sur mobile et dans Gmail

## Charte visuelle

- Or : `#c9a24b`
- Fond : `#f4f0e8`
- Typographie titres : Georgia (serif)
- Typographie corps : Arial (sans-serif)
