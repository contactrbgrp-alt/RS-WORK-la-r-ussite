// --- RS-WORK DASHBOARD ENGINE (TOTAL RECOVERY MODE) ---
console.log("RS-WORK Dashboard: Engine starting...");

const CONFIG = {
    adminEmail: "r.ruseenthiranruthees@gmail.com"
};



let state = {
    chapters: [],
    currentChapter: null,
    flashcards: [],
    currentFlashcardIndex: 0,
    flashcardMarks: [],
    quiz: [],
    currentQuizIndex: 0,
    userAnswers: {},
    favorites: JSON.parse(localStorage.getItem('rswork-favorites') || '[]')
};

function enforceMinimumContent(chapter) {
    if (!chapter || !Array.isArray(chapter.flashcards) || !Array.isArray(chapter.quiz)) return;

    // Old seeding disabled: content is now regenerated globally with the new quality rules.

    const preferredCount = 20;
    const fallbackMinCount = 20;
    chapter.flashcards = chapter.flashcards.filter((f) => !isBannedPrompt(f?.question) && !isLowValueQuestion(f?.question));
    chapter.quiz = chapter.quiz.filter((q) => !isBannedPrompt(q?.question) && !isLowValueQuestion(q?.question));
    chapter.flashcards = dedupeByQuestion(chapter.flashcards);
    chapter.quiz = dedupeByQuestion(chapter.quiz);
    // Keep a strict maximum of 20 items.
    if (chapter.flashcards.length > preferredCount) chapter.flashcards = chapter.flashcards.slice(0, preferredCount);
    if (chapter.quiz.length > preferredCount) chapter.quiz = chapter.quiz.slice(0, preferredCount);
    const usedFlashcards = new Set(chapter.flashcards.map(f => f.question));
    const usedQuiz = new Set(chapter.quiz.map(q => q.question));

    let guard = 0;
    let flashAttempt = 1;
    while (chapter.flashcards.length < preferredCount && guard < 600) {
        const candidate = buildUniqueFlashcard(chapter, flashAttempt++);
        if (candidate && !usedFlashcards.has(candidate.question) && !isBannedPrompt(candidate.question) && !isLowValueQuestion(candidate.question) && !isTooSimilarQuestion(candidate.question, usedFlashcards) && !isAnswerEchoingQuestion(candidate.question, candidate.answer)) {
            chapter.flashcards.push(candidate);
            usedFlashcards.add(candidate.question);
        }
        guard++;
    }
    while (chapter.flashcards.length < preferredCount && guard < 1400) {
        const idx = chapter.flashcards.length + 1;
        const generic = buildGenericPrompt(chapter, 1000 + idx);
        const fallback = {
            question: generic.flashQuestion,
            answer: generic.flashAnswer
        };
        if (!usedFlashcards.has(fallback.question) && !isBannedPrompt(fallback.question) && !isLowValueQuestion(fallback.question) && !isTooSimilarQuestion(fallback.question, usedFlashcards) && !isAnswerEchoingQuestion(fallback.question, fallback.answer)) {
            chapter.flashcards.push(fallback);
            usedFlashcards.add(fallback.question);
        }
        guard++;
    }
    while (chapter.flashcards.length < fallbackMinCount && guard < 2200) {
        const idx = chapter.flashcards.length + 1;
        const generic = buildGenericPrompt(chapter, 5000 + idx);
        const fallback = { question: generic.flashQuestion, answer: generic.flashAnswer };
        if (!usedFlashcards.has(fallback.question) && !isBannedPrompt(fallback.question) && !isLowValueQuestion(fallback.question) && !isTooSimilarQuestion(fallback.question, usedFlashcards) && !isAnswerEchoingQuestion(fallback.question, fallback.answer)) {
            chapter.flashcards.push(fallback);
            usedFlashcards.add(fallback.question);
        }
        guard++;
    }

    guard = 0;
    let quizAttempt = 1;
    while (chapter.quiz.length < preferredCount && guard < 600) {
        const candidate = buildUniqueQuiz(chapter, quizAttempt++);
        if (candidate && !usedQuiz.has(candidate.question) && !isBannedPrompt(candidate.question) && !isLowValueQuestion(candidate.question) && !isTooSimilarQuestion(candidate.question, usedQuiz) && !isAnswerEchoingQuestion(candidate.question, candidate.answer)) {
            chapter.quiz.push(candidate);
            usedQuiz.add(candidate.question);
        }
        guard++;
    }
    while (chapter.quiz.length < preferredCount && guard < 1400) {
        const idx = chapter.quiz.length + 1;
        const generic = buildGenericPrompt(chapter, 1000 + idx);
        const fallback = {
            question: generic.quizQuestion,
            options: generic.quizOptions,
            answer: generic.quizAnswer
        };
        if (!usedQuiz.has(fallback.question) && !isBannedPrompt(fallback.question) && !isLowValueQuestion(fallback.question) && !isTooSimilarQuestion(fallback.question, usedQuiz) && !isAnswerEchoingQuestion(fallback.question, fallback.answer)) {
            chapter.quiz.push(fallback);
            usedQuiz.add(fallback.question);
        }
        guard++;
    }
    while (chapter.quiz.length < fallbackMinCount && guard < 2200) {
        const idx = chapter.quiz.length + 1;
        const generic = buildGenericPrompt(chapter, 5000 + idx);
        const fallback = {
            question: generic.quizQuestion,
            options: generic.quizOptions,
            answer: generic.quizAnswer
        };
        if (!usedQuiz.has(fallback.question) && !isBannedPrompt(fallback.question) && !isLowValueQuestion(fallback.question) && !isTooSimilarQuestion(fallback.question, usedQuiz) && !isAnswerEchoingQuestion(fallback.question, fallback.answer)) {
            chapter.quiz.push(fallback);
            usedQuiz.add(fallback.question);
        }
        guard++;
    }

    chapter.flashcards = dedupeByQuestion(chapter.flashcards).slice(0, preferredCount);
    chapter.quiz = dedupeByQuestion(chapter.quiz).map(normalizeQuizRecord).slice(0, preferredCount);
}

function seedSixiemeAddedChapters(chapter) {
    if (!chapter || chapter.level !== "6e") return;
    if (!(chapter.id >= 443 && chapter.id <= 457)) return;

    const title = chapter.title || "ce chapitre";
    const subject = (chapter.subject || "").toLowerCase();
    const usedF = new Set((chapter.flashcards || []).map((f) => f.question));
    const usedQ = new Set((chapter.quiz || []).map((q) => q.question));

    const pools = {
        maths: {
            flash: [
                { q: `Dans « ${title} », quelle est la méthode clé à retenir ?`, a: "Appliquer une démarche en étapes et vérifier le résultat." },
                { q: `Quel outil aide à organiser les données dans « ${title} » ?`, a: "Un tableau ou un schéma." },
                { q: `Pourquoi faut-il vérifier l'unité dans « ${title} » ?`, a: "Pour que la réponse ait du sens." },
                { q: `Quelle erreur fréquente éviter dans « ${title} » ?`, a: "Confondre l'opération à utiliser." },
                { q: `Que faire avant de calculer dans « ${title} » ?`, a: "Lire attentivement la consigne et repérer les données utiles." },
                { q: `Comment présenter la réponse finale en maths ?`, a: "Avec une phrase courte et l'unité." },
                { q: `Dans un problème de proportionnalité, quel réflexe adopter ?`, a: "Chercher le coefficient de proportionnalité." },
                { q: `Sur une droite graduée, où place-t-on les nombres négatifs ?`, a: "À gauche de zéro." },
                { q: `Pourquoi un schéma peut-il aider en maths ?`, a: "Il clarifie la situation et les relations entre données." },
                { q: `Que signifie « résoudre en plusieurs étapes » ?`, a: "Décomposer le problème en calculs successifs." }
            ],
            quiz: [
                { q: `Dans « ${title} », la première étape est :`, o: ["Lire l'énoncé", "Donner la réponse", "Ignorer les unités", "Choisir au hasard"], a: "Lire l'énoncé" },
                { q: `En maths, une réponse complète contient :`, o: ["Un résultat + unité", "Seulement un nombre", "Un dessin", "Aucune vérification"], a: "Un résultat + unité" },
                { q: `Pour organiser des données, on peut utiliser :`, o: ["Un tableau", "Une poésie", "Un slogan", "Un paragraphe libre"], a: "Un tableau" },
                { q: `Dans une situation proportionnelle, si on triple une grandeur, l'autre :`, o: ["Triple", "Reste fixe", "Diminue toujours", "S'annule"], a: "Triple" },
                { q: `Nombre négatif = nombre :`, o: ["Inférieur à 0", "Supérieur à 0", "Toujours pair", "Toujours entier naturel"], a: "Inférieur à 0" },
                { q: `Avant de conclure un problème, il faut :`, o: ["Vérifier la cohérence", "Effacer les calculs", "Changer la question", "Ignorer l'unité"], a: "Vérifier la cohérence" },
                { q: `Un schéma en résolution de problème sert à :`, o: ["Mieux comprendre", "Décorer la copie", "Remplacer les calculs", "Éviter de lire"], a: "Mieux comprendre" },
                { q: `Sur la droite graduée, -3 est :`, o: ["À gauche de 0", "À droite de 0", "Au même point que 3", "Impossible à placer"], a: "À gauche de 0" },
                { q: `Le coefficient de proportionnalité permet de :`, o: ["Passer d'une grandeur à l'autre", "Conjuguer", "Classer des textes", "Nommer des angles"], a: "Passer d'une grandeur à l'autre" },
                { q: `Une erreur fréquente en problème est :`, o: ["Choisir la mauvaise opération", "Lire calmement", "Vérifier l'unité", "Découper en étapes"], a: "Choisir la mauvaise opération" }
            ]
        },
        français: {
            flash: [
                { q: `Dans « ${title} », que faut-il repérer d'abord ?`, a: "Les indices grammaticaux (sujet, verbe, ponctuation, connecteurs)." },
                { q: `Pourquoi le contexte est important en français ?`, a: "Il aide à choisir la bonne forme de mot." },
                { q: `Comment éviter une erreur d'accord ?`, a: "Identifier le sujet puis accorder le verbe." },
                { q: `À quoi sert la ponctuation ?`, a: "À donner le sens et le rythme de la phrase." },
                { q: `Dans un dialogue, que marque un tiret ?`, a: "Une nouvelle réplique." },
                { q: `Comment reconnaître une phrase interrogative ?`, a: "Elle pose une question et se termine par un point d'interrogation." },
                { q: `Voix active : le sujet ...`, a: "fait l'action." },
                { q: `Voix passive : le sujet ...`, a: "subit l'action." },
                { q: `Une figure de style sert à ...`, a: "rendre le texte plus expressif." },
                { q: `Discours indirect : on adapte ...`, a: "les pronoms et parfois les temps." }
            ],
            quiz: [
                { q: `En français, pour accorder le verbe, on cherche d'abord :`, o: ["Le sujet", "Le complément", "L'adjectif", "La ponctuation"], a: "Le sujet" },
                { q: `Le point d'interrogation indique :`, o: ["Une question", "Un ordre", "Une émotion", "Une description"], a: "Une question" },
                { q: `Dans un dialogue, un tiret marque :`, o: ["Une réplique", "Une fin de texte", "Une définition", "Un titre"], a: "Une réplique" },
                { q: `Voix active :`, o: ["Le sujet fait l'action", "Le sujet subit l'action", "Il n'y a pas de verbe", "Aucun sujet"], a: "Le sujet fait l'action" },
                { q: `Voix passive :`, o: ["Le sujet subit l'action", "Le sujet fait l'action", "Phrase sans verbe", "Question"], a: "Le sujet subit l'action" },
                { q: `Les figures de style servent à :`, o: ["Donner du relief au texte", "Supprimer le sens", "Éviter les verbes", "Compter les mots"], a: "Donner du relief au texte" },
                { q: `Discours direct :`, o: ["Paroles rapportées telles quelles", "Résumé des idées sans parole", "Liste de mots", "Texte argumentatif"], a: "Paroles rapportées telles quelles" },
                { q: `Discours indirect :`, o: ["Paroles intégrées dans la phrase", "Dialogue en tirets uniquement", "Rime poétique", "Aucune transformation"], a: "Paroles intégrées dans la phrase" },
                { q: `Une phrase exclamative exprime souvent :`, o: ["Une émotion", "Un calcul", "Une consigne de géométrie", "Un lieu"], a: "Une émotion" },
                { q: `Pour choisir un homophone, on utilise :`, o: ["Le sens de la phrase", "Le hasard", "La longueur du mot", "La couleur du texte"], a: "Le sens de la phrase" }
            ]
        },
        histoire: {
            flash: [
                { q: `En histoire, pourquoi placer les dates sur une frise ?`, a: "Pour comprendre l'ordre des événements." },
                { q: `Un siècle correspond à combien d'années ?`, a: "100 ans." },
                { q: `Pourquoi apprendre le vocabulaire historique ?`, a: "Pour mieux comprendre les documents et les périodes." },
                { q: `Que permet la chronologie ?`, a: "D'ordonner les faits du plus ancien au plus récent." },
                { q: `Civilisation : idée clé`, a: "Une civilisation regroupe des traits culturels communs." },
                { q: `Empire : idée clé`, a: "Un empire domine plusieurs territoires." },
                { q: `Pourquoi les repères temporels sont utiles ?`, a: "Ils évitent de confondre les périodes." },
                { q: `Une source historique peut être ...`, a: "un texte, un objet, une image, une inscription." },
                { q: `À quoi sert une date précise ?`, a: "À situer un événement sans ambiguïté." },
                { q: `Lire une frise demande de ...`, a: "suivre le sens du temps et comparer les repères." }
            ],
            quiz: [
                { q: `La chronologie sert à :`, o: ["Ordonner les événements", "Classer les paysages", "Conjuguer", "Calculer une aire"], a: "Ordonner les événements" },
                { q: `Un siècle, c'est :`, o: ["10 ans", "50 ans", "100 ans", "1000 ans"], a: "100 ans" },
                { q: `Une frise historique permet de :`, o: ["Situer les dates", "Mesurer un angle", "Tracer un plan", "Faire un circuit"], a: "Situer les dates" },
                { q: `Une source historique est :`, o: ["Un document sur le passé", "Un objet sans intérêt", "Une règle de maths", "Une météo"], a: "Un document sur le passé" },
                { q: `Le mot empire désigne :`, o: ["Un État dominant plusieurs territoires", "Un village", "Une date", "Un climat"], a: "Un État dominant plusieurs territoires" },
                { q: `Le vocabulaire historique sert à :`, o: ["Comprendre les notions", "Décorer la copie", "Éviter d'apprendre", "Faire des additions"], a: "Comprendre les notions" },
                { q: `Sur une frise, on place :`, o: ["Des repères temporels", "Des continents", "Des verbes", "Des formules"], a: "Des repères temporels" },
                { q: `Une civilisation correspond à :`, o: ["Un ensemble culturel", "Un seul roi", "Un océan", "Une équation"], a: "Un ensemble culturel" },
                { q: `Repérer un événement dans le temps aide à :`, o: ["Mieux le comprendre", "Le rendre faux", "L'effacer", "Le mélanger"], a: "Mieux le comprendre" },
                { q: `Lire une date permet surtout de :`, o: ["Situer un fait", "Mesurer un périmètre", "Choisir un transport", "Classer des animaux"], a: "Situer un fait" }
            ]
        },
        géo: {
            flash: [
                { q: `Pourquoi connaître continents et océans ?`, a: "Pour se repérer à l'échelle mondiale." },
                { q: `Un repère mondial sert à ...`, a: "localiser un lieu avec précision." },
                { q: `Un paysage combine ...`, a: "des éléments naturels et des aménagements humains." },
                { q: `Pourquoi lire une légende de carte ?`, a: "Pour comprendre les symboles." },
                { q: `L'équateur sépare ...`, a: "l'hémisphère Nord et l'hémisphère Sud." },
                { q: `Le méridien de Greenwich indique ...`, a: "la longitude 0 degré." },
                { q: `Paysage urbain : idée clé`, a: "Forte présence de bâtiments et de services." },
                { q: `Paysage rural : idée clé`, a: "Présence de campagnes et d'activités agricoles." },
                { q: `Un littoral est ...`, a: "la zone de contact entre terre et mer." },
                { q: `Un repère géographique aide à ...`, a: "s'orienter et comparer les lieux." }
            ],
            quiz: [
                { q: `Connaître les continents sert à :`, o: ["Se repérer dans le monde", "Conjuguer", "Résoudre des équations", "Écrire un dialogue"], a: "Se repérer dans le monde" },
                { q: `La légende d'une carte permet de :`, o: ["Comprendre les symboles", "Choisir une date", "Connaître la température exacte", "Éviter l'orientation"], a: "Comprendre les symboles" },
                { q: `Un repère mondial est :`, o: ["Une référence de localisation", "Une figure de style", "Un temps verbal", "Une opération"], a: "Une référence de localisation" },
                { q: `L'équateur sépare :`, o: ["Deux hémisphères", "Deux pays", "Deux océans", "Deux villages"], a: "Deux hémisphères" },
                { q: `Un paysage urbain contient souvent :`, o: ["Immeubles et routes", "Glaciers uniquement", "Forêts denses uniquement", "Aucun habitant"], a: "Immeubles et routes" },
                { q: `Un paysage rural correspond plutôt à :`, o: ["La campagne", "Un centre d'affaires dense", "Un port géant uniquement", "Une zone polaire seulement"], a: "La campagne" },
                { q: `Le littoral est :`, o: ["Entre terre et mer", "Au centre d'un désert", "Dans l'espace", "Sous une montagne"], a: "Entre terre et mer" },
                { q: `Le méridien de Greenwich indique :`, o: ["La longitude 0", "La latitude 0", "Le pôle Nord", "L'altitude"], a: "La longitude 0" },
                { q: `Les repères mondiaux servent à :`, o: ["Localiser précisément", "Décorer les cartes", "Supprimer les cartes", "Éviter les directions"], a: "Localiser précisément" },
                { q: `Étudier les paysages aide à comprendre :`, o: ["L'organisation des territoires", "Seulement la météo", "Seulement la grammaire", "Les tables de multiplication"], a: "L'organisation des territoires" }
            ]
        },
        default: {
            flash: [
                { q: `Dans « ${title} », quelle notion clé faut-il retenir ?`, a: "La notion principale du chapitre et son vocabulaire." },
                { q: `Quel est l'objectif du chapitre « ${title} » ?`, a: "Comprendre et appliquer la notion étudiée." },
                { q: `Pourquoi cette notion est utile ?`, a: "Elle aide à expliquer des situations réelles." },
                { q: `Comment réviser efficacement ce chapitre ?`, a: "En s'entraînant avec des questions variées." },
                { q: `Que vérifier à la fin d'un exercice ?`, a: "La cohérence de la réponse." },
                { q: `Un exemple concret permet de ...`, a: "mieux comprendre la notion." },
                { q: `Quel outil de cours utiliser ?`, a: "Le cahier, les définitions, et les exemples vus." },
                { q: `Apprendre une notion demande ...`, a: "compréhension + entraînement." },
                { q: `Erreur fréquente à éviter ?`, a: "Répondre trop vite sans relire." },
                { q: `Réponse de qualité =`, a: "claire, précise, et adaptée à la question." }
            ],
            quiz: [
                { q: `Objectif principal de « ${title} » :`, o: ["Comprendre la notion", "Mémoriser sans sens", "Répondre au hasard", "Éviter la méthode"], a: "Comprendre la notion" },
                { q: `Pour progresser, il faut surtout :`, o: ["S'entraîner régulièrement", "Attendre sans réviser", "Copier sans comprendre", "Ignorer les corrections"], a: "S'entraîner régulièrement" },
                { q: `Une bonne réponse est :`, o: ["Claire et justifiée", "Floue", "Hors sujet", "Sans lien avec la question"], a: "Claire et justifiée" },
                { q: `Avant de répondre, il faut :`, o: ["Relire la question", "Aller vite", "Changer de sujet", "Éviter les mots-clés"], a: "Relire la question" },
                { q: `Un exemple sert à :`, o: ["Illustrer une notion", "Remplacer la question", "Éviter la méthode", "Effacer le cours"], a: "Illustrer une notion" },
                { q: `Une erreur fréquente est :`, o: ["Répondre hors sujet", "Vérifier ses réponses", "Lire attentivement", "Utiliser son cours"], a: "Répondre hors sujet" },
                { q: `Pour mémoriser, il faut :`, o: ["Répéter et appliquer", "Apprendre une seule fois", "Ne jamais s'entraîner", "Ignorer les corrections"], a: "Répéter et appliquer" },
                { q: `Le cours aide à :`, o: ["Structurer la réponse", "Confondre les notions", "Éviter les exemples", "Supprimer le sens"], a: "Structurer la réponse" },
                { q: `Une question bien comprise mène à :`, o: ["Une réponse adaptée", "Une réponse au hasard", "Un hors sujet", "Aucune réponse"], a: "Une réponse adaptée" },
                { q: `À la fin, on doit :`, o: ["Vérifier la cohérence", "Rendre sans relire", "Effacer les mots-clés", "Changer la consigne"], a: "Vérifier la cohérence" }
            ]
        }
    };

    const bySubject = subject.includes("math") ? pools.maths
        : subject.includes("fran") ? pools.français
            : subject.includes("histoire") ? pools.histoire
                : (subject.includes("géo") || subject.includes("geo")) ? pools.géo
                    : pools.default;

    (chapter.flashcards || (chapter.flashcards = []));
    (chapter.quiz || (chapter.quiz = []));

    for (const item of bySubject.flash) {
        if (chapter.flashcards.length >= 15) break;
        if (usedF.has(item.q)) continue;
        chapter.flashcards.push({ question: item.q, answer: item.a });
        usedF.add(item.q);
    }

    for (const item of bySubject.quiz) {
        if (chapter.quiz.length >= 15) break;
        if (usedQ.has(item.q)) continue;
        chapter.quiz.push({ question: item.q, options: item.o, answer: item.a });
        usedQ.add(item.q);
    }
}

function getCuratedChapterContent(chapter) {
    const level = (chapter.level || "").toLowerCase();
    const title = (chapter.title || "").toLowerCase();
    if (level === "cm2" && title.includes("première guerre mondiale")) {
        const flashcards = [
            { question: "En quelles années se déroule la Première Guerre mondiale ?", answer: "De 1914 à 1918." },
            { question: "Quel événement déclenche la guerre en 1914 ?", answer: "L'assassinat de l'archiduc François-Ferdinand." },
            { question: "Dans quelle ville a lieu cet assassinat ?", answer: "À Sarajevo." },
            { question: "Quels sont les deux grands camps qui s'opposent ?", answer: "La Triple-Entente et les Empires centraux." },
            { question: "Pourquoi parle-t-on d'une guerre mondiale ?", answer: "Parce que de nombreux pays de plusieurs continents y participent." },
            { question: "Comment appelle-t-on les soldats français de cette guerre ?", answer: "Les Poilus." },
            { question: "Où les soldats combattent-ils principalement ?", answer: "Dans les tranchées, surtout sur le front de l'Ouest." },
            { question: "Pourquoi la vie dans les tranchées est-elle difficile ?", answer: "À cause de la boue, du froid, du manque d'hygiène et du danger permanent." },
            { question: "Quelles nouvelles armes sont utilisées pendant cette guerre ?", answer: "Mitrailleuses, gaz toxiques, chars et artillerie lourde." },
            { question: "Quel pays rejoint la guerre en 1917 pour aider la France et le Royaume-Uni ?", answer: "Les États-Unis." },
            { question: "Pourquoi les États-Unis entrent-ils en guerre ?", answer: "À cause notamment de la guerre sous-marine allemande et du télégramme Zimmermann." },
            { question: "En quelle année la Russie quitte-t-elle la guerre ?", answer: "En 1917 (puis paix signée en 1918)." },
            { question: "Quelle date marque la fin des combats ?", answer: "Le 11 novembre 1918." },
            { question: "Où est signé l'armistice de 1918 ?", answer: "À Rethondes, dans la forêt de Compiègne." },
            { question: "Quel traité met officiellement fin à la guerre en 1919 ?", answer: "Le traité de Versailles." },
            { question: "Dans quel lieu est signé ce traité ?", answer: "Au château de Versailles, dans la galerie des Glaces." },
            { question: "Combien de millions de soldats environ meurent pendant cette guerre ?", answer: "Environ 9 à 10 millions de soldats." },
            { question: "Pourquoi appelle-t-on cette guerre « la Grande Guerre » ?", answer: "Parce qu'elle est immense par son ampleur, sa durée et ses pertes humaines." },
            { question: "Quelles sont les conséquences pour l'Allemagne après la guerre ?", answer: "Perte de territoires, réparations financières et fortes contraintes militaires." },
            { question: "Cite une conséquence importante de la guerre pour l'Europe.", answer: "Des destructions massives, de lourdes pertes humaines et une carte politique transformée." }
        ];

        const quiz = [
            { question: "La Première Guerre mondiale se déroule de :", options: ["1914-1918", "1939-1945", "1870-1871", "1900-1904"], answer: "1914-1918" },
            { question: "L'événement déclencheur de 1914 est :", options: ["La chute de Berlin", "L'assassinat de François-Ferdinand", "Le Débarquement", "Le traité de Versailles"], answer: "L'assassinat de François-Ferdinand" },
            { question: "Cet assassinat a lieu à :", options: ["Paris", "Sarajevo", "Vienne", "Londres"], answer: "Sarajevo" },
            { question: "Les deux grands camps sont :", options: ["Triple-Entente et Empires centraux", "Axe et Alliés", "Nord et Sud", "Est et Ouest"], answer: "Triple-Entente et Empires centraux" },
            { question: "On dit « guerre mondiale » car :", options: ["Elle est courte", "Elle concerne plusieurs continents", "Elle n'implique que l'Europe", "Elle se passe en mer seulement"], answer: "Elle concerne plusieurs continents" },
            { question: "Le surnom des soldats français est :", options: ["Mousquetaires", "Poilus", "Chevaliers", "Marins"], answer: "Poilus" },
            { question: "Les combats ont lieu surtout :", options: ["Dans les tranchées", "Dans les stades", "Dans les usines", "Dans les écoles"], answer: "Dans les tranchées" },
            { question: "La vie dans les tranchées est difficile à cause de :", options: ["Le confort", "La boue, le froid et le danger", "L'absence de guerre", "Les vacances"], answer: "La boue, le froid et le danger" },
            { question: "Une arme nouvelle de la guerre est :", options: ["Mitrailleuse", "Arc", "Catapulte", "Sarbacane"], answer: "Mitrailleuse" },
            { question: "Le pays qui rejoint la guerre en 1917 est :", options: ["Espagne", "États-Unis", "Suisse", "Pays-Bas"], answer: "États-Unis" },
            { question: "Les États-Unis entrent en guerre notamment à cause de :", options: ["La guerre sous-marine allemande", "La Révolution française", "Le traité de Rome", "La Guerre froide"], answer: "La guerre sous-marine allemande" },
            { question: "La Russie quitte la guerre en :", options: ["1914", "1916", "1917", "1919"], answer: "1917" },
            { question: "La fin des combats est le :", options: ["11 novembre 1918", "8 mai 1945", "14 juillet 1789", "1 janvier 1919"], answer: "11 novembre 1918" },
            { question: "L'armistice de 1918 est signé à :", options: ["Rethondes", "Versailles", "Berlin", "Bruxelles"], answer: "Rethondes" },
            { question: "Le traité de 1919 est :", options: ["Traité de Rome", "Traité de Versailles", "Traité de Paris", "Traité de Genève"], answer: "Traité de Versailles" },
            { question: "Ce traité est signé dans :", options: ["La galerie des Glaces", "La tour Eiffel", "Le Kremlin", "Le Colisée"], answer: "La galerie des Glaces" },
            { question: "Le nombre de soldats morts est d'environ :", options: ["1 million", "3 millions", "9 à 10 millions", "25 millions"], answer: "9 à 10 millions" },
            { question: "On parle de « Grande Guerre » car :", options: ["Elle est de faible ampleur", "Elle est massive et meurtrière", "Elle dure 3 mois", "Elle n'a pas de conséquences"], answer: "Elle est massive et meurtrière" },
            { question: "Après la guerre, l'Allemagne subit :", options: ["Aucune contrainte", "Pertes, réparations et limitation militaire", "Un agrandissement", "La disparition totale"], answer: "Pertes, réparations et limitation militaire" },
            { question: "Une conséquence majeure pour l'Europe est :", options: ["Aucun changement", "Des destructions et une nouvelle carte politique", "La fin de toutes les frontières", "La disparition des villes"], answer: "Des destructions et une nouvelle carte politique" }
        ];

        return { flashcards, quiz };
    }

    if (!(level === "cm2" && title.includes("seconde guerre mondiale"))) return null;

    const flashcards = [
        { question: "En quelles années se déroule la Seconde Guerre mondiale ?", answer: "De 1939 à 1945." },
        { question: "Quel événement marque le début de la guerre en 1939 ?", answer: "L'invasion de la Pologne." },
        { question: "Quel pays envahit la Pologne en premier ?", answer: "L'Allemagne nazie." },
        { question: "Qui est le chef de l'Allemagne pendant la guerre ?", answer: "Adolf Hitler." },
        { question: "Quels sont les deux grands camps qui s'opposent ?", answer: "L'Axe et les Alliés." },
        { question: "Pourquoi la France est-elle battue en 1940 ?", answer: "L'armée allemande attaque rapidement et la France est débordée." },
        { question: "Comment appelle-t-on la période où la France est occupée ?", answer: "L'Occupation." },
        { question: "Qui dirige la France à Vichy pendant l'Occupation ?", answer: "Philippe Pétain." },
        { question: "Qui lance l'appel du 18 juin 1940 depuis Londres ?", answer: "Charles de Gaulle." },
        { question: "Comment appelle-t-on les Français qui luttent contre l'occupation ?", answer: "Les résistants." },
        { question: "Que signifie le mot « Occupation » pendant la guerre ?", answer: "Un pays est contrôlé par une armée étrangère." },
        { question: "Que se passe-t-il le 6 juin 1944 ?", answer: "Le Débarquement allié en Normandie." },
        { question: "Dans quel pays a lieu le Débarquement de 1944 ?", answer: "En France (Normandie)." },
        { question: "Comment appelle-t-on l'extermination des Juifs d'Europe ?", answer: "La Shoah." },
        { question: "Dans quels types de camps les Juifs étaient-ils enfermés ?", answer: "Des camps de concentration et d'extermination." },
        { question: "Quel pays entre en guerre après l'attaque de Pearl Harbor ?", answer: "Les États-Unis." },
        { question: "Quelle ville japonaise est touchée par la première bombe atomique ?", answer: "Hiroshima." },
        { question: "En quelle année Paris est-elle libérée ?", answer: "En 1944." },
        { question: "En quelle année la guerre se termine-t-elle en Europe ?", answer: "En 1945." },
        { question: "Cite une conséquence importante de la guerre pour l'Europe.", answer: "De lourdes destructions et une reconstruction massive après 1945." }
    ];

    const quiz = [
        { question: "La Seconde Guerre mondiale se déroule de :", options: ["1914-1918", "1939-1945", "1945-1955", "1900-1910"], answer: "1939-1945" },
        { question: "En 1939, l'événement qui déclenche la guerre est :", options: ["La chute de Berlin", "L'invasion de la Pologne", "Le Débarquement", "Pearl Harbor"], answer: "L'invasion de la Pologne" },
        { question: "Le premier pays qui envahit la Pologne est :", options: ["Italie", "Allemagne", "Japon", "URSS"], answer: "Allemagne" },
        { question: "Le chef de l'Allemagne nazie est :", options: ["Staline", "Churchill", "Adolf Hitler", "Roosevelt"], answer: "Adolf Hitler" },
        { question: "Les deux grands camps sont :", options: ["Axe et Alliés", "Nord et Sud", "Est et Ouest", "France et Italie"], answer: "Axe et Alliés" },
        { question: "La France est battue en 1940 car :", options: ["Elle n'a pas d'armée", "L'attaque allemande est très rapide", "Elle refuse de se défendre", "Les Alliés l'abandonnent dès 1939"], answer: "L'attaque allemande est très rapide" },
        { question: "La période de contrôle allemand en France s'appelle :", options: ["La Libération", "La Révolution", "L'Occupation", "La Reconstruction"], answer: "L'Occupation" },
        { question: "Le chef du régime de Vichy est :", options: ["De Gaulle", "Pétain", "Clémenceau", "Jaurès"], answer: "Pétain" },
        { question: "L'appel du 18 juin 1940 est lancé par :", options: ["Pétain", "De Gaulle", "Churchill", "Roosevelt"], answer: "De Gaulle" },
        { question: "Les Français qui luttent contre l'occupant sont :", options: ["Les colons", "Les résistants", "Les explorateurs", "Les députés"], answer: "Les résistants" },
        { question: "Pendant la guerre, « Occupation » signifie :", options: ["Vacances prolongées", "Contrôle d'un pays par une armée étrangère", "Accord de paix", "Changement de monnaie"], answer: "Contrôle d'un pays par une armée étrangère" },
        { question: "Le 6 juin 1944 correspond à :", options: ["L'armistice de 1918", "Le Débarquement en Normandie", "La chute de Paris", "La fin de la guerre au Japon"], answer: "Le Débarquement en Normandie" },
        { question: "Le Débarquement de 1944 a lieu :", options: ["En Italie", "En Allemagne", "En France", "En Belgique"], answer: "En France" },
        { question: "L'extermination des Juifs d'Europe est appelée :", options: ["La Renaissance", "La Shoah", "La Guerre froide", "La Réforme"], answer: "La Shoah" },
        { question: "Les Juifs sont enfermés dans :", options: ["Des camps de concentration et d'extermination", "Des internats", "Des casernes françaises", "Des bateaux"], answer: "Des camps de concentration et d'extermination" },
        { question: "Après Pearl Harbor, le pays qui entre en guerre est :", options: ["Le Canada", "Les États-Unis", "L'Espagne", "Le Brésil"], answer: "Les États-Unis" },
        { question: "Première ville touchée par la bombe atomique :", options: ["Tokyo", "Nagasaki", "Hiroshima", "Osaka"], answer: "Hiroshima" },
        { question: "Paris est libérée en :", options: ["1940", "1942", "1944", "1946"], answer: "1944" },
        { question: "La guerre se termine en Europe en :", options: ["1943", "1944", "1945", "1947"], answer: "1945" },
        { question: "Une conséquence majeure en Europe après 1945 est :", options: ["Aucune reconstruction", "Une reconstruction importante", "La disparition des écoles", "La fin des villes"], answer: "Une reconstruction importante" }
    ];

    return { flashcards, quiz };
}

function isBannedPrompt(text) {
    if (!text || typeof text !== 'string') return false;
    return /(question|quiz|réponse)\s+(d'entraînement|complementaire|complémentaire)\b/i.test(text);
}

function isLowValueQuestion(text) {
    if (!text || typeof text !== "string") return false;
    const t = normalizeQuestionText(text);
    const lowValuePatterns = [
        /\bobjectif du chapitre\b/,
        /\bnotion cle\b/,
        /\bpoints cles\b/,
        /\bresumer\b/,
        /\bpourquoi etudier\b/,
        /\bque faut il retenir\b/,
        /\bqu est ce qu une notion\b/,
        /\bquestion generale\b/,
        /\bdefinition simple\b/,
        /\bdonner 5 points\b/
    ];
    return lowValuePatterns.some((p) => p.test(t));
}

function isTrueFalseQuiz(q) {
    if (!q) return false;
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length === 2 && opts.includes("Vrai") && opts.includes("Faux")) return true;
    const question = `${q.question || ""}`.toLowerCase();
    return question.includes("vrai ou faux");
}

function dedupeByQuestion(items) {
    const out = [];
    const seen = new Set();
    for (const item of items || []) {
        const q = (item?.question || "").trim();
        if (!q) continue;
        if (seen.has(q)) continue;
        seen.add(q);
        out.push(item);
    }
    return out;
}

function getQuestionIntentKey(question) {
    return normalizeQuestionText(question)
        .replace(/\b(vrai|faux|explique|petit|exercice|qcm|question|reponds|reponse|complete|compl[eé]te|objectif|chapitre|notion|cle|retenir|resumer)\b/g, " ")
        .replace(/\b(cp|ce1|ce2|cm1|cm2|6e|5e|4e|3e|2nde|seconde|1ere|terminale)\b/g, " ")
        .replace(/\d+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((t) => t.length > 2)
        .slice(0, 8)
        .join(" ");
}

function dedupeByQuestionIntent(items) {
    const out = [];
    const seen = new Set();
    for (const item of items || []) {
        const key = getQuestionIntentKey(item?.question || "");
        if (!key) {
            out.push(item);
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

function normalizeQuestionText(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripQuestionNoise(text) {
    return `${text || ""}`
        .replace(/\[SERIE-[^\]]+\]/gi, " ")
        .replace(/\[(Type|Angle|Contexte|Difficult[eé])\s*:[^\]]+\]/gi, " ")
        .replace(/\(([^)]*?)-(?:\s*)[fv]\d+\)/gi, " ")
        .replace(/\[Variation quiz \d+\]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function rewriteQuestionWithVariation(question, chapter, index, mode) {
    const core = stripQuestionNoise(question);
    if (!core) return "";
    return core;
}

function cleanAndDiversifyItems(items, chapter, mode, blockedIntentSet) {
    const out = [];
    const seenQuestions = new Set();
    const seenIntents = new Set();
    for (let i = 0; i < (items || []).length; i++) {
        const raw = items[i] || {};
        const baseQuestion = stripQuestionNoise(raw.question || "");
        if (!baseQuestion || isBannedPrompt(baseQuestion) || isLowValueQuestion(baseQuestion)) continue;
        let question = rewriteQuestionWithVariation(baseQuestion, chapter, i, mode);
        let intentKey = getQuestionIntentKey(question);
        if (!intentKey) continue;
        if (blockedIntentSet && blockedIntentSet.has(intentKey)) continue;
        if (seenIntents.has(intentKey)) continue;
        if (isTooSimilarQuestion(question, seenQuestions)) continue;

        if (mode === "flash") {
            const answer = (raw.answer || "").trim();
            if (!answer || isAnswerEchoingQuestion(question, answer)) continue;
            out.push({ ...raw, question, answer });
        } else {
            const normalized = normalizeQuizRecord(raw);
            normalized.question = question;
            if (!normalized.answer) continue;
            if (isAnswerEchoingQuestion(question, normalized.answer)) continue;
            out.push(normalized);
        }

        seenQuestions.add(question);
        seenIntents.add(intentKey);
    }
    return out;
}

function auditAndDiversifyChapter(chapter) {
    if (!chapter) return;
    chapter.flashcards = cleanAndDiversifyItems(chapter.flashcards || [], chapter, "flash");
    const flashIntent = new Set((chapter.flashcards || []).map((f) => getQuestionIntentKey(f.question)).filter(Boolean));
    chapter.quiz = cleanAndDiversifyItems(chapter.quiz || [], chapter, "quiz", flashIntent);
    chapter.flashcards = dedupeByQuestionIntent(dedupeByQuestion(chapter.flashcards));
    chapter.quiz = dedupeByQuestionIntent(dedupeByQuestion(chapter.quiz)).map(normalizeQuizRecord);
}

function isTooSimilarQuestion(question, existingQuestions) {
    const qNorm = normalizeQuestionText(question);
    if (!qNorm) return false;
    const qTokens = new Set(qNorm.split(" ").filter((t) => t.length > 2));
    for (const prev of existingQuestions || []) {
        const pNorm = normalizeQuestionText(prev);
        if (!pNorm) continue;
        if (pNorm === qNorm) return true;
        const pTokens = new Set(pNorm.split(" ").filter((t) => t.length > 2));
        let inter = 0;
        qTokens.forEach((t) => {
            if (pTokens.has(t)) inter++;
        });
        const union = qTokens.size + pTokens.size - inter;
        const jaccard = union ? inter / union : 0;
        if (jaccard >= 0.78) return true;
    }
    return false;
}

function isAnswerEchoingQuestion(question, answer) {
    const qNorm = normalizeQuestionText(question);
    const aNorm = normalizeQuestionText(answer);
    if (!qNorm || !aNorm) return false;
    const qCore = qNorm.split(" ").filter((t) => t.length > 3).slice(0, 8).join(" ");
    if (!qCore) return false;
    return aNorm.includes(qCore);
}

function normalizeQuizRecord(q) {
    if (!q) return q;
    const opts = Array.isArray(q.options) ? q.options : [];
    const inferredType = q.type
        || ((q.question || "").toLowerCase().includes("complète") ? "trou"
            : (q.question || "").toLowerCase().includes("cas pratique") ? "cas_pratique"
                : "qcm");
    return {
        type: inferredType,
        question: q.question,
        options: opts,
        answer: q.answer || q.reponse_correcte,
        reponse_correcte: q.reponse_correcte || q.answer,
        explication: q.explication || "Réponse attendue conforme à la compétence travaillée."
    };
}

function getHistorySevenQuestion(topic, n) {
    const key = (topic || "").toLowerCase();
    let facts;

    if (key.includes("seconde guerre")) {
        facts = {
            when: "1939 à 1945",
            where: "En Europe, en Asie et sur d'autres fronts mondiaux",
            who: "Les puissances de l'Axe et les Alliés; civils et militaires",
            what: "Un conflit mondial total avec des combats, des occupations et des destructions massives",
            why: "Des tensions politiques, territoriales et idéologiques fortes après 1918",
            how: "Par des offensives militaires, des occupations, des résistances et des alliances",
            consequences: "Des millions de morts, des destructions, des procès, et une reconstruction de l'Europe"
        };
    } else if (key.includes("première guerre")) {
        facts = {
            when: "1914 à 1918",
            where: "Principalement en Europe, avec des fronts sur plusieurs continents",
            who: "Empires centraux et Alliés; soldats appelés et populations civiles",
            what: "Une guerre de grande ampleur marquée par les tranchées",
            why: "Des rivalités entre puissances, des alliances et des tensions nationalistes",
            how: "Par des mobilisations massives, des batailles longues et une guerre d'usure",
            consequences: "Très lourdes pertes humaines, bouleversements politiques, mémoire durable"
        };
    } else if (key.includes("construction européenne")) {
        facts = {
            when: "Après 1945, avec des étapes successives jusqu'à aujourd'hui",
            where: "En Europe",
            who: "Les États européens, leurs dirigeants et les citoyens",
            what: "La création progressive d'une coopération politique et économique",
            why: "Éviter de nouvelles guerres et renforcer la coopération",
            how: "Par des traités, des institutions communes et des décisions partagées",
            consequences: "Paix durable entre États membres, échanges facilités, institutions communes"
        };
    } else {
        facts = {
            when: "Selon la période étudiée dans le chapitre",
            where: "Dans l'espace géographique concerné par le chapitre",
            who: "Les acteurs historiques étudiés (peuples, dirigeants, groupes sociaux)",
            what: "L'événement ou le changement central du chapitre",
            why: "Les causes politiques, économiques, sociales ou culturelles",
            how: "Le déroulement des faits et les réactions des acteurs",
            consequences: "Les effets à court et à long terme"
        };
    }

    const axes = ["when", "where", "who", "what", "why", "how", "consequences"];
    const axis = axes[(n - 1) % axes.length];

    const byAxis = {
        when: {
            competence: "Se repérer dans le temps historique",
            baseQuestion: `Quand se situe ${topic} ?`,
            correct: facts.when,
            wrong: ["Au hasard dans le temps", "Sans date précise", "Dans une période non liée au chapitre"],
            explanation: "La date et la période sont indispensables pour maîtriser un chapitre d'histoire."
        },
        where: {
            competence: "Situer un événement dans l'espace",
            baseQuestion: `Où se déroule principalement ${topic} ?`,
            correct: facts.where,
            wrong: ["Dans un lieu sans lien avec le chapitre", "Uniquement dans une ville imaginaire", "Aucun espace précis"],
            explanation: "Situer l'événement permet de comprendre son contexte géographique."
        },
        who: {
            competence: "Identifier les acteurs historiques",
            baseQuestion: `Qui sont les principaux acteurs de ${topic} ?`,
            correct: facts.who,
            wrong: ["Des personnages non liés", "Aucun acteur identifié", "Seulement un groupe fictif"],
            explanation: "Connaître les acteurs aide à comprendre les décisions et les enjeux."
        },
        what: {
            competence: "Décrire l'événement historique",
            baseQuestion: `Quoi: que s'est-il passé pendant ${topic} ?`,
            correct: facts.what,
            wrong: ["Un fait hors chapitre", "Un simple détail sans événement", "Aucun changement notable"],
            explanation: "Il faut pouvoir formuler clairement l'événement central."
        },
        why: {
            competence: "Expliquer les causes d'un événement",
            baseQuestion: `Pourquoi ${topic} a-t-il eu lieu ?`,
            correct: facts.why,
            wrong: ["Sans cause identifiable", "Uniquement par hasard", "Pour une raison sans lien historique"],
            explanation: "Comprendre les causes montre une maîtrise réelle du chapitre."
        },
        how: {
            competence: "Comprendre le déroulement historique",
            baseQuestion: `Comment ${topic} s'est-il déroulé ?`,
            correct: facts.how,
            wrong: ["Sans acteurs ni étapes", "Par un seul événement isolé", "Sans réaction des populations"],
            explanation: "Le « comment » explique les mécanismes et la dynamique des faits."
        },
        consequences: {
            competence: "Analyser les conséquences historiques",
            baseQuestion: `Quelles conséquences de ${topic} à court et long terme ?`,
            correct: facts.consequences,
            wrong: ["Aucune conséquence", "Seulement un effet mineur", "Des effets hors sujet"],
            explanation: "Les conséquences permettent d'évaluer l'importance historique d'un événement."
        }
    };

    return byAxis[axis];
}

function conjugatePresent(verb, pronoun) {
    const p = (pronoun || "").toLowerCase();
    if (verb.endsWith("er")) {
        const stem = verb.slice(0, -2);
        const endings = { je: "e", tu: "es", il: "e", nous: "ons", vous: "ez", ils: "ent" };
        return `${p} ${stem}${endings[p] || "e"}`.replace(/^je [aeiouh]/, "j'");
    }
    if (verb.endsWith("ir")) {
        const stem = verb.slice(0, -2);
        const endings = { je: "is", tu: "is", il: "it", nous: "issons", vous: "issez", ils: "issent" };
        return `${p} ${stem}${endings[p] || "it"}`.replace(/^je [aeiouh]/, "j'");
    }
    return `${p} ${verb}`;
}

function conjugateImparfait(verb, pronoun) {
    const p = (pronoun || "").toLowerCase();
    const stems = {
        jouer: "jou",
        chanter: "chant",
        parler: "parl",
        regarder: "regard",
        aimer: "aim",
        marcher: "march",
        finir: "finiss",
        grandir: "grandiss",
        réussir: "réussiss"
    };
    const endings = { je: "ais", tu: "ais", il: "ait", nous: "ions", vous: "iez", ils: "aient" };
    const stem = stems[verb] || verb.replace(/er$|ir$/, "");
    return `${p} ${stem}${endings[p] || "ait"}`.replace(/^je [aeiouh]/, "j'");
}

function conjugateFuturSimple(verb, pronoun) {
    const p = (pronoun || "").toLowerCase();
    const radical = verb.endsWith("re") ? verb.slice(0, -1) : verb;
    const endings = { je: "ai", tu: "as", il: "a", nous: "ons", vous: "ez", ils: "ont" };
    return `${p} ${radical}${endings[p] || "a"}`.replace(/^je [aeiouh]/, "j'");
}

function buildUniqueFlashcard(chapter, n) {
    const generic = buildGenericPrompt(chapter, n);
    return { question: generic.flashQuestion, answer: generic.flashAnswer };
}

function buildUniqueQuiz(chapter, n) {
    const generic = buildGenericPrompt(chapter, n);
    return {
        niveau: generic.niveau,
        competence: generic.competence,
        difficulte: generic.difficulte,
        type: generic.type,
        question: generic.quizQuestion,
        options: generic.quizOptions,
        answer: generic.quizAnswer,
        reponse_correcte: generic.reponse_correcte,
        explication: generic.explication
    };
}

function getLevelBand(level) {
    const l = `${level || ""}`.toLowerCase();
    if (/(cp|ce1|ce2)/.test(l)) return "cycle2";
    if (/(cm1|cm2|6e)/.test(l)) return "cycle3";
    if (/(5e|4e|3e)/.test(l)) return "cycle4";
    return "lycee";
}

function getOfficialConceptBackbone(level, subjectRaw) {
    const band = getLevelBand(level);
    const isMath = subjectRaw.includes("math");
    const isFrench = subjectRaw.includes("fran");
    const isHistory = subjectRaw.includes("histoire");
    const isGeo = subjectRaw.includes("géo") || subjectRaw.includes("geo");

    if (isMath) {
        if (band === "cycle2") return ["nombres", "calcul", "calcul mental", "résolution de problèmes", "grandeurs", "espace et géométrie"];
        if (band === "cycle3") return ["nombres et calculs", "fractions et décimaux", "proportionnalité", "grandeurs et mesures", "espace et géométrie", "résolution de problèmes"];
        if (band === "cycle4") return ["nombres et calculs", "calcul littéral", "équations", "fonctions", "statistiques et probabilités", "grandeurs et mesures"];
        return ["fonctions", "dérivation", "suites", "probabilités", "géométrie", "raisonnement mathématique"];
    }
    if (isFrench) {
        if (band === "cycle2") return ["lecture", "compréhension", "vocabulaire", "grammaire", "orthographe", "écriture"];
        if (band === "cycle3") return ["compréhension de textes", "grammaire", "conjugaison", "orthographe", "vocabulaire", "production d'écrits"];
        if (band === "cycle4") return ["analyse de texte", "grammaire", "orthographe", "conjugaison", "écriture argumentée", "culture littéraire"];
        return ["analyse littéraire", "argumentation", "grammaire avancée", "écriture", "oral", "culture"];
    }
    if (isHistory) {
        if (band === "cycle2") return ["repères temporels", "chronologie simple", "personnages", "événements", "vocabulaire historique"];
        if (band === "cycle3") return ["repères chronologiques", "périodes historiques", "acteurs", "causes et conséquences", "lecture de documents"];
        if (band === "cycle4") return ["chronologie", "analyse de documents", "acteurs et enjeux", "causes", "conséquences", "argumentation historique"];
        return ["problématiques historiques", "analyse critique de documents", "contextes", "enjeux", "interprétations"];
    }
    if (isGeo) {
        if (band === "cycle2") return ["se repérer dans l'espace", "paysages", "habiter", "repères géographiques", "carte simple"];
        if (band === "cycle3") return ["localiser", "lire une carte", "habiter les territoires", "mobilités", "organisation de l'espace"];
        if (band === "cycle4") return ["territoires", "mobilités", "mondialisation", "aménagement", "analyse de cartes"];
        return ["dynamiques territoriales", "mondialisation", "acteurs", "enjeux", "échelles"];
    }
    if (band === "cycle2") return ["vivant", "matière", "objets techniques", "espace", "temps"];
    if (band === "cycle3") return ["matière", "énergie", "vivant", "système Terre", "objets techniques"];
    if (band === "cycle4") return ["organisation du vivant", "physique-chimie", "technologie", "environnement", "données scientifiques"];
    return ["modélisation", "données", "expérimentation", "analyse", "enjeux scientifiques"];
}

function getChapterConcepts(chapter) {
    const title = (chapter?.title || "").replace(/\(.*?\)/g, " ").trim();
    const subjectRaw = (chapter?.subject || "").toLowerCase();
    const stop = new Set(["les", "des", "dans", "avec", "pour", "sur", "une", "un", "du", "de", "la", "le", "et", "au", "aux"]);
    const fromTitle = title
        .split(/[^A-Za-zÀ-ÿ0-9]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !stop.has(w.toLowerCase()));

    const defaults = subjectRaw.includes("math")
        ? ["calcul", "nombre", "opération", "propriété", "unité", "mesure", "figure", "problème"]
        : subjectRaw.includes("fran")
            ? ["grammaire", "conjugaison", "orthographe", "vocabulaire", "phrase", "texte", "sens", "accord"]
            : subjectRaw.includes("histoire")
                ? ["date", "période", "contexte", "acteurs", "causes", "conséquences", "événement", "source"]
                : (subjectRaw.includes("géo") || subjectRaw.includes("geo"))
                    ? ["carte", "repère", "localisation", "espace", "paysage", "territoire", "échelle", "mobilité"]
                    : ["notion", "définition", "exemple", "cause", "effet", "expérience", "observation", "modèle"];

    const merged = [...fromTitle, ...defaults];
    const unique = [];
    const seen = new Set();
    for (const item of merged) {
        const key = normalizeQuestionText(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
        if (unique.length >= 10) break;
    }
    while (unique.length < 8) unique.push(`notion ${unique.length + 1}`);
    return unique;
}

function getDefinitionBySubject(subjectRaw, concept) {
    if (subjectRaw.includes("math")) return `${concept} est une notion utile pour calculer, comparer et justifier un résultat.`;
    if (subjectRaw.includes("fran")) return `${concept} est une notion de langue qui aide à écrire et analyser correctement une phrase.`;
    if (subjectRaw.includes("histoire")) return `${concept} sert à situer, comprendre et expliquer un fait historique.`;
    if (subjectRaw.includes("géo") || subjectRaw.includes("geo")) return `${concept} aide à se repérer et à comprendre l'organisation d'un espace.`;
    return `${concept} est une notion scientifique à vérifier par observation, raisonnement ou expérience.`;
}

function rotateOptions(correct, wrongs, seed) {
    const all = [correct, ...(wrongs || []).slice(0, 3)];
    const shift = seed % all.length;
    return all.slice(shift).concat(all.slice(0, shift));
}

function inferExpectedConcepts(grade, subject, title) {
    const g = `${grade || ""}`.toLowerCase();
    const s = `${subject || ""}`.toLowerCase();
    const t = `${title || ""}`.toLowerCase();
    const titleTokens = t
        .split(/[^a-z0-9à-ÿ]+/i)
        .map((w) => w.trim())
        .filter((w) => w.length > 2);

    const bySubject = s.includes("math")
        ? ["définition", "méthode", "calcul", "propriété", "représentation", "comparaison", "erreur fréquente", "application"]
        : s.includes("fran")
            ? ["nature", "fonction", "accord", "conjugaison", "ponctuation", "sens", "réécriture", "justification"]
            : s.includes("histoire")
                ? ["repères temporels", "repères spatiaux", "acteurs", "causes", "déroulement", "conséquences", "vocabulaire", "analyse de cas"]
                : (s.includes("géo") || s.includes("geo"))
                    ? ["localisation", "repères", "lecture de carte", "paysage", "mobilité", "organisation de l'espace", "comparaison", "étude de cas"]
                    : ["observation", "notion clé", "classification", "relation cause-effet", "modèle simple", "cas pratique", "erreur courante", "synthèse"];

    const levelAdjust = /(cp|ce1)/.test(g)
        ? ["vocabulaire simple", "exemple concret"]
        : /(ce2|cm1|cm2|6e)/.test(g)
            ? ["application guidée", "raisonnement simple"]
            : ["analyse", "justification"];

    const out = [];
    const seen = new Set();
    [...titleTokens, ...bySubject, ...levelAdjust].forEach((c) => {
        const k = normalizeQuestionText(c);
        if (!k || seen.has(k)) return;
        seen.add(k);
        out.push(c);
    });
    while (out.length < 8) out.push(`notion ${out.length + 1}`);
    return out.slice(0, 10);
}

function generateInferredAssessment(grade, subject, title) {
    const concepts = inferExpectedConcepts(grade, subject, title);
    const chapterTitle = `${title || "Chapitre"}`.trim();
    const flashcards = [];
    const quiz = [];

    for (let i = 0; i < 20; i++) {
        const c1 = concepts[i % concepts.length];
        const c2 = concepts[(i + 2) % concepts.length];
        if (i < 10) {
            flashcards.push({
                question: `Dans "${chapterTitle}", que signifie "${c1}" ?`,
                answer: `"${c1}" est une notion essentielle du chapitre, utilisée pour comprendre et réussir les exercices.`
            });
        } else {
            flashcards.push({
                question: `Comment utiliser "${c1}" pour traiter une question liée à "${c2}" ?`,
                answer: `On applique la méthode du cours, puis on justifie la réponse avec les éléments du chapitre.`
            });
        }
    }

    for (let i = 0; i < 20; i++) {
        const c1 = concepts[i % concepts.length];
        const c2 = concepts[(i + 1) % concepts.length];
        const block = i + 1;
        const isTrueFalse = block >= 13 && block <= 16; // 4 true/false
        const isShort = block >= 17 && block <= 20; // 4 short answers

        if (isTrueFalse) {
            const statementTrue = block % 2 === 1;
            const statement = statementTrue
                ? `Dans "${chapterTitle}", "${c1}" s'utilise avec une méthode justifiée.`
                : `Dans "${chapterTitle}", "${c1}" ne demande jamais de vérification finale.`;
            quiz.push({
                type: "true_false",
                question: statement,
                answer: statementTrue ? "Vrai" : "Faux"
            });
            continue;
        }

        if (isShort) {
            quiz.push({
                type: "short_answer",
                question: `Explique en une réponse courte comment distinguer "${c1}" et "${c2}" dans "${chapterTitle}".`,
                answer: `On les distingue par leur rôle dans la méthode et l'objectif de la consigne.`
            });
            continue;
        }

        const correct = block <= 4
            ? `Identifier la notion demandée puis répondre précisément`
            : block <= 8
                ? `Appliquer la méthode du cours à une situation concrète`
                : block <= 14
                    ? `Comparer les notions et justifier le choix`
                    : `Relier plusieurs notions pour conclure avec cohérence`;
        const wrong1 = `Donner une réponse rapide sans vérifier`;
        const wrong2 = `Réciter une définition sans lien avec la question`;
        const wrong3 = `Ignorer la consigne et changer de méthode`;
        quiz.push({
            type: "multiple_choice",
            question: block <= 4
                ? `Quelle démarche est la plus correcte pour traiter une question sur "${c1}" ?`
                : block <= 8
                    ? `Cas pratique: pour appliquer "${c1}" dans un exercice, que faut-il faire d'abord ?`
                    : block <= 14
                        ? `Quelle distinction est la plus pertinente entre "${c1}" et "${c2}" ?`
                        : `Pour réussir une synthèse sur "${chapterTitle}", quelle stratégie est la meilleure ?`,
            options: rotateOptions(correct, [wrong1, wrong2, wrong3], i + 1),
            answer: correct
        });
    }

    return { flashcards, quiz };
}

window.generateInferredAssessment = generateInferredAssessment;

function buildGenericPrompt(chapter, n) {
    const level = chapter.level || "Niveau non précisé";
    const title = chapter.title || "ce chapitre";
    const subjectRaw = (chapter.subject || "").toLowerCase();
    const topic = title.replace(/\(.*?\)/g, "").trim() || "ce chapitre";
    const idx = ((n - 1) % 20) + 1;
    const concepts = getChapterConcepts(chapter);
    const c1 = concepts[(idx - 1) % concepts.length];
    const c2 = concepts[(idx + 2) % concepts.length];
    const isMath = subjectRaw.includes("math");
    const isFrench = subjectRaw.includes("fran");
    const isHistory = subjectRaw.includes("histoire");
    const isGeo = subjectRaw.includes("géo") || subjectRaw.includes("geo");

    // Simplified, topic-focused formats: light rotation to keep variety without complex meta-questions.
    const formatCycle = [
        "qcm", "vrai_faux", "courte", "qcm", "exercice",
        "qcm", "vrai_faux", "courte", "qcm", "exercice",
        "qcm", "vrai_faux", "courte", "qcm", "exercice",
        "qcm", "vrai_faux", "qcm", "qcm", "qcm"
    ];
    const format = formatCycle[idx - 1];
    const type = format === "vrai_faux" ? "vrai_faux" : (format === "courte" ? "courte" : (format === "exercice" ? "exercice" : "qcm"));
    const difficulty = idx <= 7 ? "facile" : (idx <= 14 ? "intermediaire" : "avance");
    const competence = topic;

    const flashQuestion = idx <= 10
        ? `Que signifie "${c1}" dans le chapitre "${topic}" ?`
        : `Donne un exemple simple où "${c1}" et "${c2}" sont utilisés dans "${topic}".`;
    const flashAnswer = idx <= 10
        ? `${c1}: notion du chapitre ${topic}.`
        : `Exemple: on applique ${c1} puis ${c2} dans une situation de ${topic}.`;

    const styles = [
        (s) => `${s}.`,
        (s) => `${s} (réponse courte).`,
        (s) => `${s} Exemple attendu.`,
        (s) => `${s} en une phrase.`,
        (s) => `${s} vérifiable.`
    ];

    let baseQuestion = "";
    let correct = "";
    let wrong = [];
    let explanationSeed = "";

    const stemByFormat = {
        qcm: `Quel choix est correct pour "${c1}" dans "${topic}" ?`,
        vrai_faux: `VRAI ou FAUX : "${c1}" s'applique ainsi dans "${topic}".`,
        courte: `Réponse courte : cite l'élément clé de "${c1}" attendu au programme.`,
        exercice: `Petit exercice : applique "${c1}" dans une situation simple de "${topic}".`
    };
    baseQuestion = stemByFormat[format] || stemByFormat.qcm;

    if (isMath) {
        correct = `Réponse conforme au cours pour ${c1}`;
        wrong = [
            "Choix ne respectant pas la règle ou l'unité",
            "Réponse hors chapitre",
            "Résultat incohérent"
        ];
        explanationSeed = "On vérifie la notion mathématique visée.";
    } else if (isFrench) {
        correct = `Forme correcte selon la règle de ${c1}`;
        wrong = ["Forme fautive", "Forme hors contexte", "Forme modifiant le sens"];
        explanationSeed = "On contrôle l'application simple de la règle.";
    } else if (isHistory) {
        correct = "Repère ou relation historique exacte";
        wrong = ["Anachronisme", "Cause/conséquence inversée", "Contexte faux"];
        explanationSeed = "On vérifie repère + cohérence du fait.";
    } else if (isGeo) {
        correct = "Localisation/lecture cohérente avec la carte et le cours";
        wrong = ["Localisation erronée", "Description vague", "Interprétation hors sujet"];
        explanationSeed = "On teste repères spatiaux simples.";
    } else {
        correct = "Notion scientifique correcte ou relation valide";
        wrong = ["Conclusion non vérifiable", "Exemple incorrect", "Confusion de notions"];
        explanationSeed = "On vérifie compréhension basique du phénomène.";
    }

    let quizOptions = rotateOptions(correct, wrong, idx);
    if (type === "vrai_faux") {
        const vfStatementTrue = idx % 2 === 0;
        baseQuestion = `${baseQuestion} : ${vfStatementTrue ? "Cette affirmation est correcte." : "Cette affirmation est incorrecte."}`;
        quizOptions = ["Vrai", "Faux"];
        correct = vfStatementTrue ? "Vrai" : "Faux";
    }

    const explanation = styles[idx % styles.length](explanationSeed);

    return {
        niveau: level,
        competence,
        difficulte: difficulty,
        type,
        question: baseQuestion,
        options: quizOptions,
        reponse_correcte: correct,
        explication: explanation,
        flashQuestion,
        flashAnswer,
        quizQuestion: baseQuestion,
        quizOptions,
        quizAnswer: correct
    };
}

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    console.log("RS-WORK: Initializing...");

    // Data Migration: StudyBoost -> RS-WORK
    ['theme', 'favorites', 'users', 'logged-in', 'current-user', 'payment-verified'].forEach(key => {
        const oldKey = `studyboost-${key}`;
        const newKey = `rswork-${key}`;
        if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, localStorage.getItem(oldKey));
        }
    });

    // 1. Auth & Payment Check
    let user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
    const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');

    // Sync current user with database to get updated payment status
    const dbUserIndex = users.findIndex(u => u.email === user.email);
    let dbUser = dbUserIndex > -1 ? users[dbUserIndex] : null;

    if (dbUser) {
        // Expiry Check (Monthly = 30 days)
        if (dbUser.plan === 'monthly' && dbUser.paidAt && user.email !== CONFIG.adminEmail) {
            const paidDate = new Date(dbUser.paidAt);
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now - paidDate) / (1000 * 60 * 60 * 24));

            if (diffDays > 30) {
                dbUser.isPaid = false;
                users[dbUserIndex] = dbUser;
                localStorage.setItem('rswork-users', JSON.stringify(users));
                localStorage.removeItem('rswork-payment-verified');
                console.warn("RS-WORK: Abonnement expiré !");
            }
        }

        user = { ...user, ...dbUser };
        localStorage.setItem('rswork-current-user', JSON.stringify(user));
        if (user.isPaid) localStorage.setItem('rswork-payment-verified', 'true');
        else localStorage.removeItem('rswork-payment-verified');
    }

    if (localStorage.getItem('rswork-logged-in') !== 'true' && user && user.email) {
        localStorage.setItem('rswork-logged-in', 'true');
    }
    if (localStorage.getItem('rswork-logged-in') !== 'true') {
        window.location.href = 'index ruthees.html';
        return;
    }

    const isAdmin = user.email === CONFIG.adminEmail;
    const isPaid = localStorage.getItem('rswork-payment-verified') === 'true';

    if (isAdmin || isPaid) {
        document.getElementById('payment-lock').classList.add('hidden');
    } else {
        document.getElementById('payment-lock').classList.remove('hidden');
    }

    if (isAdmin) {
        document.getElementById('admin-sidebar-link').classList.remove('hidden');
    }

    // 2. Initialize UI Components
    if (window.lucide) lucide.createIcons();
    setupTheme();
    setupNavigation();
    setupFilters();
    setupActionButtons();
    setupPayPal();
    setupUserProfile();
    showCookieBanner();

    // 3. Load Library
    const db = window.RS_DB || (typeof RS_DB !== 'undefined' ? RS_DB : null);
    if (db && db.chapters) {
        state.chapters = db.chapters;
        // Optimization: Removed global audit/enforce checks that caused massive login delay.
        // Audit/enforcement is now only done when a specific chapter is selected.
        renderLibrary();
    } else {
        console.error("RS-WORK: Database (db.js) not found. Check if the file is loaded correctly.");
    }
}

function setupTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    html.setAttribute('data-theme', localStorage.getItem('rswork-theme') || 'light');

    themeBtn.onclick = () => {
        const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('rswork-theme', next);
        if (window.lucide) lucide.createIcons();
    };
}

function setupUserProfile() {
    const user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
    if (!user.name) return;

    let expiryInfo = "";
    if (user.isPaid && user.paidAt && user.email !== "r.ruseenthiranruthees@gmail.com") {
        const paidDate = new Date(user.paidAt);
        const days = user.plan === 'monthly' ? 30 : 365;
        const expiryDate = new Date(paidDate.getTime() + (days * 24 * 60 * 60 * 1000));
        expiryInfo = `<div style="font-size:0.7rem; color:#ef4444; font-weight:700;">Finit le : ${expiryDate.toLocaleDateString('fr-FR')}</div>`;
    }

    const profile = document.querySelector('.user-profile');
    if (profile) {
        profile.innerHTML = `
            <button id="theme-toggle" class="theme-btn"><i data-lucide="sun"></i><i data-lucide="moon"></i></button>
            <div style="text-align: right; margin-right: 15px; display:flex; flex-direction:column; justify-content:center; min-width:0;">
                <div style="font-weight:700; font-size:0.85rem; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.name}</div>
                ${expiryInfo}
            </div>
            <button class="btn btn-outline btn-sm logout-btn">Déconnexion</button>
        `;

        // Re-setup theme toggle as we just nuclear-replaced the innerHTML
        setupTheme();

        // Re-setup logout
        profile.querySelector('.logout-btn').onclick = () => {
            localStorage.removeItem('rswork-logged-in');
            localStorage.removeItem('rswork-current-user');
            localStorage.removeItem('rswork-payment-verified');
            window.location.href = 'index ruthees.html';
        };

        if (window.lucide) lucide.createIcons();
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-link');
    const views = document.querySelectorAll('.view');

    links.forEach(link => {
        link.onclick = (e) => {
            if (link.style.pointerEvents === 'none') return;
            e.preventDefault();
            const target = link.dataset.view;
            showView(target);
        };
    });

    document.querySelectorAll('.back-to-lib').forEach(btn => {
        btn.onclick = () => showView('library');
    });

    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.onclick = () => {
            localStorage.removeItem('rswork-logged-in');
            localStorage.removeItem('rswork-current-user');
            localStorage.removeItem('rswork-payment-verified');
            window.location.href = 'index ruthees.html';
        };
    });

    // PayPal is now handled via setupPayPal() call in init()
}

function showCookieBanner() {
    if (localStorage.getItem('rswork-cookies-accepted')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.style = `
        position: fixed; bottom: 20px; left: 20px; right: 20px; 
        background: var(--bg-main); border: 1px solid var(--border); 
        padding: 20px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        z-index: 10000; display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 15px;
    `;
    banner.innerHTML = `
        <div style="flex: 1; min-width: 250px;">
            <div style="font-weight: 700; margin-bottom: 5px; color:var(--text-main);">🍪 Respect de votre vie privée</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
                RS-WORK utilise des cookies essentiels pour assurer le bon fonctionnement du site et de votre espace membre. 
                En continuant, vous acceptez notre <a href="mentions-legales.html" style="color: var(--primary);">politique de confidentialité</a>.
            </div>
        </div>
        <button id="accept-cookies" class="btn btn-primary" style="padding: 10px 25px; border-radius: 10px; border:none; background:var(--primary); color:white; cursor:pointer; font-weight:700;">Accepter</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('accept-cookies').onclick = () => {
        localStorage.setItem('rswork-cookies-accepted', 'true');
        banner.remove();
    };
}

function setupPayPal() {
    const container = document.getElementById('paypal-button-container');
    if (!container || !window.paypal) return;

    // Only render if not already rendered
    if (container.children.length > 0) return;

    paypal.Buttons({
        createOrder: function (data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: '9.99' // Prix de l'abonnement
                    },
                    description: 'Abonnement RS-WORK Premium'
                }]
            });
        },
        onApprove: function (data, actions) {
            return actions.order.capture().then(function (details) {
                // Payment success!
                localStorage.setItem('rswork-payment-verified', 'true');

                // Update specific user in users list
                const user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
                const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
                const idx = users.findIndex(u => u.email === user.email);
                if (idx > -1) {
                    users[idx].isPaid = true;
                    localStorage.setItem('rswork-users', JSON.stringify(users));
                }

                alert('Paiement réussi ! Bienvenue dans RS-WORK Premium, ' + details.payer.name.given_name + ' !');
                location.reload();
            });
        },
        onError: function (err) {
            console.error('PayPal Error:', err);
            alert('Une erreur est survenue lors du paiement. Veuillez réessayer.');
        }
    }).render('#paypal-button-container');
}

function showView(viewId) {
    const user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
    const isAdmin = user.email === CONFIG.adminEmail;
    const isPaid = localStorage.getItem('rswork-payment-verified') === 'true';

    // Protect content views
    if ((viewId === 'flashcards' || viewId === 'quiz') && !isAdmin && !isPaid) {
        document.getElementById('payment-lock').classList.remove('hidden');
        return;
    }

    const views = document.querySelectorAll('.view');
    const links = document.querySelectorAll('.sidebar-link');

    views.forEach(v => {
        v.id === `view-${viewId}` ? v.classList.remove('hidden') : v.classList.add('hidden');
    });

    links.forEach(l => {
        if (l.dataset.view === viewId) {
            l.classList.add('active');
        } else if (l.dataset.view !== 'progress') { // Keep active states clean
            l.classList.remove('active');
        }
    });

    if (viewId === 'admin') updateAdminStats();
    if (viewId === 'favorites') renderFavorites();
    if (window.lucide) lucide.createIcons();
}

function setupFilters() {
    document.getElementById('f-level').onchange = renderLibrary;
    document.getElementById('f-subject').onchange = renderLibrary;
}

function renderLibrary() {
    const grid = document.getElementById('lib-grid');
    const level = document.getElementById('f-level').value;
    const subject = document.getElementById('f-subject').value;

    const filtered = state.chapters
        .filter(c => {
            return (level === 'all' || c.level === level) && (subject === 'all' || c.subject === subject);
        })
        // Show newest chapters first so recently added content is immediately visible
        .sort((a, b) => b.id - a.id);

    const user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
    const isAdmin = user.email === CONFIG.adminEmail;
    const isPaid = localStorage.getItem('rswork-payment-verified') === 'true';

    grid.innerHTML = filtered.map(c => {
        const isFav = state.favorites.includes(c.id);
        const isLocked = !isAdmin && !isPaid;
        return `
        <div class="chapter-card" style="background:var(--bg-main); border:1px solid var(--border); border-radius:15px; padding:25px; transition:all 0.3s; cursor:pointer; position:relative; overflow:hidden; ${isLocked ? 'opacity:0.85' : ''}">
            ${isLocked ? '<div style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.1); color:#ef4444; padding:5px 12px; border-radius:12px; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:6px;"><i data-lucide="lock" style="width:14px; height:14px"></i> PREMIUM</div>' : ''}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
                <div style="display:flex; gap:8px">
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(0,74,173,0.1); color:var(--primary)">${c.level}</span>
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(99,102,241,0.1); color:#6366f1">${c.subject}</span>
                </div>
                <button onclick="event.stopPropagation(); toggleFavorite(${c.id})" class="fav-btn" style="background:none; border:none; cursor:pointer; color:${isFav ? '#f59e0b' : 'var(--text-muted)'}; padding:5px;">
                    <i data-lucide="star"></i>
                </button>
            </div>
            <div onclick="selectChapter(${c.id})">
                <h3 style="margin-bottom:10px">${c.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted)">${c.flashcards.length} Flashcards • ${c.quiz.length} Questions</p>
                ${isLocked ? '<div style="margin-top:10px; font-size:0.8rem; color:#ef4444; font-weight:700; display:flex; align-items:center; gap:5px;"><i data-lucide="shield-alert" style="width:14px; height:14px"></i> Paiement Requis</div>' : ''}
            </div>
        </div>
    `}).join('');

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted)">Aucun chapitre trouvé.</p>';
    }
}

window.selectChapter = async (id) => {
    const user = JSON.parse(localStorage.getItem('rswork-current-user') || '{}');
    const isAdmin = user.email === CONFIG.adminEmail;
    const isPaid = localStorage.getItem('rswork-payment-verified') === 'true';

    if (!isAdmin && !isPaid) {
        document.getElementById('payment-lock').classList.remove('hidden');
        return;
    }

    const chapter = state.chapters.find(c => c.id === id);
    if (!chapter) return;
    enforceMinimumContent(chapter);

    state.currentChapter = chapter;
    state.flashcards = chapter.flashcards;
    state.flashcardMarks = new Array(chapter.flashcards.length).fill(null);
    state.quiz = chapter.quiz;
    state.currentFlashcardIndex = 0;
    state.currentQuizIndex = 0;
    state.userAnswers = {};

    // Enable navigation links
    const enable = ['nav-flashcards', 'nav-quiz'];
    enable.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        }
    });

    document.getElementById('title-fc').textContent = chapter.title;
    document.getElementById('title-q').textContent = `Quiz : ${chapter.title}`;

    updateFlashcardUI();
    updateQuizUI();
    showView('flashcards');
};

function setupActionButtons() {
    // Flashcards
    document.getElementById('current-flashcard').onclick = () => {
        const inner = document.querySelector('.flashcard-inner');
        const currentRotation = inner.style.transform || 'rotateY(0deg)';
        inner.style.transform = currentRotation === 'rotateY(180deg)' ? 'rotateY(0deg)' : 'rotateY(180deg)';
    };

    document.getElementById('fc-prev').onclick = () => {
        if (state.currentFlashcardIndex > 0) {
            state.currentFlashcardIndex--;
            updateFlashcardUI();
        }
    };

    document.getElementById('fc-next').onclick = () => {
        if (state.currentFlashcardIndex < state.flashcards.length - 1) {
            state.currentFlashcardIndex++;
            updateFlashcardUI();
        }
    };

    document.getElementById('fc-mark-good').onclick = () => markFlashcardResult(true);
    document.getElementById('fc-mark-bad').onclick = () => markFlashcardResult(false);
    document.getElementById('fc-summary-reset').onclick = () => {
        state.flashcardMarks = new Array(state.flashcards.length).fill(null);
        state.currentFlashcardIndex = 0;
        updateFlashcardUI();
    };

    document.getElementById('quiz-restart-btn').onclick = () => {
        state.currentQuizIndex = 0;
        state.userAnswers = {};
        showQuizMainCard();
        updateQuizUI();
    };

    document.getElementById('quiz-back-lib-btn').onclick = () => {
        showView('library');
    };

}

function markFlashcardResult(isGood) {
    if (!state.flashcards.length) return;
    state.flashcardMarks[state.currentFlashcardIndex] = isGood;
    const isLast = state.currentFlashcardIndex >= state.flashcards.length - 1;
    if (!isLast) {
        state.currentFlashcardIndex++;
        updateFlashcardUI();
        return;
    }
    renderFlashcardSummary();
}

function updateFlashcardMarkButtons() {
    const v = state.flashcardMarks[state.currentFlashcardIndex];
    const goodBtn = document.getElementById('fc-mark-good');
    const badBtn = document.getElementById('fc-mark-bad');
    if (!goodBtn || !badBtn) return;
    goodBtn.classList.toggle('active', v === true);
    badBtn.classList.toggle('active', v === false);
}

function renderFlashcardSummary() {
    const summary = document.getElementById('fc-summary');
    const pie = document.getElementById('fc-pie');
    const center = document.getElementById('fc-pie-center');
    const text = document.getElementById('fc-summary-text');
    if (!summary || !pie || !center || !text) return;
    const total = state.flashcards.length || 0;
    const good = state.flashcardMarks.filter(v => v === true).length;
    const bad = total - good;
    const percent = total ? Math.round((good / total) * 100) : 0;
    pie.style.background = `conic-gradient(#22c55e 0 ${percent}%, #ef4444 ${percent}% 100%)`;
    center.textContent = `${percent}%`;
    text.textContent = `Note: ${good} / ${total} (${bad} faux)`;
    summary.classList.remove('hidden');
}

function toggleFlashcardSummary() {
    const summary = document.getElementById('fc-summary');
    if (!summary) return;
    const done = state.flashcardMarks.length > 0 && state.flashcardMarks.every(v => typeof v === 'boolean');
    if (done) {
        renderFlashcardSummary();
    } else {
        summary.classList.add('hidden');
    }
}



function updateFlashcardUI() {
    if (!state.flashcards.length) return;
    const card = state.flashcards[state.currentFlashcardIndex];
    document.getElementById('card-question').textContent = card.question;
    document.getElementById('card-answer').textContent = card.answer;
    document.getElementById('fc-count').textContent = `${state.currentFlashcardIndex + 1} / ${state.flashcards.length}`;

    // Reset card to front face when updating content
    const inner = document.querySelector('.flashcard-inner');
    if (inner) {
        inner.style.transform = 'rotateY(0deg)';
    }

    updateFlashcardMarkButtons();
    toggleFlashcardSummary();
}

function updateQuizUI() {
    if (!state.quiz.length) return;
    showQuizMainCard();
    const q = state.quiz[state.currentQuizIndex];
    document.querySelector('.quiz-question').textContent = q.question;
    const container = document.querySelector('.quiz-options');
    container.innerHTML = '';

    q.options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'option full-width' + (state.userAnswers[state.currentQuizIndex] === opt ? ' selected' : '');
        b.style.textAlign = 'left';
        b.style.padding = '15px';
        b.textContent = opt;
        b.onclick = () => {
            state.userAnswers[state.currentQuizIndex] = opt;
            updateQuizUI();
        };
        container.appendChild(b);
    });

    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.disabled = !state.userAnswers[state.currentQuizIndex];
    nextBtn.textContent = (state.currentQuizIndex === state.quiz.length - 1) ? "Terminer le Quiz" : "Question Suivante";
    document.getElementById('q-bar').style.width = `${((state.currentQuizIndex + 1) / state.quiz.length) * 100}%`;

    nextBtn.onclick = () => {
        if (state.currentQuizIndex < state.quiz.length - 1) {
            state.currentQuizIndex++;
            updateQuizUI();
        } else {
            renderQuizSummary();
        }
    };
}

function showQuizMainCard() {
    const main = document.getElementById('quiz-main-card');
    const summary = document.getElementById('quiz-summary');
    if (main) main.classList.remove('hidden');
    if (summary) summary.classList.add('hidden');
}

function renderQuizSummary() {
    const main = document.getElementById('quiz-main-card');
    const summary = document.getElementById('quiz-summary');
    const pie = document.getElementById('quiz-pie');
    const center = document.getElementById('quiz-pie-center');
    const text = document.getElementById('quiz-summary-text');
    const list = document.getElementById('quiz-correction-list');
    if (!main || !summary || !pie || !center || !text || !list) return;

    const total = state.quiz.length;
    const score = calculateScore();
    const percent = total ? Math.round((score / total) * 100) : 0;
    pie.style.background = `conic-gradient(#22c55e 0 ${percent}%, #ef4444 ${percent}% 100%)`;
    center.textContent = `${percent}%`;
    text.textContent = `Note: ${score} / ${total}`;

    list.innerHTML = state.quiz.map((q, i) => {
        const user = state.userAnswers[i];
        const good = user === q.answer;
        const status = good ? "Bon" : "Faux";
        const userText = typeof user === 'undefined' ? "Non répondu" : user;
        return `
            <div class="quiz-correction-item ${good ? 'good' : 'bad'}">
                <div class="quiz-correction-question">Q${i + 1}. ${q.question}</div>
                <div class="quiz-correction-line"><strong>Ta réponse:</strong> ${userText}</div>
                <div class="quiz-correction-line"><strong>Bonne réponse:</strong> ${q.answer}</div>
                <div class="quiz-correction-line"><strong>Statut:</strong> ${status}</div>
            </div>
        `;
    }).join('');

    main.classList.add('hidden');
    summary.classList.remove('hidden');
}

function calculateScore() {
    return state.quiz.reduce((score, q, i) => {
        return score + (state.userAnswers[i] === q.answer ? 1 : 0);
    }, 0);
}

window.toggleFavorite = (id) => {
    const idx = state.favorites.indexOf(id);
    if (idx > -1) {
        state.favorites.splice(idx, 1);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('rswork-favorites', JSON.stringify(state.favorites));
    renderLibrary();
    if (document.getElementById('view-favorites').classList.contains('hidden') === false) {
        renderFavorites();
    }
};

function renderFavorites() {
    const grid = document.getElementById('fav-grid');
    const filtered = state.chapters.filter(c => state.favorites.includes(c.id));

    grid.innerHTML = filtered.map(c => `
        <div class="chapter-card" style="background:var(--bg-main); border:1px solid var(--border); border-radius:15px; padding:25px; transition:all 0.3s; cursor:pointer; position:relative; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
                <div style="display:flex; gap:8px">
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(0,74,173,0.1); color:var(--primary)">${c.level}</span>
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(99,102,241,0.1); color:#6366f1">${c.subject}</span>
                </div>
                <button onclick="event.stopPropagation(); toggleFavorite(${c.id})" class="fav-btn" style="background:none; border:none; cursor:pointer; color:#f59e0b; padding:5px;">
                    <i data-lucide="star"></i>
                </button>
            </div>
            <div onclick="selectChapter(${c.id})">
                <h3 style="margin-bottom:10px">${c.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted)">${c.flashcards.length} Flashcards • ${c.quiz.length} Questions</p>
            </div>
        </div>
    `).join('');

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted)">Vous n\'avez aucun cours favori pour le moment.</p>';
    }
    if (window.lucide) lucide.createIcons();
}



function updateAdminStats() {


    const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
    const paidUsers = users.filter(u => u.isPaid && u.email !== "r.ruseenthiranruthees@gmail.com");

    const monthlyCount = paidUsers.filter(u => u.plan === 'monthly').length;
    const annualCount = paidUsers.filter(u => u.plan === 'annual').length;

    // Calculation: 5.99 per monthly, 50 per annual
    const totalRevenue = (monthlyCount * 5.99) + (annualCount * 50);

    document.getElementById('stats-total-users').textContent = users.length;
    document.getElementById('stats-monthly-plans').textContent = monthlyCount;
    document.getElementById('stats-annual-plans').textContent = annualCount;
    document.getElementById('stats-revenue').textContent = totalRevenue.toFixed(2) + "€";

    const list = document.getElementById('admin-user-list');
    if (list) {
        list.innerHTML = users.map(u => {
            let expiryStr = "Non payé";
            if (u.isPaid && u.paidAt) {
                const paidDate = new Date(u.paidAt);
                const days = u.plan === 'monthly' ? 30 : 365;
                const expiryDate = new Date(paidDate.getTime() + (days * 24 * 60 * 60 * 1000));
                expiryStr = `Fin : ${expiryDate.toLocaleDateString('fr-FR')}`;
            } else if (u.email === CONFIG.adminEmail) {
                expiryStr = "";
            }

            return `
            <div class="user-row" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:var(--bg-main); padding:15px; border-radius:12px; border:1px solid var(--border);">
                <div>
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main)">${u.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${u.email}${expiryStr ? ` • <span style="color:var(--primary)">${expiryStr}</span>` : ''}</div>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <button onclick="togglePayment('${u.email}')" class="btn btn-sm" style="background:${u.isPaid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color:${u.isPaid ? '#22c55e' : '#f59e0b'}; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:700;">
                        ${u.isPaid ? 'PAYÉ (Actif)' : 'NON PAYÉ (Locker)'}
                    </button>
                    ${u.email !== CONFIG.adminEmail ? `<button onclick="deleteUser('${u.email}')" class="btn btn-sm" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; padding:8px; border-radius:8px; cursor:pointer;"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>` : ''}
                </div>
            </div>
            `;
        }).join('');
    }
    if (window.lucide) lucide.createIcons();
}

window.togglePayment = (email) => {
    let users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
    const idx = users.findIndex(u => u.email === email);
    if (idx > -1) {
        users[idx].isPaid = !users[idx].isPaid;
        // set or reset payment date
        if (users[idx].isPaid) {
            users[idx].paidAt = new Date().toISOString();
        } else {
            delete users[idx].paidAt;
        }
        localStorage.setItem('rswork-users', JSON.stringify(users));
        updateAdminStats();
    }
};

window.deleteUser = (email) => {
    if (confirm(`Supprimer l'utilisateur ${email} ?`)) {
        let users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
        users = users.filter(u => u.email !== email);
        localStorage.setItem('rswork-users', JSON.stringify(users));
        updateAdminStats();
    }
};

// Custom CSS for animations and states
const style = document.createElement('style');
style.innerHTML = `
    .spin { animation: rotate 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .option.selected { background: var(--primary) !important; color: white !important; border-color: var(--primary) !important; }
    .hidden { display: none !important; }
    .chapter-card:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: var(--shadow-lg); }
    .badge { font-weight: 700; font-size: 0.8rem; }
`;
document.head.appendChild(style);

