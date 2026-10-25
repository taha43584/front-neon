# Parité React ↔ Angular (étape A-09)

État constaté **au début de A-09** (après A-08), page par page, ordinateur et téléphone.

Légende : ✅ identique · ◐ partiel (détail dans « À faire ») · ❌ absent · ★ écart volontaire (Angular meilleur, décision du 18/10/2026).

Colonne « Ordi / Tél » : comportement propre à la taille d'écran (barre du bas, tiroir, colonnes…). « = » : même page sur les deux.

## 1. Site public

| Page | Adresse | React | Angular avant A-09 | Ordi / Tél | À faire |
|---|---|---|---|---|---|
| Accueil | `/` | Hero, catégories, sur mesure, dernières créations, boutiques, engagements | ◐ | Tél : React a des pastilles « Tout · Sur mesure · Promotions · Boutiques » sous la recherche | Pastilles téléphone ; bouton « Ouvrir ma boutique » (ordinateur) ; accroche du hero lue dans les paramètres ; « Toutes les boutiques » + « Voir la boutique » sur les cartes boutique |
| Catalogue | `/produits` | Recherche, catégories, sur mesure, promos, prix, tri | ✅ | = | — |
| Catégorie | `/categorie/:slug` | Filtres serveur, bannière néon + ateliers | ✅ | Tél : filtres en panneau | — |
| Fiche produit | `/produit/:slug` | Galerie, **cœur favori sur la photo**, variantes, sur mesure (prix animé), avis, liens vers la boutique | ◐ | = | Cœur favori sur la grande photo ; liens « nom de la boutique » et « Découvrir la boutique » |
| Boutiques | `/boutiques` | Liste des boutiques validées, recherche | ❌ | = | **À créer** |
| Boutique publique | `/boutique/:slug` | Couverture, logo, description, ville, liens sociaux, suivre, contacter, catégories, produits, bouton néon | ❌ | = | **À créer** |
| Créer mon néon | `/neon`, `/neon/:slug` | Ateliers, configurateur, devis | ✅ | Tél : aperçu collé sous l'en-tête | Lien « Réalisé par … » vers la boutique (page à créer) |
| Panier | `/panier` | Lignes, quantités, prix serveur | ✅ | = | — |
| Commande | `/checkout` | Coordonnées, adresse par défaut, prix serveur | ✅ | = | Lien « créer un compte Client » (visiteur) |
| Confirmation | `/commande/:id` | Récapitulatif | ✅ | = | — |
| Connexion | fenêtre React / `/connexion` Angular | Connexion, **mot de passe oublié**, **nouveau mot de passe (code reçu)** | ◐ | = | Mot de passe oublié + réinitialisation ; lien « Créer un compte » |
| Inscription | `/inscription`, `/inscription/client`, `/inscription/vendeur` | Choix, formulaire client, formulaire vendeur (boutique, conditions) | ❌ | = | **À créer** |
| Aide / Suivi / Vendre | `/aide`, `/suivre-commande`, `/vendre` | Pages d'information | ✅ ★ | = | — (★ en-tête du site, ★ `/suivre-commande` correct) |
| Conditions | `/conditions-generales`, `/conditions-de-vente`, `/conditions-vendeurs` | Textes | ✅ ★ | = | — |
| 404 | toute adresse inconnue | Page anglaise générique | ✅ ★ | = | — (★ français) |
| Assistant Déco IA | `/assistant`, `/assistant-deco` | Discussion avec l'assistant (style, budget, suggestions) | ❌ | = | **À créer** |
| Messagerie | `/messages`, `/messages/:shopSlug` | Conversations client ↔ boutique | ❌ | Tél : liste puis conversation | **À créer** |

## 2. Cadre du site

| Élément | React | Angular avant A-09 | À faire |
|---|---|---|---|
| En-tête ordinateur | Catégories, Nouveautés, Sur mesure, Promotions, **Boutiques**, Vendre | ◐ (« Tout le catalogue » à la place de Boutiques) | Lien **Boutiques** |
| Menu du compte | Connexion, **Créer un compte** / Mon compte, Déconnexion | ◐ | « Créer un compte » |
| Tiroir (téléphone) | … **Boutiques**, Vendre avec nous, Aide ; **Créer un compte** | ◐ | Boutiques, Créer un compte |
| Pied de page | « Acheter » se termine par **Boutiques** | ◐ | Lien Boutiques |
| Barre du bas, panneau catégories | — | ✅ | — |

## 3. Espace client

| Section | React | Angular avant A-09 | À faire |
|---|---|---|---|
| Cadre | Application à part (menu latéral générique : Mon compte, Boutique et catalogue, Assistant) | Dans le site | ★ garder le cadre du site (cohérent avec le reste) + liens Assistant et Messages dans l'espace |
| Profil | Voir / modifier | ✅ | — |
| Commandes | Liste, détail, statut | ✅ | — |
| Favoris et boutiques suivies | 3 derniers + lien boutique | ◐ (boutiques sans lien) | Lien vers la boutique |
| **Adresses** | Ajouter (libellé, destinataire, téléphone, ville, adresse, code postal, principale), supprimer | ❌ | **À créer** |
| **Avis** | Mes avis (statut) + noter un produit livré (modération) | ❌ | **À créer** |
| Messagerie | `/messages` | ❌ | Voir §1 |

## 4. Espace vendeur

| Section | Adresse | React | Angular avant A-09 | À faire |
|---|---|---|---|---|
| Cadre | — | **Application à part** : barre latérale, sans l'en-tête ni le pied du site, tiroir sur téléphone | Dans le site | **Refaire le cadre** (décision du 18/10) |
| Tableau de bord | `/espace-vendeur` | Indicateurs, dernières commandes, produits | ✅ | — |
| Produits / ajouter / modifier | `…/produits`, `…/ajouter`, `…/modifier/:id` | | ✅ | — |
| **Mes catégories** | `…/categories` | Renommer, réordonner, supprimer | ❌ | **À créer** |
| Néon | `…/neon` | | ✅ | — |
| Commandes | `…/commandes` | | ✅ | — |
| Ma boutique | `…/boutique` | | ✅ | Lien « Ma vitrine publique » (page à créer) |
| **Statistiques** | `…/statistiques` | Ventes, commandes, produits les plus vendus | ❌ | **À créer** |
| **Messages** | `…/messages` | Conversations avec les clients | ❌ | **À créer** |
| **Avis** | `…/avis` | Avis reçus | ❌ | **À créer** |
| **Paramètres** | `…/parametres` | Coordonnées du compte | ❌ | **À créer** |
| Demande / attente / refus / suspension | | | ✅ | — |

## 5. Console d'administration

| Section | Adresse | React | Angular avant A-09 | À faire |
|---|---|---|---|---|
| Vue générale, clients, vendeurs, produits, catégories, commandes, paramètres | `/admin/…` | | ✅ | — |
| **Avis** | `/admin/avis` | Modération : publier, refuser, supprimer | ❌ | **À créer** |
| **Statistiques** | `/admin/statistiques` | Chiffres et graphiques sur 12 mois | ❌ | **À créer** |
| **Comptes** | `/admin/comptes` | Créer un compte (client, vendeur, admin), lister, suspendre / réactiver | ❌ | **À créer** |

## 6. Écarts volontaires (gardés)

- 404 en français, aux couleurs du site.
- `/suivre-commande` affiche le bon contenu.
- Pages d'information avec l'en-tête et le pied du site.
- Espace client dans le cadre du site (React utilise un menu latéral générique du modèle de départ).

Les trois premiers sont des bugs du site React, notés dans `BACK-A-FAIRE.md` (section « Site React », à ne pas corriger puisqu'il sera remplacé).

---

## 7. État après A-09

Tout ce qui était marqué ❌ ou ◐ ci-dessus est fait et vérifié sur la base de test (ordinateur 1440 px, téléphone 390 px) :

| Zone | Fait |
|---|---|
| Public | `/boutiques` (recherche), `/boutique/:slug` (couverture, logo, accroche, liens sociaux, suivre, « Créer mon néon avec … », contacter, présentation, coordonnées, catégories en onglets, produits), `/inscription` (choix, client, vendeur avec conditions), mot de passe oublié + réinitialisation, lien « Créer un compte », Assistant Déco IA, messagerie `/messages` et `/messages/:shopSlug` |
| Accueil | Pastilles téléphone, « Ouvrir ma boutique », accroche des paramètres, « Toutes les boutiques », « Voir la boutique » (carte entière cliquable) |
| Fiche produit | Cœur favori sur la grande photo (« pop »), liens vers la boutique ; prix sur mesure animé vérifié (320,00 → valeur intermédiaire → 640,00 DT) |
| Cadre | Liens « Boutiques » (en-tête, tiroir, pied, raccourcis) et « Créer un compte » remis |
| Espace client | Adresses (ajouter, supprimer), avis (mes avis + noter un produit livré), boutiques suivies avec lien, raccourcis Messagerie / Assistant / Catalogue |
| Espace vendeur | Application à part (barre latérale, barre du haut, tiroir téléphone), Mes catégories, Statistiques, Messages, Avis clients, Paramètres |
| Console admin | Avis (publier, masquer, supprimer, pastille du menu), Statistiques (4 périodes, 3 graphiques, 3 tableaux), Comptes (créer client / vendeur, filtrer, suspendre / réactiver) + « Créer un compte » depuis Clients |

Écarts restants, tous volontaires :
- 404, `/suivre-commande`, en-tête du site sur les pages d'information (bugs React R1–R3) ;
- espace client dans le cadre du site ;
- `/admin/comptes` dans la console (React : page à part avec le menu générique) ;
- réponses de l'assistant affichées en texte simple (React : rendu Markdown par la bibliothèque `streamdown`, non ajoutée sans accord) ;
- messagerie : mes messages toujours à droite (bug React R4) ; assistant limité aux 12 derniers messages (bug React R5) ; paramètres vendeur : champs vides ignorés (bug React R6).

## Après la parité : différences voulues

- **A-10b — accueil « marketplace » et en-tête** (décision du 2026-10-19) : l'accueil et l'en-tête Angular ne suivent plus le site React. En-tête : bouton « Catégories », grande recherche, « Se connecter » en clair, catégories principales en 2ᵉ ligne, favoris sur téléphone. Accueil en 8 sections : cercles de catégories, vidéos des ateliers, nouveautés, espaces, néon, ateliers, présentation, newsletter. Le hero, la bande « sur mesure » et les 4 engagements de React ne sont plus sur l'accueil Angular.
- **A-10c — avis clients avec photos** (décision du 2026-10-20) : fiche produit (note près du prix, encadré de confiance, section « Avis des clients » compacte), « Donner mon avis » dans l'espace client, réponse de l'atelier dans l'espace vendeur, photos et signalements dans la console admin. Le site React garde son ancien affichage (BACK-A-FAIRE n° 13).
