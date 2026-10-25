# PLAN ANGULAR — Elegance Deco

## Décision
Le front Angular (`front/`) devient, à terme, LE site principal.
Le site React (`front-react/`) reste en service et INCHANGÉ jusqu'à la bascule (phase 3).
Après la bascule, toutes les nouvelles fonctionnalités (dont ROADMAP-PRO.md) se font UNIQUEMENT en Angular.

---

## RÈGLES (toutes les étapes)
1. Une étape à la fois. À la fin : arrête-toi et attends mon OK.
2. Branche `angular-fac`. Commit à la fin de chaque étape.
3. Phases 1 et 2 : aucun fichier modifié en dehors de `front/`. Preuve à chaque étape : `git status` + `git diff --stat redesign-et-neon..angular-fac`.
4. Le back (`back/server/`), la base, les procédures tRPC et le site React ne changent pas. Si une fonctionnalité Angular est impossible sans toucher au back : explique pourquoi et attends mon accord.
5. Toute vérification qui écrit en base (comptes, commandes, produits, offres) se fait sur la BASE DE TEST. Base réelle : comptages + sommes de contrôle identiques avant/après.
6. Le prix final vient toujours du serveur. Les fonctions partagées (`shared/`) sont importées, jamais recopiées.
7. Même design que le site React (ordinateur + téléphone), mêmes textes, mêmes règles d'accessibilité (zones ≥ 44 px, aria-label, prefers-reduced-motion).
8. Nouvelle bibliothèque : demande avant (nom, version, licence, raison), installée uniquement dans `front/`.
9. `front/EXPLICATIONS.md` mis à jour à chaque étape : ce qui a été fait, pourquoi, notions Angular avec exemples du code, 5 questions de prof + réponses.
10. Fin de chaque étape : tests + build du site React, build Angular, captures ordinateur + téléphone, commit.

---

## PHASE 1 — Angular fait tout ce que fait le site React

### A-03 — Panier, commande, espace client
Panier (prix fixe, sur mesure, néon) persistant au rechargement, service panier avec signals/computed.
Commande : formulaire réactif (téléphone tunisien 8 chiffres, adresse, gouvernorat).
Espace client : mes commandes, détail, statut, profil.
Notions : authGuard + guestGuard (retour à la page demandée après connexion), interceptor HTTP (appels tRPC via HttpClient : chargement global + 401 → reconnexion).

### A-04 — Espace vendeur (1/2)
Tableau de bord, mes produits (liste, ajout, modification, suppression, stock), médias produits, prix fixe et sur mesure (m² / mètre linéaire, options), catégories partagées (sélecteur avec "Vouliez-vous dire…").
Notions : formulaires réactifs complexes (FormArray pour les options), upload de fichiers, lazy loading de l'espace vendeur.

### A-05 — Espace vendeur (2/2)
Ma boutique (infos, Facebook/Instagram), logo + couverture avec recadrage (même comportement que le site React), commandes du vendeur et mise à jour des statuts, offre néon (avec encadré de visibilité), demandes de devis, nom de la boutique toujours affiché.
Notions : composant de recadrage réutilisable, guard vendeur (approuvé / en attente).

### A-06 — Administration
Tableau de bord, clients, vendeurs (approuver / refuser avec motif / suspendre), produits (valider / refuser), catégories du site (masquer, renommer, fusionner), commandes, demandes de devis, paramètres (dont configurateur néon et bannière).
Notions : adminGuard, lazy loading de l'espace admin, tableaux avec tri / filtres / pagination.

### A-07 — Configurateur néon
Cartes ateliers sur la catégorie LED Néon, `/neon`, `/neon/:slug` verrouillé sur l'atelier, aperçu lumineux en direct, latin + arabe (RTL, polices dédiées), prix animé, ajout au panier, devis avec logo.

### A-08 — Animations, téléphone, finitions
Les 6 animations du site React, barre du bas sur téléphone, panneau catégories, pages légales / infos, page 404, tous les états vides.

### A-09 — Vérification de parité
Tableau comparatif page par page React ↔ Angular (ordinateur + téléphone) : tout ce qui manque ou diffère est listé puis corrigé.

---

## PHASE 2 — Angular "très pro"

### A-10 — Architecture et qualité
Structure `core/` (services, guards, interceptors), `shared/` (composants, pipes), `features/` (public, client, vendeur, admin, néon).
Lazy loading par espace, `ChangeDetectionStrategy.OnPush` partout, TypeScript strict, ESLint (Angular ESLint), aucune erreur ni avertissement.

### A-10b — Refonte de l'accueil "Marketplace" (ordinateur + téléphone)
Organisation inspirée des grandes marketplaces, avec NOTRE identité (couleurs, polices, textes), sans aucun élément de marque d'un autre site. Aucune donnée inventée : section vide = cachée. Animations existantes conservées.
1. En-tête : logo, bouton "Catégories" (panneau), grande barre de recherche centrale (bordure foncée, bouton loupe couleur accent), "Se connecter" ou menu du compte, favoris, panier avec pastille ; dessous, liens des catégories principales.
2. Bande beige : titre "Trouvez la pièce qui manque à votre intérieur." + 6 catégories en cercles (les plus fournies).
3. "Dans nos ateliers, en vidéo" : grille 1 grande + 4 petites de vidéos courtes des produits. Source : vidéos déjà dans les médias produits ; si le back ne permet pas de choisir lesquelles, prends les plus récentes de produits publiés et note dans BACK-A-FAIRE.md (réglage admin mise en avant/refus, 30 s, 30 Mo, MP4/WebM, image de couverture). Lecture muette en boucle, playsinline, seulement quand visible (IntersectionObserver), pause sinon ; preload="none" + image de couverture ; pas de lecture auto si "réduire les animations" (bouton ▶). Sur chaque vidéo : durée, logo + nom de la boutique, prix, cœur. Clic → fiche produit.
4. "Nouveautés de nos ateliers" : 5 cartes par ligne ; note ★ seulement s'il y a des avis réels.
5. "Des idées pour chaque espace" : Salon, Chambre, Café & restaurant, Salon de coiffure, Hôtel, Bureau → recherche filtrée.
6. Bannière néon sombre (si un atelier propose le néon).
7. "Ateliers à découvrir" : mosaïque des 4 premières photos de la boutique + logo + note + ville + nombre de créations.
8. "Qu'est-ce qu'Elegance Deco ?" en 3 colonnes (communauté d'ateliers vérifiés, paiement à la livraison, sur mesure/néon/devis) + bouton "Consulter l'aide".
9. Newsletter (si aucune procédure : formulaire désactivé "Bientôt disponible" + note BACK-A-FAIRE.md) + pied de page.
Téléphone : en-tête compact (menu, logo, favoris, panier), recherche pleine largeur, cercles et espaces en défilement horizontal, vidéos 1 grande + 2×2, produits en 2 colonnes, ateliers en cartes qui défilent, barre du bas conservée.
Fin : captures ordinateur + téléphone, EXPLICATIONS.md, règles habituelles, commit, puis arrête-toi.

### A-10c — Avis clients avec photos (fiche produit), version COMPACTE
EXCEPTION à la règle 4 pour cette étape seulement : back modifiable uniquement de façon ADDITIVE (nouvelles colonnes/tables/procédures). Le site React doit continuer à fonctionner (tests React + build). mysqldump avant migration ; schéma + SQL montrés et validés par moi AVANT application.
1. D'abord : montre-moi ce qui existe (table reviews, procédures, affichage React), puis le schéma + SQL proposés, et attends mon accord.
2. Règles de confiance (serveur) : avis seulement pour une ligne de commande "livrée", par le client de cette commande, une fois par ligne ; badge "Achat vérifié" + variante achetée (mesures, couleur, texte néon) copiée de la ligne de commande ; jusqu'à 3 photos par avis (même validation que les photos produits) ; modération admin (masquer un avis ou une photo) ; le vendeur répond une fois, publiquement, sans pouvoir modifier ni supprimer l'avis ; "Utile" = un vote par compte ; "Signaler" visible dans l'admin ; aucun avis inventé ou importé.
3. Notes : note globale + 3 critères (Qualité, Conforme à la photo, Livraison) ; moyenne et répartition 5→1 calculées par le serveur ; avis masqués exclus.
4. Fiche produit — maquette :
   - près du prix : ★ note + "(N avis)" cliquable vers la section, et un encadré de confiance (paiement à la livraison, avis d'acheteurs vérifiés, livraison estimée).
   - section "Avis des clients" COMPACTE : titre 24 px ; onglets "Ce produit (N)" / "Tout l'atelier (N)" ; à gauche une colonne ≤ 280 px avec la note 36 px, les étoiles, "N avis d'acheteurs vérifiés", les barres 5★→1★ et les 3 critères ; à droite "Photos des clients — Comment la pièce est arrivée chez eux" (miniatures 76 px, visionneuse plein écran, clavier + Échap), filtres en pastilles (Avec photos, 5 étoiles, Sur mesure) + tri (récents, utiles, note haute, note basse), puis les cartes d'avis serrées : initiale, prénom + initiale du nom, gouvernorat, date, badge vert "Achat vérifié", étoiles, "Acheté : 80 × 150 cm · Doré", texte 14 px, photos 60 px, notes des 3 critères, réponse de l'atelier (encadré avec bordure gauche couleur accent), boutons "Utile (N)" et "Signaler", puis "Voir plus d'avis".
   - téléphone : résumé au-dessus, photos en défilement horizontal.
5. Espace client : "Donner mon avis" sur chaque commande livrée. Espace vendeur : ses avis + réponse. Admin : modération (avis, photos, signalements).
6. Tests (base de test) : avis refusé si non livré ou déjà donné, photos validées, moyenne correcte, avis masqué exclu, vendeur ne répond qu'à ses avis et une seule fois.
Fin : captures ordinateur + téléphone, EXPLICATIONS.md, BACK-A-FAIRE.md, règles habituelles, commit, puis arrête-toi.

### A-10d — Version téléphone "façon application" (accueil + fiche produit)
Mêmes RÈGLES que ce plan : branche angular-fac, rien en dehors de front/, back figé, base de test pour toute vérification qui écrit, EXPLICATIONS.md à jour avec 5 questions de prof. Aucune donnée inventée : section sans données = cachée. Aucune nouvelle bibliothèque sans accord. Ne pas casser les gains de A-11 (NgOptimizedImage, @defer, pas de décalage de mise en page).
Ne concerne QUE le téléphone (largeur < 768 px). L'ordinateur ne change pas : le montrer par des captures avant/après.
Couleurs et polices actuelles : fond #FAF8F4, texte #2A2420, gris #6B625B, accent #A8693F, beige #F1E6DA, bordures #E6DDD2, Playfair Display + DM Sans.
ACCUEIL (téléphone)
1. En-tête collant, fond légèrement transparent avec flou (backdrop-filter) : logo "Elegance Deco" à gauche, favoris + panier (pastille) à droite. Dessous, barre de recherche arrondie pleine largeur (46 px, ombre douce).
2. Rangée de cercles des ateliers en défilement horizontal (logo ou initiales + nom). Pour l'instant, clic = page de l'atelier (les stories plein écran viendront en A-10e).
3. Carte néon sombre arrondie (seulement si un atelier propose le néon) : texte néon lumineux qui "respire" doucement, titre "Votre texte, en lumière", bouton "Créer".
4. Puces de catégories en défilement horizontal ; la puce choisie se remplit en foncé avec une transition douce ; filtre la section "Pour vous".
5. "En vidéo" : vidéos verticales 9:16 (132 × 220 px) en défilement horizontal avec scroll-snap, durée, nom de l'atelier, prix. Mêmes règles vidéo que A-10b (muettes, en boucle, playsinline, seulement visibles, preload="none", rien d'automatique si "réduire les animations"). Cachée s'il n'y a pas de vidéo.
6. "Pour vous" : 2 colonnes, cartes aux coins très arrondis (20 px), hauteurs d'image alternées (4/5 et 1/1, place réservée pour éviter tout décalage), cœur favori avec petite animation "pop", badges (Sur mesure, Néon, promo) seulement si vrais, nom, prix, note seulement si de vrais avis existent. Apparition progressive des cartes au défilement.
7. Barre du bas flottante : sombre, arrondie (66 px, marges 14 px), 4 onglets (Accueil, Catégories, Favoris, Compte) ; une pastille couleur accent glisse sous l'onglet actif (transform translateX). Réserve l'espace en bas des pages (env. 110 px) + safe-area (env(safe-area-inset-bottom)).
FICHE PRODUIT (téléphone)
8. Arrivée depuis la droite (animation de route) et retour vers la gauche.
9. Photo pleine largeur 4/5 en haut, boutons ronds blancs posés dessus : retour, partager (navigator.share si disponible, sinon copier le lien), favori. Points de la galerie en bas de la photo : le point actif s'allonge.
10. Le contenu remonte sur la photo avec des coins arrondis (26 px) : atelier (logo, nom, "Atelier vérifié" seulement si vrai), note, nom du produit, choix de variantes en puces (pastille couleur + nom), encadré livraison / paiement à la livraison, sections "Détails" et "Livraison et retours" en accordéon animé (grid-template-rows 0fr → 1fr), avis compacts de A-10c (photos en défilement horizontal).
11. Barre fixe en bas : "Total [prix du serveur] DT" + gros bouton "Ajouter au panier" (54 px). La barre du bas de navigation est cachée sur cette page. Pas d'animation d'ajout au panier.
POUR TOUT : zones cliquables ≥ 44 px, aria-label, aria-pressed (favoris, variantes), aria-expanded (accordéons), aria-current (onglet actif), focus visible ; prefers-reduced-motion : toutes les animations et transitions désactivées ; petits effets d'appui (scale 0.96) sur les cartes et boutons.
Fin : tests + build React, build Angular, ESLint sans erreur, Lighthouse téléphone accueil + fiche produit (ne doit pas baisser par rapport à A-11), captures téléphone de chaque partie + captures ordinateur prouvant que rien n'a changé, EXPLICATIONS.md, commit, git status + git diff --stat, puis arrête-toi.

### A-10e — Fonctions "application" sur téléphone
Mêmes RÈGLES que ce plan (branche angular-fac, rien en dehors de front/, back figé, base de test pour toute vérification qui écrit, EXPLICATIONS.md à jour avec 5 questions de prof). Aucune donnée inventée : une section sans données est cachée. Chaque animation est désactivée si prefers-reduced-motion. Zones cliquables ≥ 44 px, aria-label partout. Lighthouse téléphone ne doit pas baisser par rapport à A-10d. Aucun seuil (budgets…) relevé sans accord.
Si une fonction est impossible sans toucher au back : ne pas modifier le back, faire la version possible côté Angular et ajouter le besoin dans front/BACK-A-FAIRE.md.
1. Stories des ateliers (accueil, en haut) : un cercle par atelier ayant publié récemment (photos/vidéos réelles des produits publiés les plus récents, 3 max par atelier) ; contour accent si non vu, beige si vu (localStorage). Visionneuse plein écran : barres de progression (4 s par photo, durée réelle d'une vidéo muette), toucher à droite = suivant, à gauche = précédent, glisser vers le bas ou ✕ = fermer, Échap ; passe à l'atelier suivant. En bas : nom du produit, prix du serveur, "Voir le produit". Reduced motion : pas d'avancement automatique, boutons Précédent/Suivant visibles. Si le back ne permet pas de lister ces médias simplement : BACK-A-FAIRE (procédure "stories", derniers médias par atelier, 24 à 72 h).
2. Bouton WhatsApp sur la fiche : "Une question sur ce produit ? — Écrire à l'atelier sur WhatsApp", lien https://wa.me/216XXXXXXXX?text=… (message pré-rempli encodé : "Bonjour, j'ai une question sur « [nom] » vu sur Elegance Deco : [lien]"). Seulement si l'atelier a un numéro ; sinon caché (+ BACK-A-FAIRE si le champ n'existe pas). Aucune API payante.
3. Filtres en panneau du bas (téléphone) : bouton "Filtrer" sur l'accueil (section produits), le catalogue, les catégories et la recherche ; poignée, fond assombri (clic = fermer), Échap, focus piégé puis rendu au bouton. Filtres : prix min/max, sur mesure, promotions, néon, couleur, atelier, gouvernorat — seulement ceux que le back sait filtrer (les autres dans BACK-A-FAIRE). "Voir N résultats" (N réel, demandé au serveur) + "Réinitialiser" ; filtres dans l'URL. Ordinateur : barre de filtres inchangée.
4. Écran de recherche (téléphone) : plein écran qui monte du bas, focus automatique, retour ; "Recherches récentes" (10 max, localStorage, Effacer, suppression une par une) ; "Tendances" seulement si données réelles (sinon caché + BACK-A-FAIRE) ; "Catégories" en grille de 3 ; suggestions pendant la frappe (debounce 250 ms, switchMap).
5. "Vus récemment" (accueil) : 10 derniers produits ouverts (localStorage, id seulement ; infos et prix rechargés du serveur, produits disparus retirés) ; rangée horizontale + "Effacer" ; cachée si vide.
6. Gestes : glisser sur la photo de la fiche = photo suivante / précédente (scroll-snap, sans bibliothèque), points synchronisés ; glisser depuis le bord gauche = retour seulement sans conflit avec le geste natif du navigateur (sinon ne pas le faire et l'expliquer). Tout reste utilisable sans geste.
7. Mode sombre automatique (prefers-color-scheme) : toutes les couleurs en variables CSS ; fond très foncé chaud, texte crème, accent cuivre, contraste ≥ 4.5:1 vérifié. Choix dans "Compte" : Automatique / Clair / Sombre (localStorage, appliqué avant l'affichage : pas de flash blanc). Vérifier accueil, catalogue, fiche, panier, commande, néon, espaces vendeur et admin.
8. PWA : reste à A-15 ; vérifier seulement que rien ici ne la bloque.
Fin : tests + build React, build Angular, ESLint sans erreur, Lighthouse téléphone accueil + fiche (5 passages, médiane), captures téléphone (clair ET sombre) de chaque fonction + ordinateur (rien n'a changé), BACK-A-FAIRE.md et EXPLICATIONS.md, commit, git status + git diff --stat, puis arrête-toi.

### A-10g — Intro claire à l'ouverture + accueil téléphone plus lisible + contrastes en mode clair
Mêmes RÈGLES que ce plan (branche angular-fac, rien en dehors de front/, back figé, base de test, EXPLICATIONS.md avec 5 questions de prof). Aucune nouvelle bibliothèque. Aucune donnée inventée : section sans données = cachée. Tout ce qui a été fait en A-10d et A-10e est conservé (y compris le mode sombre : l'intro et les nouvelles sections doivent aussi être correctes en sombre). Maquettes de référence : « Intro animée à l'ouverture » et « Mobile façon application ».
PARTIE 1 — INTRO CLAIRE (téléphone + ordinateur, 3 s au plus) : fond clair chaud #F6F3EE ; grand disque clair « en relief » (ombres douces : claire en haut à gauche, beige en bas à droite) avec un cercle intérieur légèrement creusé ; fin cercle cuivre qui se dessine (SVG, stroke-dashoffset, ~1,1 s) ; « Elegance » (Playfair Display, #2A2420) avec un léger flou qui disparaît ; « Deco » (Pacifico, cuivre de la partie 3) qui s'allume comme un néon (2-3 clignotements puis lueur douce) ; « FAIT MAIN · EN TUNISIE » en petites capitales espacées (#6B625B) ; le disque grossit légèrement et s'efface, puis fondu vers le site. Bouton « Passer → » visible après 0,9 s (≥ 44 px, clavier, Échap). Écrite directement dans index.html (avant Angular) : remplace l'écran blanc du chargement ; retirée quand l'animation est finie ET la première page affichée, jamais après 3,5 s ; une fois par visite (sessionStorage), seulement en arrivant sur l'accueil (jamais sur un lien direct, ni espace vendeur / admin) ; prefers-reduced-motion : pas d'intro ; aria-hidden, aucun piège du focus ; en mode sombre : mêmes étapes aux couleurs du thème sombre, sans flash clair. Servira d'écran de démarrage en A-15.
PARTIE 2 — ACCUEIL TÉLÉPHONE PLUS LISIBLE (ordinateur inchangé, sauf contrastes de la partie 3) : texte courant 15-16 px (jamais < 13 px, sauf étiquettes en capitales 11-12 px), titres de section 23 px Playfair avec barre cuivre de 4 px à gauche et « Tout voir › » à droite, prix 18 px gras. Après les stories : encadré beige (coins 24 px) « DÉCORATION · NÉONS · SUR MESURE », « Votre déco, fabriquée par des ateliers tunisiens. », « Choisissez un modèle ou faites-le à vos mesures. Vous payez à la livraison. », boutons « Créer mon néon » (foncé, seulement si néon) et « Les ateliers » (contour), 3 garanties avec icônes (« Paiement à la livraison », « Ateliers vérifiés », « Prix à vos mesures ») — seulement si vraies. « Par catégorie » : grille 3 colonnes de photos carrées (catégories réelles les plus fournies), nom sous la photo. Ordre : stories, encadré, Par catégorie, carte néon, En vidéo, Ateliers à découvrir, Vus récemment, Pour vous (puces + Filtrer), Services, pied de page. Cartes « Pour vous » : carte blanche bordure fine, photo carrée, atelier en pastille blanche sur la photo, cœur, catégorie (petites capitales), nom (2 lignes), note si vrais avis, prix (« Sur mesure, dès » au-dessus si sur mesure), badge « Sur mesure », « En stock » (seulement si le stock est connu et > 0) ou promotion. « Ateliers à découvrir » : cartes de 270 px qui défilent (3 photos en mosaïque, logo rond, nom, ville, nombre de créations, spécialités en étiquettes, note si avis réels, « Visiter › »). « Services » : 2 grandes cartes (« Créer mon néon » si néon, « Demander un devis sur mesure » si la demande de devis existe). Pas de boutons flottants supplémentaires sur le côté.
PARTIE 3 — CONTRASTES EN MODE CLAIR (téléphone ET ordinateur ; seule exception à « ordinateur inchangé ») : corriger les problèmes anciens (79 téléphone, 82 ordinateur) : texte ≥ 4.5:1, gros texte (≥ 24 px, ou ≥ 18,66 px gras) et icônes utiles ≥ 3:1, en changeant le moins possible (gris, cuivre, pied de page assombris légèrement). « Deco » du logo : #936940 (choix B). Tableau avant / après (élément, ancienne couleur, nouvelle couleur, contraste) et captures ordinateur avant / après des pages principales. Mode sombre : aucune régression (0 problème).
Fin : tests + build React, build Angular, ESLint, Lighthouse téléphone accueil + fiche produit (5 passages, médiane, sans baisse), vidéo ou suite de captures de l'intro (clair et sombre), captures téléphone de l'accueil (clair et sombre), tableau avant / après des contrastes + captures ordinateur avant / après, EXPLICATIONS.md, commit, git status + git diff --stat, puis arrête-toi.

### A-11 — Performance
`NgOptimizedImage` (lazy loading, tailles), `@defer` pour les sections lourdes, mesure Lighthouse téléphone avant/après (objectif ≥ 90).

### A-12 — SSR (rendu côté serveur) et SEO
Angular SSR pour les pages publiques (accueil, catalogue, catégories, produits, boutiques) : titres, descriptions, aperçu Facebook/WhatsApp (Open Graph), sitemap.
Explique d'abord comment le serveur SSR s'articule avec le back Express existant SANS le modifier, et attends mon accord.

### A-13 — Tests
Tests unitaires des services, pipes, guards et composants clés.
Tests de bout en bout (Playwright) sur la base de test : parcours visiteur → client → commande, vendeur → ajout produit, admin → validation.

### A-14 — Multilingue
Français + arabe (RTL complet), sélecteur de langue, textes externalisés.

### A-15 — PWA
Installation sur téléphone (icône, écran de démarrage), mise en cache des pages déjà vues. L'intro d'A-10g (écrite dans index.html) sert d'écran de démarrage ; theme-sombre.css est à mettre en cache (BACK-A-FAIRE n° 25).

---

## PHASE 3 — Bascule
Ne rien faire sans mon accord explicite. Présente d'abord un plan :
Angular sert le site public à la place de React, React archivé (gardé dans Git), vérification complète, procédure de retour arrière en cas de problème.
Ensuite seulement : reprise de ROADMAP-PRO.md, en Angular.
