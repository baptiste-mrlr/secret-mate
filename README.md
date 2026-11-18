# 🎁 Secret Mate — IAE Valenciennes (Campus du Mont-Houy)

Application web responsive (**Mobile-First**) conçue pour **Google Firebase (Hosting + Realtime Database)** avec un **Mode Local automatique (`localStorage`)** pour les tests directs sur ordinateur.

---

## 🔥 Fonctionnement Hybride Automatique (Google Firebase + Mode Local PC)

L'application détecte toute seule son environnement dans [`initFirebaseOrLocalEngine()`](js/app.js) :

1. **💻 En test direct sur votre ordinateur (`secretmateiaeva.html` ouvert en local) :**
   - Aucune connexion serveur requise : l'application utilise automatiquement `localStorage` et `BroadcastChannel` (synchronisation instantanée entre plusieurs onglets du même navigateur).
   - Le badge en haut du Cockpit BDE affiche : **`💻 Mode Local (Tests PC)`**.
2. **🔥 Une fois publié sur Google Firebase (`firebase deploy`) :**
   - L'application lit automatiquement la configuration native `/__/firebase/init.json` générée par **Firebase Hosting** et se connecte en WebSocket temps réel au nœud `secret_mate_iae_v3` de votre **Firebase Realtime Database**.
   - Toutes les actions du BDE (inscriptions, tirage, lieux indices, Master Switch) se répercutent en moins de 100 ms sur tous les smartphones des étudiants.
   - Le badge en haut du Cockpit BDE passe automatiquement sur : **`🔥 Firebase Temps Réel Actif`**.

---

## 🚀 Publier sur Google Firebase en 3 étapes

1. Créez un projet gratuit sur [console.firebase.google.com](https://console.firebase.google.com/) et activez **Realtime Database** (en *Mode Test* ou avec les règles fournies dans `database.rules.json`).
2. Ouvrez un terminal dans ce dossier et exécutez :
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy
   ```
3. Votre site est immédiatement en ligne sur `https://votre-projet.web.app` et relié à sa base de données temps réel !

---

## 🎛️ Le Cockpit BDE : Contrôle Total sur 100 % de l'Application

Accessible via le bouton discret **`🔒 Accès BDE`** dans le footer (ou `#bde` / `Ctrl + Shift + B`) avec le code PIN **`IAE2026`** (modifiable) :

1. **🚀 1. Pilotage, Inscriptions & Dévoilement** (Ouverture/fermeture des inscriptions et de la pioche, Master Switch `ON/OFF`, programmateur horaire + test 10 secondes, algorithmes de Fisher-Yates et de Dérangement $\forall i, p(i) \neq i$).
2. **👥 2. Inscrits & Pochettes** (Ajout, modification complète de chaque inscrit, réinitialisation d'une pioche, remplacement par un Lutin de secours, suppression).
3. **📍 3. Lieux Indices & Messages du Campus** (Personnalisation du nom, du badge, du message d'indice et du défi binôme pour chaque bâtiment du Mont-Houy).
4. **🎨 4. Textes, Secrets de Promo & Export** (Modification de tous les textes du site, des catégories de Secrets de promo, du code PIN BDE et export/import JSON & CSV).
