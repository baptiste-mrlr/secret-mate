/**
 * ============================================================================
 * SECRET MATE — IAE VALENCIENNES (CAMPUS DU MONT-HOUY)
 * Architecture Full-Stack Temps Réel • Contrôle 100% BDE (Inscriptions, Lieux,
 * Messages des Lieux Indices, Défis, Secrets de Promo, Dévoilement & CRUD)
 * ============================================================================
 */

const STATE_STORAGE_KEY = 'secret_mate_iae_v4_state';
const SESSION_EMAIL_KEY = 'secret_mate_iae_student_email';
const FIREBASE_DB_NODE = 'secret_mate_iae_v4';
const BROADCAST_CHANNEL_NAME = 'secret_mate_iae_v4_channel';

// ============================================================================
// CONNEXION GOOGLE FIREBASE REALTIME DATABASE (SANS TERMINAL) :
// Collez ici l'adresse de votre Realtime Database copiée depuis console.firebase.google.com
// Exemple : const FIREBASE_DATABASE_URL = 'https://secret-mate-iae-default-rtdb.europe-west1.firebasedatabase.app';
// (Lorsque vous ouvrez secretmateiaeva.html en local sur votre PC, le site reste
// automatiquement en Mode Local pour vos tests !)
// ============================================================================
const FIREBASE_DATABASE_URL = 'https://secret-mate-4f93a-default-rtdb.europe-west1.firebasedatabase.app';

/**
 * Helpers de nettoyage, normalisation et génération d'IDs compatibles Google Firebase
 */
function sanitizeForFirebase(obj) {
  if (obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj));
}

function sanitizeFirebaseKey(id) {
  return String(id || '').replace(/[.#$\[\]\/]/g, '_') || `stu_${Date.now()}`;
}

function makeParticipantId() {
  return `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function safeStorageGet(key) {
  try {
    return window.localStorage ? window.localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    if (window.localStorage) window.localStorage.setItem(key, value);
  } catch (e) {}
}

function safeStorageRemove(key) {
  try {
    if (window.localStorage) window.localStorage.removeItem(key);
  } catch (e) {}
}

function generateSyncRev() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeList(val) {
  if (Array.isArray(val)) return val.filter(item => item != null);
  if (val && typeof val === 'object') {
    return Object.keys(val)
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      })
      .map(k => val[k])
      .filter(item => item != null);
  }
  return [];
}

function normalizeParticipants(raw) {
  const arr = normalizeList(raw);
  const seenIds = new Set();
  const seenEmails = new Set();
  const result = [];

  arr.forEach((p, idx) => {
    if (!p || typeof p !== 'object') return;
    const email = String(p.email || '').trim().toLowerCase();
    const rawId = p.id || (email ? `stu-${email.replace(/[^a-z0-9]/g, '-')}` : `stu-${idx + 1}`);
    const id = sanitizeFirebaseKey(rawId);
    if (seenIds.has(id) || (email && seenEmails.has(email))) return;
    seenIds.add(id);
    if (email) seenEmails.add(email);

    const riddlesRaw = normalizeList(p.riddles);
    const pouchNumber = Number(p.pouchNumber) > 0 ? Number(p.pouchNumber) : idx + 1;
    const parsedDrawn = Number(p.drawnPouchNumber);
    const drawnPouchNumber =
      p.drawnPouchNumber != null && !isNaN(parsedDrawn) && parsedDrawn > 0 ? parsedDrawn : null;

    const contact = String(p.instagram || p.whatsapp || '').trim();

    result.push({
      id,
      firstName: String(p.firstName || '').trim(),
      lastName: String(p.lastName || '').trim(),
      email,
      instagram: contact,
      whatsapp: contact,
      promo: String(p.promo || '').trim(),
      role: String(p.role || 'nouveau'),
      secretType: String(p.secretType || ''),
      riddles: [
        String(riddlesRaw[0] ?? ''),
        String(riddlesRaw[1] ?? ''),
        String(riddlesRaw[2] ?? '')
      ],
      location: String(p.location || ''),
      isBackupMate: Boolean(p.isBackupMate),
      pouchNumber,
      drawnPouchNumber,
      hasDrawn: Boolean(p.hasDrawn)
    });
  });

  return result;
}

function normalizeSettings(rawSettings, fallbackSettings = null) {
  const def = getDefaultSettings();
  const base = fallbackSettings ? { ...def, ...fallbackSettings } : def;
  const src = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const merged = { ...base, ...src };

  const promos = normalizeList(src.promoOptions)
    .map(p => String(p || '').trim())
    .filter(Boolean);
  const locations = normalizeList(src.campusLocations).filter(
    l => l && typeof l === 'object' && l.name
  );
  const secrets = normalizeList(src.secretCategories).filter(
    s => s && typeof s === 'object' && s.title
  );

  merged.promoOptions =
    promos.length > 0
      ? promos
      : Array.isArray(base.promoOptions) && base.promoOptions.length > 0
      ? base.promoOptions
      : def.promoOptions;
  merged.campusLocations =
    locations.length > 0
      ? locations
      : Array.isArray(base.campusLocations) && base.campusLocations.length > 0
      ? base.campusLocations
      : def.campusLocations;
  merged.secretCategories =
    secrets.length > 0
      ? secrets
      : Array.isArray(base.secretCategories) && base.secretCategories.length > 0
      ? base.secretCategories
      : def.secretCategories;

  merged.registrationsOpen =
    src.registrationsOpen !== undefined
      ? Boolean(src.registrationsOpen)
      : Boolean(base.registrationsOpen);
  merged.drawingOpen =
    src.drawingOpen !== undefined ? Boolean(src.drawingOpen) : Boolean(base.drawingOpen);
  merged.masterRevealForce =
    src.masterRevealForce !== undefined
      ? Boolean(src.masterRevealForce)
      : Boolean(base.masterRevealForce);
  merged.prioritizeMentors =
    src.prioritizeMentors !== undefined
      ? Boolean(src.prioritizeMentors)
      : Boolean(base.prioritizeMentors);
  merged.samePromoOnly =
    src.samePromoOnly !== undefined ? Boolean(src.samePromoOnly) : Boolean(base.samePromoOnly);

  return merged;
}

function participantsToFirebaseMap(list) {
  const map = {};
  (list || []).forEach(p => {
    const key = sanitizeFirebaseKey(p.id);
    map[key] = sanitizeForFirebase({ ...p, id: key });
  });
  return map;
}

/**
 * Banques d'idées pour le générateur d'énigmes brise-glace
 */
const RIDDLE_IDEAS = {
  1: [
    "J'ai 20 ans, je viens d'arriver en L3 MDO à l'IAE Valenciennes et je ne commence jamais ma journée sans un café.",
    "Étudiant(e) en Master à l'IAE, je connais tous les raccourcis entre le terminus du tram et les amphis !",
    "Nouvel arrivant sur Valenciennes, je suis passionné(e) de sport et de musique urbaine.",
    "En échange international au Pôle Matisse, j'adore faire découvrir la gastronomie de mon pays.",
    "En L1 à l'IAE, je cherche un binôme pour réviser la gestion et découvrir les bons plans de Valenciennes.",
    "Ancien(ne) de L3, j'ai survécu à tous les partiels grâce à mes fiches de révision ultra-synthétiques.",
    "Fan de marketing digital et de podcasts entrepreneuriaux, je note toutes mes idées dans mon téléphone.",
    "Arrivé(e) en L3 CCA cette année après un BTS/BUT, j'apprends encore où se cachent toutes les salles du campus.",
    "Originaire du Nord, je peux te citer les meilleures adresses de friteries et cafés autour de Valenciennes.",
    "Passionné(e) de cinéma et de séries, je débats volontiers des dernières sorties entre deux CM.",
    "Toujours partant(e) pour les tournois sportifs universitaires ou les projets associatifs de l'IAE.",
    "Grand(e) amateur(trice) de thé glacé même en plein hiver valenciennois !",
    "En Master cette année, je prépare mon alternance tout en essayant de ne pas rater le tram du matin.",
    "Accro aux voyages : j'ai déjà visité au moins quatre pays et je rêve du prochain semestre Erasmus.",
    "Je fais partie de ceux qui arrivent 5 minutes en avance en TD... surtout pour choisir la prise électrique.",
    "Plutôt team sucré que team salé : impossible de résister à un cookie de la cafétéria à 10h.",
    "Passionné(e) de photographie ou de montage vidéo, j'ai toujours un œil sur l'esthétique des présentations.",
    "J'ai déjà fait deux fois le tour du campus du Mont-Houy avant de trouver le bon bâtiment la semaine dernière !"
  ],
  2: [
    "Tu me reconnaîtras facilement : j'ai toujours un tote-bag clair et un casque audio autour du cou.",
    "Je porte souvent des baskets blanches et j'arrive toujours pile quand le tram s'arrête devant l'IAE.",
    "J'ai un ordinateur recouvert de stickers et un carnet rouge posé sur ma table de TD.",
    "On me croise à chaque pause près des lignes colorées de la Maison des Étudiants (MSE).",
    "J'ai toujours une gourde colorée sur mon bureau et je prends mes notes sur tablette ou ordi.",
    "Je porte souvent une veste ou un sweat bordeaux et je souris tout le temps dans les couloirs.",
    "J'ai un porte-clés accroché à mon sac à dos et une coque de téléphone très voyante.",
    "On me repère vite à mes lunettes et à ma tasse ou mon thermos que je ne lâche jamais.",
    "J'ai souvent des écouteurs filaires ou un bonnet/casquette dès qu'il fait un peu frais sur le campus.",
    "Je garde toujours un paquet de bonbons ou de chewing-gums dans la poche avant de mon sac.",
    "J'utilise des stylos quatre couleurs et des post-it fluo dans absolument tous mes cours.",
    "On m'entend rire avant de me voir dans le hall du bâtiment IAE pendant l'intercours !",
    "J'ai une montre connectée et je consulte l'heure toutes les dix minutes avant le tram de 17h.",
    "Je m'installe presque toujours au même endroit dans l'amphi (côté fenêtre, milieu de rangée).",
    "Tu me verras souvent réviser au calme au premier étage de la BU avec mon plaid ou mon gros pull.",
    "J'ai une sacoche en toile / cuir pour mon PC portable qui ne me quitte jamais.",
    "Je prends presque toujours le même menu ou snack à la pause de midi devant le RU.",
    "J'ai un autocollant ou pin's original sur mon sac ou ma veste : observe bien pendant l'Afterwork !"
  ],
  3: [
    "Viens me voir à l'Afterwork avec le mot de passe « Hainaut » pour débloquer ton Secret de promo !",
    "Défi pour toi : demande-moi quelle est ma ligne de couleur préférée au sol de la MSE (Jaune, Verte, Corail ou Bleue) !",
    "Défi : retrouve-moi près du comptoir de l'Afterwork et devine ma série ou mon film préféré du moment !",
    "Si tu me retrouves en personne, je te partage mes fiches de cours et mon meilleur bon plan du Mont-Houy !",
    "Défi du midi : viens me demander mon restaurant ou café préféré de Valenciennes pour gagner ton cadeau !",
    "Retrouve-moi près du baby-foot de la MSE à l'Afterwork avec le mot de passe secret « Mont-Houy » !",
    "Défi express : cite-moi ton plat préféré en 3 secondes quand tu m'abordes pour lancer notre binôme !",
    "Si tu me repères dans le hall IAE, fais-moi le signe V de Valenciennes avant de te présenter !",
    "Défi musical : devine l'artiste que j'écoute le plus en ce moment (indice : je te le dirai en 1 mot) !",
    "Challenge photo : propose-moi un selfie binôme devant le mur 4 couleurs de la MSE dès qu'on se trouve !",
    "Viens me poser cette question piège à l'Afterwork : « Plutôt tram T1 ou bus ? » pour me prouver que c'est toi !",
    "Défi café : propose-moi un pierre-feuille-ciseaux en 1 manche gagnante dès notre première rencontre !",
    "Si tu me trouves, dis-moi « Mission Secret Mate accomplie ! » et je t'offre la surprise de ma pochette.",
    "Challenge rapide : recommande-moi un film, une série ou une musique à découvrir cette semaine !",
    "Défi IAE : devine en moins de 3 essais dans quelle filière précise je suis cette année !",
    "Viens me serrer la main en disant « Équipe Secret Mate #IAE » : tu repars avec mon astuce campus bonus !",
    "Défi campus : raconte-moi ta plus grosse galère d'orientation au Mont-Houy quand on se croise à l'Afterwork !",
    "Mot de passe secret : chuchote « Pochette mystère validée » quand tu viens récupérer ton Secret de promo !"
  ]
};

/**
 * Lieux stratégiques par défaut du Campus du Mont-Houy (100% éditables par le BDE)
 */
function getDefaultCampusLocations() {
  return [
    {
      id: 'loc-mse',
      name: 'Maison des Étudiants (MSE)',
      tag: '🎨 Code 4 Couleurs',
      tip: "Suis les 4 lignes de couleur au sol (Jaune, Vert, Corail, Bleu) jusqu'au foyer de la MSE : c'est là que ton Secret Mate t'attend pour l'Afterwork de 18h à 20h !",
      challenge: "Prenez un selfie binôme devant les 4 lignes de couleur de la MSE et échangez votre meilleur bon plan de la rentrée !"
    },
    {
      id: 'loc-iae',
      name: 'Bâtiment IAE (face au terminus du tram)',
      tag: '🚋 QG IAE & Tram',
      tip: "Rendez-vous dans le hall principal du Bâtiment IAE, juste en face de la station de tramway « Campus Mont-Houy » près des panneaux d'affichage.",
      challenge: "Comparez vos emplois du temps dans le hall de l'IAE et bloquez votre première pause café de la semaine !"
    },
    {
      id: 'loc-matisse',
      name: 'Bâtiment Matisse (Pôle International)',
      tag: '🌍 International',
      tip: "Direction l'entrée du Bâtiment Matisse, point de ralliement des étudiants internationaux et des échanges Erasmus du campus.",
      challenge: "Apprenez-vous mutuellement 3 expressions (en langue étrangère ou en Ch'ti !) pour briser la glace."
    },
    {
      id: 'loc-bu',
      name: 'Bibliothèque Universitaire (BU)',
      tag: '📚 Fiches & Révisions',
      tip: "Retrouve les indices autour du parvis de la Bibliothèque Universitaire (BU), le spot incontournable pour réviser en groupe à deux pas de l'IAE.",
      challenge: "Partagez vos meilleures méthodes de prise de notes et réservez votre premier créneau d'entraide avant les partiels !"
    },
    {
      id: 'loc-ru',
      name: 'Restaurant Universitaire (RU)',
      tag: '🍽️ Pause & Convivialité',
      tip: "Indice rattaché au Restaurant Universitaire (RU) du Mont-Houy, le cœur gourmand où toutes les promos se croisent le midi.",
      challenge: "Offrez-vous un café ou partagez un snack convivial en débrieffant votre première semaine à l'IAE Valenciennes !"
    }
  ];
}

/**
 * Catégories par défaut de « Secrets de promo » (100% éditables par le BDE)
 */
function getDefaultSecretCategories() {
  return [
    {
      id: 'sec-fiches',
      title: 'Fiches de révision / Prise de notes',
      icon: '📚',
      desc: 'Synthèses de cours, annales, drive ou méthodo pour réussir ses partiels.'
    },
    {
      id: 'sec-campus',
      title: 'Bons plans campus & stationnement/tram',
      icon: '🚋',
      desc: 'Astuces parking Mont-Houy, horaires tram, raccourcis et adresses étudiantes.'
    },
    {
      id: 'sec-culture',
      title: 'Spécialité culturelle internationale',
      icon: '🌍',
      desc: 'Souvenir, recette, snack typique ou découverte interculturelle.'
    },
    {
      id: 'sec-cafe',
      title: 'Café / Snack',
      icon: '☕',
      desc: 'Un bon pour un café ou gourmandise à partager à la MSE ou au RU.'
    }
  ];
}

/**
 * Date cible par défaut pour l'Afterwork (18h00)
 */
function getDefaultRevealIsoString() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(18, 0, 0, 0);
  if (now >= target) {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }
  return target.toISOString();
}

/**
 * Liste par défaut des Filières / Formations de l'IAE Valenciennes (100% éditable par le BDE)
 */
function getDefaultPromoOptions() {
  return [
    'Management des Organisations (L3 / Master MDO)',
    'Comptabilité, Contrôle & Audit (L3 / Master CCA)',
    'Gestion & Économie (L1 / L2 Licence)',
    'Marketing, Vente & GRH (L3 / Master)'
  ];
}

/**
 * Paramètres globaux pilotés par le BDE
 */
function getDefaultSettings() {
  return {
    topAnnouncement:
      "Bienvenue sur Secret Mate ! Inscris-toi avec ton mail @uphf.fr et dépose ta pochette numérotée au BDE avant l'Afterwork.",
    heroTitle: "Secret Mate – L'intégration mystère de l'IAE Valenciennes",
    heroSubtitle:
      "Réinventons le Secret Santa dès le mois de septembre sur le Campus du Mont-Houy ! Échange un « Secret de promo » (fiches de cours, astuces tram/parking, spécialité internationale), résous 3 énigmes et forme ton binôme d'entraide lors de l'Afterwork.",
    afterworkTitle: 'Afterwork Maison des Étudiants (18h-20h)',
    afterworkSpot: 'RDV : Comptoir MSE (4 couleurs)',
    budgetLabel: 'max 2 € ou 100 % gratuit',
    emailDomain: '@uphf.fr',
    adminPin: 'IAE2026',
    registrationsOpen: true,
    closedRegistrationMessage:
      "Les inscriptions en ligne sont maintenant clôturées par le BDE ! Si tu es déjà inscrit, consulte ta pioche dans l'onglet 2 avec ton adresse @uphf.fr.",
    // Par défaut, la pioche est verrouillée tant que le BDE n'a pas clôturé les inscriptions (ou décidé d'ouvrir la pioche)
    drawingOpen: false,
    closedDrawingMessage:
      "Les inscriptions sont en cours ! Dès que le BDE clôturera les inscriptions et donnera le top départ, tu pourras piocher ta pochette Secret Mate aléatoire ici.",
    revealScheduledAt: getDefaultRevealIsoString(),
    masterRevealForce: false,
    customRevealMessage:
      "🎉 C'est l'heure ! Retrouve vite ton Secret Mate près du comptoir de l'Afterwork à la MSE pour récupérer ta pochette et former ton binôme !",
    lockedSubMessage:
      "En attendant l'heure officielle du BDE, résous les 3 énigmes et rends-toi sur le lieu indice de ta pochette piochée !",
    prioritizeMentors: true,
    samePromoOnly: false,
    promoOptions: getDefaultPromoOptions(),
    campusLocations: getDefaultCampusLocations(),
    secretCategories: getDefaultSecretCategories()
  };
}

/**
 * Base initiale de 10 profils d'étudiants avec adresses @uphf.fr et filières IAE officielles
 */
function getInitialDemoParticipants() {
  return [
    {
      id: 'stu-lucas-martin',
      firstName: 'Lucas',
      lastName: 'Martin',
      email: 'lucas.martin@uphf.fr',
      instagram: '@lucas.m_iae',
      whatsapp: '@lucas.m_iae',
      promo: 'Management des Organisations (L3 / Master MDO)',
      role: 'nouveau',
      secretType: 'Café / Snack',
      riddles: [
        "J'ai 20 ans, je viens d'arriver en L3 MDO (Management des Organisations) à l'IAE Valenciennes et je découvre le campus du Mont-Houy !",
        'Je prends le tram tous les matins, j’ai un sac à dos noir et je cherche toujours la machine à café entre deux cours.',
        "Retrouve-moi à l'Afterwork de 18h : j'offre un café/snack à la MSE en échange de tes meilleurs conseils pour réussir ma L3 MDO !"
      ],
      location: 'Maison des Étudiants (MSE)',
      isBackupMate: false,
      pouchNumber: 7,
      drawnPouchNumber: 3,
      hasDrawn: false
    },
    {
      id: 'stu-camille-lefebvre',
      firstName: 'Camille',
      lastName: 'Lefebvre',
      email: 'camille.lefebvre@uphf.fr',
      instagram: '@camille.lfb',
      whatsapp: '@camille.lfb',
      promo: 'Management des Organisations (L3 / Master MDO)',
      role: 'parrain',
      secretType: 'Fiches de révision / Prise de notes',
      riddles: [
        "J'ai validé ma L3 MDO l'an dernier à l'IAE avec mention et j'ai conservé toutes mes fiches de révision.",
        'On me croise souvent dans le foyer de la MSE avec un stabilo jaune pastel et un carnet à spirales.',
        'Ma pochette contient le kit de survie complet pour réussir son année en L3 MDO (fiches + annales + conseils profs) !'
      ],
      location: 'Maison des Étudiants (MSE)',
      isBackupMate: true,
      pouchNumber: 3,
      drawnPouchNumber: 2,
      hasDrawn: true
    },
    {
      id: 'stu-amine-benali',
      firstName: 'Amine',
      lastName: 'Benali',
      email: 'amine.benali@uphf.fr',
      instagram: '@amine.bnl',
      whatsapp: '@amine.bnl',
      promo: 'Comptabilité, Contrôle & Audit (L3 / Master CCA)',
      role: 'parrain',
      secretType: 'Bons plans campus & stationnement/tram',
      riddles: [
        'Je connais toutes les places de stationnement secrètes du Mont-Houy où il reste de la place à 8h25 !',
        "Je porte le sweat bordeaux de l'IAE et je passe mes pauses entre le terminus du tram et le local BDE.",
        "Demande-moi l'astuce pour éviter toute file d'attente au RU à 12h15 !"
      ],
      location: 'Bâtiment IAE (face au terminus du tram)',
      isBackupMate: true,
      pouchNumber: 1,
      drawnPouchNumber: 9,
      hasDrawn: true
    },
    {
      id: 'stu-sofia-martinez',
      firstName: 'Sofia',
      lastName: 'Martínez',
      email: 'sofia.martinez@uphf.fr',
      instagram: '@sofia.mtz_val',
      whatsapp: '@sofia.mtz_val',
      promo: 'Comptabilité, Contrôle & Audit (L3 / Master CCA)',
      role: 'international',
      secretType: 'Spécialité culturelle internationale',
      riddles: [
        "Je viens de Madrid pour un semestre d'échange à l'IAE Valenciennes et j'adore l'ambiance chaleureuse du Nord !",
        "J'ai toujours une écharpe colorée et je navigue entre le Bâtiment Matisse et l'IAE.",
        "J'ai glissé une spécialité espagnole dans ma pochette et une invitation à échanger en espagnol/français !"
      ],
      location: 'Bâtiment Matisse (Pôle International)',
      isBackupMate: false,
      pouchNumber: 9,
      drawnPouchNumber: 1,
      hasDrawn: true
    },
    {
      id: 'stu-hugo-dubois',
      firstName: 'Hugo',
      lastName: 'Dubois',
      email: 'hugo.dubois@uphf.fr',
      instagram: '@hugo.dbs',
      whatsapp: '@hugo.dbs',
      promo: 'Gestion & Économie (L1 / L2 Licence)',
      role: 'nouveau',
      secretType: 'Bons plans campus & stationnement/tram',
      riddles: [
        "Nouveau bachelier en L1 à l'IAE, je me suis déjà perdu deux fois entre la BU et le RU cette semaine !",
        "Fan de basket et de foot, j'ai un porte-clés rouge accroché à mon sac à dos.",
        'Quel est ton endroit préféré pour réviser au calme sur le campus du Mont-Houy ?'
      ],
      location: 'Bibliothèque Universitaire (BU)',
      isBackupMate: false,
      pouchNumber: 4,
      drawnPouchNumber: 5,
      hasDrawn: false
    },
    {
      id: 'stu-chloe-vasseur',
      firstName: 'Chloé',
      lastName: 'Vasseur',
      email: 'chloe.vasseur@uphf.fr',
      instagram: '@chloe.vsr',
      whatsapp: '@chloe.vsr',
      promo: 'Marketing, Vente & GRH (L3 / Master)',
      role: 'parrain',
      secretType: 'Fiches de révision / Prise de notes',
      riddles: [
        "C'est ma 4e rentrée au Mont-Houy : la BU n'a plus aucun secret pour moi.",
        'J’organise toutes mes prises de notes sur Notion avec un code à 4 couleurs.',
        'Ma pochette contient mon template Notion spécial IAE + mes fiches méthodo !'
      ],
      location: 'Bibliothèque Universitaire (BU)',
      isBackupMate: true,
      pouchNumber: 10,
      drawnPouchNumber: 8,
      hasDrawn: true
    },
    {
      id: 'stu-matteo-rossi',
      firstName: 'Matteo',
      lastName: 'Rossi',
      email: 'matteo.rossi@uphf.fr',
      instagram: '@matteo.rossi_iae',
      whatsapp: '@matteo.rossi_iae',
      promo: 'Management des Organisations (L3 / Master MDO)',
      role: 'international',
      secretType: 'Spécialité culturelle internationale',
      riddles: [
        "Arrivé de Bologne en Italie pour étudier le management en L3 MDO à l'IAE Valenciennes !",
        "Très exigeant sur l'espresso mais déjà conquis par l'accueil des étudiants du Mont-Houy.",
        "J'ai mis de vrais chocolats italiens gianduja dans ma pochette #02 !"
      ],
      location: 'Bâtiment Matisse (Pôle International)',
      isBackupMate: false,
      pouchNumber: 2,
      drawnPouchNumber: 6,
      hasDrawn: true
    },
    {
      id: 'stu-lea-carpentier',
      firstName: 'Léa',
      lastName: 'Carpentier',
      email: 'lea.carpentier@uphf.fr',
      instagram: '@lea.crpt',
      whatsapp: '@lea.crpt',
      promo: 'Management des Organisations (L3 / Master MDO)',
      role: 'nouveau',
      secretType: 'Café / Snack',
      riddles: [
        'Nouvelle arrivante en L3 MDO après un BTS, je viens en train + tram chaque matin.',
        "J'ai toujours un carnet rose poudré et une trousse remplie de feutres fins.",
        'Je cherche des camarades de promo pour déjeuner ensemble au RU cette semaine !'
      ],
      location: 'Restaurant Universitaire (RU)',
      isBackupMate: false,
      pouchNumber: 6,
      drawnPouchNumber: 7,
      hasDrawn: false
    },
    {
      id: 'stu-thomas-delattre',
      firstName: 'Thomas',
      lastName: 'Delattre',
      email: 'thomas.delattre@uphf.fr',
      instagram: '@thomas.dltr',
      whatsapp: '@thomas.dltr',
      promo: 'Marketing, Vente & GRH (L3 / Master)',
      role: 'parrain',
      secretType: 'Bons plans campus & stationnement/tram',
      riddles: [
        "Ancien de l'IAE Valenciennes, je connais toutes les associations étudiantes et sportives du Mont-Houy.",
        'Grand avec des lunettes rondes, souvent devant le bâtiment IAE face au terminus du tram.',
        "J'ai glissé un guide annoté des meilleurs bons plans étudiants de Valenciennes (stages, sport, sorties) !"
      ],
      location: 'Bâtiment IAE (face au terminus du tram)',
      isBackupMate: false,
      pouchNumber: 8,
      drawnPouchNumber: 10,
      hasDrawn: true
    },
    {
      id: 'stu-ines-boucher',
      firstName: 'Inès',
      lastName: 'Boucher',
      email: 'ines.boucher@uphf.fr',
      instagram: '@ines.bchr',
      whatsapp: '@ines.bchr',
      promo: 'Gestion & Économie (L1 / L2 Licence)',
      role: 'nouveau',
      secretType: 'Café / Snack',
      riddles: [
        "Originaire de l'Avesnois, je débarque en L1 à l'IAE avec plein d'enthousiasme !",
        'Je fais de la photo argentique et je prends déjà des clichés du campus.',
        "J'ai glissé des bêtises de Cambrai et un bon café dans ma pochette #05 !"
      ],
      location: 'Restaurant Universitaire (RU)',
      isBackupMate: false,
      pouchNumber: 5,
      drawnPouchNumber: 4,
      hasDrawn: false
    }
  ];
}

/**
 * ============================================================================
 * ALGORITHMES MATHÉMATIQUES : FISHER-YATES (NON-ALPHABÉTIQUE) & DÉRANGEMENT
 * ============================================================================
 */
const SecretMateAlgorithms = {
  fisherYatesShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * 1. Attribution aléatoire des numéros de pochettes (Non-alphabétique)
   */
  assignNonAlphabeticalNumbers(participants) {
    const n = participants.length;
    if (n === 0) return [];

    const alphaSortedIds = [...participants]
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')
      )
      .map(p => p.id);

    let shuffledIds = [];
    let attempts = 0;

    do {
      shuffledIds = this.fisherYatesShuffle(alphaSortedIds);
      attempts++;
      const samePosCount = shuffledIds.filter((id, idx) => id === alphaSortedIds[idx]).length;
      if (n <= 3 || samePosCount <= Math.floor(n * 0.2)) {
        break;
      }
    } while (attempts < 30);

    const idToPouch = new Map();
    shuffledIds.forEach((id, idx) => idToPouch.set(id, idx + 1));

    return participants.map(p => ({
      ...p,
      pouchNumber: idToPouch.get(p.id)
    }));
  },

  /**
   * Sous-routine de Dérangement sur un groupe donné (garantit ∀i, candidate[i] ≠ pouches[i])
   */
  derangeGroup(group, prioritizeMentors = true) {
    const m = group.length;
    if (m < 2) return new Map();

    const pouches = group.map(p => p.pouchNumber);
    const pouchMap = new Map();
    group.forEach(p => pouchMap.set(p.pouchNumber, p));

    const buildCandidate = () => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const candidate = this.fisherYatesShuffle(pouches);
        let ok = true;
        for (let i = 0; i < m; i++) {
          if (candidate[i] === pouches[i]) {
            ok = false;
            break;
          }
        }
        if (ok) return candidate;
      }
      // Fallback Sattolo garanti sans point fixe en O(m)
      const cycle = [...pouches];
      for (let i = m - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [cycle[i], cycle[j]] = [cycle[j], cycle[i]];
      }
      return cycle;
    };

    let bestDraw = buildCandidate();

    if (prioritizeMentors) {
      let bestScore = -1;
      for (let t = 0; t < 120; t++) {
        const candidate = buildCandidate();
        let score = 0;
        for (let i = 0; i < m; i++) {
          const student = group[i];
          const target = pouchMap.get(candidate[i]);
          if (!target) continue;

          const isMentorPair =
            (student.role === 'nouveau' && target.role === 'parrain') ||
            (student.role === 'parrain' && target.role === 'nouveau') ||
            (student.role === 'international' && target.role === 'parrain') ||
            (student.role === 'parrain' && target.role === 'international');

          if (isMentorPair) score += 12;
          else if (student.role !== target.role) score += 5;
        }
        if (score > bestScore) {
          bestScore = score;
          bestDraw = candidate;
        }
      }
    }

    const result = new Map();
    group.forEach((p, idx) => result.set(p.id, bestDraw[idx]));
    return result;
  },

  /**
   * 2. Tirage au sort sans auto-attribution (Algorithme de Dérangement ∀i, p(i) ≠ i)
   * Supporte l'option BDE "Même filière uniquement" (samePromoOnly) et "Parrainage prioritaire" (prioritizeMentors).
   */
  generateDerangement(participants, prioritizeMentors = true, samePromoOnly = false) {
    const n = participants.length;
    if (n < 2) return participants;

    const assignedMap = new Map();

    if (samePromoOnly) {
      // Regroupement par filière IAE
      const groupsByPromo = new Map();
      participants.forEach(p => {
        const key = (p.promo || 'Autre').trim();
        if (!groupsByPromo.has(key)) groupsByPromo.set(key, []);
        groupsByPromo.get(key).push(p);
      });

      const singletons = [];
      groupsByPromo.forEach(group => {
        if (group.length >= 2) {
          const groupAssignment = this.derangeGroup(group, prioritizeMentors);
          groupAssignment.forEach((drawnNum, id) => assignedMap.set(id, drawnNum));
        } else if (group.length === 1) {
          singletons.push(group[0]);
        }
      });

      // Si certaines filières n'ont qu'1 seul inscrit, on les apparie entre elles ou avec le groupe le plus large
      // pour ne jamais violer la règle mathématique i ≠ p(i)
      if (singletons.length >= 2) {
        const singletonAssignment = this.derangeGroup(singletons, prioritizeMentors);
        singletonAssignment.forEach((drawnNum, id) => assignedMap.set(id, drawnNum));
      } else if (singletons.length === 1) {
        const loneStudent = singletons[0];
        const otherStudents = participants.filter(p => p.id !== loneStudent.id);
        if (otherStudents.length > 0) {
          const partner = otherStudents[0];
          const partnerOldTarget = assignedMap.get(partner.id);
          assignedMap.set(partner.id, loneStudent.pouchNumber);
          assignedMap.set(loneStudent.id, partnerOldTarget);
        }
      }
    } else {
      const globalAssignment = this.derangeGroup(participants, prioritizeMentors);
      globalAssignment.forEach((drawnNum, id) => assignedMap.set(id, drawnNum));
    }

    return participants.map(p => ({
      ...p,
      drawnPouchNumber: assignedMap.get(p.id) ?? p.drawnPouchNumber
    }));
  },

  /**
   * Insertion incrémentale d'un nouvel inscrit sans chambouler les pochettes déjà distribuées
   * ni violer l'algorithme de Dérangement (∀i, i ≠ p(i)).
   */
  insertNewParticipantIntoCycle(participants, newParticipant, samePromoOnly = false) {
    const usedPouches = new Set(participants.map(p => Number(p.pouchNumber)).filter(Boolean));
    let nextPouch = participants.reduce((m, p) => Math.max(m, Number(p.pouchNumber) || 0), 0) + 1;
    while (usedPouches.has(nextPouch)) nextPouch++;

    const added = {
      ...newParticipant,
      pouchNumber: nextPouch,
      hasDrawn: false
    };

    if (participants.length === 0) {
      added.drawnPouchNumber = null;
      return { participants: [added], added, modifiedPartner: null, rebuildAll: false };
    }

    const updated = participants.map(p => ({ ...p }));

    // Vérifier si les anciens participants forment déjà un dérangement valide
    const validPouches = new Set(updated.map(p => p.pouchNumber));
    const currentAudit = this.verifyDerangement(updated);

    if (!currentAudit.valid && updated.length >= 2) {
      added.drawnPouchNumber = null;
      updated.push(added);
      const regenerated = this.generateDerangement(updated, false, samePromoOnly);
      const created = regenerated.find(p => p.id === added.id) || added;
      return { participants: regenerated, added: created, modifiedPartner: null, rebuildAll: true };
    }

    // Choisir le meilleur partenaire dans le cycle (privilégie !hasDrawn et même filière si samePromoOnly)
    let bestIdx = 0;
    let bestScore = -1;
    updated.forEach((p, idx) => {
      let score = 0;
      if (!p.hasDrawn) score += 100;
      if (samePromoOnly && p.promo === added.promo) score += 50;
      if (p.drawnPouchNumber != null && p.drawnPouchNumber !== p.pouchNumber && validPouches.has(p.drawnPouchNumber)) {
        score += 10;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    const partner = updated[bestIdx];
    const partnerTargetValid =
      partner.drawnPouchNumber != null &&
      partner.drawnPouchNumber !== partner.pouchNumber &&
      validPouches.has(partner.drawnPouchNumber);

    added.drawnPouchNumber = partnerTargetValid ? partner.drawnPouchNumber : partner.pouchNumber;
    partner.drawnPouchNumber = added.pouchNumber;
    updated.push(added);

    return {
      participants: updated,
      added,
      modifiedPartner: partner,
      rebuildAll: false
    };
  },

  verifyDerangement(participants) {
    const n = participants.length;
    if (n < 2) return { valid: false, selfDraws: 0, uniqueDraws: 0, samePromoCount: 0, total: n };
    let selfDraws = 0;
    let samePromoCount = 0;
    const unique = new Set();
    const pouchMap = new Map();
    participants.forEach(p => pouchMap.set(p.pouchNumber, p));

    participants.forEach(p => {
      if (p.drawnPouchNumber === p.pouchNumber) selfDraws++;
      if (p.drawnPouchNumber != null && pouchMap.has(p.drawnPouchNumber)) {
        unique.add(p.drawnPouchNumber);
        const target = pouchMap.get(p.drawnPouchNumber);
        if (target && target.promo === p.promo) {
          samePromoCount++;
        }
      }
    });
    return {
      valid: selfDraws === 0 && unique.size === n,
      selfDraws,
      uniqueDraws: unique.size,
      samePromoCount,
      total: n
    };
  }
};

/**
 * ============================================================================
 * CONTRÔLEUR PRINCIPAL SECRET MATE
 * ============================================================================
 */
class SecretMateApp {
  constructor() {
    this.participants = [];
    this.settings = getDefaultSettings();
    this.currentView = 'landing';
    this.currentBdeTab = 'pilotage';
    // Aucun étudiant n'est connecté automatiquement en mode démo par défaut
    this.loggedInEmail = safeStorageGet(SESSION_EMAIL_KEY) || null;
    this.isBdeUnlocked = false;
    this.adminFilter = 'all';
    this.wasRevealedLastTick = false;
    this.broadcastChannel = null;
    this.isStudentEditingOwnProfile = false;
    this.lastUpdatedAt = null;
    this.lastSyncRev = null;
    this.isFirebaseActive = false;
    this.firebaseDbUrl = null;
    this.firebaseRef = null;
    this.firebaseStatus = 'local'; // 'local' | 'connecting' | 'connected' | 'error'
    this.firebaseErrorDetail = '';
    this.lastSyncTimeStr = null;
    this.isRegistering = false;
    this.isDrawing = false;
    this.riddleHistory = { 1: [], 2: [], 3: [] };
    this.lastNotFoundEmail = '';

    this.init();
  }

  init() {
    this.loadState();
    this.wasRevealedLastTick = this.isRevealedNow();
    try {
      this.initRealtimeSync();
    } catch (e) {
      console.warn('Init sync restreinte:', e);
    }
    try {
      this.initFirebaseOrLocalEngine();
    } catch (e) {
      console.warn('Init Firebase restreinte:', e);
    }
    try {
      this.initRoutingAndShortcuts();
    } catch (e) {
      console.warn('Init raccourcis restreinte:', e);
    }
    try {
      this.initMasterClock();
    } catch (e) {
      console.warn('Init horloge restreinte:', e);
    }
    try {
      this.renderAll();
    } catch (e) {
      console.error('Erreur de rendu initial:', e);
    }

    if (window.lucide) {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  async resolveFirebaseDatabaseUrl() {
    if (FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.trim().startsWith('http')) {
      return FIREBASE_DATABASE_URL.trim().replace(/\/$/, '').replace(/\.json$/i, '');
    }
    try {
      const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
      if (response.ok) {
        const cfg = await response.json();
        if (cfg && cfg.databaseURL) {
          return String(cfg.databaseURL).trim().replace(/\/$/, '').replace(/\.json$/i, '');
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Détecte automatiquement :
   * - En local sur l'ordinateur (file://) -> Mode Local (localStorage) pour vos tests PC
   * - En ligne (https://) -> Vérifie réellement la Realtime Database puis active WebSocket + filet REST
   */
  async initFirebaseOrLocalEngine() {
    if (window.location.protocol === 'file:') {
      this.firebaseStatus = 'local';
      this.isFirebaseActive = false;
      this.firebaseErrorDetail = '';
      this.updateSyncModeBadge();
      return;
    }

    const dbUrl = await this.resolveFirebaseDatabaseUrl();
    if (!dbUrl) {
      this.firebaseStatus = 'local';
      this.isFirebaseActive = false;
      this.firebaseErrorDetail = '';
      this.updateSyncModeBadge();
      return;
    }

    this.firebaseDbUrl = dbUrl;
    this.firebaseStatus = 'connecting';
    this.firebaseErrorDetail = '';
    this.updateSyncModeBadge();

    const result = await this.pullFromFirebase({ isInitial: true });
    if (result.ok) {
      this.attachFirebaseWebSocket();
    }
  }

  attachFirebaseWebSocket() {
    if (!this.firebaseDbUrl || this.firebaseRef) return;
    try {
      if (window.firebase && typeof window.firebase.initializeApp === 'function') {
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp({ databaseURL: this.firebaseDbUrl });
        }
        this.firebaseRef = window.firebase.database().ref(FIREBASE_DB_NODE);
        this.firebaseRef.on(
          'value',
          snapshot => {
            const data = snapshot.val();
            this.firebaseStatus = 'connected';
            this.isFirebaseActive = true;
            this.firebaseErrorDetail = '';
            this.lastSyncTimeStr = new Date().toLocaleTimeString('fr-FR');
            if (data && typeof data === 'object') {
              this.applyIncomingState(data);
            } else {
              this.updateSyncModeBadge();
            }
          },
          error => {
            this.firebaseStatus = 'error';
            this.firebaseErrorDetail = `Écoute temps réel Firebase bloquée ou refusée (${
              error?.message || error?.code || 'PERMISSION_DENIED'
            }). Le mode secours REST tente de synchroniser automatiquement.`;
            this.updateSyncModeBadge();
          }
        );
      }
    } catch (e) {}
  }

  async forceSyncWithFirebase() {
    if (window.location.protocol === 'file:' || !this.firebaseDbUrl) {
      this.updateSyncModeBadge();
      this.showToast(
        'Mode Local actif sur votre ordinateur (aucune synchronisation distante en file://).',
        'info'
      );
      return;
    }

    this.firebaseStatus = 'connecting';
    this.updateSyncModeBadge();
    const result = await this.pullFromFirebase({ isInitial: true });
    if (result.ok) {
      this.attachFirebaseWebSocket();
      this.showToast(`Synchronisé avec Google Firebase (${this.lastSyncTimeStr}) !`, 'success');
    } else {
      this.showToast(this.firebaseErrorDetail || 'Échec de connexion à Google Firebase.', 'error');
    }
  }

  updateSyncModeBadge() {
    const badge = document.getElementById('sync-mode-badge');
    const heroPill = document.getElementById('hero-sync-pill');
    const errBanner = document.getElementById('firebase-error-banner');

    if (badge) {
      if (this.firebaseStatus === 'connected') {
        badge.className =
          'px-3.5 py-2.5 rounded-xl text-xs font-mono font-extrabold bg-mse-green hover:bg-emerald-400 text-ink border-2 border-white flex items-center gap-1.5 shadow-sm transition cursor-pointer';
        badge.title = `Synchronisé avec Firebase${this.lastSyncTimeStr ? ' à ' + this.lastSyncTimeStr : ''} — Cliquer pour resynchroniser`;
        badge.innerHTML = `
          <i data-lucide="flame" class="w-4 h-4 text-iae-700"></i>
          <span id="sync-mode-label">Firebase Connecté (Sync Live)</span>
        `;
      } else if (this.firebaseStatus === 'error') {
        badge.className =
          'px-3.5 py-2.5 rounded-xl text-xs font-mono font-extrabold bg-mse-coral hover:bg-iae-700 text-white border-2 border-white flex items-center gap-1.5 shadow-sm transition cursor-pointer';
        badge.title = this.firebaseErrorDetail || 'Erreur de connexion Firebase — Cliquer pour retester';
        badge.innerHTML = `
          <i data-lucide="alert-triangle" class="w-4 h-4 text-mse-yellow"></i>
          <span id="sync-mode-label">Erreur Firebase (Cliquer pour tester)</span>
        `;
      } else if (this.firebaseStatus === 'connecting') {
        badge.className =
          'px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-mse-yellow text-ink border-2 border-white flex items-center gap-1.5 transition cursor-pointer';
        badge.innerHTML = `
          <i data-lucide="refresh-cw" class="w-4 h-4 text-ink animate-spin"></i>
          <span id="sync-mode-label">Connexion Firebase...</span>
        `;
      } else {
        badge.className =
          'px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-mse-yellow border border-white/20 flex items-center gap-1.5 transition cursor-pointer';
        badge.title = 'Tests en local (localStorage)';
        badge.innerHTML = `
          <i data-lucide="laptop" class="w-4 h-4 text-mse-yellow"></i>
          <span id="sync-mode-label">Mode Local (Tests PC)</span>
        `;
      }
    }

    if (heroPill) {
      if (this.firebaseStatus === 'connected') {
        heroPill.className = 'text-mse-green font-bold';
        heroPill.textContent = '● Sync Firebase Live';
      } else if (this.firebaseStatus === 'error') {
        heroPill.className = 'text-mse-coral font-bold';
        heroPill.textContent = '● Erreur Sync Firebase';
      } else if (this.firebaseStatus === 'connecting') {
        heroPill.className = 'text-mse-yellow font-bold';
        heroPill.textContent = '● Connexion Firebase...';
      } else {
        heroPill.className = 'text-mse-yellow font-bold';
        heroPill.textContent = '● Mode Local (Tests PC)';
      }
    }

    if (errBanner) {
      if (this.firebaseStatus === 'error' && this.firebaseErrorDetail) {
        errBanner.classList.remove('hidden');
        errBanner.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="font-mono font-extrabold text-mse-yellow uppercase">
                ⚠️ Synchronisation multi-appareils inactive (Google Firebase injoignable)
              </div>
              <p class="font-medium text-white">${this.escapeHtml(this.firebaseErrorDetail)}</p>
              <p class="font-mono text-[11px] text-amber-200">
                URL configurée : <code>${this.escapeHtml(this.firebaseDbUrl || FIREBASE_DATABASE_URL)}</code> — Vérifiez dans <strong>console.firebase.google.com &gt; Realtime Database</strong> que la base existe et que ses Règles autorisent <code>".read": true, ".write": true</code>.
              </p>
            </div>
            <button type="button" onclick="app.forceSyncWithFirebase()" class="px-4 py-2 rounded-xl bg-white text-ink font-mono font-extrabold text-xs shrink-0 hover:bg-mse-yellow transition">
              Retester maintenant
            </button>
          </div>
        `;
      } else {
        errBanner.classList.add('hidden');
        errBanner.innerHTML = '';
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Validation dynamique de l'adresse email selon le domaine défini par le BDE (@uphf.fr par défaut)
   */
  isValidUniversityEmail(email) {
    const domain = (this.settings.emailDomain || '@uphf.fr').trim().toLowerCase();
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[a-zA-Z0-9._%+-]+${escapedDomain}$`, 'i');
    return regex.test((email || '').trim());
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.participantsEmpty === true || parsed.participants != null)) {
          const normalized =
            parsed.participantsEmpty === true ? [] : normalizeParticipants(parsed.participants);
          if (parsed.participantsEmpty === true || normalized.length > 0 || parsed.settings) {
            this.lastUpdatedAt = parsed.updatedAt || null;
            this.lastSyncRev = parsed.syncRev || null;
            this.participants = normalized;
            this.settings = normalizeSettings(parsed.settings);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Chargement des valeurs par défaut:', e);
    }

    this.participants = getInitialDemoParticipants();
    this.settings = getDefaultSettings();
    this.saveLocalCache(false);
  }

  saveLocalCache(broadcastTab = true) {
    const nowIso = new Date().toISOString();
    const rev = generateSyncRev();
    this.lastUpdatedAt = nowIso;
    this.lastSyncRev = rev;
    const payload = sanitizeForFirebase({
      updatedAt: nowIso,
      syncRev: rev,
      participantsEmpty: this.participants.length === 0,
      settings: this.settings,
      participants: this.participants
    });
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(payload));
      if (broadcastTab && this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'STATE_UPDATED', payload });
      }
    } catch (e) {
      console.error('Erreur sauvegarde locale:', e);
    }
    return payload;
  }

  async saveSettingsOnly() {
    const payload = this.saveLocalCache(true);
    return await this.writeToFirebase(
      '',
      {
        updatedAt: payload.updatedAt,
        syncRev: payload.syncRev,
        settings: payload.settings
      },
      'PATCH'
    );
  }

  async saveParticipantPatch(patchFields) {
    const payload = this.saveLocalCache(true);
    const body = {
      updatedAt: payload.updatedAt,
      syncRev: payload.syncRev,
      participantsEmpty: this.participants.length === 0,
      ...patchFields
    };
    return await this.writeToFirebase('', body, 'PATCH');
  }

  async saveFullState({ usePut = false, includeSettings = true } = {}) {
    const payload = this.saveLocalCache(true);
    const isEmpty = this.participants.length === 0;
    const body = {
      updatedAt: payload.updatedAt,
      syncRev: payload.syncRev,
      participantsEmpty: isEmpty,
      participants: isEmpty ? null : participantsToFirebaseMap(this.participants)
    };
    if (includeSettings) {
      body.settings = payload.settings;
    }
    return await this.writeToFirebase('', body, usePut ? 'PUT' : 'PATCH');
  }

  async writeToFirebase(subPath, bodyObj, method = 'PATCH', { silentOnError = false } = {}) {
    if (!this.firebaseDbUrl || window.location.protocol === 'file:') {
      return { ok: true, localOnly: true };
    }

    const cleanBody = sanitizeForFirebase(bodyObj);
    const pathSuffix = subPath ? '/' + subPath.replace(/^\/+/, '') : '';
    const url = `${this.firebaseDbUrl}/${FIREBASE_DB_NODE}${pathSuffix}.json`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanBody)
      });

      if (!res.ok) {
        let msg = `Erreur d'écriture Firebase (HTTP ${res.status}).`;
        if (res.status === 404) {
          msg = `Base Firebase introuvable (HTTP 404) à l'adresse ${this.firebaseDbUrl}. Modifiez FIREBASE_DATABASE_URL dans js/app.js.`;
        } else if (res.status === 401 || res.status === 403) {
          msg = `Écriture refusée par Firebase (HTTP ${res.status}). Vérifiez que vos Règles Realtime Database autorisent ".write": true.`;
        }
        this.firebaseStatus = 'error';
        this.isFirebaseActive = false;
        this.firebaseErrorDetail = msg;
        this.updateSyncModeBadge();
        if (!silentOnError) {
          this.showToast(`⚠️ Modification enregistrée localement mais non envoyée au Cloud : ${msg}`, 'error');
        }
        return { ok: false, status: res.status };
      }

      this.firebaseStatus = 'connected';
      this.isFirebaseActive = true;
      this.firebaseErrorDetail = '';
      this.lastSyncTimeStr = new Date().toLocaleTimeString('fr-FR');
      this.updateSyncModeBadge();
      return { ok: true };
    } catch (err) {
      this.firebaseStatus = 'error';
      this.firebaseErrorDetail = `Impossible d'envoyer les données vers Firebase (${
        err?.message || 'hors-ligne'
      }). Vérifiez votre connexion Internet.`;
      this.updateSyncModeBadge();
      if (!silentOnError) {
        this.showToast(`⚠️ Hors-ligne ou Firebase injoignable : modification sauvée localement uniquement.`, 'error');
      }
      return { ok: false, error: err };
    }
  }

  async pullFromFirebase({ isInitial = false, silent = false } = {}) {
    if (!this.firebaseDbUrl || window.location.protocol === 'file:') {
      return { ok: false, localOnly: true };
    }

    try {
      const res = await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}.json`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        let msg = `Erreur de lecture Firebase (HTTP ${res.status}).`;
        if (res.status === 404) {
          msg = `Base Firebase introuvable (HTTP 404) à l'adresse ${this.firebaseDbUrl}. Vérifiez l'URL exacte dans console.firebase.google.com et modifiez la ligne 20 de js/app.js.`;
        } else if (res.status === 401 || res.status === 403) {
          msg = `Lecture refusée par Firebase (HTTP ${res.status}). Passez les règles Realtime Database (.read et .write) à true.`;
        }
        this.firebaseStatus = 'error';
        this.isFirebaseActive = false;
        this.firebaseErrorDetail = msg;
        this.updateSyncModeBadge();
        if (!silent && !isInitial) {
          this.showToast(msg, 'error');
        }
        return { ok: false, status: res.status };
      }

      const data = await res.json();
      this.isFirebaseActive = true;
      this.firebaseStatus = 'connected';
      this.firebaseErrorDetail = '';
      this.lastSyncTimeStr = new Date().toLocaleTimeString('fr-FR');

      if (data === null) {
        // Premier démarrage sur base Firebase vierge : on y pousse les données initiales
        const payload = this.saveLocalCache(false);
        const isEmpty = this.participants.length === 0;
        await this.writeToFirebase(
          '',
          {
            updatedAt: payload.updatedAt,
            syncRev: payload.syncRev,
            participantsEmpty: isEmpty,
            settings: payload.settings,
            participants: isEmpty ? null : participantsToFirebaseMap(this.participants)
          },
          'PUT'
        );
      } else if (data && typeof data === 'object') {
        this.applyIncomingState(data, { force: isInitial });
      }

      this.updateSyncModeBadge();
      return { ok: true, data };
    } catch (err) {
      this.firebaseStatus = 'error';
      this.firebaseErrorDetail = `Impossible de joindre Firebase (${
        err?.message || 'erreur réseau'
      }). Vérifiez votre connexion Internet.`;
      this.updateSyncModeBadge();
      return { ok: false, error: err };
    }
  }

  async fetchLatestRemoteParticipants() {
    if (!this.firebaseDbUrl || window.location.protocol === 'file:' || !this.isFirebaseActive) {
      return false;
    }
    try {
      const res = await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}/participants.json`, {
        cache: 'no-store'
      });
      if (!res.ok) return false;
      const raw = await res.json();
      if (raw === null) {
        this.participants = [];
        return true;
      }
      if (raw != null) {
        this.participants = normalizeParticipants(raw);
        return true;
      }
    } catch (e) {}
    return false;
  }

  async fetchLatestRemoteStateForRegistration() {
    if (!this.firebaseDbUrl || window.location.protocol === 'file:') {
      return { ok: true, localOnly: true };
    }
    try {
      const res = await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}.json`, {
        cache: 'no-store'
      });
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      if (data && typeof data === 'object') {
        if (data.participantsEmpty === true || data.participants == null) {
          this.participants = [];
        } else {
          this.participants = normalizeParticipants(data.participants);
        }
        if (data.settings) {
          this.settings = normalizeSettings(data.settings, this.settings);
        }
        this.isFirebaseActive = true;
        this.firebaseStatus = 'connected';
        this.firebaseErrorDetail = '';
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  async checkFirebaseRevision() {
    if (!this.firebaseDbUrl || window.location.protocol === 'file:') return;
    if (this.firebaseStatus === 'connecting') return;
    try {
      const res = await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}/syncRev.json`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        if (this.firebaseStatus === 'connected') {
          this.firebaseStatus = 'error';
          this.isFirebaseActive = false;
          this.firebaseErrorDetail = `Connexion perdue avec Firebase (HTTP ${res.status}).`;
          this.updateSyncModeBadge();
        }
        return;
      }
      const remoteRev = await res.json();
      const recoveringFromError = this.firebaseStatus !== 'connected';
      this.firebaseStatus = 'connected';
      this.isFirebaseActive = true;
      this.firebaseErrorDetail = '';
      this.lastSyncTimeStr = new Date().toLocaleTimeString('fr-FR');

      if (remoteRev == null || remoteRev !== this.lastSyncRev || recoveringFromError) {
        await this.pullFromFirebase({ silent: true });
      } else {
        this.updateSyncModeBadge();
      }
    } catch (e) {}
  }

  initRealtimeSync() {
    // Synchronisation instantanée entre onglets pour les tests en local sur ordinateur
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = event => {
          if (event.data && event.data.type === 'STATE_UPDATED') {
            this.applyIncomingState(event.data.payload);
          }
        };
      }
    } catch (e) {
      this.broadcastChannel = null;
    }

    window.addEventListener('storage', event => {
      if (event.key === STATE_STORAGE_KEY && event.newValue) {
        try {
          this.applyIncomingState(JSON.parse(event.newValue));
        } catch (e) {}
      }
    });

    // Filet de sécurité REST léger toutes les 3s (indispensable si WebSocket bloqué sur Wi-Fi campus)
    setInterval(() => {
      this.checkFirebaseRevision();
    }, 3000);

    // Resynchronisation immédiate dès que l'utilisateur revient sur l'onglet / déverrouille son téléphone
    window.addEventListener('focus', () => {
      this.checkFirebaseRevision();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkFirebaseRevision();
      }
    });
  }

  applyIncomingState(data, { force = false } = {}) {
    if (!data || typeof data !== 'object') return;

    const incomingRev = data.syncRev || null;
    const incomingUpdatedAt = data.updatedAt || null;

    if (!force) {
      if (incomingRev && this.lastSyncRev && incomingRev === this.lastSyncRev) {
        return;
      }
      if (!incomingRev && incomingUpdatedAt && this.lastUpdatedAt && incomingUpdatedAt === this.lastUpdatedAt) {
        return;
      }
    }

    if (incomingRev) this.lastSyncRev = incomingRev;
    this.lastUpdatedAt = incomingUpdatedAt || new Date().toISOString();

    const prevRevealed = this.isRevealedNow();

    if (data.participantsEmpty === true) {
      this.participants = [];
    } else if (data.participants != null) {
      const normalized = normalizeParticipants(data.participants);
      if (normalized.length > 0 || Array.isArray(data.participants)) {
        this.participants = normalized;
      }
    } else if (data.settings != null || data.syncRev != null) {
      // Firebase Realtime Database supprime automatiquement le nœud "participants" quand il est vide
      this.participants = [];
    }

    if (data.settings) {
      this.settings = normalizeSettings(data.settings, this.settings);
    }

    const nowRevealed = this.isRevealedNow();

    try {
      localStorage.setItem(
        STATE_STORAGE_KEY,
        JSON.stringify(
          sanitizeForFirebase({
            updatedAt: this.lastUpdatedAt,
            syncRev: this.lastSyncRev,
            participantsEmpty: this.participants.length === 0,
            settings: this.settings,
            participants: this.participants
          })
        )
      );
    } catch (e) {}

    this.renderAll();

    if (!prevRevealed && nowRevealed) {
      this.triggerRevealCelebration();
    }
    this.wasRevealedLastTick = nowRevealed;
  }

  initRoutingAndShortcuts() {
    const checkHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === '#bde' || h === '#admin') {
        this.openBdeAccess();
      }
    };
    window.addEventListener('hashchange', checkHash);
    checkHash();

    window.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.openBdeAccess();
      }
    });
  }

  isRevealedNow() {
    if (this.settings.masterRevealForce) return true;
    if (!this.settings.revealScheduledAt) return false;
    const targetMs = new Date(this.settings.revealScheduledAt).getTime();
    if (isNaN(targetMs)) return false;
    return Date.now() >= targetMs;
  }

  initMasterClock() {
    const tick = () => {
      const now = Date.now();
      const targetDate = new Date(this.settings.revealScheduledAt);
      const targetMs = isNaN(targetDate.getTime()) ? now : targetDate.getTime();
      const revealed = this.isRevealedNow();

      if (!this.wasRevealedLastTick && revealed) {
        this.wasRevealedLastTick = true;
        this.renderAll();
        this.triggerRevealCelebration();
      } else if (this.wasRevealedLastTick && !revealed) {
        this.wasRevealedLastTick = false;
        this.renderAll();
      }

      const diff = revealed ? 0 : Math.max(0, targetMs - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      const pad = n => String(n).padStart(2, '0');

      const setTxt = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };

      setTxt('cd-days', pad(days));
      setTxt('cd-hours', pad(hours));
      setTxt('cd-minutes', pad(minutes));
      setTxt('cd-seconds', pad(seconds));

      if (days > 0) {
        setTxt('student-mini-countdown', `${days}j ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      } else {
        setTxt('student-mini-countdown', `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };

    tick();
    setInterval(tick, 1000);
  }

  triggerRevealCelebration() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#8E0E27', '#FFB800', '#00C48C', '#FF4D6D', '#00A8E8']
      });
    }
    this.showToast(
      '🎉 GRAND DÉVOILEMENT ACTIF ! Les identités et comptes Instagram sont déverrouillés en direct !',
      'success'
    );
  }

  /**
   * ==========================================================================
   * NAVIGATION, CONNEXION & DÉCONNEXION (ÉTUDIANT & BDE)
   * ==========================================================================
   */
  switchView(viewName, { scrollToTop = true } = {}) {
    if (viewName === 'admin' && !this.isBdeUnlocked) {
      this.openBdeAccess();
      return;
    }

    this.currentView = viewName;
    const heroBanner = document.getElementById('hero-banner');
    if (heroBanner) {
      heroBanner.classList.toggle('hidden', viewName !== 'landing');
    }

    ['landing', 'participant', 'admin'].forEach(v => {
      const sec = document.getElementById(`view-${v}`);
      const nav = document.getElementById(`nav-${v}`);
      const mob = document.getElementById(`mob-nav-${v}`);

      if (sec) sec.classList.toggle('hidden', v !== viewName);
      if (nav) nav.classList.toggle('active', v === viewName);
      if (mob) {
        if (v === viewName) {
          mob.classList.add('text-iae-700', 'font-extrabold');
          mob.classList.remove('text-slate-500', 'font-bold');
        } else {
          mob.classList.remove('text-iae-700', 'font-extrabold');
          mob.classList.add('text-slate-500', 'font-bold');
        }
      }
    });

    this.renderAll();
    if (scrollToTop) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }

  openStudentLogin() {
    this.switchView('participant');
    if (!this.loggedInEmail) {
      const input = document.getElementById('student-login-email');
      if (input) {
        try {
          input.focus({ preventScroll: true });
        } catch (e) {
          input.focus();
        }
      }
    }
  }

  scrollToRegistration() {
    if (this.currentView !== 'landing') {
      this.switchView('landing', { scrollToTop: false });
    }
    const scrollNow = () => {
      const el = document.getElementById('section-inscription');
      if (!el) return;
      const headerEl = document.querySelector('header');
      const offset = (headerEl ? headerEl.getBoundingClientRect().height : 72) + 12;
      const targetY = Math.max(0, Math.round(el.getBoundingClientRect().top + window.pageYOffset - offset));
      try {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, targetY);
      }
    };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.requestAnimationFrame(scrollNow));
    } else {
      setTimeout(scrollNow, 40);
    }
  }

  scrollToCampusLocations() {
    if (this.currentView !== 'landing') {
      this.switchView('landing', { scrollToTop: false });
    }
    const el = document.getElementById('section-lieux-campus');
    if (!el) return;
    const headerEl = document.querySelector('header');
    const offset = (headerEl ? headerEl.getBoundingClientRect().height : 72) + 12;
    const targetY = Math.max(0, Math.round(el.getBoundingClientRect().top + window.pageYOffset - offset));
    try {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, targetY);
    }
  }

  scrollToDrawCard() {
    const target =
      ['state-not-drawn', 'state-drawing-closed', 'state-drawn-result']
        .map(id => document.getElementById(id))
        .find(el => el && !el.classList.contains('hidden')) ||
      document.getElementById('student-reveal-zone');
    if (!target) return;
    const headerEl = document.querySelector('header');
    const offset = (headerEl ? headerEl.getBoundingClientRect().height : 72) + 12;
    const targetY = Math.max(0, Math.round(target.getBoundingClientRect().top + window.pageYOffset - offset));
    try {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, targetY);
    }
  }

  clearStudentNotFoundAlert() {
    this.lastNotFoundEmail = '';
    const box = document.getElementById('student-not-found-cta');
    if (box) {
      box.classList.add('hidden');
    }
  }

  goToRegistrationWithEmail() {
    const emailToPrefill = this.lastNotFoundEmail || document.getElementById('student-login-email')?.value.trim().toLowerCase() || '';
    this.clearStudentNotFoundAlert();
    this.switchView('landing', { scrollToTop: false });
    const regEmail = document.getElementById('reg-email');
    if (regEmail && emailToPrefill) {
      regEmail.value = emailToPrefill;
      this.validateEmailField(regEmail);
    }
    this.scrollToRegistration();
    setTimeout(() => {
      const firstNameInput = document.getElementById('reg-firstname');
      if (firstNameInput) {
        try {
          firstNameInput.focus({ preventScroll: true });
        } catch (e) {
          firstNameInput.focus();
        }
      }
    }, 350);
  }

  normalizeInstagramOrContact(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    if (/^\+?[\d\s.\-()]{8,}$/.test(trimmed)) {
      return trimmed;
    }
    let handle = trimmed
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .split(/[?#]/)[0]
      .replace(/\/+$/, '')
      .replace(/^@+/, '')
      .replace(/\s+/g, '');
    return handle ? `@${handle}` : trimmed;
  }

  formatContactDetails(raw, targetMate = null, currentStudent = null) {
    const normalized = this.normalizeInstagramOrContact(raw);
    if (/^\+?[\d\s.\-()]{8,}$/.test(normalized)) {
      const cleanPhone = normalized.replace(/[^0-9]/g, '').replace(/^0/, '33');
      const waMsg = targetMate && currentStudent
        ? encodeURIComponent(
            `Salut ${targetMate.firstName} ! 🎉 C'est ${currentStudent.firstName} (${currentStudent.promo}) de l'IAE Valenciennes : j'ai pioché ta Pochette Secret Mate #${String(
              targetMate.pouchNumber
            ).padStart(2, '0')} ! On se retrouve à l'Afterwork ?`
          )
        : '';
      return {
        isLegacyPhone: true,
        normalized,
        handle: normalized,
        shortText: `📱 ${normalized}`,
        displayText: `📱 WhatsApp : ${normalized}`,
        href: waMsg ? `https://wa.me/${cleanPhone}?text=${waMsg}` : `https://wa.me/${cleanPhone}`,
        buttonLabel: 'Écrire sur WhatsApp & Créer notre binôme'
      };
    }

    const handle = normalized.replace(/^@+/, '');
    return {
      isLegacyPhone: false,
      normalized: handle ? `@${handle}` : '',
      handle,
      shortText: handle ? `📸 @${handle}` : '📸 Non renseigné',
      displayText: handle ? `📸 Instagram : @${handle}` : '📸 Instagram non renseigné',
      href: handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : '#',
      buttonLabel: handle ? `Contacter @${handle} sur Instagram` : 'Contacter sur Instagram'
    };
  }

  switchBdeTab(tabName) {
    this.currentBdeTab = tabName;
    ['pilotage', 'participants', 'locations', 'content'].forEach(t => {
      const panel = document.getElementById(`bde-panel-${t}`);
      const btn = document.getElementById(`bde-tab-btn-${t}`);
      if (panel) panel.classList.toggle('hidden', t !== tabName);
      if (btn) btn.classList.toggle('active', t === tabName);
    });
    this.renderAdminView();
  }

  openBdeAccess() {
    if (this.isBdeUnlocked) {
      this.switchView('admin');
      return;
    }
    const modal = document.getElementById('pin-modal');
    const err = document.getElementById('bde-pin-error');
    const input = document.getElementById('bde-pin-input');
    if (err) err.classList.add('hidden');
    if (input) input.value = '';
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => input?.focus(), 80);
    }
  }

  closePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (window.location.hash === '#bde' || window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  verifyBdePin(event) {
    event.preventDefault();
    const input = document.getElementById('bde-pin-input');
    const err = document.getElementById('bde-pin-error');
    const entered = (input?.value || '').trim();

    if (entered === this.settings.adminPin) {
      this.isBdeUnlocked = true;
      this.closePinModal();
      this.switchView('admin');
      this.showToast('Cockpit BDE connecté !', 'success');
    } else {
      if (err) err.classList.remove('hidden');
    }
  }

  /**
   * Déconnexion complète de la session BDE
   */
  logoutBde() {
    this.isBdeUnlocked = false;
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
    this.switchView('landing');
    this.showToast('Vous êtes déconnecté du Cockpit BDE.', 'info');
  }

  lockBdeSession() {
    this.logoutBde();
  }

  /**
   * Déconnexion complète de la session Étudiant (@uphf.fr)
   */
  logoutStudent() {
    this.loggedInEmail = null;
    safeStorageRemove(SESSION_EMAIL_KEY);
    this.clearStudentNotFoundAlert();
    const emailInput = document.getElementById('student-login-email');
    if (emailInput) emailInput.value = '';
    this.renderAll();
    this.showToast('Tu es maintenant déconnecté de ton espace étudiant.', 'info');
  }

  /**
   * ==========================================================================
   * VUE 1 : INSCRIPTION DYNAMIQUE & GÉNÉRATEUR D'ÉNIGMES
   * ==========================================================================
   */
  validateEmailField(inputEl) {
    const val = inputEl.value.trim();
    const errEl = document.getElementById('reg-email-error');
    const valid = this.isValidUniversityEmail(val);
    if (errEl) {
      errEl.textContent = `Adresse universitaire se terminant par ${this.settings.emailDomain} requise.`;
      errEl.classList.toggle('hidden', valid || val.length === 0);
    }
    return valid;
  }

  generateSingleRiddle(idx) {
    const pool = RIDDLE_IDEAS[idx] || RIDDLE_IDEAS[1];
    const el = document.getElementById(`reg-riddle-${idx}`);
    if (!el || !pool.length) return;
    if (!this.riddleHistory) this.riddleHistory = { 1: [], 2: [], 3: [] };
    if (!Array.isArray(this.riddleHistory[idx])) this.riddleHistory[idx] = [];

    let candidates = pool
      .map((text, index) => ({ text, index }))
      .filter(item => !this.riddleHistory[idx].includes(item.index) && item.text !== el.value);

    if (candidates.length === 0) {
      this.riddleHistory[idx] = [];
      candidates = pool
        .map((text, index) => ({ text, index }))
        .filter(item => item.text !== el.value);
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)] || { text: pool[0], index: 0 };
    this.riddleHistory[idx].push(picked.index);
    el.value = picked.text;
  }

  generateAllRiddles() {
    this.generateSingleRiddle(1);
    this.generateSingleRiddle(2);
    this.generateSingleRiddle(3);
    this.showToast('3 nouvelles idées d’énigmes générées !', 'info');
  }

  async handleRegistration(event) {
    event.preventDefault();
    if (this.isRegistering) return;

    if (!this.settings.registrationsOpen) {
      this.showToast('Les inscriptions sont actuellement fermées par le BDE.', 'error');
      return;
    }

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const contact = this.normalizeInstagramOrContact(document.getElementById('reg-whatsapp').value);
    const promo = document.getElementById('reg-promo').value.trim();
    const role = document.querySelector('input[name="reg-role"]:checked')?.value || 'nouveau';
    const secretType =
      document.querySelector('input[name="reg-secret"]:checked')?.value ||
      (this.settings.secretCategories[0]?.title || 'Café / Snack');
    const r1 = document.getElementById('reg-riddle-1').value.trim();
    const r2 = document.getElementById('reg-riddle-2').value.trim();
    const r3 = document.getElementById('reg-riddle-3').value.trim();
    const location = document.getElementById('reg-location').value;
    const isBackupMate = document.getElementById('reg-backup').checked;

    if (!this.isValidUniversityEmail(email)) {
      document.getElementById('reg-email-error')?.classList.remove('hidden');
      this.showToast(
        `Adresse invalide : utilise obligatoirement une adresse se terminant par ${this.settings.emailDomain} !`,
        'error'
      );
      return;
    }

    if (!firstName || !lastName || !contact || !promo || !r1 || !r2 || !r3) {
      this.showToast('Merci de compléter tous les champs (y compris ton Instagram) et tes 3 énigmes.', 'error');
      return;
    }

    const submitBtn = event.target?.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    this.isRegistering = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Enregistrement en cours...</span>';
    }

    try {
      // Récupère la dernière version Firebase juste avant d'enregistrer pour éviter toute collision
      await this.fetchLatestRemoteStateForRegistration();

      if (!this.settings.registrationsOpen) {
        this.renderAll();
        this.showToast('Les inscriptions viennent d’être clôturées par le BDE.', 'error');
        return;
      }

      const existingIdx = this.participants.findIndex(p => p.email.toLowerCase() === email);

      if (existingIdx !== -1) {
        const updatedExisting = {
          ...this.participants[existingIdx],
          id: sanitizeFirebaseKey(this.participants[existingIdx].id),
          firstName,
          lastName,
          instagram: contact,
          whatsapp: contact,
          promo,
          role,
          secretType,
          riddles: [r1, r2, r3],
          location,
          isBackupMate
        };
        this.participants[existingIdx] = updatedExisting;
        await this.saveParticipantPatch({
          [`participants/${updatedExisting.id}`]: updatedExisting
        });
      } else {
        const newParticipant = {
          id: makeParticipantId(),
          firstName,
          lastName,
          email,
          instagram: contact,
          whatsapp: contact,
          promo,
          role,
          secretType,
          riddles: [r1, r2, r3],
          location,
          isBackupMate,
          pouchNumber: 1,
          drawnPouchNumber: null,
          hasDrawn: false
        };

        const insertion = SecretMateAlgorithms.insertNewParticipantIntoCycle(
          this.participants,
          newParticipant,
          this.settings.samePromoOnly
        );
        this.participants = insertion.participants;

        if (insertion.rebuildAll) {
          await this.saveFullState({ includeSettings: false });
        } else {
          const patch = {
            [`participants/${sanitizeFirebaseKey(insertion.added.id)}`]: insertion.added
          };
          if (insertion.modifiedPartner && insertion.modifiedPartner.id !== insertion.added.id) {
            patch[`participants/${sanitizeFirebaseKey(insertion.modifiedPartner.id)}/drawnPouchNumber`] =
              insertion.modifiedPartner.drawnPouchNumber;
          }
          await this.saveParticipantPatch(patch);
        }
      }

      this.loggedInEmail = email;
      safeStorageSet(SESSION_EMAIL_KEY, email);

      document.getElementById('registration-form').reset();
      this.updateSelectedLocationPreview();
      this.switchView('participant');

      const me = this.participants.find(p => p.email.toLowerCase() === email);
      this.showToast(
        `Inscription validée pour ${email} ! Tu as reçu la Pochette #${String(
          me ? me.pouchNumber : 1
        ).padStart(2, '0')}.`,
        'success'
      );
    } finally {
      this.isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  /**
   * Aperçu dynamique du lieu sélectionné dans le formulaire d'inscription
   */
  updateSelectedLocationPreview() {
    const locSelect = document.getElementById('reg-location');
    const preview = document.getElementById('reg-location-preview');
    if (!locSelect || !preview) return;
    const chosenName = locSelect.value;
    const loc =
      this.settings.campusLocations.find(l => l.name === chosenName) ||
      this.settings.campusLocations[0];
    if (!loc) {
      preview.classList.add('hidden');
      return;
    }
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="inline-block px-2 py-0.5 rounded bg-mse-yellow border border-ink font-mono font-extrabold text-[10px] text-ink">
          ${this.escapeHtml(loc.tag)}
        </span>
        <span class="font-mono text-[10px] font-bold text-slate-500 uppercase">Aperçu du lieu choisi</span>
      </div>
      <p class="text-xs text-slate-700 leading-snug"><strong>Repère :</strong> ${this.escapeHtml(loc.tip)}</p>
      <p class="text-[11px] font-bold text-iae-700">🤝 Défi associé : ${this.escapeHtml(loc.challenge)}</p>
    `;
  }

  /**
   * Rendu dynamique des Filières IAE, Lieux du Campus et Secrets de promo sur la Vue 1
   */
  renderLandingDynamicElements() {
    // 1. Liste déroulante des Filières IAE (définie par le BDE)
    const promoSelect = document.getElementById('reg-promo');
    if (promoSelect) {
      const currentPromo = promoSelect.value;
      const promos =
        Array.isArray(this.settings.promoOptions) && this.settings.promoOptions.length > 0
          ? this.settings.promoOptions
          : getDefaultPromoOptions();
      promoSelect.innerHTML = promos
        .map(p => `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p)}</option>`)
        .join('');
      if (currentPromo && promos.includes(currentPromo)) {
        promoSelect.value = currentPromo;
      }
    }

    const promoPill = document.getElementById('ui-promo-matching-pill');
    if (promoPill) {
      if (this.settings.samePromoOnly) {
        promoPill.className =
          'px-2.5 py-0.5 rounded bg-mse-green text-ink border border-ink font-mono text-[10px] font-extrabold';
        promoPill.textContent = '🎓 Appariement Même Filière Actif';
      } else {
        promoPill.className =
          'px-2.5 py-0.5 rounded bg-mse-yellow/40 border border-ink font-mono text-[10px] font-extrabold text-ink';
        promoPill.textContent = '🌐 Brassage inter-filières IAE';
      }
    }

    const grid = document.getElementById('public-locations-grid');
    if (grid) {
      grid.innerHTML = this.settings.campusLocations
        .map(
          loc => `
        <div class="p-4 rounded-2xl bg-cream border-2 border-ink flex flex-col justify-between">
          <div>
            <span class="inline-block px-2 py-0.5 rounded bg-mse-yellow border border-ink font-mono font-extrabold text-[10px] text-ink mb-2">
              ${this.escapeHtml(loc.tag)}
            </span>
            <h4 class="font-display font-extrabold text-sm text-ink">${this.escapeHtml(loc.name)}</h4>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">${this.escapeHtml(loc.tip)}</p>
          </div>
          <div class="mt-3 pt-2 border-t border-ink/15 text-[11px] font-bold text-iae-700">
            🤝 ${this.escapeHtml(loc.challenge)}
          </div>
        </div>
      `
        )
        .join('');
    }

    const locSelect = document.getElementById('reg-location');
    if (locSelect) {
      const currentVal = locSelect.value;
      locSelect.innerHTML = this.settings.campusLocations
        .map(
          loc =>
            `<option value="${this.escapeHtml(loc.name)}">${this.escapeHtml(
              loc.tag
            )} — ${this.escapeHtml(loc.name)}</option>`
        )
        .join('');
      if (currentVal && this.settings.campusLocations.some(l => l.name === currentVal)) {
        locSelect.value = currentVal;
      }
      this.updateSelectedLocationPreview();
    }

    const secContainer = document.getElementById('reg-secrets-container');
    if (secContainer) {
      const prevSecretChecked = document.querySelector('input[name="reg-secret"]:checked')?.value;
      const validPrev =
        prevSecretChecked &&
        this.settings.secretCategories.some(s => s.title === prevSecretChecked);

      secContainer.innerHTML = this.settings.secretCategories
        .map(
          (sec, idx) => `
        <label class="flex flex-col justify-between p-3.5 rounded-2xl border-2 border-ink/20 hover:border-ink cursor-pointer transition has-[:checked]:border-ink has-[:checked]:bg-iae-50">
          <div class="flex items-center gap-2">
            <input type="radio" name="reg-secret" value="${this.escapeHtml(sec.title)}" ${
            (validPrev ? sec.title === prevSecretChecked : idx === 0) ? 'checked' : ''
          } class="accent-iae-700" />
            <span class="font-display font-extrabold text-sm text-ink">${this.escapeHtml(
              sec.icon
            )} ${this.escapeHtml(sec.title)}</span>
          </div>
          <p class="text-xs text-slate-600 mt-1.5 pl-6">${this.escapeHtml(sec.desc)}</p>
        </label>
      `
        )
        .join('');
    }

    const regForm = document.getElementById('registration-form');
    const regClosed = document.getElementById('registration-closed-view');
    const regClosedMsg = document.getElementById('ui-closed-registration-msg');
    if (regForm && regClosed) {
      regForm.classList.toggle('hidden', !this.settings.registrationsOpen);
      regClosed.classList.toggle('hidden', this.settings.registrationsOpen);
    }
    if (regClosedMsg) {
      regClosedMsg.textContent = this.settings.closedRegistrationMessage;
    }
  }

  /**
   * ==========================================================================
   * VUE 2 : ESPACE PERSONNEL ÉTUDIANT (@UPHF.FR) & MESSAGE DU LIEU INDICE
   * ==========================================================================
   */
  handleStudentLogin(event) {
    event.preventDefault();
    const input = document.getElementById('student-login-email');
    const email = (input?.value || '').trim().toLowerCase();

    if (!this.isValidUniversityEmail(email)) {
      this.clearStudentNotFoundAlert();
      this.showToast(
        `Format invalide : entre une adresse se terminant par ${this.settings.emailDomain}`,
        'error'
      );
      return;
    }

    const found = this.participants.find(p => p.email.toLowerCase() === email);
    if (!found) {
      this.lastNotFoundEmail = email;
      const notFoundBox = document.getElementById('student-not-found-cta');
      const notFoundEmailEl = document.getElementById('student-not-found-email');
      if (notFoundEmailEl) notFoundEmailEl.textContent = email;
      if (notFoundBox) notFoundBox.classList.remove('hidden');
      this.showToast(
        `Aucun inscrit trouvé pour ${email}. Clique sur « M'inscrire avec cette adresse » !`,
        'error'
      );
      return;
    }

    this.clearStudentNotFoundAlert();
    this.loggedInEmail = email;
    safeStorageSet(SESSION_EMAIL_KEY, email);
    this.renderAll();
    this.showToast(`Bienvenue ${found.firstName} ${found.lastName} !`, 'success');
  }

  openEditMyProfileModal() {
    const student = this.participants.find(
      p => p.email.toLowerCase() === (this.loggedInEmail || '').toLowerCase()
    );
    if (!student) return;
    this.openParticipantModal(student.id, true);
  }

  renderStudentView() {
    const emailInput = document.getElementById('student-login-email');
    if (emailInput && document.activeElement !== emailInput) {
      emailInput.value = this.loggedInEmail || '';
    }

    const student = this.loggedInEmail
      ? this.participants.find(
          p => p.email.toLowerCase() === this.loggedInEmail.toLowerCase()
        )
      : null;

    const emptyState = document.getElementById('student-empty-state');
    const authContent = document.getElementById('student-authenticated-content');
    const btnViewLogout = document.getElementById('btn-student-view-logout');
    const navBadge = document.getElementById('badge-user-pouch');

    if (!student) {
      emptyState?.classList.remove('hidden');
      authContent?.classList.add('hidden');
      btnViewLogout?.classList.add('hidden');
      btnViewLogout?.classList.remove('inline-flex');
      navBadge?.classList.add('hidden');
      return;
    }

    emptyState?.classList.add('hidden');
    authContent?.classList.remove('hidden');
    btnViewLogout?.classList.remove('hidden');
    btnViewLogout?.classList.add('inline-flex');

    const myNumFormatted = `#${String(student.pouchNumber).padStart(2, '0')}`;
    if (navBadge) {
      navBadge.textContent = myNumFormatted;
      navBadge.classList.remove('hidden');
    }

    const bannerName = document.getElementById('student-connected-banner-name');
    if (bannerName) {
      bannerName.textContent = `${student.firstName} ${student.lastName} (${student.email})`;
    }

    // Carte 1 : Ma Pochette
    const roleMap = {
      nouveau: '🌱 Nouvel arrivant (L1 / Nouveau L3)',
      parrain: '🎓 Ancien / Parrain (L3 / Master)',
      international: '🌍 Étudiant International'
    };

    document.getElementById('p-fullname').textContent = `${student.firstName} ${student.lastName}`;
    document.getElementById('p-email-promo').textContent = `${student.email} • ${student.promo}`;
    document.getElementById('p-my-number').textContent = myNumFormatted;
    document.getElementById('p-card-number').textContent = `Pochette ${myNumFormatted}`;
    document.getElementById('p-role-badge').textContent = roleMap[student.role] || 'Participant';

    document.getElementById('p-riddle-1').textContent = `« ${student.riddles[0] || ''} »`;
    document.getElementById('p-riddle-2').textContent = `« ${student.riddles[1] || ''} »`;
    document.getElementById('p-riddle-3').textContent = `« ${student.riddles[2] || ''} »`;
    document.getElementById('p-location').textContent = student.location;
    document.getElementById('p-secret').textContent = student.secretType;
    document.getElementById('p-backup-banner')?.classList.toggle('hidden', !student.isBackupMate);

    const updatedStudent = student;
    const targetMate =
      updatedStudent.drawnPouchNumber && updatedStudent.drawnPouchNumber !== updatedStudent.pouchNumber
        ? this.participants.find(p => p.pouchNumber === updatedStudent.drawnPouchNumber)
        : null;

    const revealed = this.isRevealedNow();

    // Bandeau guidé post-connexion (Étape 1 -> 2 -> 3)
    const guideBanner = document.getElementById('student-guided-status-banner');
    const step1El = document.getElementById('guide-step-1');
    const step2El = document.getElementById('guide-step-2');
    const step3El = document.getElementById('guide-step-3');
    const guideTitleEl = document.getElementById('student-guide-title');
    const guideDescEl = document.getElementById('student-guide-desc');
    const guideActionBtn = document.getElementById('student-guide-action-btn');

    const pillDone = 'px-2.5 py-2 rounded-xl border-2 border-ink bg-mse-green/30 font-mono text-[11px] font-extrabold text-ink';
    const pillActive = 'px-2.5 py-2 rounded-xl border-2 border-ink bg-mse-yellow font-mono text-[11px] font-extrabold text-ink';
    const pillPending = 'px-2.5 py-2 rounded-xl border-2 border-ink bg-cream font-mono text-[11px] font-bold text-slate-600';

    if (guideBanner && step1El && step2El && step3El && guideTitleEl && guideDescEl) {
      step1El.className = pillDone;
      step1El.textContent = '1. Inscrit ✓';

      if (!this.settings.drawingOpen && (!updatedStudent.hasDrawn || !targetMate)) {
        guideBanner.className = 'neo-card rounded-3xl p-5 sm:p-6 bg-paper border-2 border-ink space-y-4';
        step2El.className = pillActive;
        step2El.textContent = '2. Pioche bientôt';
        step3El.className = pillPending;
        step3El.textContent = '3. Dévoilement';
        guideTitleEl.textContent = `⏳ Bienvenue ! Ta pochette ${myNumFormatted} est prête — Pioche bientôt ouverte`;
        guideDescEl.textContent = `Prépare ta pochette physique ${myNumFormatted} (« ${updatedStudent.secretType} »). Dès que le BDE ouvrira le tirage, tu pourras piocher ton Secret Mate juste en dessous !`;
        guideActionBtn?.classList.add('hidden');
      } else if (!updatedStudent.hasDrawn || !targetMate) {
        guideBanner.className = 'neo-card rounded-3xl p-5 sm:p-6 bg-mse-yellow/25 border-2 border-ink space-y-4';
        step2El.className = pillActive;
        step2El.textContent = '2. À piocher !';
        step3El.className = pillPending;
        step3El.textContent = '3. Dévoilement';
        guideTitleEl.textContent = '🎲 La pioche est OUVERTE : tire ta pochette Secret Mate !';
        guideDescEl.textContent = 'Clique sur le bouton pour lancer la machine à pioche et découvrir les 3 énigmes + le lieu indice de ton binôme mystère.';
        guideActionBtn?.classList.remove('hidden');
      } else if (!revealed) {
        const drawnNumStr = `#${String(targetMate.pouchNumber).padStart(2, '0')}`;
        guideBanner.className = 'neo-card rounded-3xl p-5 sm:p-6 bg-cream border-2 border-ink space-y-4';
        step2El.className = pillDone;
        step2El.textContent = `2. Piochée (${drawnNumStr}) ✓`;
        step3El.className = pillActive;
        step3El.textContent = '3. Enquête active';
        guideTitleEl.textContent = `🔎 Enquête en cours sur la Pochette ${drawnNumStr} !`;
        guideDescEl.textContent = `Lis ses 3 énigmes et repère le lieu « ${targetMate.location} » ci-dessous. Son nom et son Instagram se débloqueront automatiquement à l'heure du dévoilement !`;
        guideActionBtn?.classList.add('hidden');
      } else {
        const drawnNumStr = `#${String(targetMate.pouchNumber).padStart(2, '0')}`;
        guideBanner.className = 'neo-card rounded-3xl p-5 sm:p-6 bg-mse-green/25 border-2 border-ink space-y-4';
        step2El.className = pillDone;
        step2El.textContent = `2. Piochée (${drawnNumStr}) ✓`;
        step3El.className = pillDone;
        step3El.textContent = '3. Dévoilé ✓';
        guideTitleEl.textContent = `🎉 C'est le Grand Dévoilement : contacte ${targetMate.firstName} sur Instagram !`;
        guideDescEl.textContent = `Ton binôme (${drawnNumStr}) est déverrouillé juste ci-dessous. Envoie-lui un message et retrouvez-vous à l'Afterwork !`;
        guideActionBtn?.classList.add('hidden');
      }
    }

    const stateDrawingClosed = document.getElementById('state-drawing-closed');
    const stateNotDrawn = document.getElementById('state-not-drawn');
    const stateDrawnResult = document.getElementById('state-drawn-result');
    const verifBadge = document.getElementById('draw-verification-badge');

    if (!this.settings.drawingOpen && (!updatedStudent.hasDrawn || !targetMate)) {
      stateDrawingClosed?.classList.remove('hidden');
      stateNotDrawn?.classList.add('hidden');
      stateDrawnResult?.classList.add('hidden');
      verifBadge?.classList.add('hidden');
      const closedDrawMsg = document.getElementById('ui-closed-drawing-msg');
      if (closedDrawMsg) closedDrawMsg.textContent = this.settings.closedDrawingMessage;
    } else if (!updatedStudent.hasDrawn || !targetMate) {
      stateDrawingClosed?.classList.add('hidden');
      stateNotDrawn?.classList.remove('hidden');
      stateDrawnResult?.classList.add('hidden');
      verifBadge?.classList.add('hidden');
      verifBadge?.classList.remove('inline-flex');
      document.getElementById('slot-machine-number').textContent = '#?';
    } else {
      stateDrawingClosed?.classList.add('hidden');
      stateNotDrawn?.classList.add('hidden');
      stateDrawnResult?.classList.remove('hidden');
      verifBadge?.classList.remove('hidden');
      verifBadge?.classList.add('inline-flex');

      const drawnNumFormatted = `#${String(targetMate.pouchNumber).padStart(2, '0')}`;
      document.getElementById('drawn-pouch-number').textContent = drawnNumFormatted;
      document.getElementById('drawn-pouch-title-num').textContent = drawnNumFormatted;
      const sameFiliereNote =
        targetMate.promo === updatedStudent.promo
          ? ` • Même filière (${targetMate.promo}) ✓`
          : '';
      document.getElementById('drawn-math-proof').textContent =
        `Vérifié : Pochette piochée (${drawnNumFormatted}) ≠ Ma pochette (${myNumFormatted}) ✓${sameFiliereNote}`;
      document.getElementById('drawn-secret-badge').textContent = targetMate.secretType;

      const locObj =
        this.settings.campusLocations.find(l => l.name === targetMate.location) ||
        this.settings.campusLocations[0] || {
          name: targetMate.location,
          tag: '📍 Campus Mont-Houy',
          tip: 'Rends-toi sur ce lieu emblématique du campus du Mont-Houy !',
          challenge: 'Prenez une photo ensemble lors de l’Afterwork !'
        };

      document.getElementById('drawn-location-name').textContent = targetMate.location;
      document.getElementById('drawn-location-badge').textContent = locObj.tag || '';
      document.getElementById('drawn-location-tip').textContent = locObj.tip;
      document.getElementById('drawn-duo-challenge').textContent = locObj.challenge;

      document.getElementById('drawn-riddle-1').textContent = `« ${targetMate.riddles[0]} »`;
      document.getElementById('drawn-riddle-2').textContent = `« ${targetMate.riddles[1]} »`;
      document.getElementById('drawn-riddle-3').textContent = `« ${targetMate.riddles[2]} »`;
    }

    // ZONE IDENTITÉ SECRÈTE
    const lockedBanner = document.getElementById('reveal-locked-banner');
    const unlockedBanner = document.getElementById('reveal-unlocked-banner');
    const formattedSchedule = this.formatDateFr(this.settings.revealScheduledAt);

    const lockedTitle = document.getElementById('locked-banner-title');
    if (lockedTitle) {
      lockedTitle.textContent = `🔒 Identité secrète – Dévoilement automatique prévu le ${formattedSchedule} lors de l'Afterwork !`;
    }
    const lockedSub = document.getElementById('ui-locked-submessage');
    if (lockedSub) {
      lockedSub.textContent = this.settings.lockedSubMessage;
    }

    if (!revealed || !updatedStudent.hasDrawn || !targetMate) {
      lockedBanner?.classList.remove('hidden');
      unlockedBanner?.classList.add('hidden');
      document.getElementById('revealed-mate-name').textContent = 'Identité masquée';
      document.getElementById('revealed-mate-promo').textContent = '';
      document.getElementById('revealed-mate-whatsapp-txt').textContent = '';
      const contactBtn = document.getElementById('revealed-mate-whatsapp-btn');
      if (contactBtn) contactBtn.href = '#';
    } else {
      lockedBanner?.classList.add('hidden');
      unlockedBanner?.classList.remove('hidden');

      document.getElementById('student-bde-custom-message').textContent =
        this.settings.customRevealMessage;

      const initials = `${targetMate.firstName[0] || ''}${targetMate.lastName[0] || ''}`.toUpperCase();
      document.getElementById('revealed-mate-avatar').textContent = initials;
      document.getElementById('revealed-mate-pouch-badge').textContent =
        `Créateur de la Pochette #${String(targetMate.pouchNumber).padStart(2, '0')}`;
      document.getElementById('revealed-mate-name').textContent =
        `${targetMate.firstName} ${targetMate.lastName}`;
      document.getElementById('revealed-mate-promo').textContent =
        `${targetMate.promo} • ${targetMate.email}`;

      const contactInfo = this.formatContactDetails(
        targetMate.instagram || targetMate.whatsapp,
        targetMate,
        updatedStudent
      );
      document.getElementById('revealed-mate-whatsapp-txt').textContent = contactInfo.displayText;

      const contactBtn = document.getElementById('revealed-mate-whatsapp-btn');
      const contactLabel = document.getElementById('revealed-mate-contact-btn-label');
      if (contactBtn) {
        contactBtn.href = contactInfo.href;
        contactBtn.classList.toggle('bg-emerald-600', contactInfo.isLegacyPhone);
        contactBtn.classList.toggle('hover:bg-emerald-700', contactInfo.isLegacyPhone);
      }
      if (contactLabel) {
        contactLabel.textContent = contactInfo.buttonLabel;
      }
    }
  }

  animateAndDrawPouch(replay = false) {
    if (this.isDrawing) return;

    if (!this.settings.drawingOpen) {
      this.showToast('La pioche est actuellement verrouillée par le BDE.', 'error');
      return;
    }

    const student = this.participants.find(
      p => p.email.toLowerCase() === (this.loggedInEmail || '').toLowerCase()
    );
    if (!student) return;

    if (this.participants.length < 2) {
      this.showToast('Il faut au moins 2 participants inscrits pour effectuer la pioche.', 'error');
      return;
    }

    if (replay) {
      student.hasDrawn = false;
      this.renderStudentView();
    }

    const slotEl = document.getElementById('slot-machine-number');
    const btnDraw = document.getElementById('btn-draw-pouch');
    if (!slotEl || !btnDraw) return;

    this.isDrawing = true;
    btnDraw.disabled = true;
    slotEl.parentElement.classList.add('slot-spinning');

    const total = this.participants.length;
    let ticks = 0;
    const maxTicks = 15;

    const timer = setInterval(async () => {
      let rand = Math.floor(Math.random() * total) + 1;
      if (rand === student.pouchNumber) {
        rand = (rand % total) + 1;
      }
      slotEl.textContent = `#${String(rand).padStart(2, '0')}`;
      ticks++;

      if (ticks >= maxTicks) {
        clearInterval(timer);
        try {
          await this.fetchLatestRemoteParticipants();
          const currentStudent = this.participants.find(
            p => p.email.toLowerCase() === (this.loggedInEmail || '').toLowerCase()
          );
          if (!currentStudent) return;

          const hasValidTarget =
            currentStudent.drawnPouchNumber != null &&
            currentStudent.drawnPouchNumber !== currentStudent.pouchNumber &&
            this.participants.some(p => p.pouchNumber === currentStudent.drawnPouchNumber);

          currentStudent.hasDrawn = true;

          if (!hasValidTarget) {
            this.participants = SecretMateAlgorithms.generateDerangement(
              this.participants,
              this.settings.prioritizeMentors,
              this.settings.samePromoOnly
            );
            await this.saveFullState({ includeSettings: false });
          } else {
            await this.saveParticipantPatch({
              [`participants/${sanitizeFirebaseKey(currentStudent.id)}/hasDrawn`]: true
            });
          }

          this.renderAll();
          const refreshed = this.participants.find(p => p.id === currentStudent.id);
          this.showToast(
            `Tu as pioché la Pochette #${String(refreshed?.drawnPouchNumber || 1).padStart(
              2,
              '0'
            )} !`,
            'success'
          );
        } finally {
          this.isDrawing = false;
          slotEl.parentElement.classList.remove('slot-spinning');
          btnDraw.disabled = false;
        }
      }
    }, 65);
  }

  printPouchCard() {
    window.print();
  }

  /**
   * ==========================================================================
   * VUE 3 : COCKPIT BDE — CONTRÔLE TOTAL (PILOTAGE, LIEUX, CRUD, TEXTES)
   * ==========================================================================
   */
  async toggleRegistrationsOpen() {
    const regMsg = document.getElementById('admin-closed-reg-msg')?.value.trim();
    if (regMsg) this.settings.closedRegistrationMessage = regMsg;

    this.settings.registrationsOpen = !this.settings.registrationsOpen;
    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast(
      this.settings.registrationsOpen
        ? 'Inscriptions publiques OUVERTES !'
        : 'Inscriptions publiques FERMÉES par le BDE.',
      'info'
    );
  }

  async toggleDrawingOpen() {
    const drawMsg = document.getElementById('admin-closed-draw-msg')?.value.trim();
    if (drawMsg) this.settings.closedDrawingMessage = drawMsg;

    if (!this.settings.drawingOpen) {
      await this.fetchLatestRemoteParticipants();
      if (this.participants.length < 2) {
        this.showToast(
          'Il faut au moins 2 étudiants inscrits avant d’ouvrir la pioche aléatoire.',
          'error'
        );
        return;
      }
      this.settings.drawingOpen = true;
      this.participants = SecretMateAlgorithms.generateDerangement(
        this.participants,
        this.settings.prioritizeMentors,
        this.settings.samePromoOnly
      );
      await this.saveFullState();
    } else {
      this.settings.drawingOpen = false;
      await this.saveSettingsOnly();
    }
    this.renderAll();
    this.showToast(
      this.settings.drawingOpen
        ? 'Pioche des pochettes OUVERTE pour les étudiants !'
        : 'Pioche des pochettes VERROUILLÉE par le BDE.',
      'info'
    );
  }

  /**
   * Action rapide BDE : Clôturer les inscriptions, mélanger et ouvrir la pioche aléatoire aux étudiants
   */
  async closeRegistrationsAndOpenDraw() {
    await this.fetchLatestRemoteParticipants();
    if (this.participants.length < 2) {
      this.showToast(
        'Il faut au moins 2 étudiants inscrits avant de clôturer les inscriptions et ouvrir la pioche.',
        'error'
      );
      return;
    }
    this.settings.registrationsOpen = false;
    this.settings.drawingOpen = true;
    this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      this.settings.prioritizeMentors,
      this.settings.samePromoOnly
    );
    await this.saveFullState();
    this.renderAll();
    this.showToast(
      '🎯 Inscriptions clôturées, tirage calculé et pioche aléatoire OUVERTE pour tous les étudiants !',
      'success'
    );
  }

  async toggleMatchingOptions() {
    const samePromo = document.getElementById('chk-same-promo-only')?.checked ?? false;
    const prioritize = document.getElementById('chk-prioritize-mentors')?.checked ?? true;
    await this.fetchLatestRemoteParticipants();
    this.settings.samePromoOnly = samePromo;
    this.settings.prioritizeMentors = prioritize;
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      prioritize,
      samePromo
    );
    await this.saveFullState();
    this.renderAll();
    this.showToast(
      samePromo
        ? '🎓 Mode « Même filière uniquement » activé : les étudiants piochent au sein de leur filière IAE !'
        : '🌐 Mode « Brassage inter-filières IAE » activé !',
      'info'
    );
  }

  async saveRegistrationAndDrawMessages() {
    const regMsg = document.getElementById('admin-closed-reg-msg')?.value.trim();
    const drawMsg = document.getElementById('admin-closed-draw-msg')?.value.trim();
    if (regMsg) this.settings.closedRegistrationMessage = regMsg;
    if (drawMsg) this.settings.closedDrawingMessage = drawMsg;
    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast('Messages de statut enregistrés !', 'success');
  }

  async toggleMasterRevealSwitch() {
    const val = document.getElementById('admin-custom-message')?.value.trim();
    const lockedSub = document.getElementById('admin-locked-submessage')?.value.trim();
    if (val) this.settings.customRevealMessage = val;
    if (lockedSub) this.settings.lockedSubMessage = lockedSub;

    const currentlyRevealed = this.isRevealedNow();
    if (currentlyRevealed) {
      this.settings.masterRevealForce = false;
      if (
        !this.settings.revealScheduledAt ||
        new Date(this.settings.revealScheduledAt).getTime() <= Date.now()
      ) {
        this.settings.revealScheduledAt = new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString();
      }
      this.wasRevealedLastTick = false;
      await this.saveSettingsOnly();
      this.renderAll();
      this.showToast(
        '🔒 Mode Mystère activé : les identités et comptes Instagram sont masqués chez les étudiants.',
        'info'
      );
    } else {
      this.settings.masterRevealForce = true;
      this.wasRevealedLastTick = true;
      await this.saveSettingsOnly();
      this.renderAll();
      this.triggerRevealCelebration();
    }
  }

  async saveScheduledRevealTime() {
    const input = document.getElementById('admin-reveal-datetime');
    if (!input || !input.value) return;
    const parsed = new Date(input.value);
    if (isNaN(parsed.getTime())) return;

    const val = document.getElementById('admin-custom-message')?.value.trim();
    const lockedSub = document.getElementById('admin-locked-submessage')?.value.trim();
    if (val) this.settings.customRevealMessage = val;
    if (lockedSub) this.settings.lockedSubMessage = lockedSub;

    this.settings.revealScheduledAt = parsed.toISOString();
    if (parsed.getTime() > Date.now()) {
      this.settings.masterRevealForce = false;
      this.wasRevealedLastTick = false;
    }
    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast(
      `Dévoilement programmé au ${this.formatDateFr(this.settings.revealScheduledAt)} !`,
      'success'
    );
  }

  async scheduleRevealInTenSeconds() {
    const val = document.getElementById('admin-custom-message')?.value.trim();
    const lockedSub = document.getElementById('admin-locked-submessage')?.value.trim();
    if (val) this.settings.customRevealMessage = val;
    if (lockedSub) this.settings.lockedSubMessage = lockedSub;

    const target = new Date(Date.now() + 10 * 1000);
    this.settings.revealScheduledAt = target.toISOString();
    this.settings.masterRevealForce = false;
    this.wasRevealedLastTick = false;
    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast(
      '⏱️ Dévoilement programmé dans 10 secondes !',
      'info'
    );
  }

  updateMessagePreview() {
    const val = document.getElementById('admin-custom-message')?.value || '';
    const preview = document.getElementById('admin-message-preview');
    if (preview) preview.textContent = val;
  }

  async saveCustomRevealMessage() {
    const val = document.getElementById('admin-custom-message')?.value.trim();
    const lockedSub = document.getElementById('admin-locked-submessage')?.value.trim();
    if (val) this.settings.customRevealMessage = val;
    if (lockedSub) this.settings.lockedSubMessage = lockedSub;
    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast('Messages de révélation et d’attente mis à jour en temps réel !', 'success');
  }

  async runNonAlphabeticalShuffle() {
    await this.fetchLatestRemoteParticipants();
    if (this.participants.length === 0) {
      this.showToast('Aucun participant inscrit à mélanger.', 'error');
      return;
    }
    if (this.participants.length === 1) {
      this.participants[0].pouchNumber = 1;
      this.participants[0].drawnPouchNumber = null;
      await this.saveFullState();
      this.renderAll();
      this.showToast(
        '1 seul participant inscrit (Pochette #01 attribuée). En attente d’un 2e inscrit pour le tirage.',
        'info'
      );
      return;
    }
    this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
    const prioritize = document.getElementById('chk-prioritize-mentors')?.checked ?? true;
    const samePromo = document.getElementById('chk-same-promo-only')?.checked ?? false;
    this.settings.prioritizeMentors = prioritize;
    this.settings.samePromoOnly = samePromo;
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      prioritize,
      samePromo
    );
    await this.saveFullState();
    this.renderAll();
    this.showToast(
      'Fisher-Yates exécuté : numéros #01 à #N réattribués (ordre non-alphabétique) !',
      'success'
    );
  }

  async runFullDerangementDraw() {
    await this.fetchLatestRemoteParticipants();
    if (this.participants.length < 2) {
      this.showToast(
        'Il faut au moins 2 participants inscrits pour générer un tirage sans auto-attribution.',
        'error'
      );
      return;
    }
    const prioritize = document.getElementById('chk-prioritize-mentors')?.checked ?? true;
    const samePromo = document.getElementById('chk-same-promo-only')?.checked ?? false;
    this.settings.prioritizeMentors = prioritize;
    this.settings.samePromoOnly = samePromo;
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      prioritize,
      samePromo
    );
    await this.saveFullState();
    this.renderAll();
    const audit = SecretMateAlgorithms.verifyDerangement(this.participants);
    this.showToast(
      `Dérangement généré (${samePromo ? 'Même filière' : 'Inter-filières'}) : ${audit.uniqueDraws}/${audit.total} pochettes attribuées, 0 auto-attribution !`,
      'success'
    );
  }

  /**
   * ==========================================================================
   * GESTION CRUD COMPLÈTE DES LIEUX INDICES DU CAMPUS MONT-HOUY PAR LE BDE
   * ==========================================================================
   */
  renderAdminLocationsEditor(force = false) {
    const container = document.getElementById('admin-locations-editor-list');
    if (!container) return;
    if (!force && container.contains(document.activeElement)) return;

    container.innerHTML = this.settings.campusLocations
      .map(
        (loc, idx) => `
      <div class="p-5 rounded-2xl bg-cream border-2 border-ink space-y-3.5 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded bg-ink text-mse-yellow font-mono font-extrabold text-xs">
              Lieu Indice #${idx + 1}
            </span>
            <button
              type="button"
              onclick="app.deleteCampusLocation('${loc.id}')"
              class="px-2.5 py-1 rounded-lg bg-mse-coral/20 hover:bg-mse-coral hover:text-white text-iae-700 font-mono font-bold text-xs border border-ink transition"
            >
              🗑️ Supprimer ce lieu
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="sm:col-span-2">
              <label class="block text-[11px] font-mono font-extrabold uppercase text-ink mb-1">Nom du Lieu sur le Campus :</label>
              <input
                type="text"
                id="loc-name-${loc.id}"
                value="${this.escapeHtml(loc.name)}"
                class="w-full px-3 py-2 rounded-xl border-2 border-ink bg-white font-display font-bold text-sm text-ink"
              />
            </div>
            <div>
              <label class="block text-[11px] font-mono font-extrabold uppercase text-ink mb-1">Badge / Tag :</label>
              <input
                type="text"
                id="loc-tag-${loc.id}"
                value="${this.escapeHtml(loc.tag)}"
                class="w-full px-3 py-2 rounded-xl border-2 border-ink bg-white font-mono font-bold text-xs text-ink"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-mono font-extrabold uppercase text-iae-700 mb-1">
              💬 Message / Consigne qui s'affiche sur ce Lieu Indice (chez l'étudiant) :
            </label>
            <textarea
              id="loc-tip-${loc.id}"
              rows="2"
              class="w-full p-2.5 rounded-xl border-2 border-ink bg-white text-xs font-medium text-ink"
            >${this.escapeHtml(loc.tip)}</textarea>
          </div>

          <div>
            <label class="block text-[11px] font-mono font-extrabold uppercase text-emerald-800 mb-1">
              🤝 Défi brise-glace binôme rattaché à ce lieu :
            </label>
            <textarea
              id="loc-challenge-${loc.id}"
              rows="2"
              class="w-full p-2.5 rounded-xl border-2 border-ink bg-white text-xs font-medium text-ink"
            >${this.escapeHtml(loc.challenge)}</textarea>
          </div>
        </div>

        <button
          type="button"
          onclick="app.saveSingleCampusLocation('${loc.id}')"
          class="neo-btn-primary w-full py-2.5 rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Enregistrer ce lieu & Mettre à jour chez les étudiants</span>
        </button>
      </div>
    `
      )
      .join('');
  }

  async saveSingleCampusLocation(locId) {
    const loc = this.settings.campusLocations.find(l => l.id === locId);
    if (!loc) return;

    const oldName = loc.name;
    const newName = document.getElementById(`loc-name-${locId}`)?.value.trim() || oldName;
    const newTag = document.getElementById(`loc-tag-${locId}`)?.value.trim() || loc.tag;
    const newTip = document.getElementById(`loc-tip-${locId}`)?.value.trim() || loc.tip;
    const newChallenge =
      document.getElementById(`loc-challenge-${locId}`)?.value.trim() || loc.challenge;

    loc.name = newName;
    loc.tag = newTag;
    loc.tip = newTip;
    loc.challenge = newChallenge;

    if (oldName !== newName) {
      await this.fetchLatestRemoteParticipants();
      this.participants.forEach(p => {
        if (p.location === oldName) p.location = newName;
      });
      await this.saveFullState();
    } else {
      await this.saveSettingsOnly();
    }

    this.renderAll();
    this.renderAdminLocationsEditor(true);
    this.showToast(
      `Lieu « ${newName} » et son message d'indice mis à jour en temps réel !`,
      'success'
    );
  }

  async saveAllCampusLocations() {
    const renames = [];
    this.settings.campusLocations.forEach(loc => {
      const oldName = loc.name;
      const newName = document.getElementById(`loc-name-${loc.id}`)?.value.trim() || oldName;
      const newTag = document.getElementById(`loc-tag-${loc.id}`)?.value.trim() || loc.tag;
      const newTip = document.getElementById(`loc-tip-${loc.id}`)?.value.trim() || loc.tip;
      const newChallenge =
        document.getElementById(`loc-challenge-${loc.id}`)?.value.trim() || loc.challenge;

      loc.name = newName;
      loc.tag = newTag;
      loc.tip = newTip;
      loc.challenge = newChallenge;

      if (oldName !== newName) {
        renames.push({ oldName, newName });
      }
    });

    if (renames.length > 0) {
      await this.fetchLatestRemoteParticipants();
      this.participants.forEach(p => {
        const rename = renames.find(r => r.oldName === p.location);
        if (rename) p.location = rename.newName;
      });
      await this.saveFullState();
    } else {
      await this.saveSettingsOnly();
    }

    this.renderAll();
    this.renderAdminLocationsEditor(true);
    this.showToast('Tous les lieux du campus et leurs messages ont été enregistrés !', 'success');
  }

  async addNewCampusLocation() {
    const newLoc = {
      id: `loc-${Date.now()}`,
      name: 'Nouveau Lieu Mont-Houy (ex: Gymnase SUAPS)',
      tag: '✨ Spot Campus',
      tip: "Rends-toi devant l'entrée principale de ce lieu sur le campus du Mont-Houy pour découvrir l'univers de ton Secret Mate !",
      challenge: 'Échangez vos meilleurs bons plans sport ou associations de l’IAE Valenciennes !'
    };
    this.settings.campusLocations.push(newLoc);
    await this.saveSettingsOnly();
    this.renderAll();
    this.renderAdminLocationsEditor(true);
    this.showToast('Nouveau lieu ajouté ! Vous pouvez personnaliser son nom et son message.', 'success');
  }

  async deleteCampusLocation(locId) {
    if (this.settings.campusLocations.length <= 1) {
      this.showToast('Il doit rester au moins 1 lieu sur le campus.', 'error');
      return;
    }
    const removed = this.settings.campusLocations.find(l => l.id === locId);
    this.settings.campusLocations = this.settings.campusLocations.filter(l => l.id !== locId);
    const fallbackName = this.settings.campusLocations[0].name;

    await this.fetchLatestRemoteParticipants();
    if (removed) {
      this.participants.forEach(p => {
        if (p.location === removed.name) p.location = fallbackName;
      });
    }

    await this.saveFullState();
    this.renderAll();
    this.renderAdminLocationsEditor(true);
    this.showToast('Lieu supprimé et participants réaffectés.', 'info');
  }

  /**
   * ==========================================================================
   * GESTION CRUD DES PARTICIPANTS PAR LE BDE (AJOUTER, MODIFIER TOUT, SUPPRIMER)
   * ==========================================================================
   */
  openParticipantModal(participantId = null, studentSelfEdit = false) {
    this.isStudentEditingOwnProfile = studentSelfEdit;
    const modal = document.getElementById('participant-modal');
    if (!modal) return;

    const locSelect = document.getElementById('edit-p-location');
    if (locSelect) {
      locSelect.innerHTML = this.settings.campusLocations
        .map(l => `<option value="${this.escapeHtml(l.name)}">${this.escapeHtml(l.name)}</option>`)
        .join('');
    }
    const secSelect = document.getElementById('edit-p-secret');
    if (secSelect) {
      secSelect.innerHTML = this.settings.secretCategories
        .map(
          s => `<option value="${this.escapeHtml(s.title)}">${this.escapeHtml(s.title)}</option>`
        )
        .join('');
    }

    const bdeOnlyBox = document.getElementById('edit-p-bde-only-fields');
    if (bdeOnlyBox) {
      bdeOnlyBox.classList.toggle('hidden', studentSelfEdit);
    }

    const p = participantId ? this.participants.find(item => item.id === participantId) : null;

    const promoSelect = document.getElementById('edit-p-promo');
    if (promoSelect) {
      const basePromos =
        Array.isArray(this.settings.promoOptions) && this.settings.promoOptions.length > 0
          ? [...this.settings.promoOptions]
          : getDefaultPromoOptions();
      if (p && p.promo && !basePromos.includes(p.promo)) {
        basePromos.push(p.promo);
      }
      promoSelect.innerHTML = basePromos
        .map(pr => `<option value="${this.escapeHtml(pr)}">${this.escapeHtml(pr)}</option>`)
        .join('');
    }

    if (p) {
      document.getElementById('p-modal-title').textContent = studentSelfEdit
        ? 'Modifier mes énigmes & ma pochette'
        : `Modifier ${p.firstName} ${p.lastName} (Pochette #${String(p.pouchNumber).padStart(
            2,
            '0'
          )})`;
      document.getElementById('edit-p-id').value = p.id;
      document.getElementById('edit-p-firstname').value = p.firstName;
      document.getElementById('edit-p-lastname').value = p.lastName;
      document.getElementById('edit-p-email').value = p.email;
      document.getElementById('edit-p-whatsapp').value = p.instagram || p.whatsapp || '';
      document.getElementById('edit-p-promo').value = p.promo;
      document.getElementById('edit-p-role').value = p.role;
      document.getElementById('edit-p-location').value = p.location;
      document.getElementById('edit-p-secret').value = p.secretType;
      document.getElementById('edit-p-pouch').value = p.pouchNumber;
      document.getElementById('edit-p-drawn').value = p.drawnPouchNumber || '';
      document.getElementById('edit-p-backup').checked = !!p.isBackupMate;
      document.getElementById('edit-p-hasdrawn').checked = !!p.hasDrawn;
      document.getElementById('edit-p-r1').value = p.riddles?.[0] || '';
      document.getElementById('edit-p-r2').value = p.riddles?.[1] || '';
      document.getElementById('edit-p-r3').value = p.riddles?.[2] || '';
    } else {
      const nextPouch =
        this.participants.reduce((m, item) => Math.max(m, Number(item.pouchNumber) || 0), 0) + 1;
      document.getElementById('p-modal-title').textContent =
        'Ajouter un nouveau participant manuellement';
      document.getElementById('edit-p-id').value = '';
      document.getElementById('edit-p-firstname').value = '';
      document.getElementById('edit-p-lastname').value = '';
      document.getElementById('edit-p-email').value = `prenom.nom${this.settings.emailDomain}`;
      document.getElementById('edit-p-whatsapp').value = '@prenom.iae';
      document.getElementById('edit-p-promo').value =
        this.settings.promoOptions?.[0] || 'Management des Organisations (L3 / Master MDO)';
      document.getElementById('edit-p-role').value = 'nouveau';
      document.getElementById('edit-p-pouch').value = nextPouch;
      document.getElementById('edit-p-drawn').value = '';
      document.getElementById('edit-p-backup').checked = false;
      document.getElementById('edit-p-hasdrawn').checked = false;
      document.getElementById('edit-p-r1').value = RIDDLE_IDEAS[1][0];
      document.getElementById('edit-p-r2').value = RIDDLE_IDEAS[2][0];
      document.getElementById('edit-p-r3').value = RIDDLE_IDEAS[3][0];
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeParticipantModal() {
    const modal = document.getElementById('participant-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  }

  async saveParticipantFromModal(event) {
    event.preventDefault();
    const id = document.getElementById('edit-p-id').value;
    const firstName = document.getElementById('edit-p-firstname').value.trim();
    const lastName = document.getElementById('edit-p-lastname').value.trim();
    const email = document.getElementById('edit-p-email').value.trim().toLowerCase();
    const contact = this.normalizeInstagramOrContact(
      document.getElementById('edit-p-whatsapp').value
    );
    const promo = document.getElementById('edit-p-promo').value.trim();
    const role = document.getElementById('edit-p-role').value;
    const location = document.getElementById('edit-p-location').value;
    const secretType = document.getElementById('edit-p-secret').value;
    const pouchNumber = parseInt(document.getElementById('edit-p-pouch').value, 10) || 1;
    const rawDrawn = document.getElementById('edit-p-drawn').value;
    const drawnPouchNumber = rawDrawn ? parseInt(rawDrawn, 10) || null : null;
    const isBackupMate = document.getElementById('edit-p-backup').checked;
    const hasDrawn = document.getElementById('edit-p-hasdrawn').checked;
    const r1 = document.getElementById('edit-p-r1').value.trim();
    const r2 = document.getElementById('edit-p-r2').value.trim();
    const r3 = document.getElementById('edit-p-r3').value.trim();

    if (!this.isStudentEditingOwnProfile && drawnPouchNumber === pouchNumber) {
      this.showToast(
        'Attention : un étudiant ne peut pas avoir un numéro pioché égal à son propre numéro de pochette (i ≠ p(i)) !',
        'error'
      );
      return;
    }

    await this.fetchLatestRemoteParticipants();

    if (id) {
      const idx = this.participants.findIndex(p => p.id === id);
      if (idx !== -1) {
        const updatedP = {
          ...this.participants[idx],
          id: sanitizeFirebaseKey(this.participants[idx].id),
          firstName,
          lastName,
          email,
          instagram: contact,
          whatsapp: contact,
          promo,
          role,
          location,
          secretType,
          riddles: [r1, r2, r3],
          ...(this.isStudentEditingOwnProfile
            ? {}
            : { pouchNumber, drawnPouchNumber, isBackupMate, hasDrawn })
        };
        this.participants[idx] = updatedP;
        this.closeParticipantModal();
        await this.saveParticipantPatch({
          [`participants/${updatedP.id}`]: updatedP
        });
      } else {
        this.closeParticipantModal();
      }
    } else {
      const newP = {
        id: makeParticipantId(),
        firstName,
        lastName,
        email,
        instagram: contact,
        whatsapp: contact,
        promo,
        role,
        location,
        secretType,
        riddles: [r1, r2, r3],
        pouchNumber,
        drawnPouchNumber,
        isBackupMate,
        hasDrawn
      };

      if (!drawnPouchNumber) {
        const insertion = SecretMateAlgorithms.insertNewParticipantIntoCycle(
          this.participants,
          newP,
          this.settings.samePromoOnly
        );
        // Conserve le n° pochette choisi s'il n'est pas déjà pris
        if (!this.participants.some(item => item.pouchNumber === pouchNumber)) {
          const oldNewPouch = insertion.added.pouchNumber;
          insertion.added.pouchNumber = pouchNumber;
          if (insertion.modifiedPartner && insertion.modifiedPartner.drawnPouchNumber === oldNewPouch) {
            insertion.modifiedPartner.drawnPouchNumber = pouchNumber;
          }
        }
        insertion.added.hasDrawn = hasDrawn;
        this.participants = insertion.participants;
        this.closeParticipantModal();

        if (insertion.rebuildAll) {
          await this.saveFullState({ includeSettings: false });
        } else {
          const patch = {
            [`participants/${insertion.added.id}`]: insertion.added
          };
          if (insertion.modifiedPartner && insertion.modifiedPartner.id !== insertion.added.id) {
            patch[`participants/${insertion.modifiedPartner.id}/drawnPouchNumber`] =
              insertion.modifiedPartner.drawnPouchNumber;
          }
          await this.saveParticipantPatch(patch);
        }
      } else {
        this.participants.push(newP);
        this.closeParticipantModal();
        await this.saveParticipantPatch({
          [`participants/${newP.id}`]: newP
        });
      }
    }

    this.renderAll();
    this.showToast(`Profil de ${firstName} ${lastName} enregistré avec succès !`, 'success');
  }

  async resetStudentDraw(participantId) {
    const p = this.participants.find(item => item.id === participantId);
    if (!p) return;
    p.hasDrawn = false;
    await this.saveParticipantPatch({
      [`participants/${sanitizeFirebaseKey(p.id)}/hasDrawn`]: false
    });
    this.renderAll();
    this.showToast(
      `La pioche de ${p.firstName} ${p.lastName} a été réinitialisée : le bouton « Piocher » est à nouveau actif sur son écran !`,
      'info'
    );
  }

  async deleteParticipant(participantId) {
    await this.fetchLatestRemoteParticipants();
    const target = this.participants.find(p => p.id === participantId);
    if (!target) return;

    this.participants = this.participants.filter(p => p.id !== participantId);

    if (
      this.loggedInEmail &&
      target.email &&
      this.loggedInEmail.toLowerCase() === target.email.toLowerCase()
    ) {
      this.loggedInEmail = null;
      safeStorageRemove(SESSION_EMAIL_KEY);
    }

    if (this.participants.length >= 2) {
      this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
      this.participants = SecretMateAlgorithms.generateDerangement(
        this.participants,
        this.settings.prioritizeMentors,
        this.settings.samePromoOnly
      );
    } else if (this.participants.length === 1) {
      this.participants[0].pouchNumber = 1;
      this.participants[0].drawnPouchNumber = null;
      this.participants[0].hasDrawn = false;
    }

    await this.saveFullState({ includeSettings: false });
    this.renderAll();

    const msg =
      this.participants.length === 0
        ? `Participant ${target.firstName} supprimé : la liste est maintenant vide (0 inscrit).`
        : this.participants.length === 1
        ? `Participant ${target.firstName} supprimé : 1 seul inscrit restant (en attente d’un 2e participant).`
        : `Participant ${target.firstName} supprimé et tirage recalculé.`;
    this.showToast(msg, 'info');
  }

  async assignBackupLutinFor(absentId) {
    await this.fetchLatestRemoteParticipants();
    const absent = this.participants.find(p => p.id === absentId);
    if (!absent) return;

    const lutins = this.participants.filter(p => p.isBackupMate && p.id !== absentId);
    if (lutins.length === 0) {
      this.showToast('Aucun Lutin de secours disponible ! Activez-en un d’abord.', 'error');
      return;
    }

    const chosenLutin = lutins[Math.floor(Math.random() * lutins.length)];
    absent.firstName = chosenLutin.firstName;
    absent.lastName = `${chosenLutin.lastName} (Lutin BDE Secours)`;
    absent.instagram = chosenLutin.instagram || chosenLutin.whatsapp;
    absent.whatsapp = chosenLutin.instagram || chosenLutin.whatsapp;
    absent.promo = `${chosenLutin.promo} • Lutin Secours`;

    await this.saveParticipantPatch({
      [`participants/${sanitizeFirebaseKey(absent.id)}`]: absent
    });
    this.renderAll();
    this.showToast(
      `🛟 Le Lutin de secours ${chosenLutin.firstName} remplace désormais la Pochette #${String(
        absent.pouchNumber
      ).padStart(2, '0')} !`,
      'success'
    );
  }

  /**
   * ==========================================================================
   * GESTION DES TEXTES GLOBAUX & DES SECRETS DE PROMO PAR LE BDE
   * ==========================================================================
   */
  async saveGlobalSiteTexts() {
    this.settings.topAnnouncement =
      document.getElementById('cfg-top-announcement')?.value.trim() ||
      this.settings.topAnnouncement;
    this.settings.budgetLabel =
      document.getElementById('cfg-budget-label')?.value.trim() || this.settings.budgetLabel;
    this.settings.heroTitle =
      document.getElementById('cfg-hero-title')?.value.trim() || this.settings.heroTitle;
    this.settings.afterworkTitle =
      document.getElementById('cfg-afterwork-title')?.value.trim() || this.settings.afterworkTitle;
    this.settings.heroSubtitle =
      document.getElementById('cfg-hero-subtitle')?.value.trim() || this.settings.heroSubtitle;
    this.settings.afterworkSpot =
      document.getElementById('cfg-afterwork-spot')?.value.trim() || this.settings.afterworkSpot;

    let domain = document.getElementById('cfg-email-domain')?.value.trim() || '@uphf.fr';
    if (!domain.startsWith('@')) domain = `@${domain}`;
    this.settings.emailDomain = domain;

    this.settings.adminPin =
      document.getElementById('cfg-admin-pin')?.value.trim() || this.settings.adminPin;

    await this.saveSettingsOnly();
    this.renderAll();
    this.showToast('Tous les textes globaux et paramètres du site ont été mis à jour !', 'success');
  }

  /**
   * ==========================================================================
   * GESTION DE LA LISTE DÉROULANTE DES FILIÈRES IAE PAR LE BDE
   * ==========================================================================
   */
  renderAdminPromosEditor(force = false) {
    const container = document.getElementById('admin-promos-editor-list');
    if (!container) return;
    if (!force && container.contains(document.activeElement)) return;

    const promos =
      Array.isArray(this.settings.promoOptions) && this.settings.promoOptions.length > 0
        ? this.settings.promoOptions
        : getDefaultPromoOptions();

    container.innerHTML = promos
      .map(
        (promoName, idx) => `
      <div class="p-3.5 rounded-2xl bg-cream border-2 border-ink flex items-center gap-2">
        <span class="px-2 py-1 rounded-lg bg-ink text-mse-yellow font-mono font-extrabold text-xs shrink-0">
          #${idx + 1}
        </span>
        <input
          type="text"
          id="promo-opt-${idx}"
          value="${this.escapeHtml(promoName)}"
          class="flex-1 px-3 py-1.5 rounded-xl border-2 border-ink bg-white font-display font-bold text-xs text-ink"
        />
        <button
          type="button"
          onclick="app.saveSinglePromoOption(${idx})"
          class="px-3 py-1.5 rounded-xl bg-ink text-mse-yellow font-mono font-bold text-xs shrink-0 hover:bg-slate-800 transition"
        >
          Sauver
        </button>
        <button
          type="button"
          onclick="app.deletePromoOption(${idx})"
          class="p-1.5 rounded-xl bg-mse-coral/20 hover:bg-mse-coral hover:text-white text-iae-700 border border-ink text-xs font-bold shrink-0 transition"
          title="Supprimer cette filière"
        >
          🗑️
        </button>
      </div>
    `
      )
      .join('');
  }

  async saveSinglePromoOption(idx) {
    if (!Array.isArray(this.settings.promoOptions)) {
      this.settings.promoOptions = getDefaultPromoOptions();
    }
    const oldVal = this.settings.promoOptions[idx];
    const newVal = document.getElementById(`promo-opt-${idx}`)?.value.trim();
    if (!newVal) {
      this.showToast('Le nom de la filière ne peut pas être vide.', 'error');
      return;
    }

    this.settings.promoOptions[idx] = newVal;
    if (oldVal && oldVal !== newVal) {
      await this.fetchLatestRemoteParticipants();
      this.participants.forEach(p => {
        if (p.promo === oldVal) p.promo = newVal;
      });
      await this.saveFullState();
    } else {
      await this.saveSettingsOnly();
    }

    this.renderAll();
    this.renderAdminPromosEditor(true);
    this.showToast(`Filière « ${newVal} » mise à jour dans la liste déroulante !`, 'success');
  }

  async addPromoOption() {
    if (!Array.isArray(this.settings.promoOptions)) {
      this.settings.promoOptions = getDefaultPromoOptions();
    }
    const newPromo = `Nouvelle Filière IAE #${this.settings.promoOptions.length + 1}`;
    this.settings.promoOptions.push(newPromo);
    await this.saveSettingsOnly();
    this.renderAll();
    this.renderAdminPromosEditor(true);
    this.showToast('Nouvelle filière ajoutée à la liste déroulante !', 'success');
  }

  async deletePromoOption(idx) {
    if (!Array.isArray(this.settings.promoOptions) || this.settings.promoOptions.length <= 1) {
      this.showToast('Il doit rester au moins 1 filière dans la liste déroulante.', 'error');
      return;
    }
    const removed = this.settings.promoOptions[idx];
    this.settings.promoOptions.splice(idx, 1);
    const fallbackPromo = this.settings.promoOptions[0];

    await this.fetchLatestRemoteParticipants();
    this.participants.forEach(p => {
      if (p.promo === removed) p.promo = fallbackPromo;
    });

    await this.saveFullState();
    this.renderAll();
    this.renderAdminPromosEditor(true);
    this.showToast(`Filière supprimée et étudiants rattachés à « ${fallbackPromo} ».`, 'info');
  }

  renderAdminSecretsEditor(force = false) {
    const container = document.getElementById('admin-secrets-editor-list');
    if (!container) return;
    if (!force && container.contains(document.activeElement)) return;

    container.innerHTML = this.settings.secretCategories
      .map(
        sec => `
      <div class="p-4 rounded-2xl bg-cream border-2 border-ink space-y-2.5">
        <div class="flex items-center gap-2">
          <input
            type="text"
            id="sec-icon-${sec.id}"
            value="${this.escapeHtml(sec.icon)}"
            class="w-12 px-2 py-1.5 rounded-lg border-2 border-ink bg-white text-center text-base"
          />
          <input
            type="text"
            id="sec-title-${sec.id}"
            value="${this.escapeHtml(sec.title)}"
            class="flex-1 px-3 py-1.5 rounded-lg border-2 border-ink bg-white font-display font-bold text-xs text-ink"
          />
          <button
            type="button"
            onclick="app.deleteSecretCategory('${sec.id}')"
            class="p-1.5 rounded-lg bg-mse-coral/20 hover:bg-mse-coral hover:text-white text-iae-700 border border-ink text-xs font-bold"
          >
            🗑️
          </button>
        </div>
        <input
          type="text"
          id="sec-desc-${sec.id}"
          value="${this.escapeHtml(sec.desc)}"
          class="w-full px-3 py-1.5 rounded-lg border-2 border-ink bg-white text-xs text-slate-700"
        />
        <button
          type="button"
          onclick="app.saveSingleSecretCategory('${sec.id}')"
          class="w-full py-1.5 rounded-lg bg-ink text-mse-yellow font-mono font-bold text-xs"
        >
          Enregistrer cette catégorie
        </button>
      </div>
    `
      )
      .join('');
  }

  async saveSingleSecretCategory(secId) {
    const sec = this.settings.secretCategories.find(s => s.id === secId);
    if (!sec) return;
    const oldTitle = sec.title;
    sec.icon = document.getElementById(`sec-icon-${secId}`)?.value.trim() || '🎁';
    sec.title = document.getElementById(`sec-title-${secId}`)?.value.trim() || oldTitle;
    sec.desc = document.getElementById(`sec-desc-${secId}`)?.value.trim() || sec.desc;

    if (oldTitle !== sec.title) {
      await this.fetchLatestRemoteParticipants();
      this.participants.forEach(p => {
        if (p.secretType === oldTitle) p.secretType = sec.title;
      });
      await this.saveFullState();
    } else {
      await this.saveSettingsOnly();
    }

    this.renderAll();
    this.renderAdminSecretsEditor(true);
    this.showToast(`Catégorie « ${sec.title} » enregistrée !`, 'success');
  }

  async addSecretCategory() {
    this.settings.secretCategories.push({
      id: `sec-${Date.now()}`,
      title: 'Nouveau Secret de promo',
      icon: '🎁',
      desc: 'Description personnalisée par le BDE.'
    });
    await this.saveSettingsOnly();
    this.renderAll();
    this.renderAdminSecretsEditor(true);
    this.showToast('Nouvelle catégorie de Secret de promo ajoutée !', 'success');
  }

  async deleteSecretCategory(secId) {
    if (this.settings.secretCategories.length <= 1) {
      this.showToast('Il faut conserver au moins 1 catégorie.', 'error');
      return;
    }
    const removed = this.settings.secretCategories.find(s => s.id === secId);
    this.settings.secretCategories = this.settings.secretCategories.filter(s => s.id !== secId);
    const fallbackTitle = this.settings.secretCategories[0].title;

    await this.fetchLatestRemoteParticipants();
    if (removed) {
      this.participants.forEach(p => {
        if (p.secretType === removed.title) p.secretType = fallbackTitle;
      });
    }

    await this.saveFullState();
    this.renderAll();
    this.renderAdminSecretsEditor(true);
    this.showToast('Catégorie supprimée.', 'info');
  }

  /**
   * ==========================================================================
   * RENDU DU TABLEAU ADMIN & DU COCKPIT BDE
   * ==========================================================================
   */
  setAdminFilter(filter) {
    this.adminFilter = filter;
    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
      const active = btn.getAttribute('data-filter') === filter;
      btn.className = active
        ? 'admin-filter-btn active px-3.5 py-2 rounded-xl text-xs font-mono font-extrabold bg-iae-700 text-white border border-ink'
        : 'admin-filter-btn px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cream text-ink border border-ink';
    });
    this.renderAdminTable();
  }

  renderAdminView() {
    const total = this.participants.length;
    const nouveaux = this.participants.filter(p => p.role === 'nouveau').length;
    const parrains = this.participants.filter(p => p.role === 'parrain').length;
    const internationaux = this.participants.filter(p => p.role === 'international').length;
    const backups = this.participants.filter(p => p.isBackupMate).length;

    const setTxt = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    setTxt('kpi-total', total);
    setTxt('kpi-nouveaux', nouveaux);
    setTxt('kpi-parrains', parrains);
    setTxt('kpi-internationaux', internationaux);
    setTxt('kpi-backups', backups);
    setTxt('kpi-locations', this.settings.campusLocations.length);

    setTxt('count-all', total);
    setTxt('count-nouveau', nouveaux);
    setTxt('count-parrain', parrains);
    setTxt('count-international', internationaux);
    setTxt('count-backup', backups);

    const btnReg = document.getElementById('btn-toggle-registrations');
    if (btnReg) {
      btnReg.className = this.settings.registrationsOpen
        ? 'px-4 py-2 rounded-xl font-mono font-extrabold text-xs border-2 border-ink bg-mse-green text-ink'
        : 'px-4 py-2 rounded-xl font-mono font-extrabold text-xs border-2 border-ink bg-mse-coral text-white';
      btnReg.textContent = this.settings.registrationsOpen
        ? 'INSCRIPTIONS : OUVERTES ✓'
        : 'INSCRIPTIONS : FERMÉES ✕';
    }

    const btnDraw = document.getElementById('btn-toggle-drawing');
    if (btnDraw) {
      btnDraw.className = this.settings.drawingOpen
        ? 'px-4 py-2 rounded-xl font-mono font-extrabold text-xs border-2 border-ink bg-mse-green text-ink'
        : 'px-4 py-2 rounded-xl font-mono font-extrabold text-xs border-2 border-ink bg-mse-coral text-white';
      btnDraw.textContent = this.settings.drawingOpen
        ? 'PIOCHE : OUVERTE ✓'
        : 'PIOCHE : VERROUILLÉE 🔒';
    }

    const setValIfNotFocused = (id, val) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = val;
    };

    setValIfNotFocused('admin-closed-reg-msg', this.settings.closedRegistrationMessage);
    setValIfNotFocused('admin-closed-draw-msg', this.settings.closedDrawingMessage);
    setValIfNotFocused(
      'admin-reveal-datetime',
      this.toLocalDatetimeInputValue(this.settings.revealScheduledAt)
    );
    setValIfNotFocused('admin-custom-message', this.settings.customRevealMessage);
    setValIfNotFocused('admin-locked-submessage', this.settings.lockedSubMessage);

    setValIfNotFocused('cfg-top-announcement', this.settings.topAnnouncement);
    setValIfNotFocused('cfg-budget-label', this.settings.budgetLabel);
    setValIfNotFocused('cfg-hero-title', this.settings.heroTitle);
    setValIfNotFocused('cfg-afterwork-title', this.settings.afterworkTitle);
    setValIfNotFocused('cfg-hero-subtitle', this.settings.heroSubtitle);
    setValIfNotFocused('cfg-afterwork-spot', this.settings.afterworkSpot);
    setValIfNotFocused('cfg-email-domain', this.settings.emailDomain);
    setValIfNotFocused('cfg-admin-pin', this.settings.adminPin);

    const preview = document.getElementById('admin-message-preview');
    if (preview) preview.textContent = this.settings.customRevealMessage;

    const revealed = this.isRevealedNow();
    const liveBadge = document.getElementById('admin-reveal-live-badge');
    const masterBtn = document.getElementById('btn-master-switch');
    const masterBtnLabel = document.getElementById('btn-master-switch-label');

    if (liveBadge) {
      liveBadge.className = revealed
        ? 'px-4 py-2 rounded-xl font-mono text-xs font-extrabold bg-mse-green text-ink border-2 border-ink'
        : 'px-4 py-2 rounded-xl font-mono text-xs font-extrabold bg-ink text-mse-yellow border-2 border-ink';
      liveBadge.textContent = revealed
        ? '🎉 MODE RÉVÉLATION AFTERWORK ACTIF'
        : '🔒 MODE MYSTÈRE VERROUILLÉ';
    }

    if (masterBtn && masterBtnLabel) {
      masterBtnLabel.textContent = revealed
        ? 'REPASSER EN MODE MYSTÈRE 🔒'
        : 'FORCER LE DÉVOILEMENT IMMÉDIAT 🎉';
    }

    const chkSamePromo = document.getElementById('chk-same-promo-only');
    if (chkSamePromo) chkSamePromo.checked = !!this.settings.samePromoOnly;

    const chkMentors = document.getElementById('chk-prioritize-mentors');
    if (chkMentors) chkMentors.checked = !!this.settings.prioritizeMentors;

    if (this.participants.length === 0) {
      setTxt(
        'algo-audit-text',
        '[AUDIT] 0 inscrit actuellement — Base vierge prête pour les inscriptions de la nouvelle année !'
      );
    } else if (this.participants.length === 1) {
      setTxt(
        'algo-audit-text',
        '[AUDIT] 1 seul inscrit — En attente d’au moins 2 participants pour calculer le tirage (∀i, i ≠ p(i)).'
      );
    } else {
      const audit = SecretMateAlgorithms.verifyDerangement(this.participants);
      const modeLabel = this.settings.samePromoOnly
        ? `Même filière uniquement (${audit.samePromoCount}/${audit.total})`
        : 'Brassage inter-filières IAE';
      setTxt(
        'algo-audit-text',
        `[AUDIT] Fisher-Yates Non-Alphabétique ✓ | Auto-attribution : ${audit.selfDraws} (∀i, i ≠ p(i)) ✓ | Bijection : ${audit.uniqueDraws}/${audit.total} ✓ | Mode : ${modeLabel}`
      );
    }

    this.renderAdminTable();
    this.renderAdminLocationsEditor();
    this.renderAdminPromosEditor();
    this.renderAdminSecretsEditor();
  }

  renderAdminTable() {
    const tbody = document.getElementById('admin-participants-tbody');
    if (!tbody) return;

    const query = (document.getElementById('admin-search-input')?.value || '')
      .toLowerCase()
      .trim();

    const sorted = [...this.participants].sort((a, b) => a.pouchNumber - b.pouchNumber);
    const filtered = sorted.filter(p => {
      if (this.adminFilter === 'nouveau' && p.role !== 'nouveau') return false;
      if (this.adminFilter === 'parrain' && p.role !== 'parrain') return false;
      if (this.adminFilter === 'international' && p.role !== 'international') return false;
      if (this.adminFilter === 'backup' && !p.isBackupMate) return false;
      if (query) {
        const hay = `${p.firstName} ${p.lastName} ${p.email} ${p.promo} ${p.location} ${p.secretType} #${p.pouchNumber}`.toLowerCase();
        return hay.includes(query);
      }
      return true;
    });

    if (filtered.length === 0) {
      const emptyMsg =
        this.participants.length === 0
          ? 'Aucun participant inscrit (0) — La base est vierge et prête pour une nouvelle année !'
          : 'Aucun participant ne correspond aux filtres ou à la recherche en cours.';
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 px-4 text-center text-sm font-medium text-slate-500">
            ${emptyMsg}
          </td>
        </tr>
      `;
      return;
    }

    const pouchMap = new Map();
    this.participants.forEach(p => pouchMap.set(p.pouchNumber, p));

    const roleBadge = r => {
      if (r === 'nouveau')
        return '<span class="px-2 py-0.5 rounded bg-mse-yellow/40 border border-ink font-mono text-[10px] font-bold">🌱 Nouveau</span>';
      if (r === 'parrain')
        return '<span class="px-2 py-0.5 rounded bg-mse-green/30 border border-ink font-mono text-[10px] font-bold">🎓 Parrain</span>';
      return '<span class="px-2 py-0.5 rounded bg-mse-blue/30 border border-ink font-mono text-[10px] font-bold">🌍 International</span>';
    };

    tbody.innerHTML = filtered
      .map(p => {
        const myNum = `#${String(p.pouchNumber).padStart(2, '0')}`;
        const drawnNum = `#${String(p.drawnPouchNumber || 0).padStart(2, '0')}`;
        const target = pouchMap.get(p.drawnPouchNumber);

        return `
          <tr class="hover:bg-cream/80 transition">
            <td class="py-3.5 px-4 font-mono font-extrabold text-iae-700">
              <span class="px-3 py-1 rounded-xl bg-iae-50 border-2 border-ink">${myNum}</span>
            </td>
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-1.5">
                <span class="font-display font-extrabold text-ink">${this.escapeHtml(
                  p.firstName
                )} ${this.escapeHtml(p.lastName)}</span>
              </div>
              <span class="text-xs font-mono font-bold text-iae-700 block">${this.escapeHtml(
                p.email
              )}</span>
              <span class="text-[11px] text-slate-600">${this.escapeHtml(
                p.promo
              )} • ${this.escapeHtml(this.formatContactDetails(p.instagram || p.whatsapp).shortText)}</span>
            </td>
            <td class="py-3.5 px-4 space-y-1">
              <div>${roleBadge(p.role)}</div>
              ${
                p.isBackupMate
                  ? '<span class="inline-block px-2 py-0.5 rounded bg-mse-coral text-white font-mono text-[10px] font-bold">🛟 Lutin Secours</span>'
                  : ''
              }
            </td>
            <td class="py-3.5 px-4">
              <span class="text-xs font-bold text-ink block">${this.escapeHtml(p.secretType)}</span>
              <span class="text-[11px] font-mono text-slate-600">📍 ${this.escapeHtml(
                p.location
              )}</span>
            </td>
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-1.5">
                <span class="px-2.5 py-0.5 rounded-lg bg-ink text-mse-yellow font-mono font-extrabold text-xs">
                  Pioche ${drawnNum}
                </span>
                <span class="text-[11px] font-mono font-bold text-emerald-700">${
                  p.hasDrawn ? 'Tiré ✓' : 'À piocher'
                }</span>
              </div>
              ${
                target
                  ? `<span class="text-xs text-slate-600 block mt-0.5">→ ${this.escapeHtml(
                      target.firstName
                    )} ${this.escapeHtml(target.lastName)} ${
                      target.promo === p.promo
                        ? '<span class="inline-block ml-1 px-1.5 py-0.2 rounded bg-mse-green/30 border border-ink font-mono text-[9px] font-bold text-ink">Même filière</span>'
                        : ''
                    }</span>`
                  : ''
              }
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex flex-wrap items-center justify-end gap-1">
                <button
                  onclick="app.openParticipantModal('${p.id}', false)"
                  class="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-mse-yellow hover:bg-amber-400 text-ink border border-ink"
                  title="Modifier tout (nom, énigmes, lieu, numéro, pioche)"
                >
                  ✏️ Modifier
                </button>
                <button
                  onclick="app.resetStudentDraw('${p.id}')"
                  class="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-cream hover:bg-slate-200 text-ink border border-ink"
                  title="Réinitialiser sa pioche pour qu'il puisse repiocher"
                >
                  🔄
                </button>
                <button
                  onclick="app.impersonateStudent('${p.email}')"
                  class="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-cream hover:bg-iae-700 hover:text-white text-ink border border-ink"
                  title="Connecter et voir son écran étudiant"
                >
                  👁️
                </button>
                <button
                  onclick="app.assignBackupLutinFor('${p.id}')"
                  class="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-100 hover:bg-amber-200 text-ink border border-ink"
                  title="Remplacer par un Lutin de secours"
                >
                  🛟
                </button>
                <button
                  onclick="app.deleteParticipant('${p.id}')"
                  class="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-100 hover:bg-mse-coral hover:text-white text-iae-700 border border-ink"
                  title="Supprimer cet inscrit"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  impersonateStudent(email) {
    this.loggedInEmail = email;
    safeStorageSet(SESSION_EMAIL_KEY, email);
    this.switchView('participant');
  }

  /**
   * ==========================================================================
   * RENDU GLOBAL SYNCHRONISÉ (HEADER, CONNEXION/DÉCONNEXION, VUES)
   * ==========================================================================
   */
  renderAll() {
    const revealed = this.isRevealedNow();

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // Textes globaux pilotés par le BDE
    setTxt('ui-top-announcement', this.settings.topAnnouncement);
    setTxt('ui-hero-title', this.settings.heroTitle);
    setTxt('ui-hero-subtitle', this.settings.heroSubtitle);
    setTxt('ui-afterwork-title', this.settings.afterworkTitle);
    setTxt('ui-afterwork-spot', `📍 ${this.settings.afterworkSpot}`);
    setTxt('hero-budget-badge', `BUDGET : ${this.settings.budgetLabel.toUpperCase()}`);

    const domain = this.settings.emailDomain || '@uphf.fr';
    document.querySelectorAll('.ui-domain-text').forEach(el => {
      el.textContent = domain;
    });
    const regEmailInput = document.getElementById('reg-email');
    if (regEmailInput) regEmailInput.placeholder = `prenom.nom${domain}`;
    const loginEmailInput = document.getElementById('student-login-email');
    if (loginEmailInput) loginEmailInput.placeholder = `prenom.nom${domain}`;
    const adminSearchInput = document.getElementById('admin-search-input');
    if (adminSearchInput) adminSearchInput.placeholder = `Rechercher nom, ${domain}, lieu, #...`;
    document.title = `${this.settings.heroTitle} — IAE Valenciennes (Mont-Houy)`;

    // Gestion des boutons Connexion / Déconnexion dans le Header
    const studentConnected = this.loggedInEmail
      ? this.participants.find(
          p => p.email.toLowerCase() === this.loggedInEmail.toLowerCase()
        )
      : null;

    const guestHeaderActions = document.getElementById('header-guest-actions');
    const boxHeaderStudent = document.getElementById('header-student-session-box');
    const txtHeaderEmail = document.getElementById('header-student-email');

    if (studentConnected) {
      guestHeaderActions?.classList.add('hidden');
      guestHeaderActions?.classList.remove('flex');
      boxHeaderStudent?.classList.remove('hidden');
      boxHeaderStudent?.classList.add('flex');
      if (txtHeaderEmail) txtHeaderEmail.textContent = studentConnected.email;
    } else {
      guestHeaderActions?.classList.remove('hidden');
      guestHeaderActions?.classList.add('flex');
      boxHeaderStudent?.classList.add('hidden');
      boxHeaderStudent?.classList.remove('flex');
    }

    // Bouton Cockpit BDE & Déconnexion BDE dans le Header
    const navAdminUnlocked = document.getElementById('nav-admin-unlocked');
    const mobNavAdmin = document.getElementById('mob-nav-admin');
    const btnHeaderBdeLogout = document.getElementById('header-btn-bde-logout');
    if (this.isBdeUnlocked) {
      navAdminUnlocked?.classList.remove('hidden');
      navAdminUnlocked?.classList.add('inline-flex');
      mobNavAdmin?.classList.remove('hidden');
      mobNavAdmin?.classList.add('flex');
      btnHeaderBdeLogout?.classList.remove('hidden');
      btnHeaderBdeLogout?.classList.add('inline-flex');
    } else {
      navAdminUnlocked?.classList.add('hidden');
      navAdminUnlocked?.classList.remove('inline-flex');
      mobNavAdmin?.classList.add('hidden');
      mobNavAdmin?.classList.remove('flex');
      btnHeaderBdeLogout?.classList.add('hidden');
      btnHeaderBdeLogout?.classList.remove('inline-flex');
    }

    // Statut des inscriptions dans la barre supérieure
    const regPill = document.getElementById('ui-registration-status-pill');
    if (regPill) {
      if (this.settings.registrationsOpen) {
        regPill.className = 'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-mse-green whitespace-nowrap';
        regPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-mse-green animate-ping"></span> Inscriptions ouvertes';
      } else {
        regPill.className = 'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-mse-coral whitespace-nowrap';
        regPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-mse-coral"></span> Inscriptions fermées';
      }
    }

    // Bannière supérieure en direct quand Révélation active
    const globalBanner = document.getElementById('global-reveal-banner');
    const globalBannerTxt = document.getElementById('global-reveal-banner-text');
    if (globalBanner && globalBannerTxt) {
      globalBanner.classList.toggle('hidden', !revealed);
      globalBannerTxt.textContent = this.settings.customRevealMessage;
    }

    // Ticket Afterwork Hero
    const heroPill = document.getElementById('hero-reveal-state-pill');
    const heroTargetLabel = document.getElementById('hero-reveal-target-label');
    if (heroPill) {
      heroPill.className = revealed
        ? 'px-3 py-1 rounded-lg bg-mse-green text-ink font-mono font-extrabold text-xs border border-ink shrink-0'
        : 'px-3 py-1 rounded-lg bg-ink text-mse-yellow font-mono font-bold text-xs border border-white/20 shrink-0';
      heroPill.textContent = revealed ? '🎉 Dévoilé !' : '🔒 Mystère';
    }
    if (heroTargetLabel) {
      heroTargetLabel.textContent = revealed
        ? 'LES IDENTITÉS SONT DÉVERROUILLÉES !'
        : `DÉBLOCAGE PRÉVU LE ${this.formatDateFr(this.settings.revealScheduledAt)}`;
    }

    this.renderLandingDynamicElements();
    this.renderStudentView();
    this.renderAdminView();
    this.updateSyncModeBadge();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * ==========================================================================
   * EXPORT / IMPORT JSON & CSV + RESET BASE (BDE UNIQUEMENT)
   * ==========================================================================
   */
  async resetDemoData() {
    if (
      !window.confirm(
        'Réinitialiser toute la base avec les 10 profils de démonstration ? Les inscriptions actuelles seront remplacées sur tous les appareils.'
      )
    ) {
      return;
    }
    this.participants = getInitialDemoParticipants();
    this.settings = getDefaultSettings();
    this.wasRevealedLastTick = false;
    await this.saveFullState({ usePut: true });
    this.renderAll();
    this.showToast(
      `Base réinitialisée avec les 10 profils ${this.settings.emailDomain} et les 5 lieux du Mont-Houy !`,
      'success'
    );
  }

  async clearAllParticipants() {
    if (this.participants.length === 0) {
      this.showToast('La liste des participants est déjà vide (0 inscrit).', 'info');
      return;
    }
    const count = this.participants.length;
    if (
      !window.confirm(
        `Supprimer définitivement les ${count} participant(s) inscrit(s) pour repartir à 0 cette année ?\n\n` +
          `• Cette suppression sera synchronisée sur tous les appareils.\n` +
          `• Vos réglages BDE (filières IAE, lieux du campus, textes, code PIN) sont conservés.\n` +
          `• Les inscriptions seront rouvertes et la pioche / le dévoilement reverrouillés.`
      )
    ) {
      return;
    }

    this.participants = [];
    this.loggedInEmail = null;
    safeStorageRemove(SESSION_EMAIL_KEY);
    this.settings.registrationsOpen = true;
    this.settings.drawingOpen = false;
    this.settings.masterRevealForce = false;
    this.wasRevealedLastTick = false;

    await this.saveFullState({ usePut: true, includeSettings: true });
    this.renderAll();
    this.showToast(
      `Base vidée : ${count} participant(s) supprimé(s) (0 inscrit). Vos réglages BDE sont conservés !`,
      'success'
    );
  }

  exportJSON() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            project: 'Secret Mate - IAE Valenciennes',
            exportedAt: new Date().toISOString(),
            settings: this.settings,
            participants: this.participants
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secret-mate-iae-uphf-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Configuration complète exportée en JSON !', 'success');
  }

  exportCSV() {
    const headers = [
      'Numero_Pochette',
      'Prenom',
      'Nom',
      'Email_UPHF',
      'Instagram',
      'Promo',
      'Role',
      'Secret_De_Promo',
      'Lieu_Mont_Houy',
      'Lutin_Secours',
      'Pochette_Piochee',
      'Enigme_1',
      'Enigme_2',
      'Enigme_3'
    ];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [...this.participants]
      .sort((a, b) => a.pouchNumber - b.pouchNumber)
      .map(p => [
        p.pouchNumber,
        p.firstName,
        p.lastName,
        p.email,
        p.instagram || p.whatsapp || '',
        p.promo,
        p.role,
        p.secretType,
        p.location,
        p.isBackupMate ? 'OUI' : 'NON',
        p.drawnPouchNumber ?? '',
        p.riddles?.[0] ?? '',
        p.riddles?.[1] ?? '',
        p.riddles?.[2] ?? ''
      ]);

    const csv =
      '\uFEFF' + [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secret-mate-iae-uphf-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Fichier CSV exporté !', 'success');
  }

  handleFileImport(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const txt = e.target.result;
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(txt);
          const importedParticipants = normalizeParticipants(parsed.participants);
          if (importedParticipants.length > 0 || parsed.settings) {
            if (importedParticipants.length > 0) {
              this.participants = importedParticipants;
            }
            if (parsed.settings) {
              this.settings = normalizeSettings(parsed.settings, this.settings);
            }
            await this.saveFullState({ usePut: true });
            this.renderAll();
            this.showToast('Configuration et participants importés et synchronisés avec succès !', 'success');
          } else {
            this.showToast('Le fichier JSON ne contient pas de données valides.', 'error');
          }
        } else {
          this.showToast('Seul l’import de fichiers .json complets est pris en charge.', 'info');
        }
      } catch (err) {
        this.showToast('Erreur de lecture du fichier.', 'error');
      } finally {
        if (input) input.value = '';
      }
    };
    reader.readAsText(file);
  }

  /**
   * Utilitaires
   */
  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  toLocalDatetimeInputValue(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  formatDateFr(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '18h00';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const styles = {
      success: 'bg-ink border-2 border-mse-green text-white',
      info: 'bg-ink border-2 border-mse-yellow text-white',
      error: 'bg-iae-700 border-2 border-ink text-white'
    };

    const el = document.createElement('div');
    el.className = `pointer-events-auto p-4 rounded-2xl shadow-xl text-xs font-mono font-bold flex items-center justify-between gap-3 animate-fadeIn ${
      styles[type] || styles.info
    }`;
    el.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="text-mse-yellow hover:text-white font-extrabold">✕</button>
    `;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) el.remove();
    }, 4500);
  }
}

let app;
function bootSecretMateApp() {
  if (window.app) return;
  app = new SecretMateApp();
  window.app = app;
}
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootSecretMateApp);
} else {
  bootSecretMateApp();
}
