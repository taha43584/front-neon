# ROADMAP PRO — Marketplace Elegance Deco

Ce fichier décrit les fonctionnalités à ajouter APRÈS les étapes en cours
(étapes 1 à 5 de "redesign-et-neon" + animations). Ne commence pas ce fichier
avant que ces étapes soient terminées et validées.

---

## RÈGLES GÉNÉRALES (valables pour TOUTES les étapes)

1. **Une étape à la fois.** À la fin de chaque étape : arrête-toi et attends mon "OK" avant la suivante.
2. **Git** : une branche par étape (`pro-XX-nom`), créée depuis `master`. Commit à la fin de l'étape. Ne fusionne dans `master` qu'après mon accord.
3. **Base de données** :
   - `mysqldump` avant toute migration (donne chemin + taille).
   - Migrations ADDITIVES uniquement (aucun DROP, aucune perte de données).
   - Montre-moi le schéma Drizzle + le SQL et ATTENDS mon accord avant de l'appliquer.
   - Applique la migration 2 fois pour prouver qu'elle est idempotente. Comptages avant/après.
4. **Données réelles protégées** : ne touche jamais aux comptes réels, ni aux boutiques "elegance decco" et "Rj deco". Tests avec des comptes `@elegancedeco.test` uniquement, supprimés à la fin.
5. **Sécurité** : tout est vérifié côté serveur (rôles, propriétaire, prix, remises). Un vendeur ne voit et ne modifie que SES données.
6. **Prix** : toujours calculés côté serveur et figés dans les lignes de commande. Aucun prix venant du navigateur n'est accepté.
7. **Aucune donnée inventée.** Une section sans données est cachée.
8. **Nouvelle librairie** : demande-moi avant d'en installer une (nom, version, taille, licence, raison).
9. **Style** : garde l'identité du site (fond #FAF8F4, texte #2A2420, accent #A8693F, Playfair Display + DM Sans, boutons en pilule). Tout fonctionne au téléphone. Zones cliquables ≥ 44 px, aria-label sur les icônes, prefers-reduced-motion respecté.
10. **Livrable de chaque étape** : fichiers modifiés, résultat COMPLET des tests, `npm run build`, captures (ordinateur + téléphone), commit.

---

## ÉTAPE PRO-01 — Pages légales et footer complet

**Objectif** : un site qui inspire confiance avant le lancement.

- Pages : Conditions générales de vente, Politique de retour et d'échange, Politique de confidentialité (données personnelles), Livraison, À propos, Contact, FAQ.
- Contenu modifiable par l'admin (éditeur de texte simple dans /admin/parametres), pas écrit en dur.
- Je fournirai les textes définitifs : en attendant, mets des sections avec des titres et des `[À COMPLÉTER]`, jamais de faux texte juridique.
- Formulaire de contact : nom, email, téléphone, message → enregistré en base + visible dans l'admin (protection anti-spam simple : champ caché + limite de fréquence).
- Footer : liens vers toutes ces pages, réseaux sociaux du site, moyens de paiement (paiement à la livraison), mention "© Elegance Deco".

**Tests** : pages accessibles, contenu modifié par l'admin visible côté public, formulaire de contact enregistré, spam bloqué.

---

## ÉTAPE PRO-02 — Emails professionnels + mot de passe oublié

**Objectif** : chaque email ressemble au site.

- Avant de coder : propose-moi un fournisseur d'envoi (SMTP) et explique la configuration (`.env`). En développement, utilise un outil qui affiche les emails sans les envoyer (ex. Ethereal ou Mailpit).
- Modèle d'email commun (logo, couleurs du site, footer avec liens), compatible téléphone et Gmail/Outlook.
- Emails :
  - Client : confirmation de commande (récapitulatif, mesures sur mesure, texte du néon, total, livraison), changement de statut (confirmée, expédiée, livrée), bienvenue après inscription.
  - Vendeur : demande de boutique reçue, boutique approuvée / refusée (avec motif), produit approuvé / refusé.
  - Tous : **mot de passe oublié** (lien unique, valable 1 heure, utilisable une seule fois, token stocké haché) et confirmation de changement de mot de passe.
- Espace client et espace vendeur : page "Changer mon mot de passe" (ancien mot de passe obligatoire).
- Ne jamais révéler si un email existe ("Si un compte existe, un email a été envoyé").
- Envoi en arrière-plan : un échec d'email ne bloque jamais la commande.
- **Note (18/10/2026)** : en production, le jeton "mot de passe oublié" ne doit JAMAIS apparaître dans les journaux. Aujourd'hui, sans SMTP configuré, le serveur l'écrit dans la console (`[Email] SMTP non configuré — token reset (log uniquement)`) : à supprimer, ou à réserver au seul mode développement.

**Tests** : chaque email généré avec les bonnes données, lien de réinitialisation expiré ou réutilisé = refusé, mot de passe changé = ancien refusé, aucun jeton dans les journaux en production.

---

## ÉTAPE PRO-03 — Notifications vendeur

**Objectif** : le vendeur ne rate aucune commande.

- Email immédiat au vendeur à chaque nouvelle commande contenant ses produits (uniquement SES lignes).
- Dans l'espace vendeur : cloche de notifications (nouvelle commande, avis reçu, produit approuvé/refusé), compteur non lus, marquer comme lu.
- Bouton "Contacter le client sur WhatsApp" dans le détail de commande : lien `https://wa.me/216XXXXXXXX?text=...` avec message prérempli (n° de commande, produits, total). Pas d'API WhatsApp payante.
- Réglages vendeur : activer/désactiver les emails par type.

**Tests** : un vendeur ne reçoit que les notifications de ses commandes, compteur correct, lien WhatsApp avec le bon numéro et le bon texte.

---

## ÉTAPE PRO-04 — Avis vérifiés, note de boutique, badge, photos clients

**Objectif** : la confiance.

- Un client peut laisser un avis UNIQUEMENT sur un produit d'une commande au statut "livrée", une seule fois par ligne de commande.
- Avis : note 1 à 5, texte, jusqu'à 3 photos (même validation que les photos produits). Mention "Achat vérifié".
- Modération : l'admin peut masquer un avis ; le vendeur peut répondre publiquement une fois ; signalement d'un avis par un utilisateur.
- **Galerie "Chez nos clients"** sur la fiche produit et la page boutique : photos des avis publiés.
- **Note de la boutique** : moyenne des avis + nombre d'avis + délai moyen de livraison (calculé sur les commandes livrées). Affichée sur la page boutique, les cartes boutiques et la fiche produit.
- **Badge "Vendeur vérifié"** : attribué par l'admin (case dans la fiche vendeur), affiché à côté du nom de la boutique.
- Email au client 3 jours après la livraison : "Donnez votre avis".

**Tests** : avis refusé si commande non livrée ou déjà noté, moyenne correcte, avis masqué exclu de la moyenne, photos validées.

---

## ÉTAPE PRO-05 — Commande sans compte (invité)

- Le client peut commander sans créer de compte : nom, téléphone, adresse, email (facultatif mais conseillé).
- Page de suivi de commande accessible avec n° de commande + téléphone (sans compte).
- Après la commande : proposition "Créer un compte pour suivre vos commandes" (relie la commande au nouveau compte si même téléphone/email, après vérification).
- Protection anti-abus : limite de commandes par téléphone/IP sur une période.

**Tests** : commande invité complète, suivi avec mauvais téléphone refusé, liaison au compte correcte.

---

## ÉTAPE PRO-06 — Recherche intelligente, "Vus récemment", "Vous aimerez aussi"

- **Recherche** : suggestions pendant la frappe (après 2 lettres, délai 250 ms) : catégories, produits, boutiques, avec photo miniature. Tolère accents et petites fautes (utilise la normalisation de `shared/categoryKey.ts`). Page de résultats avec filtres.
- **Vus récemment** : 8 derniers produits consultés (stockés dans le navigateur, sans compte), affichés en bas de la fiche produit et sur l'accueil.
- **Vous aimerez aussi** : produits de la même catégorie, puis de la même boutique, publiés, hors produit actuel.
- Performance : index MySQL adaptés (montre-moi le SQL), réponses < 300 ms.

**Tests** : "mir" propose Miroirs, "neon" trouve "Néon", produits non publiés jamais proposés.

---

## ÉTAPE PRO-07 — Statistiques vendeur + dupliquer un produit

- Tableau de bord vendeur : chiffre d'affaires (jour / semaine / mois), nombre de commandes, panier moyen, produits les plus vendus, produits les plus vus, taux de conversion (vues → commandes).
- Graphiques simples et lisibles, période au choix, export CSV.
- Compteur de vues produit (une vue par visiteur et par jour, sans données personnelles).
- **Dupliquer un produit** : copie le produit (texte, prix, options, sur mesure, catégorie) en brouillon "Copie de…", les photos sont copiées comme nouveaux fichiers, statut "en attente" si la validation admin est active.

**Tests** : chiffres exacts sur un jeu de commandes de test, un vendeur ne voit que ses chiffres, duplication complète et indépendante de l'original.

---

## ÉTAPE PRO-08 — Commissions et relevés mensuels

- L'admin fixe un taux de commission global et, si besoin, un taux par boutique.
- Le taux appliqué est FIGÉ dans chaque ligne de commande au moment de la commande.
- Relevé mensuel par vendeur : commandes livrées, total des ventes, commission, montant à verser au vendeur. Statut "À payer" / "Payé" (date, moyen, référence) géré par l'admin.
- Le vendeur voit ses relevés et peut les télécharger en PDF.
- Les commandes annulées ou retournées sont exclues.

**Tests** : calculs exacts au millime, taux modifié après commande = anciennes commandes inchangées, vendeur ne voit que ses relevés.

---

## ÉTAPE PRO-09 — Bannières, promotions et codes promo

- **Bannières** gérées par l'admin : image (ordinateur + téléphone), titre, texte, bouton, lien, dates de début et de fin, ordre. Affichées en haut de l'accueil (carrousel discret) uniquement pendant leur période.
- **Codes promo** :
  - créés par l'admin (valables sur tout le site) ou par un vendeur (valables uniquement sur SES produits) ;
  - type : pourcentage ou montant fixe ; minimum de commande ; date de fin ; nombre d'utilisations total et par client ;
  - appliqués et vérifiés côté serveur, montant de remise figé dans la commande ;
  - si la commande contient plusieurs boutiques, la remise d'un code vendeur ne s'applique qu'à ses lignes.
- Qui paie la remise : code admin = déduit de la commission du site (à confirmer avec moi), code vendeur = à la charge du vendeur. Visible dans les relevés.

**Tests** : code expiré / épuisé / minimum non atteint refusé, code vendeur sans effet sur les autres boutiques, remise impossible à modifier depuis le navigateur.

---

## ÉTAPE PRO-10 — Aperçu "Dans votre pièce"

**Objectif** : la fonctionnalité qui rend le site unique.

- Bouton "Voir dans ma pièce" sur les fiches produit compatibles (miroirs, tableaux, néons, déco murale).
- Le client prend ou importe une photo de son mur. **La photo reste dans le navigateur** (jamais envoyée au serveur).
- Mise à l'échelle : le client indique la largeur réelle d'un repère (ex. trace un trait sur une porte ou un meuble et saisit "80 cm"). Le produit s'affiche alors à sa vraie taille (dimensions du produit ou mesures saisies en sur mesure).
- Le client déplace le produit au doigt / à la souris ; légère ombre portée pour le réalisme.
- Pour les néons : rendu du texte lumineux du configurateur (police, couleur, taille).
- Le vendeur peut ajouter une "image d'aperçu" détourée (PNG transparent) ; sinon on utilise la photo principale.
- Bouton "Enregistrer l'image" (téléchargement) et "Ajouter au panier" avec les mêmes mesures.
- Fonctionne au téléphone (appareil photo).

**Tests** : taille affichée proportionnelle au repère, aucun envoi réseau de la photo du client, fonctionne sur Chrome Android et Safari iPhone.

---

## ÉTAPE PRO-11 — Vitesse et images optimisées

- Mesure AVANT : score Lighthouse (téléphone) de l'accueil, d'une catégorie et d'une fiche produit. Donne-moi les chiffres.
- Images : conversion WebP + plusieurs tailles (miniature, moyenne, grande) avec `srcset`, lazy loading, dimensions réservées (pas de saut de mise en page). Propose-moi l'outil (côté navigateur ou serveur) et attends mon accord.
- Conversion des images existantes par un script, SANS supprimer les originaux (garde-les en sauvegarde).
- Cache navigateur des images et fichiers statiques, compression gzip/brotli, découpage du code par page.
- Mesure APRÈS avec les mêmes pages. Objectif : score téléphone ≥ 85.

**Tests** : toutes les images existantes s'affichent encore, aucun fichier original perdu.

---

## ÉTAPE PRO-12 — Statistiques du site et publicité (Google Analytics, Meta Pixel)

- Bandeau de consentement aux cookies (Accepter / Refuser / Personnaliser). Aucun traceur avant consentement.
- Google Analytics 4 et Meta Pixel, identifiants dans `.env` (je les fournirai), désactivés en développement.
- Événements : vue produit, ajout au panier, début de commande, commande validée (avec montant), recherche.
- Aucune donnée personnelle (nom, téléphone, email, adresse) envoyée aux traceurs.
- Politique de confidentialité mise à jour en conséquence (section `[À COMPLÉTER]` pour moi).

**Tests** : aucun script de suivi chargé sans consentement, événements envoyés après consentement, rien en développement.

---

## APRÈS LA ROADMAP : PRÉPARATION DU LANCEMENT

Ne fais rien de cette partie sans mon accord ; présente-moi seulement un plan quand on y arrive :
hébergement, nom de domaine, HTTPS, variables de production, sauvegardes MySQL automatiques quotidiennes (et test de restauration), stockage durable des photos, journaux d'erreurs, changement de tous les mots de passe de test, compte admin final.
