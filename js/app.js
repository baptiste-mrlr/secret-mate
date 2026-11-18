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

// ============================================================================
// CONNEXION GOOGLE FIREBASE REALTIME DATABASE (SANS TERMINAL) :
// Collez ici l'adresse de votre Realtime Database copiée depuis console.firebase.google.com
// Exemple : const FIREBASE_DATABASE_URL = 'https://secret-mate-iae-default-rtdb.europe-west1.firebasedatabase.app';
// (Lorsque vous ouvrez secretmateiaeva.html en local sur votre PC, le site reste
// automatiquement en Mode Local pour vos tests !)
// ============================================================================
const FIREBASE_DATABASE_URL = 'https://secret-mate-iae-default-rtdb.europe-west1.firebasedatabase.app';

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
    "Ancien(ne) de L3, j'ai survécu à tous les partiels grâce à mes fiches de révision ultra-synthétiques."
  ],
  2: [
    "Tu me reconnaîtras facilement : j'ai toujours un tote-bag clair et un casque audio autour du cou.",
    "Je porte souvent des baskets blanches et j'arrive toujours pile quand le tram s'arrête devant l'IAE.",
    "J'ai un ordinateur recouvert de stickers et un carnet rouge posé sur ma table de TD.",
    "On me croise à chaque pause près des lignes colorées de la Maison des Étudiants (MSE).",
    "J'ai toujours une gourde bleue sur mon bureau et je prends mes notes sur tablette.",
    "Je porte souvent le sweat bordeaux de l'IAE et je souris tout le temps dans les couloirs."
  ],
  3: [
    "Viens me voir à l'Afterwork avec le mot de passe « Hainaut » pour débloquer ton Secret de promo !",
    "Indice final : demande-moi quelle est ma ligne de couleur préférée au sol de la MSE !",
    "Défi : retrouve-moi près du comptoir de l'Afterwork à 18h et devine ma série préférée du moment !",
    "Si tu me trouves, je te partage mon drive complet de fiches de cours et mon astuce parking au Mont-Houy !",
    "Mon QG le midi est le RU : viens me demander mon meilleur bon plan resto étudiant à Valenciennes !",
    "Retrouve-moi près du baby-foot de la MSE à l'Afterwork : j'ai glissé une surprise sucrée dans ma pochette !"
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
      whatsapp: '06 42 18 90 11',
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
      whatsapp: '06 11 25 84 03',
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
      whatsapp: '06 78 34 12 90',
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
      whatsapp: '06 95 14 72 88',
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
      whatsapp: '07 81 55 20 14',
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
      whatsapp: '06 54 91 02 33',
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
      whatsapp: '07 44 19 83 60',
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
      whatsapp: '06 23 89 45 67',
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
      whatsapp: '06 99 10 44 82',
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
      whatsapp: '07 60 43 21 09',
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
      if (p.drawnPouchNumber != null) {
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
    this.loggedInEmail = localStorage.getItem(SESSION_EMAIL_KEY) || null;
    this.isBdeUnlocked = false;
    this.adminFilter = 'all';
    this.wasRevealedLastTick = false;
    this.broadcastChannel = null;
    this.isStudentEditingOwnProfile = false;
    this.lastUpdatedAt = null;
    this.isFirebaseActive = false;
    this.firebaseDbUrl = null;
    this.firebaseRef = null;

    this.init();
  }

  init() {
    this.loadState();
    this.wasRevealedLastTick = this.isRevealedNow();
    this.initRealtimeSync();
    this.initFirebaseOrLocalEngine();
    this.initRoutingAndShortcuts();
    this.initMasterClock();
    this.renderAll();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Détecte automatiquement :
   * - En local sur l'ordinateur (file://) -> Mode Local (localStorage) pour vos tests PC
   * - En ligne (https://) -> Connecte Google Firebase Realtime Database (via FIREBASE_DATABASE_URL ou /__/firebase/init.json)
   */
  async initFirebaseOrLocalEngine() {
    // 1. Si ouvert directement depuis l'ordinateur (double-clic sur secretmateiaeva.html) -> Mode Local (Tests PC)
    if (window.location.protocol === 'file:') {
      this.updateSyncModeBadge(false);
      return;
    }

    try {
      let firebaseConfig = null;

      // 2. Si l'URL de la Realtime Database a été renseignée dans FIREBASE_DATABASE_URL en haut de ce fichier
      if (FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.trim().startsWith('http')) {
        firebaseConfig = {
          databaseURL: FIREBASE_DATABASE_URL.trim().replace(/\/$/, '')
        };
      } else {
        // 3. Sinon, auto-détection native si hébergé sur Firebase Hosting
        const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
        if (response.ok) {
          firebaseConfig = await response.json();
        }
      }

      if (!firebaseConfig || !firebaseConfig.databaseURL) {
        this.updateSyncModeBadge(false);
        return;
      }

      this.isFirebaseActive = true;
      this.firebaseDbUrl = firebaseConfig.databaseURL.replace(/\/$/, '');
      this.updateSyncModeBadge(true);

      // Connexion WebSocket Temps Réel native via le SDK officiel Google Firebase
      if (window.firebase && typeof window.firebase.initializeApp === 'function') {
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp(firebaseConfig);
        }
        this.firebaseRef = window.firebase.database().ref(FIREBASE_DB_NODE);
        this.firebaseRef.on('value', snapshot => {
          const data = snapshot.val();
          if (data && Array.isArray(data.participants)) {
            this.applyIncomingState(data);
          } else if (data === null) {
            // Initialise automatiquement la base Firebase lors du tout premier déploiement
            this.saveState(true);
          }
        });
      } else {
        // Fallback REST automatique si le script CDN est bloqué par un pare-feu
        await this.pullFromFirebaseIfActive();
      }
    } catch (e) {
      // Exécution locale sur ordinateur : utilise localStorage automatiquement
      this.updateSyncModeBadge(false);
    }
  }

  updateSyncModeBadge(isFirebase) {
    const badge = document.getElementById('sync-mode-badge');
    const label = document.getElementById('sync-mode-label');
    if (!badge || !label) return;

    if (isFirebase) {
      badge.className =
        'px-3.5 py-2.5 rounded-xl text-xs font-mono font-extrabold bg-mse-green text-ink border-2 border-white flex items-center gap-1.5 shadow-sm';
      badge.innerHTML = `
        <i data-lucide="flame" class="w-4 h-4 text-iae-700"></i>
        <span id="sync-mode-label">Firebase Temps Réel Actif</span>
      `;
    } else {
      badge.className =
        'px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-white/10 text-mse-yellow border border-white/20 flex items-center gap-1.5';
      badge.innerHTML = `
        <i data-lucide="laptop" class="w-4 h-4 text-mse-yellow"></i>
        <span id="sync-mode-label">Mode Local (Tests PC)</span>
      `;
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
        if (parsed && Array.isArray(parsed.participants) && parsed.participants.length > 0) {
          this.lastUpdatedAt = parsed.updatedAt || null;
          this.participants = parsed.participants;
          const def = getDefaultSettings();
          this.settings = {
            ...def,
            ...(parsed.settings || {}),
            promoOptions:
              Array.isArray(parsed.settings?.promoOptions) &&
              parsed.settings.promoOptions.length > 0
                ? parsed.settings.promoOptions
                : def.promoOptions,
            campusLocations:
              Array.isArray(parsed.settings?.campusLocations) &&
              parsed.settings.campusLocations.length > 0
                ? parsed.settings.campusLocations
                : def.campusLocations,
            secretCategories:
              Array.isArray(parsed.settings?.secretCategories) &&
              parsed.settings.secretCategories.length > 0
                ? parsed.settings.secretCategories
                : def.secretCategories
          };
          return;
        }
      }
    } catch (e) {
      console.warn('Chargement des valeurs par défaut:', e);
    }

    this.participants = getInitialDemoParticipants();
    this.settings = getDefaultSettings();
    this.saveState(false);
  }

  saveState(broadcast = true) {
    const nowIso = new Date().toISOString();
    this.lastUpdatedAt = nowIso;
    const payload = {
      updatedAt: nowIso,
      settings: this.settings,
      participants: this.participants
    };
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(payload));
      if (broadcast && this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'STATE_UPDATED', payload });
      }
      if (broadcast) {
        this.pushToFirebaseIfActive(payload);
      }
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    }
  }

  initRealtimeSync() {
    // Synchronisation instantanée entre onglets pour les tests en local sur ordinateur
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('secret_mate_iae_v3_channel');
      this.broadcastChannel.onmessage = event => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          this.applyIncomingState(event.data.payload);
        }
      };
    }

    window.addEventListener('storage', event => {
      if (event.key === STATE_STORAGE_KEY && event.newValue) {
        try {
          this.applyIncomingState(JSON.parse(event.newValue));
        } catch (e) {}
      }
    });

    // Filet de sécurité Firebase REST si le WebSocket SDK n'est pas utilisé
    setInterval(() => {
      if (this.isFirebaseActive && !this.firebaseRef) {
        this.pullFromFirebaseIfActive();
      }
    }, 2500);
  }

  applyIncomingState(data) {
    if (!data || !Array.isArray(data.participants)) return;
    // Ignore si l'état reçu est strictement identique au dernier état connu
    if (data.updatedAt && this.lastUpdatedAt && data.updatedAt === this.lastUpdatedAt) {
      return;
    }

    this.lastUpdatedAt = data.updatedAt || new Date().toISOString();
    const prevRevealed = this.isRevealedNow();
    this.participants = data.participants;
    const def = getDefaultSettings();
    this.settings = {
      ...def,
      ...this.settings,
      ...(data.settings || {}),
      promoOptions:
        Array.isArray(data.settings?.promoOptions) && data.settings.promoOptions.length > 0
          ? data.settings.promoOptions
          : this.settings.promoOptions || def.promoOptions,
      campusLocations:
        Array.isArray(data.settings?.campusLocations) && data.settings.campusLocations.length > 0
          ? data.settings.campusLocations
          : this.settings.campusLocations || def.campusLocations,
      secretCategories:
        Array.isArray(data.settings?.secretCategories) && data.settings.secretCategories.length > 0
          ? data.settings.secretCategories
          : this.settings.secretCategories || def.secretCategories
    };
    const nowRevealed = this.isRevealedNow();

    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(data));
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
      '🎉 GRAND DÉVOILEMENT ACTIF ! Les identités et boutons WhatsApp sont déverrouillés en direct !',
      'success'
    );
  }

  /**
   * ==========================================================================
   * NAVIGATION, CONNEXION & DÉCONNEXION (ÉTUDIANT & BDE)
   * ==========================================================================
   */
  switchView(viewName) {
    if (viewName === 'admin' && !this.isBdeUnlocked) {
      this.openBdeAccess();
      return;
    }

    this.currentView = viewName;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    localStorage.removeItem(SESSION_EMAIL_KEY);
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
    if (!el) return;
    const filtered = pool.filter(item => item !== el.value);
    el.value = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
  }

  generateAllRiddles() {
    this.generateSingleRiddle(1);
    this.generateSingleRiddle(2);
    this.generateSingleRiddle(3);
    this.showToast('3 idées d’énigmes générées !', 'info');
  }

  handleRegistration(event) {
    event.preventDefault();

    if (!this.settings.registrationsOpen) {
      this.showToast('Les inscriptions sont actuellement fermées par le BDE.', 'error');
      return;
    }

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();
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

    if (!firstName || !lastName || !whatsapp || !promo || !r1 || !r2 || !r3) {
      this.showToast('Merci de compléter tous les champs et tes 3 énigmes.', 'error');
      return;
    }

    const existingIdx = this.participants.findIndex(p => p.email.toLowerCase() === email);

    if (existingIdx !== -1) {
      this.participants[existingIdx] = {
        ...this.participants[existingIdx],
        firstName,
        lastName,
        whatsapp,
        promo,
        role,
        secretType,
        riddles: [r1, r2, r3],
        location,
        isBackupMate
      };
    } else {
      const newParticipant = {
        id: `stu-${Date.now()}`,
        firstName,
        lastName,
        email,
        whatsapp,
        promo,
        role,
        secretType,
        riddles: [r1, r2, r3],
        location,
        isBackupMate,
        pouchNumber: this.participants.length + 1,
        drawnPouchNumber: null,
        hasDrawn: false
      };
      this.participants.push(newParticipant);

      this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
      this.participants = SecretMateAlgorithms.generateDerangement(
        this.participants,
        this.settings.prioritizeMentors,
        this.settings.samePromoOnly
      );

      const created = this.participants.find(p => p.email.toLowerCase() === email);
      if (created) created.hasDrawn = false;
    }

    this.loggedInEmail = email;
    localStorage.setItem(SESSION_EMAIL_KEY, email);
    this.saveState();

    document.getElementById('registration-form').reset();
    this.switchView('participant');

    const me = this.participants.find(p => p.email.toLowerCase() === email);
    this.showToast(
      `Inscription validée pour ${email} ! Tu as reçu la Pochette #${String(me.pouchNumber).padStart(
        2,
        '0'
      )}.`,
      'success'
    );
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
    }

    const secContainer = document.getElementById('reg-secrets-container');
    if (secContainer) {
      secContainer.innerHTML = this.settings.secretCategories
        .map(
          (sec, idx) => `
        <label class="flex flex-col justify-between p-3.5 rounded-2xl border-2 border-ink/20 hover:border-ink cursor-pointer transition has-[:checked]:border-ink has-[:checked]:bg-iae-50">
          <div class="flex items-center gap-2">
            <input type="radio" name="reg-secret" value="${this.escapeHtml(sec.title)}" ${
            idx === 0 ? 'checked' : ''
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
      this.showToast(
        `Format invalide : entre une adresse se terminant par ${this.settings.emailDomain}`,
        'error'
      );
      return;
    }

    const found = this.participants.find(p => p.email.toLowerCase() === email);
    if (!found) {
      this.showToast(
        `Aucun inscrit trouvé pour ${email}. Inscris-toi d'abord via l'onglet 1 !`,
        'error'
      );
      return;
    }

    this.loggedInEmail = email;
    localStorage.setItem(SESSION_EMAIL_KEY, email);
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

    if (!student.drawnPouchNumber || student.drawnPouchNumber === student.pouchNumber) {
      this.participants = SecretMateAlgorithms.generateDerangement(
        this.participants,
        this.settings.prioritizeMentors,
        this.settings.samePromoOnly
      );
      this.saveState(false);
    }

    const updatedStudent = this.participants.find(p => p.id === student.id);
    const targetMate = this.participants.find(
      p => p.pouchNumber === updatedStudent.drawnPouchNumber
    );

    const stateDrawingClosed = document.getElementById('state-drawing-closed');
    const stateNotDrawn = document.getElementById('state-not-drawn');
    const stateDrawnResult = document.getElementById('state-drawn-result');
    const verifBadge = document.getElementById('draw-verification-badge');

    if (!this.settings.drawingOpen && !updatedStudent.hasDrawn) {
      stateDrawingClosed?.classList.remove('hidden');
      stateNotDrawn?.classList.add('hidden');
      stateDrawnResult?.classList.add('hidden');
      verifBadge?.classList.add('hidden');
      const closedDrawMsg = document.getElementById('ui-closed-drawing-msg');
      if (closedDrawMsg) closedDrawMsg.textContent = this.settings.closedDrawingMessage;
    } else if (!updatedStudent.hasDrawn) {
      stateDrawingClosed?.classList.add('hidden');
      stateNotDrawn?.classList.remove('hidden');
      stateDrawnResult?.classList.add('hidden');
      verifBadge?.classList.add('hidden');
      verifBadge?.classList.remove('inline-flex');
      document.getElementById('slot-machine-number').textContent = '#?';
    } else if (targetMate) {
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
    const revealed = this.isRevealedNow();
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
      document.getElementById('revealed-mate-whatsapp-btn').href = '#';
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
      document.getElementById('revealed-mate-whatsapp-txt').textContent =
        `📱 WhatsApp : ${targetMate.whatsapp}`;

      const cleanPhone = targetMate.whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '33');
      const waMsg = encodeURIComponent(
        `Salut ${targetMate.firstName} ! 🎉 C'est ${updatedStudent.firstName} (${updatedStudent.promo}) de l'IAE Valenciennes : j'ai pioché ta Pochette Secret Mate #${String(
          targetMate.pouchNumber
        ).padStart(2, '0')} ! On se retrouve à l'Afterwork ?`
      );
      document.getElementById('revealed-mate-whatsapp-btn').href =
        `https://wa.me/${cleanPhone}?text=${waMsg}`;
    }
  }

  animateAndDrawPouch(replay = false) {
    if (!this.settings.drawingOpen) {
      this.showToast('La pioche est actuellement verrouillée par le BDE.', 'error');
      return;
    }

    const student = this.participants.find(
      p => p.email.toLowerCase() === (this.loggedInEmail || '').toLowerCase()
    );
    if (!student) return;

    if (replay) {
      student.hasDrawn = false;
      this.renderStudentView();
    }

    const slotEl = document.getElementById('slot-machine-number');
    const btnDraw = document.getElementById('btn-draw-pouch');
    if (!slotEl || !btnDraw) return;

    btnDraw.disabled = true;
    slotEl.parentElement.classList.add('slot-spinning');

    const total = this.participants.length;
    let ticks = 0;
    const maxTicks = 15;

    const timer = setInterval(() => {
      let rand = Math.floor(Math.random() * total) + 1;
      if (rand === student.pouchNumber) {
        rand = (rand % total) + 1;
      }
      slotEl.textContent = `#${String(rand).padStart(2, '0')}`;
      ticks++;

      if (ticks >= maxTicks) {
        clearInterval(timer);
        slotEl.parentElement.classList.remove('slot-spinning');
        btnDraw.disabled = false;

        student.hasDrawn = true;
        this.saveState();
        this.renderAll();

        this.showToast(
          `Tu as pioché la Pochette #${String(student.drawnPouchNumber).padStart(2, '0')} !`,
          'success'
        );
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
  toggleRegistrationsOpen() {
    this.settings.registrationsOpen = !this.settings.registrationsOpen;
    this.saveState();
    this.renderAll();
    this.showToast(
      this.settings.registrationsOpen
        ? 'Inscriptions publiques OUVERTES !'
        : 'Inscriptions publiques FERMÉES par le BDE.',
      'info'
    );
  }

  toggleDrawingOpen() {
    this.settings.drawingOpen = !this.settings.drawingOpen;
    if (this.settings.drawingOpen) {
      // S'assure que le dérangement est à jour selon les options BDE dès l'ouverture de la pioche
      this.participants = SecretMateAlgorithms.generateDerangement(
        this.participants,
        this.settings.prioritizeMentors,
        this.settings.samePromoOnly
      );
    }
    this.saveState();
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
  closeRegistrationsAndOpenDraw() {
    this.settings.registrationsOpen = false;
    this.settings.drawingOpen = true;
    this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      this.settings.prioritizeMentors,
      this.settings.samePromoOnly
    );
    this.saveState();
    this.renderAll();
    this.showToast(
      '🎯 Inscriptions clôturées, tirage calculé et pioche aléatoire OUVERTE pour tous les étudiants !',
      'success'
    );
  }

  toggleMatchingOptions() {
    const samePromo = document.getElementById('chk-same-promo-only')?.checked ?? false;
    const prioritize = document.getElementById('chk-prioritize-mentors')?.checked ?? true;
    this.settings.samePromoOnly = samePromo;
    this.settings.prioritizeMentors = prioritize;
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      prioritize,
      samePromo
    );
    this.saveState();
    this.renderAll();
    this.showToast(
      samePromo
        ? '🎓 Mode « Même filière uniquement » activé : les étudiants piochent au sein de leur filière IAE !'
        : '🌐 Mode « Brassage inter-filières IAE » activé !',
      'info'
    );
  }

  saveRegistrationAndDrawMessages() {
    const regMsg = document.getElementById('admin-closed-reg-msg')?.value.trim();
    const drawMsg = document.getElementById('admin-closed-draw-msg')?.value.trim();
    if (regMsg) this.settings.closedRegistrationMessage = regMsg;
    if (drawMsg) this.settings.closedDrawingMessage = drawMsg;
    this.saveState();
    this.renderAll();
    this.showToast('Messages de statut enregistrés !', 'success');
  }

  toggleMasterRevealSwitch() {
    this.settings.masterRevealForce = !this.settings.masterRevealForce;
    this.saveState();
    this.renderAll();

    if (this.settings.masterRevealForce) {
      this.triggerRevealCelebration();
    } else {
      if (new Date(this.settings.revealScheduledAt).getTime() <= Date.now()) {
        this.settings.revealScheduledAt = new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString();
        this.saveState();
        this.renderAll();
      }
      this.showToast(
        '🔒 Mode Mystère activé : les identités et numéros WhatsApp sont masqués chez les étudiants.',
        'info'
      );
    }
  }

  saveScheduledRevealTime() {
    const input = document.getElementById('admin-reveal-datetime');
    if (!input || !input.value) return;
    const parsed = new Date(input.value);
    if (isNaN(parsed.getTime())) return;

    this.settings.revealScheduledAt = parsed.toISOString();
    if (parsed.getTime() > Date.now()) {
      this.settings.masterRevealForce = false;
      this.wasRevealedLastTick = false;
    }
    this.saveState();
    this.renderAll();
    this.showToast(
      `Dévoilement programmé au ${this.formatDateFr(this.settings.revealScheduledAt)} !`,
      'success'
    );
  }

  scheduleRevealInTenSeconds() {
    const target = new Date(Date.now() + 10 * 1000);
    this.settings.revealScheduledAt = target.toISOString();
    this.settings.masterRevealForce = false;
    this.wasRevealedLastTick = false;
    this.saveState();
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

  saveCustomRevealMessage() {
    const val = document.getElementById('admin-custom-message')?.value.trim();
    const lockedSub = document.getElementById('admin-locked-submessage')?.value.trim();
    if (val) this.settings.customRevealMessage = val;
    if (lockedSub) this.settings.lockedSubMessage = lockedSub;
    this.saveState();
    this.renderAll();
    this.showToast('Messages de révélation et d’attente mis à jour en temps réel !', 'success');
  }

  runNonAlphabeticalShuffle() {
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
    this.saveState();
    this.renderAll();
    this.showToast(
      'Fisher-Yates exécuté : numéros #01 à #N réattribués (ordre non-alphabétique) !',
      'success'
    );
  }

  runFullDerangementDraw() {
    const prioritize = document.getElementById('chk-prioritize-mentors')?.checked ?? true;
    const samePromo = document.getElementById('chk-same-promo-only')?.checked ?? false;
    this.settings.prioritizeMentors = prioritize;
    this.settings.samePromoOnly = samePromo;
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      prioritize,
      samePromo
    );
    this.saveState();
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
  renderAdminLocationsEditor() {
    const container = document.getElementById('admin-locations-editor-list');
    if (!container) return;

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

  saveSingleCampusLocation(locId) {
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
      this.participants.forEach(p => {
        if (p.location === oldName) p.location = newName;
      });
    }

    this.saveState();
    this.renderAll();
    this.showToast(
      `Lieu « ${newName} » et son message d'indice mis à jour en temps réel !`,
      'success'
    );
  }

  addNewCampusLocation() {
    const newLoc = {
      id: `loc-${Date.now()}`,
      name: 'Nouveau Lieu Mont-Houy (ex: Gymnase SUAPS)',
      tag: '✨ Spot Campus',
      tip: "Rends-toi devant l'entrée principale de ce lieu sur le campus du Mont-Houy pour découvrir l'univers de ton Secret Mate !",
      challenge: 'Échangez vos meilleurs bons plans sport ou associations de l’IAE Valenciennes !'
    };
    this.settings.campusLocations.push(newLoc);
    this.saveState();
    this.renderAll();
    this.showToast('Nouveau lieu ajouté ! Vous pouvez personnaliser son nom et son message.', 'success');
  }

  deleteCampusLocation(locId) {
    if (this.settings.campusLocations.length <= 1) {
      this.showToast('Il doit rester au moins 1 lieu sur le campus.', 'error');
      return;
    }
    const removed = this.settings.campusLocations.find(l => l.id === locId);
    this.settings.campusLocations = this.settings.campusLocations.filter(l => l.id !== locId);
    const fallbackName = this.settings.campusLocations[0].name;

    if (removed) {
      this.participants.forEach(p => {
        if (p.location === removed.name) p.location = fallbackName;
      });
    }

    this.saveState();
    this.renderAll();
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
      document.getElementById('edit-p-whatsapp').value = p.whatsapp;
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
      document.getElementById('p-modal-title').textContent =
        'Ajouter un nouveau participant manuellement';
      document.getElementById('edit-p-id').value = '';
      document.getElementById('edit-p-firstname').value = '';
      document.getElementById('edit-p-lastname').value = '';
      document.getElementById('edit-p-email').value = `prenom.nom${this.settings.emailDomain}`;
      document.getElementById('edit-p-whatsapp').value = '06 00 00 00 00';
      document.getElementById('edit-p-promo').value =
        this.settings.promoOptions?.[0] || 'Management des Organisations (L3 / Master MDO)';
      document.getElementById('edit-p-role').value = 'nouveau';
      document.getElementById('edit-p-pouch').value = this.participants.length + 1;
      document.getElementById('edit-p-drawn').value = 1;
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

  saveParticipantFromModal(event) {
    event.preventDefault();
    const id = document.getElementById('edit-p-id').value;
    const firstName = document.getElementById('edit-p-firstname').value.trim();
    const lastName = document.getElementById('edit-p-lastname').value.trim();
    const email = document.getElementById('edit-p-email').value.trim().toLowerCase();
    const whatsapp = document.getElementById('edit-p-whatsapp').value.trim();
    const promo = document.getElementById('edit-p-promo').value.trim();
    const role = document.getElementById('edit-p-role').value;
    const location = document.getElementById('edit-p-location').value;
    const secretType = document.getElementById('edit-p-secret').value;
    const pouchNumber = parseInt(document.getElementById('edit-p-pouch').value, 10) || 1;
    const drawnPouchNumber = parseInt(document.getElementById('edit-p-drawn').value, 10) || null;
    const isBackupMate = document.getElementById('edit-p-backup').checked;
    const hasDrawn = document.getElementById('edit-p-hasdrawn').checked;
    const r1 = document.getElementById('edit-p-r1').value.trim();
    const r2 = document.getElementById('edit-p-r2').value.trim();
    const r3 = document.getElementById('edit-p-r3').value.trim();

    if (drawnPouchNumber === pouchNumber) {
      this.showToast(
        'Attention : un étudiant ne peut pas avoir un numéro pioché égal à son propre numéro de pochette (i ≠ p(i)) !',
        'error'
      );
      return;
    }

    if (id) {
      const idx = this.participants.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.participants[idx] = {
          ...this.participants[idx],
          firstName,
          lastName,
          email,
          whatsapp,
          promo,
          role,
          location,
          secretType,
          riddles: [r1, r2, r3],
          ...(this.isStudentEditingOwnProfile
            ? {}
            : { pouchNumber, drawnPouchNumber, isBackupMate, hasDrawn })
        };
      }
    } else {
      this.participants.push({
        id: `stu-${Date.now()}`,
        firstName,
        lastName,
        email,
        whatsapp,
        promo,
        role,
        location,
        secretType,
        riddles: [r1, r2, r3],
        pouchNumber,
        drawnPouchNumber,
        isBackupMate,
        hasDrawn
      });
    }

    this.closeParticipantModal();
    this.saveState();
    this.renderAll();
    this.showToast(`Profil de ${firstName} ${lastName} enregistré avec succès !`, 'success');
  }

  resetStudentDraw(participantId) {
    const p = this.participants.find(item => item.id === participantId);
    if (!p) return;
    p.hasDrawn = false;
    this.saveState();
    this.renderAll();
    this.showToast(
      `La pioche de ${p.firstName} ${p.lastName} a été réinitialisée : le bouton « Piocher » est à nouveau actif sur son écran !`,
      'info'
    );
  }

  deleteParticipant(participantId) {
    if (this.participants.length <= 2) {
      this.showToast('Il faut conserver au moins 2 participants pour le tirage.', 'error');
      return;
    }
    const target = this.participants.find(p => p.id === participantId);
    this.participants = this.participants.filter(p => p.id !== participantId);
    this.participants = SecretMateAlgorithms.assignNonAlphabeticalNumbers(this.participants);
    this.participants = SecretMateAlgorithms.generateDerangement(
      this.participants,
      this.settings.prioritizeMentors,
      this.settings.samePromoOnly
    );
    this.saveState();
    this.renderAll();
    this.showToast(
      `Participant ${target ? target.firstName : ''} supprimé et tirage recalculé.`,
      'info'
    );
  }

  assignBackupLutinFor(absentId) {
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
    absent.whatsapp = chosenLutin.whatsapp;
    absent.promo = `${chosenLutin.promo} • Lutin Secours`;

    this.saveState();
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
  saveGlobalSiteTexts() {
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

    this.saveState();
    this.renderAll();
    this.showToast('Tous les textes globaux et paramètres du site ont été mis à jour !', 'success');
  }

  /**
   * ==========================================================================
   * GESTION DE LA LISTE DÉROULANTE DES FILIÈRES IAE PAR LE BDE
   * ==========================================================================
   */
  renderAdminPromosEditor() {
    const container = document.getElementById('admin-promos-editor-list');
    if (!container) return;

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

  saveSinglePromoOption(idx) {
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
      this.participants.forEach(p => {
        if (p.promo === oldVal) p.promo = newVal;
      });
    }

    this.saveState();
    this.renderAll();
    this.showToast(`Filière « ${newVal} » mise à jour dans la liste déroulante !`, 'success');
  }

  addPromoOption() {
    if (!Array.isArray(this.settings.promoOptions)) {
      this.settings.promoOptions = getDefaultPromoOptions();
    }
    const newPromo = `Nouvelle Filière IAE #${this.settings.promoOptions.length + 1}`;
    this.settings.promoOptions.push(newPromo);
    this.saveState();
    this.renderAll();
    this.showToast('Nouvelle filière ajoutée à la liste déroulante !', 'success');
  }

  deletePromoOption(idx) {
    if (!Array.isArray(this.settings.promoOptions) || this.settings.promoOptions.length <= 1) {
      this.showToast('Il doit rester au moins 1 filière dans la liste déroulante.', 'error');
      return;
    }
    const removed = this.settings.promoOptions[idx];
    this.settings.promoOptions.splice(idx, 1);
    const fallbackPromo = this.settings.promoOptions[0];

    this.participants.forEach(p => {
      if (p.promo === removed) p.promo = fallbackPromo;
    });

    this.saveState();
    this.renderAll();
    this.showToast(`Filière supprimée et étudiants rattachés à « ${fallbackPromo} ».`, 'info');
  }

  renderAdminSecretsEditor() {
    const container = document.getElementById('admin-secrets-editor-list');
    if (!container) return;

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

  saveSingleSecretCategory(secId) {
    const sec = this.settings.secretCategories.find(s => s.id === secId);
    if (!sec) return;
    sec.icon = document.getElementById(`sec-icon-${secId}`)?.value.trim() || '🎁';
    sec.title = document.getElementById(`sec-title-${secId}`)?.value.trim() || sec.title;
    sec.desc = document.getElementById(`sec-desc-${secId}`)?.value.trim() || sec.desc;
    this.saveState();
    this.renderAll();
    this.showToast(`Catégorie « ${sec.title} » enregistrée !`, 'success');
  }

  addSecretCategory() {
    this.settings.secretCategories.push({
      id: `sec-${Date.now()}`,
      title: 'Nouveau Secret de promo',
      icon: '🎁',
      desc: 'Description personnalisée par le BDE.'
    });
    this.saveState();
    this.renderAll();
    this.showToast('Nouvelle catégorie de Secret de promo ajoutée !', 'success');
  }

  deleteSecretCategory(secId) {
    if (this.settings.secretCategories.length <= 1) {
      this.showToast('Il faut conserver au moins 1 catégorie.', 'error');
      return;
    }
    this.settings.secretCategories = this.settings.secretCategories.filter(s => s.id !== secId);
    this.saveState();
    this.renderAll();
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

    const audit = SecretMateAlgorithms.verifyDerangement(this.participants);
    const modeLabel = this.settings.samePromoOnly
      ? `Même filière uniquement (${audit.samePromoCount}/${audit.total})`
      : 'Brassage inter-filières IAE';
    setTxt(
      'algo-audit-text',
      `[AUDIT] Fisher-Yates Non-Alphabétique ✓ | Auto-attribution : ${audit.selfDraws} (∀i, i ≠ p(i)) ✓ | Bijection : ${audit.uniqueDraws}/${audit.total} ✓ | Mode : ${modeLabel}`
    );

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
              )} • 📱 ${this.escapeHtml(p.whatsapp)}</span>
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
    localStorage.setItem(SESSION_EMAIL_KEY, email);
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
    setTxt('ui-domain-label-1', this.settings.emailDomain);
    setTxt('ui-domain-label-2', this.settings.emailDomain);
    setTxt('ui-domain-label-3', this.settings.emailDomain);

    // Gestion des boutons Connexion / Déconnexion dans le Header
    const studentConnected = this.loggedInEmail
      ? this.participants.find(
          p => p.email.toLowerCase() === this.loggedInEmail.toLowerCase()
        )
      : null;

    const btnHeaderLogin = document.getElementById('header-btn-student-login');
    const boxHeaderStudent = document.getElementById('header-student-session-box');
    const txtHeaderEmail = document.getElementById('header-student-email');

    if (studentConnected) {
      btnHeaderLogin?.classList.add('hidden');
      boxHeaderStudent?.classList.remove('hidden');
      boxHeaderStudent?.classList.add('flex');
      if (txtHeaderEmail) txtHeaderEmail.textContent = studentConnected.email;
    } else {
      btnHeaderLogin?.classList.remove('hidden');
      boxHeaderStudent?.classList.add('hidden');
      boxHeaderStudent?.classList.remove('flex');
    }

    // Bouton Cockpit BDE & Déconnexion BDE dans le Header
    const navAdminUnlocked = document.getElementById('nav-admin-unlocked');
    const btnHeaderBdeLogout = document.getElementById('header-btn-bde-logout');
    if (this.isBdeUnlocked) {
      navAdminUnlocked?.classList.remove('hidden');
      navAdminUnlocked?.classList.add('inline-flex');
      btnHeaderBdeLogout?.classList.remove('hidden');
      btnHeaderBdeLogout?.classList.add('inline-flex');
    } else {
      navAdminUnlocked?.classList.add('hidden');
      navAdminUnlocked?.classList.remove('inline-flex');
      btnHeaderBdeLogout?.classList.add('hidden');
      btnHeaderBdeLogout?.classList.remove('inline-flex');
    }

    // Statut des inscriptions dans la barre supérieure
    const regPill = document.getElementById('ui-registration-status-pill');
    if (regPill) {
      if (this.settings.registrationsOpen) {
        regPill.className = 'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-mse-green';
        regPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-mse-green animate-ping"></span> Inscriptions ouvertes';
      } else {
        regPill.className = 'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-mse-coral';
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

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * ==========================================================================
   * EXPORT / IMPORT JSON & CSV + RESET BASE (BDE UNIQUEMENT)
   * ==========================================================================
   */
  resetDemoData() {
    this.participants = getInitialDemoParticipants();
    this.settings = getDefaultSettings();
    this.wasRevealedLastTick = false;
    this.saveState();
    this.renderAll();
    this.showToast(
      'Base réinitialisée avec les 10 profils @uphf.fr et les 5 lieux du Mont-Houy !',
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
      'WhatsApp',
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
        p.whatsapp,
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
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const txt = e.target.result;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed.participants)) {
            this.participants = parsed.participants;
            if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
            this.saveState();
            this.renderAll();
            this.showToast('Configuration et participants importés avec succès !', 'success');
          }
        }
      } catch (err) {
        this.showToast('Erreur de lecture du fichier.', 'error');
      }
    };
    reader.readAsText(file);
  }

  /**
   * ==========================================================================
   * SYNCHRONISATION NATIVE GOOGLE FIREBASE REALTIME DATABASE
   * (Automatique sur Firebase Hosting • Fallback localStorage sur ordinateur)
   * ==========================================================================
   */
  async pushToFirebaseIfActive(payload) {
    if (!this.isFirebaseActive) return;

    try {
      if (this.firebaseRef) {
        await this.firebaseRef.set(payload);
        return;
      }
      if (this.firebaseDbUrl) {
        await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {}
  }

  async pullFromFirebaseIfActive() {
    if (!this.isFirebaseActive || !this.firebaseDbUrl) return;

    try {
      const res = await fetch(`${this.firebaseDbUrl}/${FIREBASE_DB_NODE}.json`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.participants)) {
          this.applyIncomingState(data);
        } else if (data === null) {
          this.saveState(true);
        }
      }
    } catch (e) {}
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
window.addEventListener('DOMContentLoaded', () => {
  app = new SecretMateApp();
});
