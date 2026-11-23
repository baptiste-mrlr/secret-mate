# 🎁 Secret Mate — IAE Valenciennes (Campus du Mont-Houy)

Application web responsive (**Mobile-First**) dédiée à l'intégration et au parrainage étudiant à l'IAE Valenciennes, avec synchronisation temps réel via **Google Firebase Realtime Database** et bascule automatique en **Mode Local PC** pour les tests hors ligne.

---

## 📁 Structure des fichiers

- [`secretmateiaeva.html`](secretmateiaeva.html) — Page principale de l'application (Accueil, Formulaire d'inscription, Espace Étudiant, Cockpit BDE).
- [`css/styles.css`](css/styles.css) — Feuille de style (*Neo-Pop Campus & Mystery Club*) et règles d'affichage responsive mobile/impression.
- [`js/app.js`](js/app.js) — Logique applicative, algorithmes de tirage (Fisher-Yates & Dérangement) et moteur hybride de synchronisation Firebase / Local.
- [`database.rules.json`](database.rules.json) — Règles de sécurité pour Google Firebase Realtime Database.
- [`firebase.json`](firebase.json) — Configuration d'hébergement pour Firebase Hosting (optionnel).

---

## ✨ Fonctionnalités principales

- **Formulaire d'inscription étudiant** :
  - Validation du domaine universitaire configurable par le BDE.
  - Liste déroulante des **filières / formations IAE** entièrement administrable par le BDE.
  - Choix du profil (**Nouvel arrivant**, **Ancien / Parrain**, **Étudiant International**), sélection d'un **« Secret de promo »**, rédaction de **3 énigmes personnelles** et volontariat en tant que **Lutin de secours**.
- **Espace personnel étudiant (`2. Ma Pioche`)** :
  - Consultation et impression de la fiche pochette personnelle.
  - Pioche aléatoire garantie sans auto-attribution (`∀i, p(i) ≠ i`), débloquée uniquement lorsque le BDE décide d'ouvrir la pioche (en général après clôture des inscriptions).
  - Compte à rebours et dévoilement en direct de l'identité du binôme avec lien de contact **WhatsApp**.
- **Ergonomie mobile dédiée** :
  - Bandeau d'annonce BDE en haut de page qui défile sans chevaucher l'en-tête fixe.
  - Barre de navigation fixe en bas d'écran sur smartphone et pied de page ancré en bas de contenu.

---

## 🔄 Synchronisation hybride (Google Firebase + Mode Local PC)

L'application sélectionne automatiquement le mode adapté dans [`initFirebaseOrLocalEngine()`](js/app.js) :

1. **💻 Mode Local PC (`secretmateiaeva.html` ouvert directement en `file://`) :**
   - Aucune configuration ni connexion requise pour effectuer des tests sur un ordinateur.
   - Les données sont stockées dans `localStorage` et synchronisées entre onglets du navigateur via `BroadcastChannel` (`Mode Local (Tests PC)`).

2. **🔥 Mode Cloud Temps Réel (site hébergé en HTTPS : GitHub Pages, Firebase Hosting, etc.) :**
   - Connexion à **Google Firebase Realtime Database** sur le nœud `secret_mate_iae_v4`.
   - Double transport combinant l'API **REST** et le **SDK WebSocket Firebase**, complété par une vérification périodique et une resynchronisation automatique au retour sur l'onglet.
   - Écritures atomiques par participant et mises à jour ciblées de la configuration BDE, avec panneau de diagnostic intégré dans le Cockpit BDE et indicateur de statut (`● Sync Firebase Live`).

---

## 🚀 Publication & Déploiement

### Méthode sans terminal (GitHub Pages + Firebase Realtime Database)

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com/) puis activez **Realtime Database** et appliquez les règles de [`database.rules.json`](database.rules.json).
2. Dans [`js/app.js`](js/app.js), renseignez votre URL dans la constante `FIREBASE_DATABASE_URL` :
   ```js
   const FIREBASE_DATABASE_URL = 'https://<votre-projet>-default-rtdb.europe-west1.firebasedatabase.app';
   ```
3. Déposez les fichiers du projet (`secretmateiaeva.html`, `css/`, `js/`) sur **GitHub Pages** (ou tout autre hébergeur statique HTTPS).

### Alternative en ligne de commande (Firebase Hosting)

Si vous souhaitez héberger l'ensemble directement sur **Firebase Hosting**, utilisez les fichiers [`firebase.json`](firebase.json) et [`database.rules.json`](database.rules.json) avec `firebase-tools` :

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```

---

## 🎛️ Le Cockpit BDE (4 onglets d'administration)

L'espace d'administration est accessible via le bouton **`Accès BDE`** situé dans le pied de page, protégé par un code PIN administrateur configurable et modifiable depuis le back-office :

1. **Pilotage, Inscriptions & Dévoilement** : contrôle de la chronologie (*Ouverture des inscriptions* → *Clôture & ouverture de la pioche*), Master Switch ON/OFF du dévoilement, programmateur date/heure avec mode test 10 s, algorithme 1 (mélange non-alphabétique **Fisher-Yates**) et algorithme 2 (**Dérangement** sans auto-attribution, avec options *Même filière uniquement* et *Parrainage prioritaire*).
2. **Inscrits & Pochettes** : ajout manuel, modification complète de chaque profil et de ses énigmes, réinitialisation d'une pioche, gestion des *Lutins de secours* et suppression.
3. **Lieux Indices & Messages du Campus** : ajout, édition et suppression des lieux du Campus du Mont-Houy, personnalisation des messages d'indices et des défis brise-glace associés.
4. **Filières IAE, Textes, Secrets & Export** : gestion de la liste déroulante des filières IAE, édition des textes globaux du site et des catégories de *Secrets de promo*, paramétrage du domaine email autorisé, modification du code PIN BDE, et export/import complet au format JSON ou CSV.

---

## 🔒 Bonnes pratiques de sécurité

- **Ne jamais inscrire** le mot de passe / code PIN du Cockpit BDE (ni de données personnelles d'inscrits) dans ce `README.md` ou dans tout document public.
- **Modifier le code PIN** directement depuis l'onglet 4 du Cockpit BDE avant de diffuser le lien aux étudiants.
- **Restreindre ou archiver** la base Firebase Realtime Database (via les règles `.read` / `.write` dans la console Firebase) une fois l'événement d'intégration terminé.
