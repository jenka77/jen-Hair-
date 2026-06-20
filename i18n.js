/* ============================================================
   Jen's & Flora — Internationalisation (FR / DE / EN)
   ============================================================ */

const I18N = {
  fr: {
    "nav.home": "Accueil",
    "nav.maison": "La Maison",
    "nav.contact": "Contact",
    "nav.menu": "Ouvrir le menu",
    "nav.menuClose": "Fermer le menu",
    "nav.login": "Se connecter",
    "nav.register": "S'inscrire",
    "nav.account": "Mon compte",
    "nav.collection": "Collection",

    "auth.loginTitle": "Connexion",
    "auth.loginLead": "Accédez à l'historique de vos commandes.",
    "auth.registerTitle": "Créer un compte",
    "auth.registerLead": "Vos commandes seront enregistrées dans votre espace personnel.",
    "auth.email": "Adresse e-mail",
    "auth.password": "Mot de passe",
    "auth.passwordConfirm": "Confirmer le mot de passe",
    "auth.welcome": "Mon espace",
    "auth.logout": "Se déconnecter",
    "auth.ordersTitle": "Historique de mes commandes",
    "auth.ordersLoading": "Chargement…",
    "auth.ordersEmpty": "Aucune commande enregistrée pour le moment.",
    "auth.orderTotal": "Total",
    "auth.loginSuccess": "Connexion réussie",
    "auth.loginError": "E-mail ou mot de passe incorrect",
    "auth.registerSuccess": "Compte créé avec succès",
    "auth.registerError": "Impossible de créer le compte",
    "auth.rateLimit": "Trop de tentatives d'inscription. Attendez 30 à 60 minutes, puis réessayez. Vérifiez aussi vos spams si vous avez déjà reçu un e-mail de confirmation.",
    "auth.confirmEmail": "Compte créé. Vérifiez votre boîte e-mail pour confirmer votre inscription.",
    "auth.linkExpired": "Ce lien de confirmation a expiré ou a déjà été utilisé. Reconnectez-vous ou créez un nouveau compte avec la même adresse e-mail pour recevoir un nouvel e-mail.",
    "auth.confirmError": "Impossible de confirmer votre adresse e-mail. Réessayez depuis la page Mon compte.",
    "auth.passwordMismatch": "Les mots de passe ne correspondent pas",
    "auth.logoutSuccess": "Vous êtes déconnectée",
    "auth.status.paid": "Payée",
    "auth.status.pending_payment": "En attente",
    "auth.status.preparing": "En préparation",
    "auth.status.delivered": "Livrée",
    "auth.status.ready": "Prête",
    "auth.status.accepted": "Confirmée",
    "auth.status.cancelled": "Annulée",

    "hero.kicker": "SUBLIMEZ VOTRE BEAUTÉ",
    "hero.title": "L'Art de la Perruque<br />de Luxe",
    "hero.sub": "Des cheveux d'exception, sélectionnés à la main pour les femmes qui osent briller.",
    "hero.cta": "Voir la Collection",
    "hero.cap1": "Lisse & Brillant — l'élégance intemporelle qui sublime chaque regard.",
    "hero.cap2": "Le carré plongeant, signature d'une féminité affirmée et raffinée.",
    "hero.cap3": "Reflets miel et lumière dorée pour un éclat résolument chic.",
    "hero.cap4": "Des ondulations glamour qui révèlent toute votre splendeur.",

    "about.kicker": "La Maison Jen's & Flora",
    "about.title": "La Beauté, Élevée au Rang d'Art",
    "about.p1": "Chez Jen's & Flora, nous croyons que chaque femme mérite de se sentir resplendissante. Nos perruques de luxe sont créées à partir de cheveux 100% naturels, sélectionnés avec exigence pour offrir une tenue parfaite et un éclat incomparable.",
    "about.p2": "De la coupe lisse à l'ondulé glamour, notre collection célèbre toutes les facettes de votre élégance.",
    "about.stat1": "Cheveux naturels",
    "about.stat2": "Clientes conquises",
    "about.stat3": "Service privilège",

    "contact.kicker": "Nous Contacter",
    "contact.title": "Prenons Contact",
    "contact.desc": "Une question, un conseil ou une commande ? Écrivez-nous directement sur WhatsApp ou passez nous voir en boutique.",
    "contact.shop": "Boutique",
    "contact.map": "Voir sur la carte",
    "contact.whatsapp": "WhatsApp",
    "contact.write": "Écrire sur WhatsApp",

    "cart.title": "Votre Panier",
    "cart.total": "Total",
    "cart.checkout": "Passer commande",
    "cart.empty": "Votre panier est vide.<br />Découvrez notre collection ✦",
    "cart.remove": "Retirer",

    "order.step": "Finaliser",
    "order.title": "Votre Commande",
    "order.fullname": "Nom complet *",
    "order.phone": "Téléphone *",
    "order.phonePlaceholder": "ex : +49 152 12345678",
    "order.email": "Adresse email *",
    "order.emailPlaceholder": "ex : prenom@email.com",
    "order.emailHint": "Obligatoire pour recevoir la confirmation de commande.",
    "order.mode": "Mode de récupération *",
    "order.pickup": "Retrait en boutique",
    "order.pickupSub": "Chez Saá Mokolo",
    "order.delivery": "Livraison à domicile",
    "order.deliverySub": "Indiquez votre adresse",
    "order.pickupAddress": "Retrait en boutique chez Saá Mokolo",
    "order.address": "Adresse de livraison complète *",
    "order.addressHint": "Requise pour une livraison en Allemagne : rue, numéro, code postal, ville et pays.",
    "order.street": "Rue *",
    "order.streetPlaceholder": "ex : Steinstraße",
    "order.houseNumber": "N° *",
    "order.houseNumberPlaceholder": "70",
    "order.postalCode": "Code postal *",
    "order.postalCodePlaceholder": "35390",
    "order.city": "Ville *",
    "order.cityPlaceholder": "Gießen",
    "order.country": "Pays *",
    "order.countryPlaceholder": "Deutschland",
    "order.confirm": "Confirmer la commande",
    "order.loginRequired": "Connectez-vous pour passer commande",
    "order.sending": "Envoi en cours...",
    "order.lineSubtotal": "Sous-total",
    "order.deliveryFeeLabel": "Frais de livraison",
    "order.deliveryFeeNote": "Des frais de livraison de {montant} s'appliquent à la livraison à domicile et sont inclus dans le total.",

    "footer.tag": "L'élégance dans chaque détail.",
    "footer.navTitle": "Navigation",
    "footer.legalTitle": "Informations légales",
    "footer.cgv": "Conditions Générales de Vente (CGV)",
    "footer.returns": "Politique de Retour et de Remboursement",
    "footer.privacy": "Politique de Confidentialité",
    "footer.copy": "© 2026 Jen's & Flora. Tous droits réservés.",

    "page.index": "Jen's & Flora — L'Art de la Perruque de Luxe",
    "page.maison": "La Maison — Jen's & Flora by Sa'a Mokolo",
    "page.compte": "Mon compte — Jen's & Flora",
    "page.confirm": "Jen's & Flora — Confirmation de commande",
    "page.typeTitle": "Jen's & Flora — {name}",

    "maison.kicker": "La Maison Jen's & Flora",
    "maison.title": "Nos Types de Perruques",
    "maison.desc": "Découvrez tous les styles de notre collection — de la coupe lisse aux boucles les plus glamour — ainsi que notre espace apprentissage.",
    "maison.d1": "Lisse absolu, brillance miroir et tombé impeccable.",
    "maison.d2": "Ondulations souples et volumineuses, naturellement chic.",
    "maison.d3": "Vagues profondes et marquées pour un effet sophistiqué.",
    "maison.d4": "Boucles fluides inspirées du mouvement de l'eau.",
    "maison.d5": "Ondulations larges et légères, douces et aériennes.",
    "maison.d6": "Petites boucles serrées, pleines de caractère et de volume.",
    "maison.d7": "Carré intemporel et structuré, élégance affirmée.",
    "maison.d8": "Coupe courte audacieuse, féminine et moderne.",
    "maison.d9": "Coupe dégradée pour du mouvement et de la légèreté.",
    "maison.ext": "Extensions (Mèches)",
    "maison.extDesc": "Mèches et bundles 100% naturels pour tissages et coiffures protectrices.",
    "maison.care": "Entretien des Cheveux",
    "maison.careDesc": "Soins et produits pour préserver l'éclat de vos perruques et extensions.",
    "maison.learn": "Apprentissage",
    "maison.learnDesc": "Conseils, tutoriels et accompagnement pour poser, entretenir et sublimer votre perruque.",
    "maison.learnTag": "Espace dédié",
    "maison.feedback": "Vos avis",
    "maison.feedbackDesc": "Notez le site et partagez vos remarques pour nous aider à améliorer votre expérience.",
    "maison.feedbackTag": "Votre voix compte",

    "avis.formTitle": "Donnez votre avis",
    "avis.formLead": "Comment trouvez-vous le site ? Votre retour nous aide à progresser.",
    "avis.name": "Votre prénom ou pseudonyme",
    "avis.nameRequired": "Indiquez votre prénom ou un pseudonyme.",
    "avis.rating": "Note sur 5 étoiles",
    "avis.ratingHint": "Cliquez sur une étoile pour noter le site.",
    "avis.ratingSelected": "Vous avez donné {n} étoile(s).",
    "avis.ratingRequired": "Veuillez sélectionner une note entre 1 et 5 étoiles.",
    "avis.comment": "Votre commentaire",
    "avis.commentPlaceholder": "Navigation, commande, clarté des pages…",
    "avis.commentTooShort": "Le commentaire doit contenir au moins 10 caractères.",
    "avis.submit": "Publier mon avis",
    "avis.sending": "Envoi…",
    "avis.thanks": "Merci pour votre avis !",
    "avis.submitError": "Impossible d'enregistrer votre avis.",
    "avis.loadError": "Impossible de charger les avis.",
    "avis.apiUnavailable": "Le service d'avis n'est pas encore disponible. Réessayez dans quelques minutes.",
    "avis.listTitle": "Avis de nos visiteurs",
    "avis.loading": "Chargement des avis…",
    "avis.empty": "Aucun avis pour l'instant. Soyez le premier à partager le vôtre.",
    "avis.replyFrom": "Réponse de Jen's & Flora",

    "type.crumb": "La Maison",
    "type.loading": "Chargement…",
    "type.notFound": "Type introuvable",
    "type.notExist": "Ce type n'existe pas.",
    "type.back": "Retour à La Maison",
    "type.noProducts": "Aucun produit pour ce type pour l'instant.",
    "type.loadError": "Impossible de charger les produits.",
    "type.loadHint": "Vérifiez que le backend tourne (<code>cd backend && npm run dev</code>) et que le site est ouvert via <code>http://127.0.0.1:8000</code> (pas en double-clic sur le fichier HTML). Puis rechargez avec Ctrl+Shift+R.",
    "type.searchPlaceholder": "Rechercher un article (nom, couleur, taille…)",
    "type.searchClear": "Effacer la recherche",
    "type.searchNoResults": "Aucun article ne correspond à votre recherche.",
    "type.searchResults": "{n} article(s) sur {total}",

    "product.inStock": "En stock",
    "product.outStock": "Épuisé",
    "product.unitsLeft": "{n} en stock",
    "product.unavailable": "Indisponible",
    "product.order": "Commander",
    "product.soldout": "Rupture de stock",
    "product.watch": "Regarder la vidéo",
    "product.soon": "Bientôt disponible",
    "product.specType": "Type",
    "product.specSize": "Taille",
    "product.specColor": "Couleur",
    "product.specLace": "Lace",

    "toast.added": "« {nom} » ajouté au panier ✦",
    "toast.maxStock": "Stock maximum atteint pour cet article",
    "toast.deliveryNeeded": "Merci d'indiquer une adresse complète : rue, numéro, code postal allemand à 5 chiffres, ville et pays.",
    "toast.invalidPhone": "Merci d'indiquer un numéro de téléphone valide.",
    "toast.emailErr": "Commande enregistrée, mais l'email n'a pas pu être envoyé.",
    "toast.thanks": "Merci {nom} ! Votre commande est acceptée ✦",

    "confirm.kicker": "Commande",
    "confirm.loading": "Vérification de votre commande…",
    "confirm.processing": "Confirmation du paiement en cours…",
    "confirm.successTitle": "Merci pour votre commande",
    "confirm.successLead": "Votre paiement a été confirmé. Sa'a Mokolo prépare votre commande avec soin.",
    "confirm.orderNumber": "N° de commande",
    "confirm.statusLabel": "Statut",
    "confirm.articles": "Articles commandés",
    "confirm.total": "Total payé",
    "confirm.deliveryTitle": "Mode de récupération",
    "confirm.emailNote": "Un email de confirmation vous a été envoyé avec le détail de votre commande.",
    "confirm.readyEmailNote": "Vous recevrez également un email dès que votre commande sera livrée ou disponible en boutique chez Saá Mokolo.",
    "confirm.backShop": "Continuer mes achats",
    "confirm.contact": "Nous contacter",
    "confirm.cancelTitle": "Paiement annulé",
    "confirm.cancelLead": "Votre paiement PayPal a été annulé. Votre panier n'a pas été débité.",
    "confirm.errorTitle": "Commande introuvable",
    "confirm.errorLead": "Impossible d'afficher cette commande. Contactez-nous si vous avez effectué un paiement.",
    "confirm.toastSuccess": "Paiement confirmé — commande {number}",
    "confirm.step.paid": "Payée",
    "confirm.step.preparing": "En préparation",
    "confirm.step.delivered": "Prête / Livrée",
    "confirm.status.paid": "Payée",
    "confirm.status.accepted": "Confirmée",
    "confirm.status.preparing": "En préparation",
    "confirm.status.delivered": "Livrée / Prête",
    "confirm.status.pending_payment": "En attente de paiement",
    "confirm.status.cancelled": "Annulée",
    "confirm.status.unknown": "En cours de traitement",
    "confirm.pickupModeValue": "Retrait en boutique chez Saá Mokolo",
    "confirm.deliveryModeValue": "Livraison à domicile",
  },

  de: {
    "nav.home": "Startseite",
    "nav.maison": "Das Haus",
    "nav.contact": "Kontakt",
    "nav.menu": "Menü öffnen",
    "nav.menuClose": "Menü schließen",
    "nav.login": "Anmelden",
    "nav.register": "Registrieren",
    "nav.account": "Mein Konto",
    "nav.collection": "Kollektion",

    "auth.loginTitle": "Anmelden",
    "auth.loginLead": "Greifen Sie auf Ihre Bestellhistorie zu.",
    "auth.registerTitle": "Konto erstellen",
    "auth.registerLead": "Ihre Bestellungen werden in Ihrem persönlichen Bereich gespeichert.",
    "auth.email": "E-Mail-Adresse",
    "auth.password": "Passwort",
    "auth.passwordConfirm": "Passwort bestätigen",
    "auth.welcome": "Mein Bereich",
    "auth.logout": "Abmelden",
    "auth.ordersTitle": "Meine Bestellhistorie",
    "auth.ordersLoading": "Wird geladen…",
    "auth.ordersEmpty": "Noch keine Bestellungen gespeichert.",
    "auth.orderTotal": "Gesamt",
    "auth.loginSuccess": "Erfolgreich angemeldet",
    "auth.loginError": "E-Mail oder Passwort falsch",
    "auth.registerSuccess": "Konto erfolgreich erstellt",
    "auth.registerError": "Konto konnte nicht erstellt werden",
    "auth.rateLimit": "Zu viele Anmeldeversuche. Bitte warten Sie 30–60 Minuten und versuchen Sie es erneut. Prüfen Sie auch Ihren Spam-Ordner.",
    "auth.confirmEmail": "Konto erstellt. Bitte bestätigen Sie Ihre E-Mail.",
    "auth.linkExpired": "Dieser Bestätigungslink ist abgelaufen oder wurde bereits verwendet. Melden Sie sich an oder registrieren Sie sich erneut mit derselben E-Mail.",
    "auth.confirmError": "E-Mail konnte nicht bestätigt werden. Bitte versuchen Sie es erneut über Mein Konto.",
    "auth.passwordMismatch": "Passwörter stimmen nicht überein",
    "auth.logoutSuccess": "Sie sind abgemeldet",
    "auth.status.paid": "Bezahlt",
    "auth.status.pending_payment": "Ausstehend",
    "auth.status.preparing": "In Vorbereitung",
    "auth.status.delivered": "Geliefert",
    "auth.status.ready": "Abholbereit",
    "auth.status.accepted": "Bestätigt",
    "auth.status.cancelled": "Storniert",

    "hero.kicker": "VEREDELN SIE IHRE SCHÖNHEIT",
    "hero.title": "Die Kunst der<br />Luxus-Perücke",
    "hero.sub": "Außergewöhnliches Haar, von Hand ausgewählt für Frauen, die strahlen wollen.",
    "hero.cta": "Zur Kollektion",
    "hero.cap1": "Glatt & glänzend — zeitlose Eleganz, die jeden Blick veredelt.",
    "hero.cap2": "Der Bob, Signatur einer selbstbewussten und raffinierten Weiblichkeit.",
    "hero.cap3": "Honigtöne und goldenes Licht für einen edlen Glanz.",
    "hero.cap4": "Glamouröse Wellen, die Ihre ganze Pracht enthüllen.",

    "about.kicker": "Das Haus Jen's & Flora",
    "about.title": "Schönheit, erhoben zur Kunst",
    "about.p1": "Bei Jen's & Flora glauben wir, dass jede Frau es verdient, sich strahlend zu fühlen. Unsere Luxus-Perücken werden aus 100% Naturhaar gefertigt, sorgfältig ausgewählt für perfekten Sitz und unvergleichlichen Glanz.",
    "about.p2": "Vom glatten Schnitt bis zur glamourösen Welle feiert unsere Kollektion alle Facetten Ihrer Eleganz.",
    "about.stat1": "Naturhaar",
    "about.stat2": "Zufriedene Kundinnen",
    "about.stat3": "Premium-Service",

    "contact.kicker": "Kontaktieren Sie uns",
    "contact.title": "Nehmen wir Kontakt auf",
    "contact.desc": "Eine Frage, ein Rat oder eine Bestellung? Schreiben Sie uns direkt auf WhatsApp oder besuchen Sie uns im Geschäft.",
    "contact.shop": "Geschäft",
    "contact.map": "Auf der Karte ansehen",
    "contact.whatsapp": "WhatsApp",
    "contact.write": "Auf WhatsApp schreiben",

    "cart.title": "Ihr Warenkorb",
    "cart.total": "Gesamt",
    "cart.checkout": "Zur Bestellung",
    "cart.empty": "Ihr Warenkorb ist leer.<br />Entdecken Sie unsere Kollektion ✦",
    "cart.remove": "Entfernen",

    "order.step": "Abschließen",
    "order.title": "Ihre Bestellung",
    "order.fullname": "Vollständiger Name *",
    "order.phone": "Telefon *",
    "order.phonePlaceholder": "z. B. +49 152 12345678",
    "order.email": "E-Mail-Adresse *",
    "order.emailPlaceholder": "z. B. name@email.com",
    "order.emailHint": "Erforderlich, um die Bestellbestätigung per E-Mail zu erhalten.",
    "order.mode": "Abholungsart *",
    "order.pickup": "Abholung im Geschäft",
    "order.pickupSub": "Bei Saá Mokolo",
    "order.delivery": "Lieferung nach Hause",
    "order.deliverySub": "Geben Sie Ihre Adresse an",
    "order.pickupAddress": "Abholung im Geschäft bei Saá Mokolo",
    "order.address": "Vollständige Lieferadresse *",
    "order.addressHint": "Erforderlich für Lieferungen in Deutschland: Straße, Hausnummer, Postleitzahl, Stadt und Land.",
    "order.street": "Straße *",
    "order.streetPlaceholder": "z. B. Steinstraße",
    "order.houseNumber": "Nr. *",
    "order.houseNumberPlaceholder": "70",
    "order.postalCode": "Postleitzahl *",
    "order.postalCodePlaceholder": "35390",
    "order.city": "Stadt *",
    "order.cityPlaceholder": "Gießen",
    "order.country": "Land *",
    "order.countryPlaceholder": "Deutschland",
    "order.confirm": "Bestellung bestätigen",
    "order.loginRequired": "Bitte melden Sie sich an, um zu bestellen",
    "order.sending": "Wird gesendet...",
    "order.lineSubtotal": "Zwischensumme",
    "order.deliveryFeeLabel": "Liefergebühr",
    "order.deliveryFeeNote": "Für die Lieferung nach Hause fällt eine Liefergebühr von {montant} an, die im Gesamtbetrag enthalten ist.",

    "footer.tag": "Eleganz in jedem Detail.",
    "footer.navTitle": "Navigation",
    "footer.legalTitle": "Rechtliche Informationen",
    "footer.cgv": "Allgemeine Geschäftsbedingungen (AGB)",
    "footer.returns": "Widerrufs- & Rückerstattungsrichtlinie",
    "footer.privacy": "Datenschutzerklärung",
    "footer.copy": "© 2026 Jen's & Flora. Alle Rechte vorbehalten.",

    "page.index": "Jen's & Flora — Die Kunst der Luxus-Perücke",
    "page.maison": "Das Haus — Jen's & Flora by Sa'a Mokolo",
    "page.compte": "Mein Konto — Jen's & Flora",
    "page.confirm": "Jen's & Flora — Bestellbestätigung",
    "page.typeTitle": "Jen's & Flora — {name}",

    "maison.kicker": "Das Haus Jen's & Flora",
    "maison.title": "Unsere Perücken-Typen",
    "maison.desc": "Entdecken Sie alle Stile unserer Kollektion — vom glatten Schnitt bis zu den glamourösesten Locken — sowie unseren Lernbereich.",
    "maison.d1": "Absolut glatt, spiegelnder Glanz und makelloser Fall.",
    "maison.d2": "Weiche, voluminöse Wellen, natürlich schick.",
    "maison.d3": "Tiefe, markante Wellen für einen edlen Effekt.",
    "maison.d4": "Fließende Locken, inspiriert von der Bewegung des Wassers.",
    "maison.d5": "Breite, leichte Wellen, weich und luftig.",
    "maison.d6": "Kleine, enge Locken voller Charakter und Volumen.",
    "maison.d7": "Zeitloser, strukturierter Bob, selbstbewusste Eleganz.",
    "maison.d8": "Kurzer, kühner Schnitt, feminin und modern.",
    "maison.d9": "Stufenschnitt für Bewegung und Leichtigkeit.",
    "maison.ext": "Extensions (Tressen)",
    "maison.extDesc": "100% natürliche Tressen und Bundles für Weaves und schützende Frisuren.",
    "maison.care": "Haarpflege",
    "maison.careDesc": "Pflegeprodukte, die den Glanz Ihrer Perücken und Extensions bewahren.",
    "maison.learn": "Lernbereich",
    "maison.learnDesc": "Tipps, Tutorials und Begleitung zum Anlegen, Pflegen und Veredeln Ihrer Perücke.",
    "maison.learnTag": "Eigener Bereich",
    "maison.feedback": "Ihre Meinung",
    "maison.feedbackDesc": "Bewerten Sie die Website und teilen Sie Ihr Feedback, damit wir uns verbessern können.",
    "maison.feedbackTag": "Ihre Stimme zählt",

    "avis.formTitle": "Geben Sie Ihre Meinung ab",
    "avis.formLead": "Wie finden Sie die Website? Ihr Feedback hilft uns weiter.",
    "avis.name": "Vorname oder Pseudonym",
    "avis.nameRequired": "Bitte geben Sie einen Vornamen oder ein Pseudonym an.",
    "avis.rating": "Bewertung (5 Sterne)",
    "avis.ratingHint": "Klicken Sie auf einen Stern, um zu bewerten.",
    "avis.ratingSelected": "Sie haben {n} Stern(e) vergeben.",
    "avis.ratingRequired": "Bitte wählen Sie eine Bewertung von 1 bis 5 Sternen.",
    "avis.comment": "Ihr Kommentar",
    "avis.commentPlaceholder": "Navigation, Bestellung, Übersichtlichkeit…",
    "avis.commentTooShort": "Der Kommentar muss mindestens 10 Zeichen enthalten.",
    "avis.submit": "Bewertung absenden",
    "avis.sending": "Wird gesendet…",
    "avis.thanks": "Vielen Dank für Ihre Bewertung!",
    "avis.submitError": "Bewertung konnte nicht gespeichert werden.",
    "avis.loadError": "Bewertungen konnten nicht geladen werden.",
    "avis.apiUnavailable": "Der Bewertungsdienst ist noch nicht verfügbar. Bitte versuchen Sie es in einigen Minuten erneut.",
    "avis.listTitle": "Meinungen unserer Besucher",
    "avis.loading": "Bewertungen werden geladen…",
    "avis.empty": "Noch keine Bewertung. Seien Sie der Erste, der die Website bewertet.",
    "avis.replyFrom": "Antwort von Jen's & Flora",

    "type.crumb": "Das Haus",
    "type.loading": "Wird geladen…",
    "type.notFound": "Typ nicht gefunden",
    "type.notExist": "Dieser Typ existiert nicht.",
    "type.back": "Zurück zu Das Haus",
    "type.noProducts": "Derzeit keine Produkte für diesen Typ.",
    "type.loadError": "Produkte konnten nicht geladen werden.",
    "type.loadHint": "Stellen Sie sicher, dass das Backend läuft (<code>cd backend && npm run dev</code>) und die Seite über <code>http://127.0.0.1:8000</code> geöffnet ist. Dann mit Strg+Umschalt+R neu laden.",
    "type.searchPlaceholder": "Artikel suchen (Name, Farbe, Größe…)",
    "type.searchClear": "Suche löschen",
    "type.searchNoResults": "Kein Artikel entspricht Ihrer Suche.",
    "type.searchResults": "{n} Artikel von {total}",

    "product.inStock": "Auf Lager",
    "product.outStock": "Ausverkauft",
    "product.unitsLeft": "{n} auf Lager",
    "product.unavailable": "Nicht verfügbar",
    "product.order": "Bestellen",
    "product.soldout": "Ausverkauft",
    "product.watch": "Video ansehen",
    "product.soon": "Bald verfügbar",
    "product.specType": "Typ",
    "product.specSize": "Länge",
    "product.specColor": "Farbe",
    "product.specLace": "Lace",

    "toast.added": "„{nom}“ zum Warenkorb hinzugefügt ✦",
    "toast.maxStock": "Maximaler Bestand für diesen Artikel erreicht",
    "toast.deliveryNeeded": "Bitte geben Sie eine vollständige Adresse an: Straße, Hausnummer, 5-stellige deutsche Postleitzahl, Stadt und Land.",
    "toast.invalidPhone": "Bitte geben Sie eine gültige Telefonnummer ein.",
    "toast.emailErr": "Bestellung gespeichert, aber die E-Mail konnte nicht gesendet werden.",
    "toast.thanks": "Danke {nom}! Ihre Bestellung wurde angenommen ✦",

    "confirm.kicker": "Bestellung",
    "confirm.loading": "Bestellung wird überprüft…",
    "confirm.processing": "Zahlung wird bestätigt…",
    "confirm.successTitle": "Vielen Dank für Ihre Bestellung",
    "confirm.successLead": "Ihre Zahlung wurde bestätigt. Sa'a Mokolo bereitet Ihre Bestellung sorgfältig vor.",
    "confirm.orderNumber": "Bestellnummer",
    "confirm.statusLabel": "Status",
    "confirm.articles": "Bestellte Artikel",
    "confirm.total": "Bezahlter Betrag",
    "confirm.deliveryTitle": "Abholung / Lieferung",
    "confirm.emailNote": "Eine Bestätigungs-E-Mail mit allen Details wurde an Sie gesendet.",
    "confirm.readyEmailNote": "Sie erhalten außerdem eine E-Mail, sobald Ihre Bestellung geliefert wurde oder zur Abholung im Geschäft bei Saá Mokolo bereit ist.",
    "confirm.backShop": "Weiter einkaufen",
    "confirm.contact": "Kontakt",
    "confirm.cancelTitle": "Zahlung abgebrochen",
    "confirm.cancelLead": "Ihre PayPal-Zahlung wurde abgebrochen. Ihr Warenkorb wurde nicht belastet.",
    "confirm.errorTitle": "Bestellung nicht gefunden",
    "confirm.errorLead": "Diese Bestellung kann nicht angezeigt werden. Kontaktieren Sie uns, falls Sie bezahlt haben.",
    "confirm.toastSuccess": "Zahlung bestätigt — Bestellung {number}",
    "confirm.step.paid": "Bezahlt",
    "confirm.step.preparing": "In Vorbereitung",
    "confirm.step.delivered": "Bereit / Geliefert",
    "confirm.status.paid": "Bezahlt",
    "confirm.status.accepted": "Bestätigt",
    "confirm.status.preparing": "In Vorbereitung",
    "confirm.status.delivered": "Geliefert / Bereit",
    "confirm.status.pending_payment": "Zahlung ausstehend",
    "confirm.status.cancelled": "Storniert",
    "confirm.status.unknown": "In Bearbeitung",
    "confirm.pickupModeValue": "Abholung im Geschäft bei Saá Mokolo",
    "confirm.deliveryModeValue": "Lieferung nach Hause",
  },

  en: {
    "nav.home": "Home",
    "nav.maison": "The House",
    "nav.contact": "Contact",
    "nav.menu": "Open menu",
    "nav.menuClose": "Close menu",
    "nav.login": "Log in",
    "nav.register": "Register",
    "nav.account": "My account",
    "nav.collection": "Collection",

    "auth.loginTitle": "Log in",
    "auth.loginLead": "Access your order history.",
    "auth.registerTitle": "Create an account",
    "auth.registerLead": "Your orders will be saved to your personal space.",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.passwordConfirm": "Confirm password",
    "auth.welcome": "My space",
    "auth.logout": "Log out",
    "auth.ordersTitle": "My order history",
    "auth.ordersLoading": "Loading…",
    "auth.ordersEmpty": "No orders saved yet.",
    "auth.orderTotal": "Total",
    "auth.loginSuccess": "Logged in successfully",
    "auth.loginError": "Incorrect email or password",
    "auth.registerSuccess": "Account created successfully",
    "auth.registerError": "Unable to create account",
    "auth.rateLimit": "Too many sign-up attempts. Please wait 30–60 minutes and try again. Also check your spam folder.",
    "auth.confirmEmail": "Account created. Please check your email to confirm.",
    "auth.linkExpired": "This confirmation link has expired or was already used. Sign in or register again with the same email to receive a new link.",
    "auth.confirmError": "Unable to confirm your email. Please try again from My Account.",
    "auth.passwordMismatch": "Passwords do not match",
    "auth.logoutSuccess": "You are logged out",
    "auth.status.paid": "Paid",
    "auth.status.pending_payment": "Pending",
    "auth.status.preparing": "Preparing",
    "auth.status.delivered": "Delivered",
    "auth.status.ready": "Ready",
    "auth.status.accepted": "Confirmed",
    "auth.status.cancelled": "Cancelled",

    "hero.kicker": "ELEVATE YOUR BEAUTY",
    "hero.title": "The Art of the<br />Luxury Wig",
    "hero.sub": "Exceptional hair, handpicked for women who dare to shine.",
    "hero.cta": "View the Collection",
    "hero.cap1": "Sleek & shiny — timeless elegance that enhances every look.",
    "hero.cap2": "The bob, signature of bold and refined femininity.",
    "hero.cap3": "Honey highlights and golden light for a resolutely chic glow.",
    "hero.cap4": "Glamorous waves that reveal all your splendor.",

    "about.kicker": "The House of Jen's & Flora",
    "about.title": "Beauty, Raised to an Art",
    "about.p1": "At Jen's & Flora, we believe every woman deserves to feel radiant. Our luxury wigs are crafted from 100% natural hair, carefully selected for a perfect fit and incomparable shine.",
    "about.p2": "From sleek cuts to glamorous waves, our collection celebrates every facet of your elegance.",
    "about.stat1": "Natural hair",
    "about.stat2": "Happy clients",
    "about.stat3": "Premium service",

    "contact.kicker": "Contact Us",
    "contact.title": "Let's Get in Touch",
    "contact.desc": "A question, advice or an order? Message us directly on WhatsApp or visit us in store.",
    "contact.shop": "Store",
    "contact.map": "View on map",
    "contact.whatsapp": "WhatsApp",
    "contact.write": "Message on WhatsApp",

    "cart.title": "Your Cart",
    "cart.total": "Total",
    "cart.checkout": "Checkout",
    "cart.empty": "Your cart is empty.<br />Discover our collection ✦",
    "cart.remove": "Remove",

    "order.step": "Finalize",
    "order.title": "Your Order",
    "order.fullname": "Full name *",
    "order.phone": "Phone *",
    "order.phonePlaceholder": "e.g. +49 152 12345678",
    "order.email": "Email address *",
    "order.emailPlaceholder": "e.g. name@email.com",
    "order.emailHint": "Required to receive the order confirmation by email.",
    "order.mode": "Pickup method *",
    "order.pickup": "In-store pickup",
    "order.pickupSub": "At Saá Mokolo",
    "order.delivery": "Home delivery",
    "order.deliverySub": "Enter your address",
    "order.pickupAddress": "In-store pickup at Saá Mokolo",
    "order.address": "Complete delivery address *",
    "order.addressHint": "Required for delivery in Germany: street, house number, postal code, city and country.",
    "order.street": "Street *",
    "order.streetPlaceholder": "e.g. Steinstraße",
    "order.houseNumber": "No. *",
    "order.houseNumberPlaceholder": "70",
    "order.postalCode": "Postal code *",
    "order.postalCodePlaceholder": "35390",
    "order.city": "City *",
    "order.cityPlaceholder": "Gießen",
    "order.country": "Country *",
    "order.countryPlaceholder": "Germany",
    "order.confirm": "Confirm order",
    "order.loginRequired": "Please log in to place an order",
    "order.sending": "Sending...",
    "order.lineSubtotal": "Subtotal",
    "order.deliveryFeeLabel": "Delivery fee",
    "order.deliveryFeeNote": "A delivery fee of {montant} applies to home delivery and is included in the total.",

    "footer.tag": "Elegance in every detail.",
    "footer.navTitle": "Navigation",
    "footer.legalTitle": "Legal Information",
    "footer.cgv": "General Terms and Conditions (GTC)",
    "footer.returns": "Return & Refund Policy",
    "footer.privacy": "Privacy Policy",
    "footer.copy": "© 2026 Jen's & Flora. All rights reserved.",

    "page.index": "Jen's & Flora — The Art of the Luxury Wig",
    "page.maison": "The House — Jen's & Flora by Sa'a Mokolo",
    "page.compte": "My Account — Jen's & Flora",
    "page.confirm": "Jen's & Flora — Order Confirmation",
    "page.typeTitle": "Jen's & Flora — {name}",

    "maison.kicker": "The House of Jen's & Flora",
    "maison.title": "Our Wig Types",
    "maison.desc": "Discover all the styles of our collection — from sleek cuts to the most glamorous curls — as well as our learning section.",
    "maison.d1": "Absolute sleekness, mirror shine and impeccable fall.",
    "maison.d2": "Soft, voluminous waves, naturally chic.",
    "maison.d3": "Deep, defined waves for a sophisticated effect.",
    "maison.d4": "Fluid curls inspired by the movement of water.",
    "maison.d5": "Wide, light waves, soft and airy.",
    "maison.d6": "Small, tight curls full of character and volume.",
    "maison.d7": "Timeless, structured bob, bold elegance.",
    "maison.d8": "Bold short cut, feminine and modern.",
    "maison.d9": "Layered cut for movement and lightness.",
    "maison.ext": "Extensions (Bundles)",
    "maison.extDesc": "100% natural bundles and wefts for weaves and protective styles.",
    "maison.care": "Hair Care",
    "maison.careDesc": "Care products to preserve the shine of your wigs and extensions.",
    "maison.learn": "Learning",
    "maison.learnDesc": "Tips, tutorials and guidance to install, maintain and enhance your wig.",
    "maison.learnTag": "Dedicated space",
    "maison.feedback": "Your feedback",
    "maison.feedbackDesc": "Rate the site and share your thoughts to help us improve your experience.",
    "maison.feedbackTag": "Your voice matters",

    "avis.formTitle": "Share your feedback",
    "avis.formLead": "How do you find the site? Your input helps us improve.",
    "avis.name": "First name or nickname",
    "avis.nameRequired": "Please enter a first name or nickname.",
    "avis.rating": "Rating out of 5 stars",
    "avis.ratingHint": "Click a star to rate the site.",
    "avis.ratingSelected": "You gave {n} star(s).",
    "avis.ratingRequired": "Please select a rating from 1 to 5 stars.",
    "avis.comment": "Your comment",
    "avis.commentPlaceholder": "Navigation, ordering, clarity of pages…",
    "avis.commentTooShort": "The comment must be at least 10 characters.",
    "avis.submit": "Submit review",
    "avis.sending": "Sending…",
    "avis.thanks": "Thank you for your feedback!",
    "avis.submitError": "Unable to save your review.",
    "avis.loadError": "Unable to load reviews.",
    "avis.apiUnavailable": "The review service is not available yet. Please try again in a few minutes.",
    "avis.listTitle": "Visitor reviews",
    "avis.loading": "Loading reviews…",
    "avis.empty": "No reviews yet. Be the first to share yours.",
    "avis.replyFrom": "Reply from Jen's & Flora",

    "type.crumb": "The House",
    "type.loading": "Loading…",
    "type.notFound": "Type not found",
    "type.notExist": "This type does not exist.",
    "type.back": "Back to The House",
    "type.noProducts": "No products for this type yet.",
    "type.loadError": "Unable to load products.",
    "type.loadHint": "Make sure the backend is running (<code>cd backend && npm run dev</code>) and open the site at <code>http://127.0.0.1:8000</code> (not by double-clicking the HTML file). Then hard-refresh with Ctrl+Shift+R.",
    "type.searchPlaceholder": "Search an item (name, color, size…)",
    "type.searchClear": "Clear search",
    "type.searchNoResults": "No items match your search.",
    "type.searchResults": "{n} item(s) out of {total}",

    "product.inStock": "In stock",
    "product.outStock": "Sold out",
    "product.unitsLeft": "{n} in stock",
    "product.unavailable": "Unavailable",
    "product.order": "Order",
    "product.soldout": "Out of stock",
    "product.watch": "Watch the video",
    "product.soon": "Coming soon",
    "product.specType": "Type",
    "product.specSize": "Length",
    "product.specColor": "Color",
    "product.specLace": "Lace",

    "toast.added": "“{nom}” added to cart ✦",
    "toast.maxStock": "Maximum stock reached for this item",
    "toast.deliveryNeeded": "Please enter a complete address: street, house number, 5-digit German postal code, city and country.",
    "toast.invalidPhone": "Please enter a valid phone number.",
    "toast.emailErr": "Order saved, but the email could not be sent.",
    "toast.thanks": "Thank you {nom}! Your order is confirmed ✦",

    "confirm.kicker": "Order",
    "confirm.loading": "Checking your order…",
    "confirm.processing": "Confirming payment…",
    "confirm.successTitle": "Thank you for your order",
    "confirm.successLead": "Your payment is confirmed. Sa'a Mokolo is preparing your order with care.",
    "confirm.orderNumber": "Order number",
    "confirm.statusLabel": "Status",
    "confirm.articles": "Ordered items",
    "confirm.total": "Total paid",
    "confirm.deliveryTitle": "Pickup / Delivery",
    "confirm.emailNote": "A confirmation email with your order details has been sent to you.",
    "confirm.readyEmailNote": "You will also receive an email once your order has been delivered or is ready for pickup at Saá Mokolo boutique.",
    "confirm.backShop": "Continue shopping",
    "confirm.contact": "Contact us",
    "confirm.cancelTitle": "Payment cancelled",
    "confirm.cancelLead": "Your PayPal payment was cancelled. Your cart was not charged.",
    "confirm.errorTitle": "Order not found",
    "confirm.errorLead": "Unable to display this order. Contact us if you completed a payment.",
    "confirm.toastSuccess": "Payment confirmed — order {number}",
    "confirm.step.paid": "Paid",
    "confirm.step.preparing": "Preparing",
    "confirm.step.delivered": "Ready / Delivered",
    "confirm.status.paid": "Paid",
    "confirm.status.accepted": "Confirmed",
    "confirm.status.preparing": "Preparing",
    "confirm.status.delivered": "Delivered / Ready",
    "confirm.status.pending_payment": "Awaiting payment",
    "confirm.status.cancelled": "Cancelled",
    "confirm.status.unknown": "Processing",
    "confirm.pickupModeValue": "Pickup at Saá Mokolo boutique",
    "confirm.deliveryModeValue": "Home delivery",
  },
};

const TYPE_CATALOGUE_I18N = {
  "bone-straight": { desc: "maison.d1" },
  "body-waves": { desc: "maison.d2" },
  "deep-waves": { desc: "maison.d3" },
  "pixies-curls": { desc: "maison.d6" },
  bob: { desc: "maison.d7" },
  "pixie-cut": { desc: "maison.d8" },
  "layered-hair": { desc: "maison.d9" },
  extensions: { title: "maison.ext", desc: "maison.extDesc" },
  entretien: { title: "maison.care", desc: "maison.careDesc" },
  apprentissage: { title: "maison.learn", desc: "maison.learnDesc" },
  commentaires: { title: "maison.feedback", desc: "maison.feedbackDesc" },
};

function libelleTypeCatalogue(slug, nomDefaut) {
  const meta = TYPE_CATALOGUE_I18N[slug];
  if (meta?.title) return t(meta.title);
  return nomDefaut || slug;
}

function descriptionTypeCatalogue(slug, descDefaut) {
  const meta = TYPE_CATALOGUE_I18N[slug];
  if (meta?.desc) return t(meta.desc);
  return descDefaut || "";
}

const LANG_CLE = "jf_lang";
let langueActuelle = "fr";

(function initLangue() {
  const matchPath = window.location.pathname.match(/\/(fr|en|de)\//);
  if (matchPath && I18N[matchPath[1]]) {
    langueActuelle = matchPath[1];
    return;
  }
  const sauvee = localStorage.getItem(LANG_CLE);
  if (sauvee && I18N[sauvee]) {
    langueActuelle = sauvee;
  }
})();

// Traduit une clé, avec interpolation optionnelle {variable}
function t(cle, vars) {
  const dict = I18N[langueActuelle] || I18N.fr;
  let texte = dict[cle] != null ? dict[cle] : (I18N.fr[cle] != null ? I18N.fr[cle] : cle);
  if (vars) {
    Object.keys(vars).forEach((k) => {
      texte = texte.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    });
  }
  return texte;
}

function tAll(cle) {
  return {
    fr: I18N.fr[cle] != null ? I18N.fr[cle] : cle,
    de: I18N.de[cle] != null ? I18N.de[cle] : I18N.fr[cle] != null ? I18N.fr[cle] : cle,
    en: I18N.en[cle] != null ? I18N.en[cle] : I18N.fr[cle] != null ? I18N.fr[cle] : cle,
  };
}

// Applique les traductions aux éléments marqués data-i18n*
function appliquerTraductions() {
  document.documentElement.lang = langueActuelle;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });

  mettreAJourAriaMenuMobile();
  if (typeof mettreAJourLiensLegaux === "function") mettreAJourLiensLegaux();
  if (typeof mettreAJourNavbarAuth === "function") mettreAJourNavbarAuth();
  if (typeof mettreAJourEnteteType === "function") mettreAJourEnteteType();
  if (typeof actualiserLibellesCatalogueMenu === "function") actualiserLibellesCatalogueMenu();

  const docTitleKey = document.body?.dataset.i18nDocTitle;
  if (docTitleKey) {
    document.title = t(docTitleKey);
  }

  // État actif des boutons de langue
  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === langueActuelle);
  });
}

function changerLangue(lang) {
  if (!I18N[lang]) return;
  if (typeof redirigerPageLegaleSiBesoin === "function" && redirigerPageLegaleSiBesoin(lang)) {
    return;
  }
  langueActuelle = lang;
  localStorage.setItem(LANG_CLE, lang);
  appliquerTraductions();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

function mettreAJourAriaMenuMobile() {
  const navbar = document.querySelector(".navbar");
  const btn = document.querySelector(".nav-menu-btn");
  if (!btn) return;
  const ouvert = navbar && navbar.classList.contains("menu-open");
  btn.setAttribute("aria-label", t(ouvert ? "nav.menuClose" : "nav.menu"));
}

function fermerMenuMobile() {
  const navbar = document.querySelector(".navbar");
  const btn = document.querySelector(".nav-menu-btn");
  if (!navbar || !btn) return;
  navbar.classList.remove("menu-open");
  document.body.classList.remove("menu-open");
  btn.setAttribute("aria-expanded", "false");
  mettreAJourAriaMenuMobile();
}

function basculerMenuMobile() {
  const navbar = document.querySelector(".navbar");
  const btn = document.querySelector(".nav-menu-btn");
  if (!navbar || !btn) return;
  const ouvert = navbar.classList.toggle("menu-open");
  document.body.classList.toggle("menu-open", ouvert);
  btn.setAttribute("aria-expanded", ouvert ? "true" : "false");
  mettreAJourAriaMenuMobile();
}

function ancrerNavMobile() {
  const navbar = document.querySelector(".navbar");
  const nav = document.getElementById("site-nav");
  const tools = navbar?.querySelector(".navbar-tools");
  if (!navbar || !nav) return;

  if (window.innerWidth <= 900) {
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }
  } else if (tools && nav.parentElement !== navbar) {
    navbar.insertBefore(nav, tools);
  }
}

function initMenuMobile() {
  const navbar = document.querySelector(".navbar");
  const btn = document.querySelector(".nav-menu-btn");
  const nav = document.getElementById("site-nav");
  if (!navbar || !btn || !nav) return;

  ancrerNavMobile();

  btn.addEventListener("click", basculerMenuMobile);

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) fermerMenuMobile();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navbar.classList.contains("menu-open")) {
      fermerMenuMobile();
    }
  });

  window.addEventListener("resize", () => {
    ancrerNavMobile();
    if (window.innerWidth > 900) fermerMenuMobile();
    else if (typeof injecterCatalogueMenuMobile === "function") injecterCatalogueMenuMobile();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  appliquerTraductions();
  initMenuMobile();
  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.addEventListener("click", () => changerLangue(b.dataset.lang));
  });
});
