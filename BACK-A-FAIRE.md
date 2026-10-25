# Changements du back à faire APRÈS la bascule

Pendant les phases 1 et 2, le back (Express + tRPC + base de données) ne change pas : le front Angular utilise les procédures existantes telles quelles.
Ce fichier liste les limites du back rencontrées pendant ces étapes. Chaque point sera traité **après la bascule (phase 3)**, une fois le changement approuvé.

Chaque entrée indique : l'étape où la limite a été trouvée, le problème, la procédure concernée et la correction proposée.

---

## 1. Tri côté serveur des tableaux de la console admin

- **Étape** : A-06.
- **Problème** : les listes de la console sont paginées par le serveur (20 lignes par page) et toujours triées par date de création décroissante. Un tri fait dans le navigateur ne porterait que sur les 20 lignes affichées, ce qui est trompeur. Il a donc été **retiré** du front Angular : les tableaux gardent les filtres, la recherche et la pagination serveur, sans tri par colonne.
- **Procédures concernées** (`back/server/routers.ts` → `back/server/adminConsole.ts`) :
  - `admin.clients` → `adminListClients` (tri fixe : `desc(users.createdAt)`) ;
  - `admin.vendors` → `adminListVendors` (tri fixe : `desc(shops.createdAt)`) ;
  - `admin.products` → `adminListProducts` (tri fixe : `desc(products.createdAt)`) ;
  - `admin.orders` → `adminListOrders` (tri fixe : `desc(orders.createdAt)`).
- **Correction proposée** :
  - ajouter au schéma d'entrée de chaque procédure deux champs facultatifs :
    `sort: z.enum([...colonnes autorisées]).optional()` et `dir: z.enum(["asc", "desc"]).optional()` ;
  - côté serveur, associer chaque valeur autorisée à une colonne Drizzle (liste fermée, jamais de nom de colonne venant directement du client) et l'utiliser dans `orderBy`, avec `id` en second critère pour un ordre stable d'une page à l'autre ;
  - colonnes proposées :
    - clients : nom, ville, nombre de commandes, total dépensé, date d'inscription ;
    - vendeurs : boutique, vendeur, nombre de produits, date de demande ;
    - produits : nom, vendeur, prix, stock, date de création ;
    - commandes : référence, client, ville, nombre d'articles, total ;
  - les colonnes calculées (nombre de commandes, total dépensé, nombre de produits) se trient sur l'expression SQL déjà présente dans la requête ;
  - sans `sort`, le comportement actuel est conservé (rien ne change pour le site React) ;
  - Angular : remettre un bouton de tri dans les en-têtes, avec `aria-sort`, et envoyer `sort` / `dir` dans les filtres de `serverList` (un changement de tri ramène à la page 1).
- **Tests à ajouter** : un test d'intégration par liste (ordre croissant / décroissant, stabilité entre deux pages, valeur de tri inconnue refusée par le schéma).

## 2. Nom de catégorie en double : erreur 500 au lieu de 400

- **Étape** : A-06.
- **Problème** : créer ou renommer une catégorie avec un nom déjà pris lève une `Error` JavaScript ordinaire. tRPC la transforme en `INTERNAL_SERVER_ERROR` (**HTTP 500**), comme une panne du serveur, alors que c'est une erreur de saisie. Le message est clair (« La catégorie « … » existe déjà ») et Angular l'affiche correctement, mais le code est faux : les journaux comptent une erreur serveur, et un client ne peut pas distinguer « nom pris » d'une vraie panne.
- **Procédures concernées** :
  - `admin.saveCategory` → `assertUniqueName` dans `back/server/adminConsole.ts` ;
  - même défaut pour les vendeurs : `vendor.proposeCategory` et `vendor.updateCategory` (`back/server/vendorCatalog.ts` : « existe déjà », « Vous avez déjà proposé cette catégorie », « déjà été proposée ») ;
  - à titre de comparaison, `admin.renameSiteCategory` (`back/server/shopCategories.ts`) utilise déjà le bon code : `TRPCError({ code: "CONFLICT" })`.
- **Correction proposée** : remplacer `throw new Error(...)` par `throw new TRPCError({ code: "CONFLICT", message: ... })` (HTTP 409) — ou `BAD_REQUEST` (HTTP 400) si l'on préfère un seul code pour toutes les erreurs de saisie. Les messages restent identiques ; les tests existants (`rejects.toThrow("existe déjà")`) continuent de passer. Aucun changement nécessaire dans Angular (le message est déjà affiché tel quel).
- **Tests à ajouter** : vérifier le code (`CONFLICT` / `BAD_REQUEST`) en plus du message dans `admin.console.integration.test.ts` et `vendor.catalog.integration.test.ts`.

## 3. Favoris : nom, image et prix enregistrés tels qu'envoyés par le navigateur

- **Étape** : A-08 (cœur favori des cartes produit).
- **Problème** : `account.toggleFavorite` reçoit `productName`, `imageUrl` et `priceTnd` du navigateur et les enregistre sans les relire en base. Conséquences :
  - un client peut enregistrer un nom ou un prix faux dans SA liste de favoris (affichée ensuite « 12 TND » dans son espace) ;
  - le prix d'un favori reste figé au jour de l'ajout, même si la boutique change son prix ou ajoute une promotion ;
  - un produit sans photo ne peut pas être mis en favori : `imageUrl` doit faire au moins 1 caractère, donc le serveur refuse avec une erreur de validation.
  
  Pas de risque pour les commandes (le prix d'une commande est toujours recalculé par le serveur) : seule la liste du client est concernée.
- **Procédures concernées** : `account.toggleFavorite` (`back/server/routers.ts`) → `toggleFavorite` (`back/server/db.ts`) ; affichage par `account.dashboard` (`favorites`).
- **Correction proposée** :
  - ne demander que `productSlug` (et éventuellement `productId`) ;
  - le serveur retrouve le produit publié et enregistre son nom, sa photo principale et son prix actuel, ou refuse avec « Produit introuvable » (NOT_FOUND) ;
  - mieux : ne plus stocker le prix, et le lire au moment d'afficher le tableau de bord (jointure sur `products`), pour qu'il soit toujours à jour.
- **Tests à ajouter** : favori d'un slug inconnu refusé ; nom et prix envoyés par le client ignorés ; produit sans photo accepté.
- **Même défaut (A-09)** : `account.toggleFollowShop` enregistre le `shopName` envoyé par le navigateur. Même correction : ne demander que `shopSlug`, relire le nom de la boutique active en base.

## 4. Messagerie : seuls les 100 PREMIERS messages d'une conversation sont renvoyés

- **Étape** : A-09 (messagerie client et vendeur).
- **Problème** : `getConversationMessages` trie les messages du plus ancien au plus récent puis coupe à 100 (`orderBy(messages.createdAt).limit(100)`). Dans une longue conversation, ce sont donc les messages les plus RÉCENTS qui disparaissent : la réponse qu'on vient d'envoyer n'apparaît plus. De plus, la liste des conversations lance une requête de comptage des non-lus par conversation (N + 1 requêtes, jusqu'à 51).
- **Procédures concernées** : `messages.get` → `getConversationMessages` ; `messages.list` → `getUserConversations` (`back/server/db.ts`).
- **Correction proposée** :
  - prendre les 100 derniers : `orderBy(desc(messages.createdAt)).limit(100)` puis inverser le tableau avant de le renvoyer ; éventuellement une pagination « messages plus anciens » (`before: id`) ;
  - compter les non-lus en une seule requête groupée (`GROUP BY conversationId`).
- **Tests à ajouter** : conversation de 120 messages → les 100 derniers sont renvoyés, dans l'ordre ; non-lus corrects pour plusieurs conversations.

## 5. Mot de passe : « Token invalide ou expiré » renvoyé en erreur 500

- **Étape** : A-09 (mot de passe oublié dans la page de connexion).
- **Problème** : `auth.resetPassword` lève une `Error` ordinaire si le token est faux ou expiré : tRPC répond HTTP 500 (panne du serveur) au lieu d'une erreur de saisie. Angular affiche bien le message, mais le code est faux (même défaut que le point 2).
- **Procédure concernée** : `auth.resetPassword` (`back/server/routers.ts`).
- **Correction proposée** : `throw new TRPCError({ code: "BAD_REQUEST", message: "Token invalide ou expiré" })`.
- **Test à ajouter** : token inconnu → code `BAD_REQUEST`.

## 6. Création de compte par l'admin : mot de passe en clair

- **Étape** : A-09 (page `/admin/comptes`).
- **Problème** :
  - `admin.createUser` renvoie le mot de passe en clair au navigateur (`plainPassword`), qui l'affiche, et l'envoie aussi en clair par e-mail (`sendWelcomeEmail`) ;
  - `admin.listUsers` renvoie TOUS les comptes en une fois, sans pagination ni recherche (la page devient lourde quand le nombre de comptes grandit).
- **Procédures concernées** : `admin.createUser`, `admin.listUsers` (`back/server/routers.ts`, `back/server/db.ts`).
- **Correction proposée** :
  - ne plus renvoyer ni envoyer de mot de passe : créer le compte sans mot de passe utilisable et envoyer un lien de définition du mot de passe à usage unique (le mécanisme du « mot de passe oublié » existe déjà) ;
  - paginer `listUsers` comme les autres listes de la console (`page`, `search`, compteurs par rôle).
- **Tests à ajouter** : la réponse de `createUser` ne contient aucun mot de passe ; `listUsers` paginé.
- **Constaté aussi** : sans SMTP configuré, `sendWelcomeEmail` écrit le mot de passe en clair dans les journaux du serveur (`[Email] SMTP non configuré — identifiants envoyés (log uniquement)`). À retirer en même temps.

## 7. Assistant Déco IA : erreur 500 quand le service d'IA n'est pas configuré

- **Étape** : A-09 (page `/assistant`).
- **Problème** : sans `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`, `invokeLLM` lève une erreur et `ai.chat` répond HTTP 500 à chaque message (c'est le cas en local et sur la base de test). Les deux fronts affichent un message de repli, mais le serveur signale une panne au lieu d'un service désactivé.
- **Procédure concernée** : `ai.chat` (`back/server/routers.ts`) → `invokeLLM` (`back/server/_core/llm.ts`).
- **Correction proposée** : vérifier la configuration avant l'appel et répondre `TRPCError({ code: "PRECONDITION_FAILED", message: "L'assistant n'est pas disponible pour le moment." })` ; éventuellement exposer un indicateur public (paramètres) pour masquer le lien « Assistant Déco IA » quand il est désactivé.
- **Test à ajouter** : sans clé → code `PRECONDITION_FAILED`, aucune requête réseau sortante.

## 8. Code serveur incompatible avec l'option TypeScript `noPropertyAccessFromIndexSignature` (trouvé en A-10)
- **Problème** : Angular lit le code du serveur pour connaître les types tRPC (`AppRouter`). Activer `noPropertyAccessFromIndexSignature` dans `front/tsconfig.json` produit 89 erreurs, toutes dans `../server` : `process.env.JWT_SECRET` au lieu de `process.env['JWT_SECRET']`, et des accès du même type sur des objets indexés. L'option reste donc désactivée côté Angular (aucun défaut de fonctionnement, c'est une règle de style plus stricte).
- **Fichiers concernés** : `back/server/db.ts` (50), `back/server/adminConsole.ts` (17), `back/server/_core/env.ts` (13), `back/server/_core/llm.ts` (7), `back/server/testDbGuard.ts` (1), `back/server/mediaStorage.ts` (1).
- **Correction proposée** (faible priorité) : écrire ces accès avec des crochets, ou mieux, lire les variables d'environnement une seule fois dans `env.ts` avec un schéma zod typé, puis activer l'option dans les deux `tsconfig`.
- **Vérification** : `npx tsc -p front/tsconfig.app.json --noEmit --noPropertyAccessFromIndexSignature` → 0 erreur.

## 9. Vidéos de l'accueil : aucune procédure dédiée, aucun choix éditorial (trouvé en A-10b)
- **Problème** : la vidéo d'un produit n'est renvoyée que par la fiche produit (`vendor.publicProduct`). Pour la section « Dans nos ateliers, en vidéo », Angular lit donc les fiches des **12 produits publiés les plus récents** (12 requêtes en parallèle, après l'affichage de la page) et garde les 5 premiers qui ont une vidéo envoyée (MP4 / WebM). Conséquences : requêtes inutiles quand peu de produits ont une vidéo, une vidéo plus ancienne n'apparaît jamais, et l'admin ne peut ni mettre en avant ni refuser une vidéo. Les limites actuelles d'envoi (`shared/productValidation.ts`) sont de 60 Mo, sans limite de durée et sans image de couverture dédiée (Angular utilise la photo principale du produit).
- **Procédure** : ajouter `catalog.homeVideos` (publique) : produits publiés de boutiques actives ayant un média `kind = 'video'`, non refusés, mis en avant d'abord puis les plus récents, limite 5 ; renvoie la carte produit, l'URL et le type de la vidéo, la durée et l'image de couverture.
- **Correction proposée** (migration additive, avec mysqldump avant) :
  - colonnes sur `media` : `featured` (booléen, défaut 0), `moderationStatus` (`pending` / `approved` / `rejected`, défaut `approved`), `durationSeconds` (entier, NULL), `posterMediaId` (NULL) ;
  - console admin : liste des vidéos avec « Mettre en avant » / « Refuser » ;
  - envoi vendeur : **30 s et 30 Mo au plus, MP4 ou WebM**, durée lue à l'envoi, image de couverture facultative (sinon la photo principale).
- **Angular ensuite** : remplacer `CatalogService.workshopVideos` par l'appel à `catalog.homeVideos` (un seul appel).

## 10. Newsletter : aucune procédure (trouvé en A-10b)
- **Problème** : l'accueil prévoit une inscription à la lettre d'information, mais le serveur n'a ni table ni procédure. Angular affiche le formulaire **désactivé** avec « Bientôt disponible » (aucune adresse n'est collectée).
- **Procédure** : `newsletter.subscribe` (publique, limitée en fréquence) : `{ email }` validé par zod, réponse identique que l'adresse soit déjà inscrite ou non ; lien de désinscription dans chaque envoi ; consentement explicite (case à cocher) conformément à la loi tunisienne n° 2004-63 sur les données personnelles.
- **Correction proposée** (migration additive) : table `newsletter_subscribers` (`id`, `email` unique, `status` `subscribed` / `unsubscribed`, `consentAt`, `unsubscribeToken`, `createdAt`), export CSV dans la console admin.
- **Angular ensuite** : activer le formulaire (champ e-mail + case de consentement), message de confirmation.

## 11. `lastSignedIn` réécrit à CHAQUE requête authentifiée (trouvé en A-10b)
- **Où** : `back/server/_core/sdk.ts`, fin de `authenticateRequest` (`db.upsertUser({ openId, lastSignedIn: signedInAt })`).
- **Problème** : chaque appel tRPC d'un compte connecté écrit dans `users` (`lastSignedIn` et `updatedAt`). La colonne indique donc « dernière activité », et non « dernière connexion ». Cela fait une écriture en base par requête (une page de la console admin en lance plusieurs). Effet observé : l'empreinte de la base réelle a changé pendant A-10b, uniquement à cause d'une requête faite avec la session admin sur le site réel (compte id 3, mot de passe inchangé). Les tests React, rejoués avec une empreinte avant / après, ne touchent pas la base réelle.
- **Correction proposée** : n'écrire `lastSignedIn` qu'à la connexion (`auth.login`), ou au plus une fois par heure (comparer avec la valeur lue juste avant). Si une « dernière activité » est utile, en faire une colonne séparée (`lastSeenAt`, migration additive).

## 12. Avis : deux lignes du MÊME produit dans une commande → un seul avis (trouvé en A-10c)
- **Où** : contrainte unique existante `reviews_user_order_product` (`userId`, `orderId`, `productSlug`).
- **Problème** : A-10c donne un avis par LIGNE (`orderItemId`, index unique). Mais l'ancienne contrainte empêche encore un 2ᵉ avis quand la même commande contient deux lignes du même produit (deux tailles d'une enseigne, par exemple). La supprimer n'est pas un ajout : elle a été gardée (accord du 2026-10-20).
- **Correction proposée** (après la bascule, quand `reviews.submit` du site React n'existera plus) : `ALTER TABLE reviews DROP INDEX reviews_user_order_product` ; l'unicité par ligne (`reviews_order_item_unique`) suffit.

## 13. Ancienne procédure `reviews.submit` (site React) : avis sans critères, sans ligne, sans photo
- **Problème** : React utilise toujours `reviews.submit` (une note, un texte). Ces avis n'ont ni les 3 critères, ni la variante, ni le nom figé, ni de photos. Ils comptent dans la moyenne générale mais pas dans les moyennes des critères (calculées sur les avis qui les ont). Le site React n'affiche pas non plus les photos, les critères ni les réponses des ateliers.
- **Correction proposée** (à la bascule) : retirer `reviews.submit` et `reviews.list` ; garder `reviews.submitForLine` et `reviews.page`.

## 14. Photos d'avis : pas de miniature
- **Problème** : une photo de 8 Mo au plus est servie telle quelle, même pour une miniature de 60 ou 76 px (fiche produit). Sur téléphone, cela pèse lourd.
- **Correction proposée** : à l'envoi, créer une miniature (≈ 320 px, WebP) et une version moyenne (≈ 1600 px) avec une bibliothèque d'images côté serveur (à approuver) ; colonnes additives `thumbKey`, `mediumKey` dans `review_photos`.

## 15. Suppression d'un avis par l'admin : fichiers des photos laissés sur le disque
- **Où** : `adminDeleteReview` (`back/server/adminConsole.ts`) supprime la ligne `reviews` ; la clé étrangère supprime les lignes `review_photos` (`ON DELETE CASCADE`) mais pas les fichiers.
- **Correction proposée** : dans `adminDeleteReview`, lire les `storageKey` des photos, supprimer la ligne, puis `deleteStoredFile` pour chacune (même ordre que `cleanupPendingReviewPhotos`). En attendant, « Masquer » (statut `rejected`) est l'action à utiliser.

## 16. Sans serveur d'e-mail, des secrets sont écrits dans le journal du serveur (trouvé avec le vrai site local)
- **Où** : `back/server/email.ts` — `sendPasswordResetEmail` écrit le **code de réinitialisation**, `sendWelcomeEmail` écrit le **mot de passe** du compte créé par l'admin (voir aussi n° 6), quand SMTP n'est pas configuré.
- **Contournement actuel** : le superviseur du vrai site (`site-local/superviseur.mjs`) détourne ces lignes vers `site-local/journaux/prive/codes-mot-de-passe.txt` (exclu de git) et les masque dans le journal normal.
- **Correction proposée** : en production (`NODE_ENV=production`), ne jamais écrire ces valeurs ; refuser l'envoi (« e-mail non configuré ») ou exiger SMTP. Configurer SMTP avant la mise en ligne.

## 17. Le serveur écoute sur toutes les adresses du PC
- **Où** : `back/server/_core/index.ts` (`server.listen(port)` sans adresse).
- **Problème** : le back (3100 pour le vrai site, 3000 en développement) est joignable par les autres appareils du réseau si le pare-feu le laisse passer. Aujourd'hui, seul le pare-feu (`site-local/configurer-pare-feu.ps1`) le bloque.
- **Correction proposée** : variable `HOST` (défaut `127.0.0.1`) passée à `server.listen(port, host)` ; en production derrière Nginx, `127.0.0.1` aussi.

## 19. Photos envoyées en taille réelle : premier frein à la vitesse sur téléphone (mesuré en A-11)
- **Problème** : une photo produit fait souvent 1 à 2,3 Mo (JPG original). Elle est envoyée telle quelle, même pour une miniature de 76 px ou une carte de 180 px. Lighthouse (téléphone) chiffre le gain possible à **~7,5 s** (« images adaptées à la taille ») + **~5,3 s** (« formats modernes ») sur la fiche produit et l'accueil. C'est la raison pour laquelle l'accueil (68) et la fiche produit (71) n'atteignent pas 90 : côté Angular, tout le reste est fait (voir EXPLICATIONS, A-11).
- **Correction proposée** (regroupe le n° 14, photos d'avis) : à l'envoi, générer 3 versions WebP (≈ 320, 800 et 1600 px) avec une bibliothèque d'images côté serveur (`sharp`, licence Apache-2.0, à approuver) ; colonnes additives (`variantsJson`) dans `media` et `review_photos` ; procédure de rattrapage pour les photos existantes. Angular : un « loader » `NgOptimizedImage` qui choisit la bonne version (`srcset` + `sizes`), ce qui est prévu pour fonctionner sans autre changement des composants.

## 20. `@trpc/server` 11.6.0 : alerte de sécurité « élevée » (trouvée en A-11)
- **Problème** : `npm audit` signale GHSA-43p4-m455-4f4j (pollution de prototype) pour `@trpc/server` < 11.8.0. La faille concerne `experimental_nextAppDirCaller`, propre à Next.js, que le projet n'utilise pas : a priori pas exploitable ici, mais la dépendance reste vulnérable.
- **Correction proposée** : passer `@trpc/server` et `@trpc/client` à la même version ≥ 11.8.0 (11.19.0 disponible, sans changement majeur) dans le serveur et dans `front`, puis relancer tous les tests.

## 18. Pas de page « Changer mon mot de passe »
- **Problème** : un utilisateur connecté ne peut changer son mot de passe qu'en passant par « Mot de passe oublié » (code par e-mail, ou dans le journal sans SMTP).
- **Correction proposée** : procédure `auth.changePassword` (mot de passe actuel + nouveau, mêmes règles zod, limitée en fréquence) et un formulaire dans l'espace client / vendeur / admin.

## 21. Stories des ateliers : pas de procédure « stories » (trouvé en A-10e)
- **Aujourd'hui (Angular)** : les stories sont construites avec ce qui existe : les créations les plus récentes de chaque atelier (`catalog.list`, trié par date), 3 au plus, montrées par leur vidéo (`vendor.publicProduct`, déjà lu pour « En vidéo ») ou leur photo principale.
- **Limites** : `catalog.list` ne donne ni la date de publication (impossible de garder seulement les 24 à 72 dernières heures) ni les autres photos d'une création ; un atelier sans création récente dans les 200 dernières n'a pas de story.
- **Correction proposée** : procédure publique `catalog.stories` : pour chaque boutique active, ses médias (photos et vidéos) des produits publiés depuis 72 h au plus (paramètre 24-72), avec `createdAt`, le produit (nom, slug, prix payé calculé par le serveur), 3 médias par atelier au plus.

## 22. Filtres : atelier, couleur, néon et gouvernorat non filtrables sur le catalogue (trouvé en A-10e)
- **Aujourd'hui** : `catalog.list` filtre par recherche, catégorie, prix, sur mesure et promotions ; `catalog.categoryPage` ajoute les ateliers. Le panneau de filtres du téléphone ne propose QUE ces filtres-là.
- **Manquent** : atelier sur le catalogue général ; couleur (les couleurs sont dans `products.variants`, texte libre du vendeur) ; néon (aucun lien entre un produit et l'offre néon de l'atelier) ; gouvernorat de livraison (aucune zone de livraison par boutique en base).
- **Aussi** : `catalog.list` s'arrête aux 200 produits les plus récents (`getCatalogProducts`, `limit(200)`) : « Voir N résultats » est exact dans cette limite seulement.
- **Correction proposée** : paramètres `shops[]`, `colors[]` (liste de couleurs normalisées choisies par le vendeur), `neon`, `governorate` (colonne additive : gouvernorats livrés par boutique, liste de `shared/tunisia.ts`) ; une procédure `catalog.count` (même filtres, renvoie un nombre) et une vraie pagination.

## 23. Recherche : pas de « Tendances » réelles (trouvé en A-10e)
- **Aujourd'hui** : aucune recherche n'est enregistrée côté serveur : la section « Tendances » de l'écran de recherche est cachée (aucune donnée inventée).
- **Correction proposée** : table additive `search_stats` (texte normalisé, nombre, semaine), alimentée par `catalog.list` quand `search` est fourni (sans compte ni adresse IP), et procédure `catalog.trending` (10 recherches les plus fréquentes des 7 derniers jours, au moins 3 occurrences, filtre des mots interdits).

## 24. « Vus récemment » : pas de lecture de plusieurs produits par identifiant (trouvé en A-10e)
- **Aujourd'hui** : les produits vus sont retrouvés dans la liste déjà chargée (`catalog.list`) ; ceux qui n'y sont pas sont relus un par un (`vendor.publicProduct`, par slug), ce qui fait jusqu'à 10 requêtes.
- **Correction proposée** : procédure publique `catalog.cards({ ids })` (20 au plus) qui renvoie les cartes des produits encore publiés par une boutique active, dans l'ordre demandé.

## 25. Mise en ligne (Nginx) : `theme-sombre.css` doit être revalidé à chaque visite (trouvé en A-10e)
- **Pourquoi** : les fichiers du build ont une empreinte dans leur nom (`main-HASH.js`) et peuvent être gardés un an (`immutable`). `theme-sombre.css` (couleurs du mode sombre, chargé seulement en sombre par `index.html`) n'en a pas, comme `index.html` : gardé un an, une ancienne version resterait après une mise à jour.
- **Déjà fait** : le serveur du vrai site local (`site-local/serveur-site.mjs`) et le proxy de la démo envoient `Cache-Control: no-cache` pour ce fichier.
- **À faire à la mise en ligne** : même règle dans Nginx, par exemple :
  `location = /theme-sombre.css { add_header Cache-Control "no-cache"; }` (à côté de la règle de `index.html`), et l'ajouter à la liste des fichiers mis en cache par la PWA (A-15).

## 26. Pas de demande de devis « sur mesure » générale (trouvé en A-10g)
- **Aujourd'hui** : la seule demande de devis existante est celle du néon (`neon.requestQuote` : envoyer son logo à un atelier néon). Il n'existe pas de demande de devis pour une création sur mesure quelconque (dimensions, matériau, photo d'inspiration).
- **Conséquence** : la carte « Demander un devis sur mesure » de la section « Services » de l'accueil n'est pas affichée (seule « Créer mon néon » l'est).
- **Correction proposée** : procédure `quotes.request` (client connecté : atelier choisi ou « tous les ateliers », description, dimensions, photo facultative, téléphone) avec une table additive `custom_quotes` et un onglet « Devis » dans l'espace vendeur, sur le modèle des devis néon.

## 27. La liste du catalogue ne donne pas le stock (trouvé en A-10g)
- **Aujourd'hui** : `catalog.list` renvoie `availability` (déclarée par le vendeur) mais pas `stock`. La carte « Pour vous » ne peut donc pas afficher « En stock » avec la règle demandée (« seulement si le stock est connu et > 0 ») : ce badge n'est pas affiché.
- **Correction proposée** : ajouter `stock` (nombre, ou null si non suivi) aux cartes de `catalog.list` et de `catalog.categoryPage` (lecture seule, aucune migration).

---

# Site React : bugs connus (à NE PAS corriger, le site React sera remplacé)

Ces défauts du site React ont été trouvés pendant les étapes Angular. Angular fait déjà mieux ; ils sont notés pour mémoire et pour la recette de la bascule (phase 3).

## R1. Page 404 en anglais et hors charte
- **Où** : `front-react/src/pages/NotFound.tsx` (route finale du `Switch` dans `App.tsx`).
- **Problème** : page générique du modèle de départ (« Page Not Found », « Go Home », couleurs bleues et grises), sans l'en-tête ni le pied du site.
- **Angular** : `pages/info/not-found.page.ts`, en français, aux couleurs du site, avec l'en-tête et le pied (A-08).

## R2. `/suivre-commande` affiche la page Aide
- **Où** : `front-react/src/pages/InfoPage.tsx`.
- **Problème** : la page lit le segment d'adresse (`suivre-commande`) et cherche cette clé dans son contenu, où le texte s'appelle `suivi` ; la clé n'existant pas, elle affiche la page Aide.
- **Angular** : la donnée de route `page: 'suivi'` affiche « Suivre ma commande » (A-08).

## R3. Pages d'information avec un ancien en-tête
- **Où** : `InfoPage.tsx`, `VendorTerms.tsx`, `Assistant.tsx`.
- **Problème** : ces pages ont leur propre en-tête simplifié (« Elegance. », « DECORATION MARKETPLACE »), différent de l'en-tête du site, et pas de pied de page.
- **Angular** : en-tête et pied du site partout (A-08, A-09).

## R4. Messagerie vendeur : les bulles sont du mauvais côté
- **Où** : `front-react/src/pages/Messages.tsx` (`MessagesPanel`).
- **Problème** : un message est aligné à droite s'il vient du CLIENT, même quand c'est le vendeur qui lit : dans l'espace vendeur, ses propres messages sont à gauche et ceux du client à droite.
- **Angular** : mes messages sont toujours à droite (`senderId` comparé au compte connecté).

## R5. Assistant Déco IA : panne après 6 échanges
- **Où** : `front-react/src/pages/Assistant.tsx`.
- **Problème** : toute la conversation est envoyée à chaque message, alors que le serveur accepte 12 messages au plus : à partir du 7ᵉ échange, chaque envoi échoue (« Je rencontre un souci temporaire… »).
- **Angular** : le message système et les 11 messages les plus récents sont envoyés.

## R6. Paramètres du vendeur : un champ vide bloque l'enregistrement
- **Où** : `front-react/src/pages/vendor/sections.tsx` (`VendorSettings`).
- **Problème** : tous les champs du formulaire sont envoyés au schéma, y compris vides ; un champ facultatif laissé vide (ville, adresse…) est refusé (« La ville est requise »).
- **Angular** : seuls les champs renseignés sont vérifiés et envoyés.
