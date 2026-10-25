# Elegance Deco — front Angular : explications pour la soutenance

Ce dossier `front/` est un **deuxième front** (Angular) pour le site Elegance Deco.
Il utilise **le même back** que le site React (serveur Express + tRPC sur le port 3000), **sans le modifier**.

---

## Étape 1 — Mise en place, connexion au back, page de connexion

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `package.json`, `angular.json`, `tsconfig*.json` | Projet Angular 21 indépendant (ses propres `node_modules`) |
| `proxy.conf.json` | En développement, envoie `/api` et `/media` vers le back (port 3000) |
| `proxy.test.json` | Même chose vers un back branché sur la **base de test** (port 3001), pour les essais |
| `src/styles.css` | Identité visuelle du site : couleurs (variables CSS), polices Playfair Display et DM Sans |
| `src/app/core/api/trpc-client.ts` | Client tRPC : appelle les procédures du back avec leurs types |
| `src/app/core/services/auth.service.ts` | Service de connexion : qui est connecté, se connecter, se déconnecter |
| `src/app/pages/login/` | Page « Connexion » avec un formulaire réactif |
| `src/app/pages/home/` | Accueil provisoire qui affiche l'état de la session |
| `src/app/app.ts`, `app.html`, `app.css` | Composant racine : en-tête, page courante, pied de page |
| `src/app/app.routes.ts` | Les routes (adresse → page) |

### Pourquoi ces choix

- **Un dossier séparé** : le site React ne change en rien. Angular a son propre `package.json`, donc ses bibliothèques ne se mélangent pas avec celles du site.
- **Le proxy** : le navigateur parle uniquement à `localhost:4200` ; c'est le serveur de développement d'Angular qui transmet `/api/...` au back. Pour le navigateur, tout vient de la même adresse : le **cookie de session** du back fonctionne tel quel, sans toucher au CORS ni aux cookies du serveur.
- **tRPC avec `import type`** : on importe seulement le *type* `AppRouter` du serveur. Aucun code serveur n'arrive dans le navigateur (vérifié : ni `bcrypt`, ni `drizzle`, ni `express` dans le fichier compilé), mais TypeScript connaît toutes les procédures. Si j'écris une procédure qui n'existe pas, ou si j'utilise mal une réponse, **la compilation échoue** (testé volontairement).
- **superjson** : le back encode ses réponses avec superjson (par exemple pour garder les dates) ; le client doit utiliser le même format.
- **Angular 21** au lieu de 22 : Angular 22 exige Node 22.22 ou plus, l'ordinateur a Node 22.14. Angular 21 apporte les mêmes notions (composants standalone, signals, nouveau contrôle de flux `@if`).
- **Base de test pour les essais** : pour tester la connexion, j'ai utilisé un compte de démonstration dans la base de test (`proxy.test.json` → back sur le port 3001), puis je l'ai supprimé. La base réelle n'a reçu aucune écriture.

### Notions Angular utilisées dans cette étape

**Component (composant)** — Un morceau d'écran autonome : un gabarit HTML, un style et une classe TypeScript.
Exemple : `LoginPage` (`pages/login/login.page.ts`) affiche le formulaire de connexion. Il est « standalone » : il déclare lui-même ce qu'il utilise (`imports: [ReactiveFormsModule]`), sans module central.

**Service** — Une classe qui contient une logique partagée, hors de l'affichage.
Exemple : `AuthService` sait qui est connecté et parle au back (`trpc.auth.login.mutate(...)`). Les pages ne savent pas *comment* on se connecte, elles demandent au service.

**Injection de dépendances** — Angular crée le service une seule fois et le donne à ceux qui le demandent.
Exemple : `private readonly auth = inject(AuthService);` dans `LoginPage`, `HomePage` et `App`. Grâce à `@Injectable({ providedIn: 'root' })`, c'est **le même** `AuthService` partout : quand la page de connexion connecte l'utilisateur, l'en-tête l'affiche aussitôt.

**Routing (routage)** — Associe une adresse à une page, sans recharger le site.
Exemple dans `app.routes.ts` : `{ path: 'connexion', component: LoginPage }`. Le lien `routerLink="/connexion"` change de page instantanément ; `<router-outlet />` dans `app.html` est l'endroit où la page s'affiche. Une adresse inconnue (`**`) renvoie à l'accueil.

**Signals** — Une valeur « réactive » : quand elle change, l'écran se met à jour tout seul.
Exemple dans `AuthService` : `readonly user = signal<CurrentUser | null>(null);` et `isLoggedIn = computed(() => this.user() !== null)`. Dans le HTML, `@if (auth.user(); as user)` affiche le nom dès que `user.set(...)` est appelé.

**Formulaires réactifs** — Le formulaire est décrit en TypeScript avec ses règles de validation.
Exemple dans `LoginPage` :
```ts
readonly form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});
```
Le HTML relie les champs avec `formControlName="email"` et affiche « Adresse e-mail invalide. » si `form.controls.email.hasError('email')`.

*Notions prévues aux étapes suivantes : **guard** (protéger l'espace client / vendeur / admin), **interceptor** (traiter les erreurs et le chargement de toutes les requêtes), **RxJS** (recherche avec délai `debounceTime`).*

### Ce qui a été vérifié

- `ng build` réussit ; fichier principal ≈ 77 Ko transférés.
- Dans le navigateur (ordinateur et téléphone) : champs vides → messages d'erreur ; mauvais mot de passe → message du serveur « Email ou mot de passe incorrect » ; bon mot de passe → « Connecté en tant que … » ; la session reste après rechargement ; « Se déconnecter » fonctionne, même après rechargement.
- Le cookie de session est bien `httpOnly` (Angular ne peut pas le lire : protection contre le vol de session).
- Le site React n'a pas changé : ses tests et son build passent (voir le compte rendu de l'étape).

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi utiliser un proxy plutôt que d'appeler directement `http://localhost:3000` ?**
   Parce que le navigateur considère `localhost:4200` et `localhost:3000` comme deux origines différentes : il bloquerait les appels (CORS) ou n'enverrait pas le cookie de session. Avec le proxy, le navigateur ne parle qu'à une seule origine et le serveur n'a pas besoin d'être modifié.

2. **Quelle est la différence entre `import type` et un import normal ?**
   `import type` n'importe que des informations de type, qui disparaissent à la compilation. Le code du serveur (base de données, mots de passe…) n'est donc jamais envoyé au navigateur, mais TypeScript vérifie quand même que j'appelle les bonnes procédures avec les bons paramètres.

3. **Pourquoi l'`AuthService` est-il `providedIn: 'root'` ?**
   Pour qu'il n'en existe qu'un seul exemplaire dans toute l'application (un « singleton »). Toutes les pages partagent ainsi le même utilisateur connecté : si la page de connexion le change, l'en-tête le voit immédiatement.

4. **Quelle différence entre un signal et une simple variable ?**
   Une variable normale peut changer sans qu'Angular le sache. Un signal prévient Angular à chaque changement (`set`), et seuls les endroits de l'écran qui le lisent sont remis à jour. `computed()` crée une valeur dérivée (ici `isLoggedIn`) recalculée automatiquement.

5. **Où se fait la vraie vérification du mot de passe et des droits ?**
   Toujours sur le serveur. Le formulaire Angular ne vérifie que la forme (champ rempli, e-mail valide) pour aider l'utilisateur. Le mot de passe est comparé par le back (bcrypt), et la session est un cookie `httpOnly` que le JavaScript du navigateur ne peut même pas lire.

---

## Étape 2 — Accueil, catalogue, page catégorie, fiche produit

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `core/services/catalog.service.ts` | **Service catalogue** : tous les appels de lecture (accueil, catégories, catalogue, page catégorie, fiche produit, avis, prix confirmé) |
| `shared/components/product-card/` | **Carte produit réutilisable** (accueil, catalogue, catégorie) |
| `shared/components/category-tile/` | **Tuile catégorie réutilisable** (accueil) |
| `shared/components/shop-logo/` | Logo rond d'une boutique (ou ses initiales) |
| `shared/components/load-state/` | **État de chargement / d'erreur réutilisable** (squelettes gris, bouton « Réessayer ») |
| `shared/pipes/prix-dt.pipe.ts` | **Pipe** d'affichage des prix : `1234.5 → « 1234,50 DT »` |
| `pages/home/` | Accueil : hero avec vraies photos, catégories, bande « sur mesure », dernières créations (filtres Tout / Sur mesure / Promotions), boutiques, engagements |
| `pages/catalog/` | Catalogue : recherche au fil de la frappe, catégories, sur mesure, promotions, prix min/max, tri |
| `pages/category/` | Page catégorie `/categorie/:slug` : filtres et tri faits par le serveur |
| `pages/product/` | Fiche produit `/produit/:slug` : galerie, infos, calculateur sur mesure, autres créations, avis |
| `app.ts` / `app.html` | En-tête complet (recherche, menu des catégories), barre du bas sur téléphone |

### Pourquoi ces choix

- **Mêmes procédures que le site React**, sans aucune modification : `catalog.home`, `catalog.siteCategories`, `catalog.categories`, `catalog.list`, `catalog.categoryPage`, `vendor.publicProduct`, `reviews.list`, `catalog.quoteCart`.
- **Mêmes adresses que le site React** (`/produits`, `/categorie/led-neon`, `/produit/led-neon-zicbn9`). La fiche produit utilise le **slug** (texte lisible) et non un numéro, parce que la procédure du back (`vendor.publicProduct`) reçoit un `productSlug` : on garde ainsi exactement le même back et les mêmes liens.
- **Les filtres sont dans l'URL** (`?q=led&promo=1&tri=price_asc`) : la page est partageable, et le bouton « retour » du navigateur fonctionne.
- **Le prix sur mesure** :
  1. *estimation en direct* dans le navigateur avec `computeCustomPrice`, **importée** depuis `shared/customPricing.ts` (le même fichier que le serveur et le site React, pas une copie) ;
  2. *confirmation* par le serveur (`catalog.quoteCart`, le même calcul que pour le panier et la commande). Le serveur reste la **seule source du prix final**.
  Vérifié : 120 × 80 cm sur « led neon » → estimation 518,40 DT, serveur 518,40 DT.
- **Chargement à la demande** (`loadComponent`) : les pages catalogue, catégorie et produit ne sont téléchargées que lorsqu'on y va (≈ 3 à 8 Ko chacune).
- **Champs de mesure en `type="text"` + `inputmode="numeric"`** : avec `type="number"`, les formulaires réactifs ne se mettaient pas à jour dans ce projet ; en texte, le clavier numérique s'affiche quand même sur téléphone et la fonction partagée vérifie la valeur (« doit être un nombre entier de centimètres »).

### Notions Angular utilisées dans cette étape

**Composant réutilisable avec `input()`** — Un composant qui reçoit ses données de l'extérieur au lieu de les charger lui-même.
Exemple : `ProductCardComponent` déclare `readonly product = input.required<ProductCardData>();`. L'accueil, le catalogue et la page catégorie l'utilisent tous : `<app-product-card [product]="p" />`. Une seule carte à maintenir pour trois pages.

**`output()`** — L'inverse d'`input()` : le composant prévient son parent.
Exemple : `LoadStateComponent` a `readonly retry = output<void>();` ; la page écrit `<app-load-state status="error" (retry)="load()" />` et décide elle-même quoi recharger.

**Routing avec paramètres** — Une partie de l'adresse est une variable.
Exemple : `{ path: 'produit/:slug', loadComponent: … }`. Deux façons de lire le paramètre sont montrées :
- fiche produit : grâce à `withComponentInputBinding()` (dans `app.config.ts`), le paramètre arrive directement dans `readonly slug = input.required<string>();` ;
- page catégorie : avec `ActivatedRoute.paramMap` (un Observable), combiné aux paramètres de requête (filtres).

**Service catalogue** — `CatalogService` regroupe tous les appels de lecture. Les pages ne parlent jamais directement à tRPC : si une procédure change un jour, on ne modifie qu'un fichier. Les types des réponses sont déduits du serveur (`Awaited<ReturnType<typeof trpc.catalog.home.query>>`).

**RxJS (cas justifié : la recherche)** — Dans `catalog.page.ts` :
```ts
this.searchControl.valueChanges
  .pipe(debounceTime(350), map((v) => v.trim()), distinctUntilChanged(), takeUntilDestroyed())
  .subscribe((q) => this.setParams({ q: q || null }));
```
- `debounceTime(350)` : on attend 350 ms sans frappe avant d'agir. **Vérifié** : en tapant « l », « e », « d », le serveur n'a reçu **qu'un seul** appel (pour « led ») au lieu de trois.
- `distinctUntilChanged()` : pas de nouvel appel si le texte n'a pas changé.
- `switchMap` (plus bas dans le même fichier) : si une nouvelle recherche part avant la réponse de la précédente, l'ancienne réponse est ignorée (pas de résultats « en retard » qui écraseraient les bons).
- `takeUntilDestroyed()` : l'abonnement s'arrête tout seul quand on quitte la page (pas de fuite de mémoire).
- `toSignal(...)` transforme le résultat RxJS en signal pour l'affichage.

**Pipes** — Une transformation d'affichage dans le gabarit.
- `prixDt` (créé pour le projet) : `{{ produit.priceTnd | prixDt }}` → « 600,00 DT ».
- `date` (fourni par Angular, en français grâce à `registerLocaleData(localeFr)`) : `{{ avis.createdAt | date: 'longDate' }}` → « 18 octobre 2026 ».

**`@if` / `@for` / `@switch`** — Le contrôle de flux dans les gabarits.
- `@if (categories().length) { … }` : une section sans données n'est pas affichée.
- `@for (p of latest(); track p.slug) { <app-product-card [product]="p" /> }` : `track` dit à Angular comment reconnaître chaque élément pour ne recréer que ce qui change.
- `@switch (state().status) { @case ('loading') … @case ('error') … @default … }` : un affichage par état.

**État de chargement / d'erreur** — Chaque page a un état `'loading' | 'ok' | 'error'` (et `'notfound'` pour une catégorie ou un produit inconnu). Pendant le chargement : squelettes gris de la taille des vraies cartes. En cas d'erreur : message + « Réessayer ». Catégorie inconnue → « Catégorie introuvable » ; produit inconnu → « Création introuvable ».

**`computed()`** — Valeur dérivée recalculée automatiquement. Exemple : `estimate = computed(() => computeCustomPrice(...))` dans la fiche produit : à chaque chiffre tapé, l'estimation se met à jour, sans bouton.

### Ce qui a été vérifié (ordinateur 1440 px et téléphone 390 px)

Sur les vraies données (lecture seule, aucune connexion, aucune écriture) :
- Accueil : 4 catégories, 6 dernières créations, filtres Tout / Sur mesure / Promotions, 2 boutiques, exemple sur mesure « à partir de 600,00 DT / m² ».
- Catégorie « led neon » : 2 créations ; tri « prix croissant » fait par le serveur (540,00 puis 600,00 DT / m²) ; catégorie inconnue → « Catégorie introuvable ».
- Catalogue : 6 produits ; recherche « led » → 3 résultats, **un seul appel serveur** pour 3 lettres.
- Fiche sur mesure : largeur 5 cm → « La largeur doit être comprise entre 50 et 200 cm. » ; 120 × 80 cm → estimation 518,40 DT = prix confirmé par le serveur 518,40 DT.
- Fiche à prix fixe : « Cercle lumineux », 200,00 DT ; produit inconnu → « Création introuvable ».
- Pas de défilement horizontal sur téléphone ; la seule erreur réseau est le 404 voulu de la catégorie inconnue.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi utiliser `input()` plutôt que de charger les données dans la carte produit ?**
   Pour que la carte soit *réutilisable* et *simple* : elle ne fait qu'afficher ce qu'on lui donne. La page charge la liste une seule fois (un seul appel serveur) puis distribue chaque produit à une carte. Si chaque carte chargeait ses données, il y aurait un appel par carte.

2. **À quoi sert `debounceTime` et comment l'avez-vous vérifié ?**
   À éviter d'interroger le serveur à chaque touche : on attend 350 ms de pause. Dans le test automatique, en tapant « led » lettre par lettre, le serveur n'a reçu qu'un seul appel (« led ») au lieu de trois.

3. **Quelle est la différence entre `switchMap` et un simple appel dans `subscribe` ?**
   Avec `switchMap`, si une nouvelle recherche part, la précédente est abandonnée : on n'affiche jamais une réponse périmée. Avec de simples appels, une réponse lente à « le » pourrait arriver après celle de « led » et afficher de mauvais résultats.

4. **Le prix sur mesure est calculé dans le navigateur : un client ne pourrait-il pas tricher ?**
   Non. Le navigateur n'affiche qu'une *estimation* (avec la même fonction, importée de `shared/`). Le prix qui compte est recalculé par le serveur à partir des mesures (bouton « Confirmer le prix », et toujours au panier et à la commande). Un prix envoyé par le navigateur est ignoré.

5. **Pourquoi mettre les filtres dans l'URL plutôt que dans une variable ?**
   L'URL est la « source de vérité » : on peut partager le lien, recharger la page, utiliser « retour » sans perdre les filtres. La page observe l'URL (`queryParamMap`) et recharge les résultats à chaque changement : il n'y a qu'un seul chemin pour mettre à jour la liste.

---

## Étape A-03 — Panier, commande, espace client

*(À partir de cette étape, le projet suit le plan officiel `ANGULAR-PLAN.md`.)*

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `core/api/trpc-client.ts` | Le client tRPC passe désormais par **HttpClient** (au lieu de `fetch`) → tous les appels traversent l'intercepteur |
| `core/interceptors/api.interceptor.ts` | **Intercepteur HTTP** : barre de chargement globale + session expirée (401) → reconnexion |
| `core/services/loading.service.ts` | Compteur de requêtes en cours (signal) pour la barre de chargement |
| `core/guards/auth.guards.ts` | **authGuard** (pages réservées aux connectés) et **guestGuard** (page de connexion) |
| `core/services/cart.service.ts` | **Service panier** : signals + `computed`, sauvegarde automatique (rechargement), lignes prix fixe / sur mesure / néon |
| `core/services/account.service.ts` | Espace client et commande : `account.dashboard`, `account.order`, `account.updateProfile`, `checkout.createOrder` |
| `shared/validators/tunisian-phone.validator.ts` | **Validateur personnalisé** : numéro tunisien de 8 chiffres + liste des 24 gouvernorats |
| `pages/cart/` | Panier : lignes groupées par boutique, quantités, prix du serveur |
| `pages/checkout/` | Commande : formulaire réactif (nom, téléphone, gouvernorat, adresse, note, confirmation) |
| `pages/order-confirmation/` | Confirmation : récapitulatif relu sur le serveur |
| `pages/account/` | Espace client : profil, compteurs, commandes avec détail et statut |
| `pages/product/` | Ajout au panier (choix obligatoires, quantité, personnalisation, « Commander maintenant ») |

### Pourquoi ces choix

- **Le prix final vient toujours du serveur.** Le panier ne garde que les produits, quantités et mesures. Les prix affichés au panier et à la commande sont ceux de `catalog.quoteCart` ; à la commande, le serveur recalcule encore tout et fige les prix. Vérifié : 959,00 DT au panier = 959,00 DT à la commande = 959,00 DT enregistrés.
- **Même format de panier que le site React** (même clé `elegance-deco-cart`, mêmes champs) : le jour de la bascule (phase 3), les paniers des clients ne seront pas perdus.
- **Le gouvernorat** est envoyé dans le champ « ville » de la commande (procédure inchangée).
- **Téléphone tunisien** : le formulaire exige 8 chiffres (avec ou sans +216) ; le serveur vérifie de nouveau avec sa propre règle.
- **Profil** : validé avec `profileUpdateSchema` et `fieldErrors` **importés** de `shared/validation.ts` (les mêmes règles et les mêmes messages que le serveur).
- **Ligne néon** : le panier sait déjà les afficher et le serveur les chiffre ; elles seront ajoutées depuis le configurateur à l'étape A-07 (vérifié en déposant une ligne néon dans le panier).

### Notions Angular utilisées dans cette étape

**Service avec signals et `computed`** — `CartService` garde les lignes dans un signal ; le nombre d'articles est une valeur dérivée :
```ts
readonly items = signal<CartItem[]>(readStoredCart());
readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
```
La pastille du panier (en-tête et barre du bas) affiche `cart.count()` : elle se met à jour toute seule quand on ajoute, modifie ou retire un article.

**`effect()`** — Une action automatique quand un signal change. Dans `CartService`, chaque modification du panier est sauvegardée dans le navigateur :
```ts
effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items())));
```

**Guards (authGuard + guestGuard)** — Des fonctions exécutées AVANT d'entrer sur une page.
```ts
export const authGuard: CanActivateFn = async (_route, state) => {
  await auth.loadCurrentUser();
  return auth.isLoggedIn() ? true : router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};
```
Dans `app.routes.ts` : `{ path: 'checkout', canActivate: [authGuard], … }`. Un visiteur qui clique « Passer la commande » arrive sur `/connexion?retour=/checkout`, se connecte, et **revient directement sur `/checkout`**. `guestGuard` fait l'inverse sur `/connexion` : une personne déjà connectée est renvoyée vers la page de retour. L'adresse de retour est vérifiée (`safeReturnUrl`) : elle doit commencer par `/`, jamais `//autre-site.com`.

**Intercepteur HTTP** — Un filtre sur TOUTES les requêtes. Pour que les appels tRPC passent par lui, tRPC utilise le `HttpClient` d'Angular (fonction `fetchWithHttpClient`). L'intercepteur :
```ts
loading.start();
return next(request).pipe(
  catchError((error) => { if (error.status === 401 && !isLogin) { /* oublier l'utilisateur, aller à /connexion?retour=…&session=expiree */ } return throwError(() => error); }),
  finalize(() => loading.stop()),
);
```
- `finalize` : la barre de chargement s'arrête même en cas d'erreur.
- `auth.login` est exclu : là, 401 signifie « mauvais mot de passe », pas « session expirée ».
- `injector.get(AuthService)` au moment de l'erreur (et pas au démarrage) évite une **dépendance circulaire** (AuthService → tRPC → HttpClient → intercepteur → AuthService).

**Formulaire réactif + validateur personnalisé** — Dans `CheckoutPage` :
```ts
phone: new FormControl('', { nonNullable: true, validators: [Validators.required, tunisianPhoneValidator] }),
governorate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
confirmed: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
```
`tunisianPhoneValidator` est une simple fonction qui renvoie `null` (valide) ou `{ tunisianPhone: true }` (erreur). Modifier le téléphone ou l'adresse décoche la confirmation (`valueChanges` + `takeUntilDestroyed`).

**RxJS (panier)** — Les prix du panier sont redemandés à chaque modification :
```ts
toObservable(this.cart.items).pipe(debounceTime(200), switchMap((items) => from(this.cart.quote(items))))
```
`toObservable` transforme le signal en flux ; `debounceTime` regroupe les clics rapides sur « + » ; `switchMap` ignore une réponse arrivée trop tard.

**Paramètre de route en `input()`** — `/commande/:id` : `readonly id = input.required<string>();` puis la commande est relue sur le serveur (`account.order`).

### Ce qui a été vérifié (base de test, ordinateur 1440 px et téléphone 390 px)

- `/espace-client` sans être connecté → `/connexion?retour=/espace-client`.
- Fiche produit : « Ajouter au panier » sans couleur → « Choisissez : couleurs » ; Doré × 2 → ajouté, pastille « 2 articles ».
- Sur mesure 120 × 80 cm + Fixation murale → 419,00 DT calculés par le serveur, ajouté avec « 120 × 80 cm · 0,96 m² · Fixation murale ».
- Panier rechargé : 3 lignes conservées (prix fixe, sur mesure, néon), total serveur 959,00 DT.
- « Passer la commande » → connexion → retour automatique sur `/checkout`, formulaire pré-rempli (nom, téléphone, gouvernorat, adresse).
- Téléphone « 2012345 » → « Numéro tunisien invalide : 8 chiffres… » ; confirmation non cochée → « Confirmez vos coordonnées. »
- Commande enregistrée : référence ED-…, total 959,00 DT ; panier vidé.
- Espace client : la commande, son statut « En attente de confirmation » et son détail (lignes, mesures, livraison).
- Profil : téléphone « abc » → message du schéma partagé ; ville modifiée → « Informations mises à jour ».
- Cookie de session supprimé → l'appel suivant reçoit 401 → retour à `/connexion?retour=/espace-client&session=expiree` avec « Votre session a expiré ».
- Réseau ralenti : la barre de chargement apparaît pendant les appels puis disparaît.
- Données de démonstration supprimées de la base de test ensuite ; la base réelle n'a reçu aucune écriture.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi faire passer tRPC par HttpClient au lieu de `fetch` ?**
   Parce que les intercepteurs Angular ne voient que les requêtes faites avec `HttpClient`. En donnant à tRPC une fonction `fetch` basée sur `HttpClient`, tous les appels au back passent par l'intercepteur : un seul endroit gère le chargement global et la session expirée, pour toute l'application.

2. **Un guard suffit-il à protéger l'espace client ?**
   Non : un guard n'est qu'un confort d'affichage (on évite d'afficher une page inutile). La vraie protection est sur le serveur : `account.*` et `checkout.createOrder` refusent toute requête sans session valide (401). C'est d'ailleurs ce 401 que l'intercepteur transforme en « reconnectez-vous ».

3. **Pourquoi le panier ne contient-il pas les prix « officiels » ?**
   Parce que le navigateur peut être modifié par n'importe qui. Le panier ne garde que les produits, quantités et mesures ; le serveur recalcule tous les prix (au panier pour l'affichage, puis à la commande, où ils sont figés). Un prix envoyé par le navigateur est ignoré.

4. **Quelle est la différence entre `computed()` et `effect()` ?**
   `computed()` calcule une *valeur* à partir d'autres signaux (le nombre d'articles) ; il ne fait rien d'autre. `effect()` exécute une *action* quand des signaux changent (sauvegarder le panier dans le navigateur). On utilise `computed` pour afficher, `effect` pour agir sur l'extérieur.

5. **Comment évitez-vous qu'un lien malveillant redirige après la connexion vers un autre site ?**
   L'adresse de retour (`?retour=`) passe par `safeReturnUrl` : elle n'est acceptée que si elle commence par `/` et pas par `//`. Sinon, on revient à l'accueil. Ainsi `?retour=https://pirate.com` ou `?retour=//pirate.com` ne fonctionnent pas.

### Ajustement après validation de A-03 : ville et téléphone

- **Ville / délégation** obligatoire, en plus de la liste des 24 gouvernorats. Le serveur reçoit « Ville, Gouvernorat » dans son champ ville existant, par exemple `"Hammam Sousse, Sousse"` (procédure inchangée). Au pré-remplissage, `splitCity()` fait l'inverse : « Hammam Sousse, Sousse » → ville « Hammam Sousse » + gouvernorat « Sousse ».
- **Téléphone normalisé** : `normalizeTunisianPhone()` accepte `20123456`, `20 123 456`, `+216 20 123 456`, `00216 20 123 456` (espaces, points, tirets, parenthèses) et renvoie toujours les **8 chiffres** (`20123456`), qui sont envoyés au serveur. Le validateur du formulaire utilise la même fonction : un numéro accepté par le formulaire est forcément normalisable.

```ts
export function normalizeTunisianPhone(value: string | null | undefined): string | null {
  let digits = String(value ?? '').trim().replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('00216')) digits = digits.slice(5);
  else if (digits.length === 11 && digits.startsWith('216')) digits = digits.slice(3);
  return /^[234579]\d{7}$/.test(digits) ? digits : null;
}
```

Vérifié : `+216 20 123 456`, `00216 20 123 456`, `20 123 456`, `+216-98.765.432`, `(+216) 55 123 456` → 8 chiffres ; `2012345`, `12345678` (ne commence pas par 2, 3, 4, 5, 7 ou 9), `+33 6 12 34 56 78`, `abc` → refusés.

**Question possible : pourquoi normaliser le téléphone dans le navigateur si le serveur le vérifie déjà ?**
Pour que toutes les commandes enregistrent le numéro sous la même forme (8 chiffres) : la boutique peut appeler ou écrire sur WhatsApp sans se demander quel format a été saisi. Le serveur reste le garde-fou : il refuse toujours un numéro invalide.

---

## Étape A-04 — Espace vendeur (1/2) : tableau de bord et produits

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `pages/vendor/vendor.routes.ts` | Routes de l'espace vendeur, **chargées à la demande** (`loadChildren`) |
| `pages/vendor/vendor-space.state.ts` | État partagé de l'espace vendeur (tableau de bord), **fourni au niveau de la route** |
| `pages/vendor/vendor-layout.component.*` | Cadre : nom de la boutique connectée, menu, message si la boutique n'est pas validée |
| `pages/vendor/vendor-dashboard.page.*` | Tableau de bord : 8 compteurs calculés par le serveur, produits récents, dernières commandes |
| `pages/vendor/vendor-products.page.*` | Mes produits : recherche, filtres statut / catégorie, pagination, publier / dépublier, supprimer (confirmation) |
| `pages/vendor/product-editor/` | Ajout / modification : informations, prix fixe ou sur mesure (m² / mètre linéaire, options), stock, variantes, photos, vidéo |
| `pages/vendor/category-select/` | Sélecteur de catégorie partagée avec « Vouliez-vous dire … ? » |
| `core/services/vendor.service.ts` | Procédures existantes : `vendor.dashboard`, `vendor.product`, `vendor.saveProduct`, `setProductStatus`, `removeProduct`, `deleteMedia`, `shopCategories.*` |
| `core/services/media-upload.service.ts` | **Envoi de fichiers** vers la route existante `POST /api/uploads`, avec progression |
| `core/guards/auth.guards.ts` | **vendorGuard** : espace réservé aux comptes Vendeur |

### Pourquoi ces choix

- **Mêmes adresses que le site React** : `/espace-vendeur`, `/espace-vendeur/produits`, `/espace-vendeur/ajouter`, `/espace-vendeur/modifier/:id`.
- **Aucune règle recopiée** : le formulaire produit est validé avec `productInputSchema` et `fieldErrors` (`shared/`), l'aperçu du prix sur mesure avec `computeCustomPrice`, le lien vidéo avec `toVideoEmbedUrl`, les formats de fichiers avec `MEDIA_LIMITS`, la suggestion de catégorie avec `findSimilarCategories` et `categorySlug`. Le serveur revalide tout.
- **La boutique n'est jamais envoyée par le navigateur** : le serveur la déduit de la session du vendeur (impossible de modifier les produits d'une autre boutique).
- **Une boutique non validée** (en attente, suspendue, refusée) voit un message à la place des outils ; le guard « approuvé / en attente » plus complet est prévu à l'étape A-05.

### Notions Angular utilisées dans cette étape

**Lazy loading de l'espace vendeur (`loadChildren`)** — Dans `app.routes.ts` :
```ts
{ path: 'espace-vendeur', canActivate: [vendorGuard], loadChildren: () => import('./pages/vendor/vendor.routes').then((m) => m.VENDOR_ROUTES) }
```
Le code de l'espace vendeur est dans des fichiers séparés, téléchargés **seulement** quand un vendeur y entre. Vérifié : en arrivant sur `/espace-vendeur`, le navigateur télécharge de nouveaux fichiers (`vendor-layout`, `vendor-dashboard`…) qu'il n'avait pas chargés sur l'accueil. Un client ne télécharge jamais ce code.

**Service fourni au niveau de la route** — Dans `vendor.routes.ts` : `providers: [VendorSpaceState]`. Ce service n'existe que dans l'espace vendeur : il est créé en y entrant et détruit en le quittant. Le tableau de bord, la liste et le formulaire partagent ainsi les mêmes données (le formulaire appelle `state.reload()` après un enregistrement, la liste est à jour).

**Formulaire réactif complexe** — `ProductEditorPage` contient :
- un **FormGroup imbriqué** pour les variantes : `variants: new FormGroup({ dimensions, colors, materials, models })` ;
- un **FormArray** pour les options du sur-mesure (liste de taille variable) :
```ts
options: new FormArray<ReturnType<typeof optionGroup>>([]),
addOption()          { this.options.push(optionGroup()); }
removeOption(i: number) { this.options.removeAt(i); }
```
Dans le gabarit : `<div formArrayName="options">` puis, pour chaque ligne, `<div [formGroupName]="i">` avec ses champs `formControlName="name"`, `"surchargeType"`, `"amountTnd"`.
- `toSignal(this.form.valueChanges)` : les valeurs du formulaire deviennent un signal, utilisé par l'aperçu du prix (`computed`).

**Upload de fichiers avec progression** — `MediaUploadService.upload()` :
```ts
this.http.post<UploadedMedia>(url, file, { reportProgress: true, observe: 'events', withCredentials: true })
```
`reportProgress` + `observe: 'events'` : HttpClient émet des évènements `UploadProgress` (pourcentage affiché sur la vignette) puis la réponse du serveur (l'identifiant du fichier enregistré). Le service renvoie un Observable ; la page s'y abonne avec `takeUntilDestroyed` (l'envoi est annulé si l'on quitte la page). Un fichier envoyé mais retiré avant l'enregistrement est supprimé du serveur (`vendor.deleteMedia`).

**`viewChild()` et `<dialog>`** — La confirmation de suppression utilise l'élément HTML natif `<dialog>` (clavier, touche Échap et focus gérés par le navigateur), ouvert depuis le code avec `viewChild.required<ElementRef<HTMLDialogElement>>('deleteBox')` puis `.nativeElement.showModal()`.

**`DomSanitizer`** — Pour afficher l'aperçu d'une vidéo YouTube / Vimeo dans un `<iframe>`, Angular exige de marquer l'adresse comme sûre (`bypassSecurityTrustResourceUrl`). On ne le fait que pour l'adresse produite par `toVideoEmbedUrl`, qui n'accepte que `youtube-nocookie.com` et `player.vimeo.com` en https.

**Composant avec `input()` / `output()`** — `CategorySelectComponent` reçoit la catégorie choisie (`value = input<number | null>()`) et prévient le formulaire (`selected = output<number | null>()`) : `<app-category-select [value]="…" (selected)="form.controls.shopCategoryId.setValue($event)" />`.

### Bug trouvé et corrigé pendant la vérification

L'aperçu « Exemple : 100 × 100 cm = … » restait sur « indiquez le prix unitaire » même après avoir tapé le prix. Cause : le `computed` lisait le formulaire avec `this.form.getRawValue()`, qui **n'est pas un signal** → Angular ne savait pas qu'il devait recalculer. Correction : lire `this.values()` (le signal issu de `valueChanges`) dans le `computed`. Règle à retenir : un `computed` ne se recalcule que si ce qu'il lit est un signal.

### Ce qui a été vérifié (base de test, ordinateur 1440 px et téléphone 390 px, un vendeur différent pour chacun)

- **vendorGuard** : un client qui ouvre `/espace-vendeur` est renvoyé vers `/espace-client`.
- **Chargement à la demande** : nouveaux fichiers JS téléchargés en entrant dans l'espace vendeur.
- **Tableau de bord** : nom de la boutique affiché, 8 compteurs (0 au départ, puis 1 produit publié à la fin).
- **Liste vide** : « Aucun produit pour le moment ».
- **Produit à prix fixe** : catégorie « Miroir » → « Vouliez-vous dire « Miroirs » ? » (catégorie d'une autre boutique) → choisie et ajoutée ; prix 180 DT, promo 150 DT, stock 4, couleur « Doré » ; **2 photos envoyées** au serveur de test (progression puis adresse `/media/…`) ; publié → « Produit publié : il est visible dans le catalogue. »
- **Produit sur mesure** : prix au m² 400 DT, largeur 30–200 cm, hauteur 20–150 cm ; 2 options ajoutées puis 1 supprimée (FormArray) → reste « Fixation murale » ; aperçu « Exemple : 100 × 100 cm = 400,00 DT » ; « Publier » sans photo → « Ajoutez au moins une photo pour publier le produit » (schéma partagé) ; « Enregistrer en brouillon » → OK.
- **Modification** : la catégorie, les 2 photos et le stock (4) sont relus ; stock passé à 2 → « 2 en stock » dans la liste.
- **Dépublier / Publier** puis **suppression** avec confirmation → le produit disparaît ; le produit publié apparaît dans le catalogue public (−17 %, 150,00 DT au lieu de 180,00 DT).
- **Commande (ajustement A-03)** : ville « Hammam Sousse » + gouvernorat « Sousse » pré-remplis, ville vide refusée, téléphone « +216 98 765 432 » envoyé « 98765432 » ; enregistré : « 12 rue de la Lumière, Hammam Sousse, Sousse ».
- Données de démonstration supprimées ensuite de la base de test ; base réelle inchangée.

### 5 questions qu'un professeur pourrait poser

1. **Quelle est la différence entre `loadComponent` et `loadChildren` ?**
   `loadComponent` charge à la demande UNE page. `loadChildren` charge à la demande tout un ensemble de routes (ici l'espace vendeur avec son cadre, son tableau de bord, sa liste et son formulaire). C'est adapté à un « espace » entier réservé à certains utilisateurs : les autres ne téléchargent jamais ce code.

2. **Pourquoi un FormArray pour les options, et pas plusieurs FormControl fixes ?**
   Parce que le nombre d'options n'est pas connu à l'avance : le vendeur en ajoute ou en retire (0 à 30). Un FormArray est une liste de formulaires qui grandit avec `push()` et rétrécit avec `removeAt()`, tout en restant un vrai formulaire réactif (valeurs, état, validation).

3. **Comment suivez-vous la progression de l'envoi d'une photo ?**
   Avec `HttpClient` et les options `reportProgress: true` et `observe: 'events'`. Au lieu d'une seule réponse, on reçoit un flux d'évènements : des `UploadProgress` (octets envoyés / total) pendant l'envoi, puis la réponse du serveur. Le pourcentage est affiché sur la vignette.

4. **Le vendeur ne pourrait-il pas modifier les produits d'une autre boutique en changeant l'identifiant ?**
   Non. La procédure `vendor.saveProduct` ne reçoit jamais la boutique : le serveur la déduit de la session, et refuse un produit qui n'appartient pas à cette boutique. Le guard Angular n'est qu'un confort ; la sécurité est sur le serveur.

5. **Pourquoi votre aperçu du prix ne se mettait-il pas à jour, et comment l'avez-vous corrigé ?**
   Le `computed` lisait le formulaire avec `getRawValue()`, qui n'est pas un signal : Angular ne voyait aucune dépendance et ne recalculait jamais. En lisant `values()` (signal créé avec `toSignal(form.valueChanges)`), le `computed` est recalculé à chaque frappe.

---

## Étape A-05 — Espace vendeur (2/2) : boutique, commandes, néon, devis

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `shared/components/image-cropper/` | **Composant de recadrage réutilisable** (rond ou rectangle, déplacement + zoom 1× à 3×, souris, doigt, clavier) |
| `core/services/shop-image.service.ts` | Vérification du fichier, découpe sur un `<canvas>` aux dimensions exactes, envoi avec progression vers `POST /api/vendor/shop/:slot` (route existante) |
| `pages/vendor/shop-images/` | Logo rond + couverture façon Facebook : menu « Importer / Supprimer », fenêtre de recadrage (`<dialog>`) |
| `pages/vendor/vendor-shop.page.*` | **Ma boutique** : informations publiques, liens Facebook / Instagram vérifiés |
| `pages/vendor/vendor-orders.page.*` | **Mes commandes** : regroupement par commande, filtres, recherche, statut de SES articles |
| `pages/vendor/vendor-neon.page.*` | **Néon personnalisé** : réglages de l'atelier, encadré de visibilité, **demandes de devis** |
| `shared/components/neon/` | Texte néon lumineux + aperçu d'un néon commandé (réutilisés à l'étape A-07) |
| `pages/vendor/shop-application/` | Demande vendeur (première demande, demande en attente ou refusée à corriger) |
| `pages/vendor/shop-status.guard.ts` | **Guard vendeur « approuvé / en attente »** |
| `shared/validators/social-link.validator.ts` | Validateur Angular construit sur les fonctions partagées Facebook / Instagram |

Le cadre de l'espace vendeur affiche maintenant **toujours** le nom (et le logo) de la boutique connectée, plus un menu avec pastilles (nombre de produits, commandes en attente). Selon le statut de la boutique : outils de vente (approuvée), écran « demande en cours d'examen » avec photos et récapitulatif modifiable (en attente), motif + formulaire corrigé (refusée), motif + contact (suspendue).

### Pourquoi ces choix

- **Aucun back modifié** : tout passe par des procédures existantes (`vendor.updateShop`, `vendor.applyShop`, `vendor.shop.removeLogo/removeCover`, `vendor.updateOrderStatus`, `vendor.neon.offer/saveOffer/quotes/setQuoteStatus`) et la route d'envoi d'image existante.
- **Règles importées, pas recopiées** : liens sociaux (`normalizeFacebookUrl`, `normalizeInstagramUrl`), dimensions et formats d'image (`SHOP_IMAGE_SPECS`, `SHOP_IMAGE_MIME_TYPES`…), offre néon (`neonOfferSchema`, `NEON_COLORS`, `NEON_SUPPORTS`, `DEFAULT_NEON_SIZES`), polices néon (`neonFont`, `neonFontsStylesheet`). Le serveur revalide tout.
- **Pas de bibliothèque ajoutée** : React utilise `react-easy-crop` ; en Angular, le recadrage est un composant écrit à la main (~200 lignes) avec le même comportement — l'image couvre toujours le cadre, zoom 1× à 3×, zone sombre autour du cadre, grille pour la couverture.
- **Le statut choisi par un vendeur ne touche que ses articles** : vérifié dans la base de test (commande à 2 boutiques : la ligne d'Alpha passe « en préparation », celle de Beta reste « en attente »).
- **La visibilité sur /neon est calculée par le serveur** (boutique active, offre activée et complète) ; Angular affiche simplement sa réponse.

### Notions Angular utilisées dans cette étape

**Composant réutilisable avec `input()`, `model()` et `output()`** — Le recadrage ne connaît ni les boutiques ni le serveur :
```html
<app-image-cropper [src]="crop.src" [aspect]="1600 / 500" shape="rect" [showGrid]="true"
  [(zoom)]="zoom" (areaChange)="onArea($event)" />
```
- `input()` : données reçues (image, rapport largeur/hauteur, forme) ;
- `model()` : **liaison dans les deux sens** `[(zoom)]` — le curseur et les boutons ± du parent changent le zoom, et la molette / le pincement dans le composant mettent à jour le curseur du parent :
```ts
readonly zoom = model(1);        // dans le composant
this.zoom.set(1.2);              // prévient automatiquement le parent
```
- `output()` : la zone choisie (en pixels de l'image d'origine) est envoyée au parent à chaque changement.

Tout le calcul est fait avec des **`computed`** enchaînés : taille du cadre → échelle → centre ramené dans l'image → position de l'image à l'écran → zone découpée. Un `ResizeObserver` met à jour la taille de la zone (rotation du téléphone).

**Guard paramétré (fonction qui fabrique un guard)** :
```ts
export function shopStatusGuard(...allowed: ShopStatus[]): CanActivateFn {
  return async () => {
    const state = inject(VendorSpaceState);   // fourni par la route parente
    await state.ensureLoaded();
    return allowed.includes(state.shop()?.status) ? true : inject(Router).createUrlTree(['/espace-vendeur']);
  };
}
// vendor.routes.ts
{ path: 'commandes', canActivate: [shopStatusGuard('active')], loadComponent: … }
```
Une boutique en attente qui tape `/espace-vendeur/produits` arrive sur `/espace-vendeur`, qui montre l'état de sa demande. Le guard utilise `inject(VendorSpaceState)` : il reçoit le service **fourni par la route parente**. `ensureLoaded()` partage une seule requête entre le guard et le cadre.

**Validateur personnalisé** :
```ts
export function socialLinkValidator(normalize: typeof normalizeFacebookUrl): ValidatorFn {
  return (control) => {
    const result = normalize(String(control.value ?? ''));
    return result.ok ? null : { social: result.error };   // message du serveur, mot pour mot
  };
}
```

**FormArray de taille variable + FormArray de taille fixe** (offre néon) : les tailles (1 à 8, ajout / retrait) et les 3 supports (cases à cocher + supplément), avec `formArrayName` / `[formGroupName]="i"` dans le gabarit.

**Upload d'un `Blob`** produit par un `<canvas>` (et non d'un fichier choisi) : `canvas.toBlob(…, 'image/webp')`, puis `HttpClient.post(url, blob, { reportProgress: true, observe: 'events' })`. Le réencodage supprime aussi les métadonnées (position GPS de la photo…).

**`DOCUMENT` et `effect()`** : le texte néon charge sa police Google Fonts **une seule fois**, en ajoutant un `<link>` dans `<head>` depuis un `effect` (`inject(DOCUMENT)` plutôt que `document` directement).

**`@HostListener`** : le menu « Importer / Supprimer » se ferme au clic en dehors (`document:click`) et à la touche Échap ; le focus revient alors sur le bouton de la photo (accessibilité clavier).

### Bugs trouvés et corrigés pendant la vérification

1. **Bouton « Modifier la couverture » mal placé** : la règle `.menu-image { position: relative }`, écrite après `.coin { position: absolute }`, l'emportait (même poids CSS). Correction : `.menu-image.coin`, plus précis.
2. **Fenêtre de recadrage trop haute sur ordinateur** : la hauteur « plein écran » prévue pour le téléphone s'appliquait aussi à l'ordinateur. Elle est maintenant limitée aux écrans de moins de 640 px.
3. **Pastille de couleur déformée** dans l'aperçu néon : le nom de classe `.pastille` existait déjà dans le style global (filtres de 44 px de haut). Renommée `.puce-couleur`. Leçon : un style global « gagne » sur un nom identique utilisé ailleurs.
4. **Focus perdu** après « Supprimer la photo » (le menu disparaissait avec l'élément qui avait le focus) : le focus revient sur le bouton de la photo.

### Ce qui a été vérifié (base de test, ordinateur 1440 px et téléphone 390 px)

- **Guard** : boutique en attente → `/espace-vendeur/produits` renvoie vers `/espace-vendeur` (état « en cours d'examen », aucun menu de vente) ; refusée → motif affiché + formulaire ; suspendue → motif + contact. Modification d'une demande en attente : lien Facebook invalide refusé avec le message partagé, puis enregistrement.
- **Ma boutique** : lien `twitter.com` refusé (« Seuls les liens Facebook sont acceptés… ») ; `facebook.com/atelieralpha` enregistré `https://facebook.com/atelieralpha` et `@atelier.alpha` enregistré `https://www.instagram.com/atelier.alpha` ; nouveau nom affiché aussitôt en haut de l'espace.
- **Recadrage** : zoom au clavier (120 %), déplacement à la souris (ordinateur) et au clavier (téléphone) ; images enregistrées par le serveur **exactement en 400 × 400 et 1600 × 500** ; logo affiché en haut de l'espace ; suppression du logo → initiales.
- **Commandes** : Alpha ne voit que son vase (2 × 85 = 170 DT) dans une commande partagée ; statut « En préparation » enregistré ; filtres et recherche ; Beta voit l'aperçu lumineux du néon « Coffee / Time » et son miroir toujours « en attente ».
- **Néon** : encadré « Pas encore visible… Il manque : Enregistrez votre offre néon » → enregistrement sans prix → 3 erreurs listées → prix, couleurs, support, activation → « Visible sur /neon » ; relu après rechargement. **Devis** : demande avec logo affichée, statut « Répondue » conservé après rechargement.
- Téléphone : aucune cible tactile < 44 px, aucun défilement horizontal ; aucune erreur dans la console.
- Données de démonstration supprimées ensuite ; base réelle identique avant / après.

### 5 questions qu'un professeur pourrait poser

1. **Quelle différence entre `input()`, `model()` et `output()` ?**
   `input()` : une valeur qui descend du parent vers l'enfant. `output()` : un évènement qui remonte de l'enfant vers le parent. `model()` combine les deux pour une même valeur : le parent écrit `[(zoom)]="zoom"`, et une modification d'un côté met l'autre à jour. Le zoom du recadrage est un `model` parce qu'il peut changer depuis le curseur du parent ou depuis la molette / le pincement dans le composant.

2. **Pourquoi votre guard est-il une fonction qui retourne un guard ?**
   Pour le paramétrer : `shopStatusGuard('active')` pour les pages de vente, et l'on pourrait écrire `shopStatusGuard('active', 'pending')` pour une page ouverte aux boutiques en attente. Un seul code, plusieurs règles.

3. **Le guard empêche-t-il vraiment une boutique en attente de vendre ?**
   Non, c'est un confort d'affichage : le code Angular peut être modifié dans le navigateur. La vraie protection est sur le serveur : `saveVendorNeonOffer` appelle `requireActiveShop`, les procédures produits et commandes vérifient la boutique de la session.

4. **Pourquoi recadrer dans le navigateur plutôt que sur le serveur ?**
   Le vendeur voit exactement le résultat avant l'envoi, et on n'envoie qu'une image légère aux dimensions finales. Le serveur ne fait pas confiance pour autant : il revérifie le format, le poids et les dimensions exactes (400 × 400 / 1600 × 500).

5. **Comment le `computed` de la zone de recadrage reste-t-il juste quand l'écran change de taille ?**
   La taille de la zone est un signal mis à jour par un `ResizeObserver`. Le centre choisi est stocké en pixels de l'image d'origine (pas de l'écran) : quand la taille ou le zoom change, tous les `computed` qui en dépendent (échelle, position, zone) se recalculent automatiquement, sans perdre le cadrage.

---

## Étape A-06 — Console d'administration

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `core/guards/auth.guards.ts` | **adminGuard** : console réservée aux comptes Administrateur |
| `core/services/admin.service.ts` | Procédures existantes `admin.*` (types déduits du back), libellés des statuts |
| `pages/admin/admin.routes.ts` | Routes de la console, **chargées à la demande** (`loadChildren`) |
| `pages/admin/admin.state.ts` | Indicateurs partagés (pastilles du menu), fournis au niveau de la route `/admin` |
| `pages/admin/admin-layout.component.*` | Barre latérale sombre (ordinateur), tiroir (téléphone), sans l'en-tête du site |
| `pages/admin/admin-ui.ts` | Briques réutilisables : liste serveur (`serverList`), badge de statut, pagination, fenêtre de confirmation avec motif, fenêtre de formulaire |
| `pages/admin/admin-overview.page.*` | Vue générale : 10 indicateurs, « À traiter », graphique 30 jours (SVG), dernières activités |
| `pages/admin/clients/` | Liste (filtre, recherche, pagination) + fiche (adresses, commandes, suspendre / réactiver) |
| `pages/admin/vendors/` | Liste + fiche : **approuver, refuser avec motif obligatoire, suspendre avec motif**, réactiver |
| `pages/admin/products/` | Liste (statut, vendeur, catégorie, prix min / max) + fiche : publier / approuver, dépublier, **refuser avec motif**, supprimer, catégorie du site |
| `pages/admin/categories/` | Catégories du site : **masquer** (motif), **renommer**, **fusionner** ; catégories globales : propositions des vendeurs, créer, modifier, activer / désactiver, supprimer avec réaffectation |
| `pages/admin/orders/` | Liste (statut, vendeur, dates, recherche) + **demandes de devis néon** + fiche (articles par boutique, historique, commissions, changement de statut avec note) |
| `pages/admin/admin-settings.page.*` | Paramètres : identité, coordonnées, livraison, validation des produits, commission, **configurateur néon (catégorie + bannière)**, conditions |

Le composant racine masque l'en-tête, le pied de page et la barre du bas du site sur `/admin` (la console est une application indépendante, comme sur le site React) ; l'en-tête affiche un lien « Administration » pour un compte admin.

### Pourquoi ces choix

- **Aucun back modifié** : 30 procédures `admin.*` existantes. La sécurité reste sur le serveur : chaque procédure vérifie le rôle admin, le motif d'un refus (≥ 3 caractères) est revérifié par le serveur, les paramètres sont validés par son schéma.
- **Mêmes textes et mêmes règles que la console React** (titres des fenêtres, messages de confirmation, motif obligatoire ou facultatif selon l'action).
- **Pas de bibliothèque de graphiques** : React utilise `recharts` ; en Angular le graphique des 30 jours est un SVG calculé par un `computed` (aire des ventes + ligne des commandes, avec un texte alternatif « 30 derniers jours : N commandes, X DT »).
- **Pagination et filtres sur le serveur** (le serveur renvoie 20 lignes par page et les compteurs des onglets). **Pas de tri par colonne** : le serveur trie toujours par date (les plus récents d'abord) et n'a pas de paramètre de tri ; un tri fait dans le navigateur ne porterait que sur les 20 lignes affichées, ce qui serait trompeur. Il a été retiré après validation, et le tri côté serveur est noté dans `BACK-A-FAIRE.md` (à faire après la bascule).

### Notions Angular utilisées dans cette étape

**adminGuard + lazy loading de toute la console** — dans `app.routes.ts` :
```ts
{ path: 'admin', canActivate: [adminGuard], loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.ADMIN_ROUTES) }
```
Visiteur → `/connexion?retour=/admin/…` ; client → `/espace-client` ; vendeur → `/espace-vendeur`. Le code de la console (≈ 15 pages) n'est téléchargé que par un administrateur.

**Liste serveur avec RxJS : `toObservable` + `debounceTime` + `switchMap`** (`admin-ui.ts`) :
```ts
toObservable(computed(() => ({ f: filters(), v: version() })))
  .pipe(
    debounceTime(250),                       // on attend que l'admin ait fini de taper
    switchMap(({ f }) => from(load(f))),     // une nouvelle recherche ANNULE l'ancienne réponse
    takeUntilDestroyed(),
  )
```
Chaque page déclare seulement ses filtres sous forme de signal :
```ts
readonly list = serverList(
  computed(() => ({ status: this.status(), search: this.search().trim() || undefined, page: this.page() })),
  (f) => this.admin.clients(f),
);
```
Sans `switchMap`, une réponse lente pour « Sa » pourrait arriver après celle de « Sarra » et afficher de mauvais résultats.

**Paramètres d'adresse reçus comme `input()`** (`withComponentInputBinding`) : `/admin/vendeurs/:id` → `readonly id = input.required<string>()` ; `/admin/produits?statut=pending&boutique=12` → `readonly statut = input<string>()`. Un `effect` recharge la fiche quand `id()` change.

**Fenêtre de confirmation réutilisable** : `<app-confirm-dialog [request]="request()" (confirmed)="apply($event)" (cancelled)="…" />`. La page décrit la demande (`title`, `description`, `reason`, `reasonRequired`…) dans un `computed` ; le composant gère le `<dialog>` natif, Échap, le clic sur le fond, et renvoie le motif saisi. Le contenu supplémentaire (liste « catégorie de remplacement ») est passé par **projection de contenu** (`<ng-content />`).

**Service fourni au niveau de la route** : `AdminState` (indicateurs) est partagé par le cadre (pastilles du menu) et les pages, qui appellent `state.reload()` après chaque action — les pastilles « 2 / 1 / 1 / 1 » disparaissent au fur et à mesure.

**`NgTemplateOutlet`** : la barre latérale est écrite une seule fois dans un `<ng-template #sidebar>` et affichée à deux endroits (colonne fixe sur ordinateur, tiroir sur téléphone).

### Bugs trouvés et corrigés pendant la vérification

1. **Interrupteurs** (catégorie visible, paramètres) : le dessin de l'interrupteur recouvrait la case à cocher invisible, qui ne recevait pas le clic. Correction : la case passe au-dessus (`z-index: 1`).
2. **Cibles trop petites sur téléphone** : les liens de nom dans les tableaux mesuraient 18 px de haut → `min-height: 44px`.
3. **Message affiché avant la mise à jour du tableau** (catégories) : le message s'affiche maintenant une fois les données rechargées.
4. Montants coupés sur deux lignes (« 140,00 / DT ») → `white-space: nowrap`.
5. Avertissements « `?.` inutile » : certaines données peuvent manquer (compte ou boutique supprimés) alors que le type déduit ne le dit pas ; je l'ai rendu explicite (`as VendorDetail['owner'] | null`) au lieu de supprimer la protection.

### Ce qui a été vérifié (base de test, administrateur de test, ordinateur 1440 px + téléphone 390 px)

- **adminGuard** : visiteur → `/connexion?retour=%2Fadmin%2Fproduits` ; client → `/espace-client` ; vendeur → `/espace-vendeur`. En-tête et barre du bas du site masqués dans la console.
- **Vue générale** : « À traiter : 2 demande(s) vendeur, 1 produit(s) en attente, 1 catégorie(s) proposée(s) » ; pastilles 2 / 1 / 1 / 1 qui disparaissent après traitement ; chiffre d'affaires 290,00 DT et commissions 29,00 DT calculés par le serveur.
- **Vendeurs** : lien « 2 demande(s) vendeur » → onglet « En attente » ; Gamma approuvé ; refus de Delta **sans motif refusé** (« Indiquez un motif (au moins 3 caractères). ») puis avec motif ; recherche « Epsilon » → 1 ligne ; suspension avec motif affiché sur la fiche, puis réactivation.
- **Produits** : produit en attente approuvé ; vase refusé avec motif (« Refusé · Photos floues (démo) », note visible sur la fiche) ; filtres vendeur + prix ≥ 100 → 1 produit ; suppression définitive depuis la fiche.
- **Catégories du site** : « Luminaires démo » renommée ; « Miroir démo » fusionnée dans « Miroirs démo » (« 1 produit(s) déplacé(s), aucun supprimé ») ; masquée avec motif (« par Admin Démo · le 18/10/2026 ») puis réaffichée. **Globales** : proposition validée ; nom en double refusé par le serveur (« La catégorie « Céramique démo » existe déjà ») ; création, désactivation, suppression.
- **Commandes** : demande de devis néon avec logo listée ; recherche par référence ; fiche avec les 2 boutiques ; passage « En préparation » avec note → historique « En attente → En préparation · Administration (Admin Démo) « Appel du client effectué (démo) » ».
- **Clients** : recherche, suspension puis réactivation du compte.
- **Paramètres** : « Enregistrer » inactif sans modification ; e-mail invalide refusé par le serveur (« Adresse e-mail invalide ») ; catégorie néon, bannière masquée, commission 12,5 % enregistrées et relues après rechargement ; paramètres de la base de test **restaurés** ensuite.
- Téléphone : tiroir de menu, titre « Administration · Produits », tableau défilant dans son cadre, aucune cible < 44 px, aucun défilement horizontal de la page.
- Comptes, boutiques, commandes et catégories de démonstration supprimés ensuite ; base réelle identique avant / après.

### Pour l'étape A-09 (parité)
Pages de la console React non demandées par A-06 : **Avis** (modération), **Statistiques**, **Créer un compte** (`/admin/comptes`).

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi `switchMap` et pas `mergeMap` pour la recherche ?**
   `switchMap` abandonne la requête précédente quand une nouvelle arrive : seule la réponse à la DERNIÈRE recherche est affichée. Avec `mergeMap`, toutes les réponses seraient traitées, et une réponse lente pour un ancien texte pourrait écraser la bonne.

2. **Le guard admin suffit-il à protéger la console ?**
   Non. Il évite seulement d'afficher la console à quelqu'un qui n'y a pas droit (et de télécharger son code). Un utilisateur peut appeler l'API directement : la vraie protection est `adminProcedure` côté serveur, qui refuse tout appel d'un compte non admin.

3. **Pourquoi les tableaux n'ont-ils pas de tri par colonne ?**
   Pagination, filtres et compteurs se font sur le serveur, qui ne renvoie que 20 lignes. Trier ces 20 lignes dans le navigateur donnerait l'impression de trier toute la base alors que ce n'est pas le cas : c'est trompeur, donc retiré. Le vrai tri doit se faire dans la requête SQL (`orderBy` avec une liste fermée de colonnes autorisées) ; ce changement du back est décrit dans `BACK-A-FAIRE.md` et sera fait après la bascule.

4. **Comment la page reçoit-elle `?statut=pending` ou l'identifiant `:id` ?**
   Grâce à `withComponentInputBinding()` dans `provideRouter` : le routeur remplit automatiquement les `input()` du composant qui portent le même nom (`id`, `statut`, `boutique`). Le composant ne dépend plus d'`ActivatedRoute`.

5. **Pourquoi dessiner le graphique en SVG plutôt qu'avec une bibliothèque ?**
   Pour un seul graphique simple, un SVG calculé par un `computed` suffit : aucune dépendance à faire approuver, aucun code supplémentaire à télécharger. Les coordonnées sont recalculées automatiquement quand les données changent, et un `aria-label` résume le graphique pour les lecteurs d'écran.

---

## Étape A-07 — Configurateur néon

### Ajustements demandés après A-06

- **Tri des tableaux admin retiré.** Il ne portait que sur les 20 lignes de la page affichée, ce qui était trompeur. Les tableaux gardent les filtres, la recherche et la pagination du serveur. Le tri côté serveur est noté dans `BACK-A-FAIRE.md`.
- **Nouveau fichier `front/BACK-A-FAIRE.md`.** Il liste les changements du back à faire APRÈS la bascule. Pour chacun : le problème, la procédure concernée, la correction proposée et les tests à ajouter. Pour l'instant :
  1. tri côté serveur des listes admin ;
  2. nom de catégorie en double → erreur 500 au lieu de 409/400.
  Il sera complété à chaque étape.

### Ce que j'ai créé

| Fichier | Rôle |
|---|---|
| `core/services/neon.service.ts` | Procédures existantes : `catalog.neonOffers`, `catalog.neonWorkshop`, `catalog.quoteCart` (prix confirmé), `neon.requestQuote`, et la route `POST /api/neon/quote-logo` (envoi du logo avec progression) |
| `shared/components/neon/neon-text.component.ts` | Texte lumineux. Ajouts : fond **Brique**, libellés des fonds, `loadNeonFonts()` (polices OFL chargées seulement par les pages néon) |
| `shared/components/neon/neon-workshop-card.component.ts` | Carte « pub » d'un atelier : couverture, logo, prix de départ, délai, note, mot « Néon » dans sa 1ʳᵉ couleur ; grille 1 / 2 / 3 colonnes |
| `shared/components/neon/neon-banner.component.ts` | Bannière « Votre texte, votre couleur, votre néon. » ; le mot s'allume quand il arrive à l'écran |
| `shared/animated-number.ts` | Prix animé : le nombre défile vers la nouvelle valeur |
| `pages/neon/neon-workshops.page.ts` | `/neon` : liste des ateliers (ou message « Aucun atelier… ») |
| `pages/neon/neon-configurator.page.*` | `/neon/:slug` : configurateur verrouillé sur UN atelier |
| `pages/neon/neon-quote-dialog.component.ts` | Fenêtre « Devis pour votre logo » (`<dialog>` natif) |
| `pages/category/category.page.*` | Bannière + cartes ateliers sur la catégorie choisie par l'admin (`neonBanner` renvoyé par le serveur) |
| `styles.css` | Animation d'allumage (`.neon-allume`, `.neon-a-l-ecran`), mêmes étapes que le site React |

### Comment fonctionne le configurateur

1. **Atelier verrouillé.** L'adresse `/neon/atelier-lumiere-demo` donne le `slug`. La page n'affiche que les tailles, prix, couleurs et supports de cet atelier. Elle n'accepte l'arabe que s'il est autorisé par l'atelier. Pour un slug inconnu, une boutique inactive ou une offre désactivée, elle affiche « Atelier indisponible ».
2. **Aperçu en direct.** Le texte lumineux est fait uniquement en CSS (`text-shadow`). Trois fonds sont proposés : mur sombre, brique (5 dégradés CSS, aucune image) et mur clair. Les dimensions estimées s'affichent en bas à gauche.
3. **Latin ou arabe.** Dès qu'une lettre arabe est tapée :
   - seules les polices arabes sont proposées (Reem Kufi, Aref Ruqaa) ;
   - l'aperçu passe en `dir="rtl"` et `lang="ar"`.

   La fonction partagée `analyzeNeonText` (importée de `shared/neon.ts`) refuse :
   - le mélange des deux écritures ;
   - les emoji ;
   - plus de 25 caractères par ligne.

   Les lignes au-delà de 3 sont coupées pendant la frappe.
4. **Prix.** L'estimation est calculée à chaque frappe par `computeNeonPrice`, la même fonction que celle du serveur (importée, pas recopiée). **À l'ajout au panier, le serveur recalcule** avec `catalog.quoteCart` et les tarifs actuels de l'atelier. C'est ce prix qui est enregistré dans le panier, puis recalculé encore à la commande.
5. **Devis avec logo.**
   - Un visiteur est envoyé vers `/connexion?retour=/neon/<slug>`.
   - Un client envoie l'image (format et taille vérifiés avant l'envoi, revérifiés par le serveur), puis la demande est enregistrée.
   - Un vendeur ou un administrateur voit « réservé aux comptes Client ».

### Notions Angular utilisées dans cette étape

**`linkedSignal` : un choix modifiable qui suit sa source.** La police doit changer automatiquement quand le client passe du latin à l'arabe, et rester modifiable par un clic :
```ts
readonly fontKey = linkedSignal<NeonScript, string>({
  source: this.script,
  computation: (script, previous) => {
    const current = previous?.value ?? 'pacifico';
    return neonFont(current)?.script === script ? current : fontsForScript(script)[0].key;
  },
});
// clic : this.fontKey.set('great-vibes')
```
Il en va de même pour la couleur, la taille et le support : quand l'offre de l'atelier arrive, un choix que l'atelier ne propose pas est remplacé par le sien. Sans `linkedSignal`, il faudrait un `effect` qui écrit dans un signal : c'est plus fragile et déconseillé.

**Toute la page en `computed`.** `analysis → script → request → priced → animatedTotal`. Chaque frappe recalcule uniquement ce qui en dépend, sans abonnement ni désabonnement.

**Prix animé avec `effect` + `onCleanup`** (`shared/animated-number.ts`) :
```ts
effect((onCleanup) => {
  const to = target();
  // … requestAnimationFrame jusqu'à `to` (ralenti à la fin)
  onCleanup(() => cancelAnimationFrame(frame)); // nouvelle cible avant la fin : on repart de la valeur affichée
});
```
Le nombre animé porte `aria-hidden="true"`. Un texte masqué donne le prix final aux lecteurs d'écran. Avec « réduire les animations », le prix s'affiche directement.

**Rejouer une animation CSS : recréer l'élément.** En React, on change la `key`. En Angular, on utilise un `@for` sur un tableau d'un seul élément, suivi par la clé :
```html
@for (k of [replayKey()]; track k) { <div class="neon-allume">…</div> }
```
Quand la police ou la couleur change, la clé change. Angular détruit alors l'ancien élément et en crée un nouveau, et l'allumage repart de zéro.

**`afterNextRender` + `IntersectionObserver`** (bannière). Le code qui touche au navigateur ne s'exécute qu'après le premier affichage : c'est déjà prêt pour le SSR (A-12). L'observateur est déconnecté à la destruction du composant (`DestroyRef`).

**Envoi avec progression puis demande, avec RxJS** :
```ts
const mediaId = await lastValueFrom(this.neon.uploadLogo(file, slug).pipe(
  tap((e) => { if (e.type === 'progress') this.progress.set(e.percent); }),
  filter((e) => e.type === 'done'),
  map((e) => e.mediaId),
));
await this.neon.requestQuote({ shopSlug: slug, mediaId, … });
```

**Accessibilité.**
- Chaque groupe de choix est un `role="radiogroup"` nommé par son titre (`aria-labelledby`), avec des boutons `role="radio"` et `aria-checked`.
- Les pastilles de couleur ont un `aria-label` (« Bleu glace »).
- Les erreurs du texte utilisent `role="alert"` ; l'aide et le récapitulatif utilisent `aria-live="polite"`.
- Dans la fenêtre de devis, le focus va sur « Fermer » à l'ouverture et revient sur le bouton « Envoyer mon logo » à la fermeture. Échap ferme la fenêtre.
- Toutes les cibles font au moins 44 px.

### Bugs trouvés et corrigés pendant la vérification

1. **Ordinateur : l'aperçu collé passait sous l'en-tête.** La valeur `top: 96px` venait de React, mais l'en-tête Angular mesure 140 px. Correction : `top: 156px`. Mesuré : bas de l'en-tête à 140 px, haut de l'aperçu à 156 px.
2. **Fenêtre de devis : « (facultatif) » passait à la ligne.** Le libellé est une grille, donc chaque élément devenait une ligne. Correction : le texte du libellé est regroupé dans un seul élément.

### Ce qui a été vérifié (base de test, ordinateur 1440 px + téléphone 390 px)

**Où apparaissent les ateliers.**
- Catégorie « LED Néon démo » (choisie comme catégorie néon) : bannière, mot allumé à l'écran. Cartes **Atelier Lumière** et **Neon Factory** ; l'atelier à l'offre désactivée n'apparaît pas.
- `/neon` : 2 cartes (« À partir de 150,00 DT · Fabrication en 5 à 7 jours »).

**Prix chez Atelier Lumière** (toutes les valeurs = celles du serveur) :

| Configuration | Total |
|---|---|
| « Bienvenue » (9 lettres, 8 incluses), M | 232,00 DT |
| Taille L | 322,00 DT (pendant l’animation, une valeur intermédiaire s’affiche, par exemple 279,26 DT) |
| + plaque rectangle | 347,00 DT |
| + usage extérieur (+ 20 %) | 416,40 DT |
| Texte arabe « مرحبا بكم » (8 lettres) | 402,00 DT |

**Saisie en arabe et erreurs.**
- Arabe : polices Reem Kufi / Aref Ruqaa, aperçu `dir="rtl"` et `lang="ar"`.
- Erreurs affichées :
  - mélange : « Une seule écriture par néon… » ;
  - emoji : « Caractère non accepté : « ☕ »… » ;
  - 26 caractères : « Ligne 1 : 25 caractères au maximum (26 actuellement). » ;
  - 4 lignes tapées → 3 gardées.
- Bouton d'ajout inactif tant que le texte est invalide.

**Panier.**
- « Coffee / Time » → message « Néon ajouté au panier · Atelier Lumière (démo) · 430,80 DT ».
- Ligne enregistrée avec le prix du serveur et les choix (aucun montant envoyé par le navigateur).
- `/panier` affiche 430,80 DT recalculés par le serveur.

**Autres ateliers.**
- Neon Factory (sans arabe ni extérieur) : pas de case « Usage extérieur ». Taille par défaut XL (2ᵉ taille, comme React) → 420,00 DT. Texte arabe → « Neon Factory (démo) ne réalise pas de néons en arabe. », ajout impossible.
- Offre désactivée et slug inconnu → « Atelier indisponible ».

**Devis.**
- Visiteur → `/connexion?retour=%2Fneon%2Fatelier-lumiere-demo`.
- Client : sans logo → « Choisissez l'image de votre logo. ». Avec logo, taille L, extérieur, téléphone et message → « Demande envoyée à Atelier Lumière (démo) ».
- Focus : sur « Fermer » à l'ouverture, retour sur le bouton à la fermeture ; Échap ferme.
- Compte vendeur → « La demande de devis est réservée aux comptes Client. ».

**Réduire les animations.** Le prix s'affiche directement (322,00 DT) ; aucune animation d'allumage.

**Téléphone.**
- L'aperçu reste collé sous l'en-tête pendant les choix (bas de l'en-tête à 65 px, haut de l'aperçu à 70 px).
- Aucune cible < 44 px, aucun défilement horizontal (390 px).

**Données.** Aucune erreur dans la console. Comptes et données de démonstration supprimés ensuite ; paramètres de la base de test restaurés ; base réelle identique avant / après.

### Remarques pour l'étape A-09 (parité)

- Le lien « Réalisé par … » mène à `/boutique/:slug`, page publique pas encore faite en Angular (déjà notée pour A-09).
- React affiche une notification flottante (« toast ») après l'ajout au panier. Angular affiche le même message sous les boutons, comme sur la fiche produit.

### 5 questions qu'un professeur pourrait poser

1. **Le prix est calculé dans le navigateur : un client ne pourrait-il pas le modifier ?**
   Le navigateur ne fait qu'une estimation pour l'affichage. Au moment d'ajouter au panier, Angular n'envoie que les CHOIX (texte, police, couleur, taille, support, extérieur), jamais un montant. Le serveur relit les tarifs de l'atelier en base et recalcule avec la même fonction `computeNeonPrice`. Il le refait à la commande (`checkout.createOrder`).

2. **Pourquoi `linkedSignal` plutôt qu'un `computed` ou un `effect` ?**
   Un `computed` est en lecture seule : le client ne pourrait pas choisir une autre police. Un `effect` qui corrige un signal fonctionne, mais il crée une écriture « après coup », avec un affichage intermédiaire incohérent. `linkedSignal` réunit les deux : une valeur modifiable par `.set()`, recalculée quand sa source change (écriture latin ↔ arabe, offre de l'atelier).

3. **Comment rejouer l'animation d'allumage quand la couleur change ?**
   Une animation CSS ne se rejoue pas si l'élément reste le même. On force donc Angular à recréer l'élément : `@for (k of [replayKey()]; track k)`. La clé combine police et couleur. Quand elle change, l'ancien élément est détruit et le nouveau démarre son animation.

4. **Comment l'arabe est-il géré (affichage et règles) ?**
   - Règles : la fonction partagée `analyzeNeonText` classe chaque caractère par écriture Unicode (`\p{Script=Arabic}`) et refuse les mélanges. Elle ne compte ni les harakat ni les espaces.
   - Affichage : `dir="rtl"` et `lang="ar"` sur l'aperçu et le champ (`dir="auto"`), avec des polices arabes dédiées chargées à la demande.
   - Sécurité : le serveur refuse aussi l'arabe si l'atelier ne l'accepte pas.

5. **Pourquoi la fenêtre de devis utilise-t-elle `<dialog>` et pas une simple `<div>` ?**
   `showModal()` apporte gratuitement :
   - le fond qui bloque la page ;
   - le focus enfermé dans la fenêtre ;
   - la touche Échap (évènement `cancel`) ;
   - le rôle « dialogue » annoncé par les lecteurs d'écran.

   Il reste à placer le focus au bon endroit à l'ouverture (« Fermer ») et à le rendre au bouton d'origine à la fermeture.

---

## Étape A-08 — Animations, téléphone, finitions

### Ce que j'ai créé ou modifié

| Fichier | Rôle |
|---|---|
| `core/layout/site-header.component.*` | En-tête du site, comme React. **Téléphone** : bouton menu, logo centré, panier, recherche pleine largeur. **Tablette / ordinateur** : recherche, menu du compte, favoris, panier. **Ordinateur** : « Toutes les catégories » (survol ou clic), Nouveautés, Sur mesure (s'il en existe), Promotions, « Vendre sur Elegance Deco ». Tiroir du menu en `<dialog>` |
| `core/layout/mobile-nav.component.*` | **Barre du bas** (téléphone) : Accueil, Catégories, Favoris, Compte. **Panneau « Catégories »** qui monte du bas (`<dialog>`) |
| `core/layout/site-footer.component.ts` | **Pied de page complet** : nom, accroche, réseaux, « Acheter », « Informations », contact. Tout vient des paramètres du serveur ; un champ vide n'est pas affiché. Réserve la place de la barre du bas |
| `core/services/site.service.ts` | Paramètres publics et catégories, chargés **une seule fois** pour tout le site |
| `core/services/favorites.service.ts` | Favoris (procédures existantes `account.favoriteSlugs` / `account.toggleFavorite`), mise à jour optimiste |
| `core/services/toast.service.ts` + `shared/components/toast-host/` | Petites notifications, comme les « toasts » React, au-dessus de la barre du bas |
| `shared/components/icon/` | **Icônes Lucide** (mêmes dessins que React) à la place des emoji. Seuls les tracés ont été repris (licence ISC, mention dans le fichier) : aucune bibliothèque ajoutée |
| `shared/directives/reveal.directive.ts` | `appReveal` : la section apparaît au premier passage à l'écran |
| `shared/components/product-card/` | Survol, fondu décalé, cœur favori avec « pop » |
| `pages/info/info.page.ts` | `/aide`, `/suivre-commande`, `/vendre` : une page, le contenu choisi par la donnée de route |
| `pages/info/legal.page.ts` | `/conditions-generales`, `/conditions-de-vente` : texte rédigé par l'admin |
| `pages/info/vendor-terms.page.ts` | `/conditions-vendeurs` (même document que React) |
| `pages/info/not-found.page.ts` | **Page 404** : route `**` et `/404` (avant, une adresse inconnue renvoyait à l'accueil) |
| `pages/account/` | Section « Vos sélections » ; `/favoris` la met en avant et la fait venir à l'écran |
| `styles.css` | Les animations globales et le bloc « réduire les animations » |

### Les 6 animations du site React

| # | Animation | En Angular |
|---|---|---|
| 1 | Apparition de l'accueil | Les éléments du haut montent l'un après l'autre (`.monte` + `.delai-1/2/3`). Les sections apparaissent à l'entrée dans l'écran (`appReveal`, une seule fois) |
| 2 | Cartes produit | Au survol ou au focus clavier : la carte monte de 6 px, l'ombre apparaît, la photo zoome (×1,07). « Voir le produit » s'affiche (souris seulement). Le cœur fait un « pop » |
| 3 | Prix animé | Le total défile vers le nouveau prix (calcul sur mesure de la fiche produit, néon). Chiffres à largeur fixe |
| 4 | Néon qui s'allume | Fait en A-07 (bannière, configurateur) |
| 5 | Tuiles au survol | Catégories et boutiques montent de 8 px et l'image zoome. Les photos du haut de l'accueil zooment |
| 6 | Chargement élégant | Squelettes aux dimensions des vrais blocs, avec un reflet qui passe. Les cartes arrivent en fondu, 0,12 s d'écart entre chacune |

Mêmes règles que React :
- uniquement `transform` et `opacity` (fluide) ;
- 0,3 à 0,8 s ;
- mêmes courbes (`--ease`, `--ease-sortie`) ;
- rien ne bloque l'utilisateur ;
- **tout est coupé** avec « réduire les animations ».

### Notions Angular utilisées dans cette étape

**Directive d'attribut avec `host`** :
```ts
@Directive({ selector: '[appReveal]', host: { class: 'apparition' } })
export class RevealDirective {
  constructor() {
    const el = inject(ElementRef).nativeElement;
    afterNextRender(() => { /* IntersectionObserver → el.classList.add('visible') puis unobserve */ });
  }
}
```
Il suffit d'écrire `<section appReveal>`. La directive ajoute elle-même la classe de départ. Le code navigateur ne tourne qu'après le premier affichage (`afterNextRender`), ce qui le prépare au SSR (A-12).

**Liaison d'une variable CSS** : `[style.--rang]="i"` donne son rang à chaque carte. Le CSS en déduit le délai : `animation-delay: calc(var(--rang) * .12s)`.

**Rejouer une animation** (même astuce qu'en A-07) : `@for (k of [pop()]; track k)` recrée l'icône du cœur à chaque clic, donc le « pop » repart. Sur l'accueil, `@for (k of [latestFilter()]; track k)` recrée la grille quand on change de filtre : les cartes réapparaissent en fondu.

**Données de route vers `input()`** (`withComponentInputBinding`) :
```ts
{ path: 'vendre', loadComponent: …InfoPage, data: { page: 'vendre' } }
// dans le composant : readonly page = input<'aide' | 'suivi' | 'vendre'>('aide');
```
Une même page sert trois adresses. De la même façon, `/favoris` passe `focus: 'favorites'` à la page Espace client.

**`<dialog>` natif pour le tiroir et le panneau.** `showModal()` apporte :
- le fond qui bloque la page ;
- le focus enfermé dans le panneau ;
- la touche Échap.

L'évènement `(close)` rend le focus au bouton « Catégories ». Le panneau se ferme aussi par un clic sur le fond ou sur un lien.

**Icônes sans `innerHTML`.** `app-icon` dessine chaque tracé avec `[attr.d]`, `[attr.cx]`… dans un `@switch`. Angular n'a rien à « nettoyer », et l'icône est décorative (`aria-hidden`) : c'est le bouton qui porte le nom (`aria-label`).

**Service partagé chargé une fois** (`SiteService`). L'en-tête, le tiroir, la barre du bas, le pied de page et les pages légales lisent les mêmes signaux, et une seule série de requêtes part au démarrage.

**Mise à jour optimiste** (favoris) : le cœur change tout de suite. Si le serveur refuse, l'ancien état revient, avec la notification « Impossible de mettre à jour vos favoris pour le moment ».

### Bugs trouvés et corrigés pendant la vérification

1. **Cibles trop petites sur téléphone** : liens du pied de page (36 px de haut, « Aide » 29 px de large), logo (38 px), fil d'Ariane du catalogue (21 px). Tous font maintenant au moins 44 × 44 px.
2. **Squelette pendant « réduire les animations »** : la règle globale `* { animation: none }` ne touchait pas les pseudo-éléments, donc le reflet (`::after`) continuait. Correction : `*, *::before, *::after`.

### Ce qui a été vérifié (base de test, ordinateur 1440 px + téléphone 390 px)

**Animations.**
- Chargement ralenti volontairement : 50 blocs squelette, reflet animé (`reflet`).
- Le titre monte avec 0,12 s de délai.
- Les sections deviennent visibles au défilement (0 avant, 1 après).
- Fondu des cartes à 0 / 0,12 / 0,24 / 0,36 s.
- Survol d'une carte : `translateY(-6px)`, photo ×1,07, « Voir le produit » visible. Survol d'une tuile : `translateY(-8px)`.
- **Réduire les animations** : aucune transformation, sections visibles tout de suite, aucune animation.

**En-tête.**
- Menu « Toutes les catégories » au survol (6 catégories).
- Menu du compte : visiteur → « Se connecter » ; client → e-mail, « Mon compte », « Se déconnecter ». Échap le ferme et rend le focus au bouton.
- « Vendre sur Elegance Deco ».

**Favoris.**
- Visiteur → `/connexion?retour=…` + « Connectez-vous pour sauvegarder vos favoris ».
- Client → cœur rempli, `aria-pressed="true"`, « pop », « Ajouté à vos favoris ».
- `/favoris` : section mise en avant « Vos favoris et boutiques suivies · Miroir soleil (démo) ».
- Second clic → « Retiré de vos favoris ».

**Pied de page.** Accroche, 4 catégories, liens d'information, e-mail, téléphone, WhatsApp, adresse, livraison, Instagram : tout vient des paramètres de la base de test.

**Pages.**
- `/aide`, `/suivre-commande`, `/vendre` : textes et boutons de React.
- Conditions générales : texte de l'admin. Conditions de vente vides : « Ce document n'a pas encore été publié… ».
- Conditions vendeurs.
- `/adresse-qui-n-existe-pas` : page 404, l'adresse reste dans la barre, titre « Page introuvable ».

**Téléphone.**
- Barre du bas « Accueil · Catégories · Favoris · Compte ».
- Panneau : 6 catégories, focus sur « Fermer », Échap → focus rendu au bouton. Choisir une catégorie ferme le panneau et allume l'onglet.
- Tiroir : compte, catégories, liens ; un lien le ferme.
- Les notifications et la fin du pied de page restent au-dessus de la barre du bas.
- Aucune cible < 44 px et aucun défilement horizontal sur 5 pages.

**Données.** Aucune erreur dans la console. Données de démonstration supprimées, paramètres de test restaurés, base réelle identique avant / après.

### Écarts volontaires et points pour l'étape A-09 (parité)

- **Page 404** : React affiche une page anglaise générique (« Page Not Found », couleurs d'un modèle). Angular : français, aux couleurs du site.
- **`/suivre-commande`** : dans React, cette adresse affiche le contenu de l'Aide (la page cherche la clé « suivre-commande » alors que le contenu s'appelle « suivi »). Angular affiche le bon contenu « Suivre ma commande ».
- **Pages d'information et conditions vendeurs** : React leur donne un ancien en-tête simplifié (« Elegance. »). Angular garde l'en-tête et le pied du site.
- **Pages encore absentes en Angular**, donc liens retirés pour l'instant :
  - Boutiques : lien de l'en-tête, du tiroir et des raccourcis de l'accueil, page `/boutiques` ;
  - « Créer un compte » / `/inscription` ;
  - la page publique d'une boutique (les boutiques suivies s'affichent sans lien).

  Le bouton « Devenir vendeur » de l'accueil vide mène à `/vendre`.
- **Espace vendeur** : React en fait une application indépendante (barre latérale, sans l'en-tête du site). Angular l'affiche dans le cadre du site depuis A-04.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi animer seulement `transform` et `opacity` ?**
   Le navigateur peut les animer sur la carte graphique sans recalculer la mise en page de la page. `top`, `height` ou `margin` forceraient ce recalcul à chaque image, ce qui saccade sur téléphone. C'est aussi pour cela que l'ombre de la carte est un pseudo-élément dont on ne change que l'opacité.

2. **Comment l'utilisateur qui « réduit les animations » est-il respecté ?**
   Par la requête média `prefers-reduced-motion: reduce`. Une règle globale coupe toutes les animations et transitions, pseudo-éléments compris. Les éléments qui partaient invisibles (sections, néon) sont affichés tout de suite, et les déplacements au survol sont annulés. Côté TypeScript, le prix animé vérifie aussi ce réglage et affiche directement la valeur finale.

3. **Pourquoi une directive pour l'apparition au défilement, et pas du code dans chaque page ?**
   Le comportement (observer l'élément, poser une classe, arrêter d'observer) est le même partout. Une directive l'encapsule une fois et s'utilise par un simple attribut, `<section appReveal>`. L'observateur est arrêté à la destruction de l'élément (`DestroyRef`), ce qui évite les fuites de mémoire.

4. **Comment le panneau « Catégories » reste-t-il accessible au clavier et aux lecteurs d'écran ?**
   - C'est un `<dialog>` ouvert par `showModal()` : rôle de dialogue annoncé, focus enfermé, Échap.
   - Le bouton qui l'ouvre porte `aria-expanded`, et le focus va d'abord sur « Fermer » (`autofocus`).
   - À la fermeture, l'évènement `close` rend le focus au bouton « Catégories ».
   - Toutes les cibles font au moins 44 px.

5. **Les favoris changent tout de suite à l'écran : et si le serveur refuse ?**
   C'est une mise à jour « optimiste ». Le service garde l'ancienne liste, modifie le signal tout de suite, puis appelle le serveur :
   - si le serveur répond, sa liste fait foi (relue après coup) ;
   - en cas d'erreur, l'ancienne liste revient et une notification l'explique.

   La vraie règle reste sur le serveur : `account.toggleFavorite` exige une session.

---

## Étape A-09 — Vérification de parité

### Démarche

1. **Tableau comparatif complet** page par page, React ↔ Angular, ordinateur et téléphone : `front/PARITE.md`. Il couvre le site public, le cadre, l'espace client (adresses, favoris, avis, messagerie), l'espace vendeur et la console admin (Avis, Statistiques, Comptes).
2. **Correction de tout ce qui manquait** : l'état final est en section 7 du même fichier.
3. **Bugs du site React** gardés corrigés côté Angular et notés dans `BACK-A-FAIRE.md` (R1–R6, à ne pas corriger dans React puisqu'il sera remplacé), avec les nouvelles limites du back (points 4 à 7).

### Ce que j'ai créé ou modifié

| Fichier | Rôle |
|---|---|
| `pages/shops/shops.page.ts` | `/boutiques` : boutiques validées, recherche par nom, ville ou accroche |
| `pages/shops/shop.page.*` | `/boutique/:slug` : couverture, logo, liens sociaux, suivre, bouton néon (si l'atelier est sur /neon), contacter, catégories en onglets, produits |
| `pages/register/register.page.*` | `/inscription`, `/inscription/client`, `/inscription/vendeur` : schémas partagés `customerRegistrationSchema` / `vendorRegistrationSchema` |
| `pages/login/` | Mot de passe oublié, nouveau mot de passe (token), lien « Créer un compte » |
| `pages/messages/` + `shared/components/messages-panel/` | Messagerie privée réutilisée par le client (`/messages/:shopSlug`) et le vendeur |
| `pages/assistant/` | Assistant Déco IA (`ai.chat`) |
| `pages/account/` | Adresses de livraison, avis (mes avis + noter un produit livré), raccourcis |
| `pages/vendor/vendor-layout.*` | **Espace vendeur = application à part** : barre latérale, barre du haut, tiroir `<dialog>` sur téléphone |
| `pages/vendor/vendor-{categories,stats,messages,reviews,settings}.page.ts` | Mes catégories, Statistiques (histogramme SVG), Messages, Avis clients, Paramètres |
| `pages/admin/reviews/`, `admin-stats.page.*`, `accounts/` | Avis (modération), Statistiques (3 graphiques SVG, 4 périodes), Comptes |
| `core/services/{shop,messages}.service.ts` + compléments | Procédures existantes uniquement (aucune modifiée) |
| `app.ts` | L'en-tête et le pied du site sont masqués sur `/admin` **et** `/espace-vendeur` |

### Notions Angular utilisées dans cette étape

**Le même composant pour plusieurs adresses.** Les données de route alimentent un `input()` :
```ts
{ path: 'inscription/vendeur', loadComponent: …RegisterPage, data: { mode: 'vendor' } }
// readonly mode = input<'choice' | 'client' | 'vendor'>('choice');
```

**Un gabarit réutilisable dans un formulaire réactif.** Un `<ng-template #champ let-f>` affiché par `*ngTemplateOutlet` évite de répéter 9 champs. Piège rencontré : un gabarit prend l'injecteur de l'endroit où il est **déclaré**. Déclaré hors du `<form [formGroup]>`, `formControlName` ne trouve pas le formulaire. Il faut donc déclarer le gabarit à l'intérieur du formulaire.

**Un composant partagé entre deux espaces.** `app-messages-panel` sert au client et au vendeur. La seule différence (de quel côté afficher une bulle) dépend du compte connecté : `m.senderId === auth.user().id`.

**Mise à jour optimiste avec retour arrière** (ordre des catégories) : la liste change tout de suite. Si le serveur refuse, l'ancien ordre revient.

**Graphiques en SVG calculés par `computed`.** Les barres, courbes (`<polyline>`) et barres empilées sont calculées sans bibliothèque (React utilise `recharts`). Un `aria-label` résume le graphique pour les lecteurs d'écran.

**Cadre conditionnel.** `App` décide d'afficher ou non l'en-tête du site selon l'adresse (`/admin`, `/espace-vendeur`). Le cadre vendeur décide ensuite entre l'application complète (boutique approuvée) et un cadre simple (demande en attente, refusée, suspendue).

### Bugs trouvés et corrigés pendant la vérification

1. **Formulaires sans `[formGroup]`** (messagerie, assistant, avis). `(ngSubmit)` n'existe qu'avec une directive de formulaire, donc le bouton déclenchait l'envoi natif du navigateur, qui rechargeait la page. Correction : `(submit)="$event.preventDefault(); …"`.
2. **Avis client** : l'attribut `minlength` faisait bloquer l'envoi par le navigateur avant ma propre vérification, et le message d'erreur n'apparaissait jamais. Correction : `novalidate`.
3. **Statistiques vendeur sur téléphone** : défilement horizontal (498 px) causé par le tableau des commissions, car une colonne de grille s'élargit par défaut pour contenir son contenu. Correction : `min-width: 0` sur les colonnes. Les mois du graphique sont aussi plus lisibles (un sur deux, texte plus grand).
4. **Bouton « + » de la barre vendeur** : 40 px de large sur téléphone, porté à 44 px.
5. **Budget du paquet initial dépassé de 240 octets** (icônes ajoutées) : la page de connexion est maintenant chargée à la demande (489 Ko au lieu de 500).

### Ce qui a été vérifié (base de test, ordinateur 1440 px + téléphone 390 px)

**Boutiques.**
- 2 boutiques ; recherche « Beta » → 1 ; recherche sans résultat → « Aucune boutique ne correspond à votre recherche. ».
- Page Atelier Alpha :
  - liens Facebook et Instagram ; « Créer mon néon avec Atelier Alpha (démo) » ; Contacter → `/messages/atelier-alpha-demo` ;
  - onglets Tous / Miroirs démo / Luminaires démo (la catégorie vide n'apparaît pas), « Miroirs démo » → 1 produit ;
  - slug inconnu → « Boutique introuvable » ;
  - visiteur qui clique « Suivre » → connexion avec retour.

**Fiche produit sur mesure** (produit de démo, supprimé ensuite) : 100 × 80 cm → 320,00 DT. Passage à 200 cm → valeur intermédiaire 496,74 DT, puis 640,00 DT, égal au prix final.

**Comptes et connexion.**
- Inscription client : sans saisie → « Certains champs sont à corriger. » et 8 messages par champ ; puis compte créé → espace client, « Compte Client créé. Bienvenue Démo ! ». Revenir sur `/inscription` → « Vous êtes déjà connecté ».
- Inscription vendeur : sans les conditions → « Vous devez accepter les conditions générales applicables aux vendeurs » ; puis espace vendeur « en attente », sans l'en-tête du site.
- Mot de passe oublié → « Demande envoyée ! » ; token invalide → « Token invalide ou expiré ».
- Assistant : le message de repli s'affiche, car le service d'IA n'est pas configuré en local (voir `BACK-A-FAIRE.md` n° 7).

**Client.**
- Suivre → « Suivie » ; premier message à la boutique → conversation créée, mon message à droite.
- Favori depuis la fiche produit.
- Adresse : erreur si incomplète, puis ajout, puis suppression.
- Avis : « Court » → « au moins 10 caractères » ; avis valide → « En modération ».

**Vendeur.**
- Application à part : pas d'en-tête, pas de pied, pas de barre du bas ; 11 entrées de menu comme React.
- Catégories : renommer, monter, supprimer (« Aucun produit n'utilise cette catégorie »).
- Statistiques : 235,00 DT, 2 articles, commissions 23,50 DT, graphique.
- Messages : message du client à gauche, ma réponse à droite.
- Paramètres : interrupteur WhatsApp (activé puis remis), profil enregistré.

**Admin.**
- Menu avec « Avis | 1 » et « Statistiques ».
- Avis : publier, masquer, supprimer ; l'avis publié apparaît ensuite chez le vendeur (★★★★★).
- Statistiques : 6 indicateurs et 3 graphiques, sur 30 jours et 12 mois.
- Comptes (depuis « Clients → Créer un compte ») : filtre Vendeurs, création d'un compte avec mot de passe généré affiché, puis suspension et réactivation.

**Téléphone.** 8 pages (boutiques, boutique, inscription, messagerie, espace client, statistiques vendeur, statistiques et comptes admin) : aucune cible < 44 px, aucun défilement horizontal. Le tiroir vendeur s'ouvre, et un lien le ferme.

**Données.** Données de démonstration supprimées (0 produit de démo, 0 compte de test) ; base réelle identique avant / après.

### 5 questions qu'un professeur pourrait poser

1. **Comment avez-vous vérifié la parité, et pourquoi d'abord un tableau ?**
   Le tableau fait l'inventaire avant de coder : chaque page React (avec ses adresses et ses procédures tRPC) a une ligne, avec l'état Angular et la correction à faire. Il évite d'oublier des fonctions cachées (mot de passe oublié, raccourcis de l'accueil, messagerie vendeur). Il sert aussi de preuve : la section 7 montre que chaque ligne a été traitée, et les écarts restants sont justifiés.

2. **Pourquoi certains écarts avec React sont-ils gardés ?**
   Parce que la parité ne veut pas dire copier les bugs. Exemples : la 404 anglaise, `/suivre-commande` qui affichait l'Aide, les bulles du vendeur du mauvais côté, l'assistant en panne après 6 échanges. Chaque écart est décrit dans `BACK-A-FAIRE.md` (R1–R6) avec l'endroit du code React concerné, pour la recette de la bascule.

3. **Pourquoi `(ngSubmit)` ne marchait-il pas sur certains formulaires ?**
   `ngSubmit` est un évènement émis par une directive de formulaire : `NgForm` (FormsModule) ou `FormGroupDirective` (`[formGroup]`). Un `<form>` sans l'une des deux n'a pas cet évènement, et le clic sur « Envoyer » déclenche l'envoi HTML natif, qui recharge la page. Pour ces petits formulaires, j'écoute l'évènement DOM `submit` et j'annule l'envoi natif avec `preventDefault()`.

4. **Comment l'espace vendeur est-il devenu une « application à part » sans dupliquer le site ?**
   Le composant racine masque l'en-tête, le pied et la barre du bas quand l'adresse commence par `/espace-vendeur`, comme pour `/admin`. Le cadre vendeur affiche sa propre barre latérale. Sur téléphone, cette même barre est réutilisée dans un `<dialog>` grâce à un `<ng-template>` et `*ngTemplateOutlet` : la navigation n'est écrite qu'une fois.

5. **Le formulaire d'inscription vérifie les champs : le serveur le fait-il aussi ?**
   Oui, et c'est le serveur qui décide. Angular utilise les mêmes schémas zod que le serveur (`shared/validation`, importés et non recopiés) pour afficher les erreurs tout de suite. Le serveur revérifie tout et peut renvoyer des erreurs par champ (ex. « Un compte avec cet email existe déjà »), qu'Angular affiche sous le bon champ (`error.data.fieldErrors`).


---

## Étape A-10 — Architecture et qualité

### Démarche

1. **Ranger le code par espace** : `core/` (ce qui existe une seule fois dans l'application), `shared/` (ce qui est réutilisé), `features/` (une page = un espace). Déplacements faits avec `git mv` pour garder l'historique de chaque fichier.
2. **Une liste de routes par espace**, chargée à la demande.
3. **`ChangeDetectionStrategy.OnPush` sur les 75 composants.**
4. **TypeScript plus strict** et **ESLint (Angular ESLint)** : 125 erreurs au départ, 0 erreur et 0 avertissement à la fin (`maxWarnings: 0`).
5. **Revérification complète** de l'étape A-09 sur la base de test, car OnPush peut empêcher un écran de se mettre à jour sans aucune erreur visible.

### La nouvelle structure

```
src/app/
  core/        api/ (client tRPC) · guards/ · interceptors/ · layout/ (en-tête, pied, barre du bas) · services/
  shared/      components/ · directives/ · pipes/ · validators/
  features/
    public/    accueil, catalogue, catégorie, produit, boutiques, pages d'information, assistant, panier, connexion, inscription, 404
    front-react/    espace client, commande, confirmation, messagerie         (authGuard)
    neon/      ateliers, configurateur, demande de devis
    vendeur/   application vendeur                                      (vendorGuard)
    admin/     console d'administration                                 (adminGuard)
```

| Fichier | Rôle |
|---|---|
| `features/public/public.routes.ts` | `PUBLIC_ROUTES` (accueil chargé tout de suite, le reste à la demande) et `NOT_FOUND_ROUTES` (`404` et `**`, toujours en dernier) |
| `features/client/client.routes.ts` | `CLIENT_ROUTES`, toutes protégées par `authGuard` |
| `features/neon/neon.routes.ts` | `NEON_ROUTES` |
| `features/vendeur/vendor.routes.ts`, `back-office/admin.routes.ts` | Chargés en bloc par `loadChildren`, derrière leur garde |
| `app.routes.ts` | N'assemble plus que les espaces : un tableau de 6 entrées |
| `eslint.config.js` | Règles : recommandées JS + TypeScript + style, Angular (TS, gabarits, accessibilité), OnPush obligatoire, préfixe `app`, suffixe `Component` ou `Page` |
| `angular.json`, `package.json` | Cible `ng lint` (`npm run lint`), fichiers `.ts` et `.html`, 0 avertissement toléré |
| `tsconfig.json` | En plus de `strict` : `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` |
| `app.ts`, `main.ts` | Composant racine renommé `AppComponent` (règle de nommage) |

Bibliothèques ajoutées (accord donné, `devDependencies` de `front/` seulement, versions exactes) : `eslint` 9.39.5, `typescript-eslint` 8.72.0, `angular-eslint` 21.4.0 (licences MIT). `@eslint/js` est fourni par `eslint`.

### Notions Angular utilisées dans cette étape

**Lazy loading par espace.** `loadComponent` charge une page, `loadChildren` charge toute une liste de routes :
```ts
{ path: 'admin', canActivate: [adminGuard],
  loadChildren: () => import('./back-office/admin.routes').then((m) => m.ADMIN_ROUTES) }
```
Un visiteur ne télécharge jamais le code de la console admin. Le paquet initial fait 490 Ko (133 Ko compressé) ; le reste est réparti en plus de 60 morceaux chargés à la demande.

**OnPush.** Par défaut, Angular revérifie tous les composants après chaque évènement. Avec OnPush, un composant n'est revérifié que si : un de ses `input()` change, un évènement part de son gabarit, ou un **signal** lu dans son gabarit change. Comme toute l'application stocke son état dans des signaux, OnPush ne change rien au comportement et réduit le travail. Le seul cas à corriger : le champ de recherche de l'en-tête, une simple propriété liée par `[(ngModel)]`, devient un `signal('')` (`[(ngModel)]="search"` accepte un signal).

**Focus dans un tiroir.** Le tiroir de la console admin (`role="dialog" aria-modal="true"`) met maintenant le focus sur « Fermer » dès qu'il s'ouvre :
```ts
private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
constructor() { effect(() => this.closeButton()?.nativeElement.focus()); }
```
`viewChild` est un signal : il vaut `undefined` tant que le tiroir est fermé (`@if`), puis l'élément dès qu'il apparaît, et l'`effect` se relance à ce moment-là.

### Ce que ESLint a trouvé, et comment je l'ai corrigé

| Règle | Nb | Correction |
|---|---|---|
| `prefer-on-push-component-change-detection` | 75 | `changeDetection: ChangeDetectionStrategy.OnPush` partout (script, puis relecture) |
| `array-type`, `consistent-type-definitions` | 25 | Correction automatique (`ng lint --fix`) : `string[]` au lieu de `Array<string>`, `interface` au lieu de `type = { … }` |
| `template/eqeqeq` | 6 | `!= null` → `!== null` (les champs viennent du serveur et valent `null`, jamais `undefined`) |
| `template/role-has-required-aria` | 2 | Options « Adopter » et « Créer » du sélecteur de catégorie : `aria-selected="false"` ajouté (obligatoire pour `role="option"`) |
| `template/click-events-have-key-events` + `interactive-supports-focus` | 16 | Voir ci-dessous |
| `component-class-suffix` | 1 | `App` → `AppComponent` |

**Les 16 alertes d'accessibilité.**
- **Voile du tiroir admin** : c'était un `<div>` cliquable. C'est devenu un vrai `<button>` (« Fermer le menu », `tabindex="-1"` car le bouton « ✕ » sert déjà au clavier).
- **Fond des fenêtres `<dialog>`** (6 cas) : un clic sur le fond ferme la fenêtre. L'équivalent au clavier existe déjà, c'est la touche Échap, gérée par le navigateur (évènement `cancel`). La règle ne peut pas le savoir. Je l'ai donc désactivée **ligne par ligne**, avec la raison écrite dans le commentaire, et non pour tout le projet.
- **Conteneurs qui écoutent Échap** (menu du compte, sélecteur de catégorie) : ils reçoivent les touches de leurs boutons et champs (l'évènement remonte). Ils n'ont pas besoin d'être focalisables eux-mêmes. Même traitement : désactivation sur la ligne, avec la raison.

**Pourquoi pas `noPropertyAccessFromIndexSignature` ?** J'ai essayé cette option de TypeScript. Elle produit 89 erreurs, toutes dans le code du **serveur** (`../server`), qu'Angular lit pour connaître les types tRPC. Le serveur ne doit pas être modifié (règle 4), donc l'option n'est pas activée ; la correction est notée dans `BACK-A-FAIRE.md` (n° 8).

### Bugs trouvés et corrigés pendant la vérification

1. **Tiroir de la console admin sur téléphone : Échap ne le fermait pas.** Le focus restait sur le bouton « Ouvrir le menu », en dehors du tiroir, donc la touche n'arrivait jamais au tiroir. Ce défaut existait depuis A-06. Correction : focus sur « Fermer » à l'ouverture (voir plus haut).
2. **Voile devenu `<button>`** : les styles par défaut du navigateur (bordure, marges) sont neutralisés en CSS pour garder exactement le même rendu.

### Ce qui a été vérifié

- `ng lint` : « All files pass linting. » ; `ng build` réussi (paquet initial 490 Ko, budget respecté).
- **Base de test, toute la vérification A-09 relancée** (visiteur, client, vendeur, admin, ordinateur 1440 px et téléphone 390 px). Résultats identiques à A-09, sauf des valeurs qui dépendent du moment de la mesure : prix pendant l'animation, date du jour. La fenêtre « Supprimer « Vide renommée démo » ? » paraissait vide dans le texte relevé, car elle était lue avant son affichage ; la capture d'écran la montre bien remplie.
- Tiroir admin sur téléphone : s'ouvre, se ferme par un clic sur le voile, se ferme avec Échap (3 passages de suite).
- Captures ordinateur et téléphone : accueil, catalogue, boutiques, néon, inscription, connexion, 404, panneau des catégories. Rendu inchangé, aucune erreur dans la console.
- React : 27 fichiers de tests réussis, build réussi.
- Données de démonstration supprimées ; base réelle identique avant et après (vérification Angular et tests React).

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi séparer `core/`, `shared/` et `features/` ?**
   Chaque dossier répond à une question différente. `core/` contient ce qui n'existe qu'une fois et sert toute l'application : services d'état, gardes, intercepteur, cadre du site. `shared/` contient des briques sans état propre, réutilisées partout : carte produit, icônes, pipes, validateurs. `features/` contient les écrans, rangés par espace et par public (visiteur, client, vendeur, admin, néon). On sait ainsi où chercher, et une page d'un espace n'importe jamais une page d'un autre espace.

2. **Qu'apporte OnPush, et quel risque présente-t-il ?**
   Moins de vérifications : un composant OnPush n'est revérifié que si ses entrées changent, si un évènement vient de lui ou si un signal qu'il lit change. Le risque : une valeur modifiée « en douce » (une propriété ordinaire, un objet modifié sur place) ne s'afficherait plus, sans erreur. C'est pour cela que tout l'état est en signaux, et que j'ai relancé toute la vérification A-09 après le changement. Un seul cas a dû être corrigé : le champ de recherche de l'en-tête.

3. **Désactiver une règle ESLint, n'est-ce pas tricher ?**
   Ce le serait si c'était global ou sans raison. Ici, la désactivation porte sur une seule ligne et précise la règle concernée et la raison (`-- clic sur le fond du <dialog> ; au clavier : Échap (natif)`). Ce n'est fait que lorsque l'équivalent clavier existe vraiment. Quand la règle avait raison (voile du tiroir admin, options sans `aria-selected`), le code a été corrigé. La vérification a même trouvé un vrai défaut : Échap qui ne fermait pas le tiroir admin.

4. **Comment le lazy loading se combine-t-il avec les gardes ?**
   Sur `/admin`, Angular exécute d'abord `adminGuard`. Si le compte n'est pas administrateur, il redirige, et le code de la console n'est **jamais téléchargé**. Sinon, `loadChildren` télécharge le morceau `admin.routes` et ses pages. Les pages publiques sont chargées une par une (`loadComponent`), sauf l'accueil, chargé tout de suite parce que c'est la première page vue.

5. **Que vérifie TypeScript en plus avec les options ajoutées ?**
   `noImplicitReturns` : une fonction qui renvoie une valeur doit le faire dans tous les cas. `noFallthroughCasesInSwitch` : un `case` ne doit pas « tomber » dans le suivant par oubli d'un `break`. `noImplicitOverride` : une méthode qui remplace celle d'une classe parente doit être marquée `override`. Avec `strict` et `strictTemplates` (déjà actifs), les gabarits HTML sont aussi vérifiés : un `input()` mal typé ou une propriété inexistante bloque la compilation.


---

## Étape A-10b — Accueil « Marketplace »

### Démarche

1. **Ajouter l'étape au plan** (`ANGULAR-PLAN.md`, commit séparé), puis la réaliser.
2. **Chercher les données dans les procédures existantes** avant d'écrire une ligne d'interface. Règle : aucune donnée inventée, une section sans données est cachée.
3. **En-tête, puis accueil section par section**, avec la même identité : couleurs, polices, textes en français, aucun élément d'un autre site.
4. **Base de test** : 3 ateliers de démonstration, 11 produits, 6 vidéos, 1 avis publié, une offre néon. Vérification automatique sur ordinateur (1440 px) et téléphone (390 px), puis captures.

### D'où vient chaque section (back inchangé)

| Section | Procédure | Règle d'affichage |
|---|---|---|
| Cercles (6 catégories) | `catalog.siteCategories` (déjà trié par nombre de créations) | catégories avec au moins 1 création |
| Vidéos | `catalog.list` (12 plus récents), puis `vendor.publicProduct` de chacun | produits avec une vidéo envoyée ; 5 au plus ; section cachée sinon |
| Nouveautés (5 par ligne) | `catalog.list({ sort: 'recent' })` | 10 cartes ; filtres Tout / Sur mesure / Promotions s'ils ont des produits ; ★ seulement si `reviewCount > 0` (carte produit existante) |
| Espaces | aucune donnée : liens vers `/produits?q=salon`, `?q=chambre`… | affichée s'il existe des produits |
| Néon | `catalog.neonOffers` | au moins un atelier propose le néon |
| Ateliers | `catalog.home().shops` + photos de `catalog.list` | 4 boutiques ; leurs 4 photos les plus récentes ; note seulement avec des avis |
| Qu'est-ce qu'Elegance Deco ? | textes fixes, nom lu dans les paramètres | toujours |
| Newsletter | **aucune procédure** | formulaire désactivé « Bientôt disponible » (BACK-A-FAIRE n° 10) |

La vidéo d'un produit n'existe que dans sa fiche. Lire 12 fiches est un contournement. Il est noté dans BACK-A-FAIRE n° 9, avec la procédure proposée : `catalog.homeVideos`, mise en avant ou refus par l'admin, 30 s, 30 Mo, MP4/WebM, image de couverture. Ces 12 appels partent **après** l'affichage de la page : ils ne retardent rien.

### Fichiers

| Fichier | Rôle |
|---|---|
| `features/public/home/home.page.*` | Accueil réécrit : 8 sections, valeurs dérivées en `computed` (cercles, nouveautés par filtre, ateliers avec photos) |
| `features/public/home/workshop-video.component.ts` | **Nouveau** : une vidéo (lecture à l'écran, pause, durée, boutique, prix, cœur, lien vers la fiche) |
| `core/services/catalog.service.ts` | `workshopVideos()` et type `WorkshopVideo` |
| `core/layout/site-header.component.*` | Bouton « Catégories » et son panneau ; grande recherche (bordure foncée, loupe couleur accent) ; « Se connecter » ; 2ᵉ ligne des catégories principales ; favoris sur téléphone ; « Vendre sur … » à 44 px |
| `shared/components/icon/icons.ts` | 8 icônes Lucide ajoutées (canapé, lit, café, ciseaux, hôtel, mallette, lecture, pause). Tracés repris de `lucide-react`, déjà installé : aucune bibliothèque ajoutée |

### La vidéo, en détail

```ts
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    if (video.preload === 'none') video.preload = 'metadata';   // durée connue, quelques Ko
    if (!reduce && !this.pausedByUser) void video.play().catch(() => undefined);
  } else if (!video.paused) video.pause();
}, { threshold: 0.5 });
```
- `preload="none"` + `poster` (photo du produit) : **rien n'est téléchargé** tant que la vidéo n'est pas à l'écran.
- `muted loop playsinline` : les navigateurs n'autorisent la lecture automatique que sans le son, et `playsinline` évite le plein écran sur iPhone. `video.muted = true` est aussi posé en code, car l'attribut seul ne suffit pas toujours quand l'élément est créé par JavaScript.
- **Réduire les animations** (`matchMedia('(prefers-reduced-motion: reduce)')`) : aucune lecture automatique, bouton ▶ au centre.
- **Bouton lecture / pause toujours présent** : un contenu qui bouge plus de 5 s doit pouvoir être arrêté (WCAG 2.2.2). Une pause demandée est respectée : la vidéo ne repart pas en revenant à l'écran.
- Toute la carte mène à la fiche produit : le lien du nom s'étend avec `::after`. Le cœur et le bouton lecture sont des boutons **séparés**, placés au-dessus.
- `afterNextRender` : ce code ne tourne que dans le navigateur, ce qui prépare le rendu serveur de A-12.

### Bugs trouvés pendant la vérification

1. **Textes invisibles sur les vidéos.** La vidéo et le voile étaient positionnés (`position: absolute`), le bloc de texte non. Or les éléments positionnés sont peints **au-dessus** des autres. Correction : `isolation: isolate` sur la carte et `z-index: -1` sur la vidéo et le voile. Le texte reste non positionné, ce qui permet au lien étendu de couvrir toute la carte.
2. **Premier cercle collé au bord sur téléphone.** L'aimantation du défilement (`scroll-snap`) ignore la marge intérieure. Correction : `scroll-padding: 0 16px`.
3. **Paquet initial passé de 490 à 793 Ko.** L'accueil est chargé tout de suite, et il injectait `NeonService` pour savoir s'il existe un atelier néon. Or ce service importe `@shared/productValidation` (donc zod) et les règles du néon : tout cela entrait dans le premier téléchargement. Correction : `CatalogService.neonOffers()` appelle la même procédure sans ces dépendances. Résultat : 498 Ko (135 Ko compressé), soit +8 Ko pour toute la nouvelle page.
4. **Grand vide sur les captures pleine page.** Ce n'était pas un défaut de la page. Les sections apparaissent au défilement (`appReveal`), et une capture prise d'un seul coup ne fait pas défiler. Le script fait maintenant défiler la page avant la capture.

### Ce qui a été vérifié (base de test)

- Ordinateur et téléphone : 8 sections dans l'ordre du plan, 5 cartes par ligne sur ordinateur et 2 sur téléphone, aucune barre de défilement horizontale de la page, aucune erreur dans la console.
- Vidéos :
  - 5 affichées sur 6 possibles ;
  - attributs `muted loop playsinline preload="none"` et image de couverture ;
  - lecture quand elles sont visibles, pause quand on s'éloigne ;
  - bouton pause / lecture, durée « 0:08 » ;
  - un clic ouvre la fiche produit.
- Réduire les animations : aucune vidéo ne joue, 5 boutons ▶ centrés, la lecture démarre au clic.
- Ateliers : Alpha affiche « ★ 4.0 (1 avis) · Tunis · 5 créations » (avis réel publié) ; Beta et Gamma n'ont pas de note.
- En-tête : panneau « Catégories » (5 catégories), « Se connecter », bordure de recherche de 2 px, favoris visibles sur téléphone.
- Recherche « salon » depuis la tuile Salon : 3 créations.
- `ng lint` : 0 erreur, 0 avertissement. Build Angular (498 Ko au départ), tests React (27 fichiers, 196 tests) et build React réussis.
- Base réelle : seule la table `users` a changé pendant l'étape, à cause de la date de dernière connexion du compte admin (10 h 21). Le serveur la réécrit à chaque requête d'un compte connecté (BACK-A-FAIRE n° 11). La requête venait d'une session admin sur le site réel, pas de la vérification : les tests React, rejoués entre deux empreintes, laissent la base identique, et la vérification Angular n'utilise que la base de test.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi ne pas avoir simplement ajouté une procédure `homeVideos` au serveur ?**
   La règle 4 du plan interdit de modifier le back pendant les phases 1 et 2. J'ai donc utilisé ce qui existe : la fiche produit renvoie la vidéo. J'ai limité le coût à 12 appels lancés après l'affichage, et décrit la vraie solution dans BACK-A-FAIRE n° 9 pour l'après-bascule.

2. **Comment éviter qu'une page avec 5 vidéos soit lourde ?**
   Avec `preload="none"`, seule l'image de couverture est chargée. La vidéo n'est demandée que lorsqu'elle est à moitié visible (`threshold: 0.5`), et elle s'arrête quand elle sort de l'écran. Avec « réduire les animations », seules les métadonnées (la durée) sont lues.

3. **Pourquoi des `computed` plutôt que des calculs dans le gabarit ?**
   `circles`, `latest` et `workshops` dépendent de signaux (`categories`, `products`, `home`, `latestFilter`). Un `computed` n'est recalculé que si l'un d'eux change, et son résultat est gardé en cache. Avec OnPush, le gabarit lit une valeur prête au lieu de refaire le regroupement des photos par boutique à chaque vérification.

4. **« Aucune donnée inventée » : comment est-ce garanti ?**
   Chaque section est entourée d'un `@if` sur sa donnée réelle. Pas de vidéo : pas de section vidéo. Pas d'atelier néon : pas de bannière. La note ★ n'apparaît que si `reviewCount > 0`. La newsletter, sans procédure serveur, est affichée désactivée et ne collecte rien. Les seuls textes fixes décrivent le fonctionnement réel du site (paiement à la livraison, ateliers validés).

5. **Comment la carte vidéo reste-t-elle accessible alors que toute la carte est un lien ?**
   Le seul lien est le nom du produit, un texte lisible par un lecteur d'écran. Son `::after` couvre la carte pour la souris et le toucher. La vidéo est `aria-hidden`, car elle est décorative et sans son. Le cœur et le bouton lecture sont de vrais `<button>` de 44 px, avec un `aria-label` qui nomme le produit (« Mettre en pause la vidéo de … »). Le focus clavier est visible sur chacun.


---

## Étape A-10c — Avis clients avec photos (version compacte)

### Démarche

1. **Montrer l'existant, proposer, attendre l'accord.** C'est la seule étape où le back peut changer, et seulement par AJOUTS. J'ai d'abord présenté la table `reviews`, les procédures et l'affichage React, puis le schéma et le SQL proposés. 4 décisions ont été validées :
   - modération avant publication (comme aujourd'hui) ;
   - compléter seulement les nouvelles colonnes des anciens avis ;
   - définition d'une ligne « livrée » : ligne livrée OU commande livrée, jamais annulée ;
   - garder l'ancienne contrainte unique.

   Ajout demandé ensuite pour la vie privée : afficher le nom public avant l'envoi, avec une case « Publier anonymement ». Les photos non rattachées à un avis sont supprimées après 24 h.
2. **Ordre de sécurité** :
   1. mysqldump de la base réelle (hors du dépôt) ;
   2. migration sur la base de TEST ;
   3. tests serveur (13 nouveaux) ;
   4. tous les tests React et build React ;
   5. seulement alors, migration de la base RÉELLE ;
   6. vérification que les données existantes n'ont pas changé.
3. **Interface Angular** : fiche produit, espace client, espace vendeur, console admin. Vérification sur la base de test, sur ordinateur et téléphone.

### Ce qui a été ajouté au back (aucune ligne existante modifiée)

| Élément | Rôle |
|---|---|
| `reviews` + 11 colonnes | `orderItemId` (un avis par ligne, index unique) ; 3 critères ; `purchasedVariant` (« 80 × 150 cm · Doré ») et `isCustom` copiés de la ligne ; `authorDisplayName` / `authorGovernorate` figés à l'envoi (NULL si anonyme) ; réponse unique de l'atelier |
| `review_photos` | 3 photos au plus par avis ; privées tant que l'avis n'est pas publié ; masquables (`hiddenAt`) |
| `review_votes` | « Utile » : un vote par (avis, compte) — index unique |
| `review_reports` | « Signaler » : un signalement par (avis, compte), ouvert / traité |
| `back/server/customerReviews.ts` | Toutes les règles de confiance (voir plus bas) |
| `back/server/reviewPhotoRoutes.ts` | `POST /api/review-uploads` (client connecté) + nettoyage des photos non rattachées après 24 h (au démarrage, toutes les heures, à chaque envoi) |
| `shared/reviewRules.ts`, `shared/tunisia.ts` | Schéma zod de l'avis, nom affiché, variante achetée, gouvernorats : **partagés** navigateur / serveur |
| `routers.ts` | Procédures **ajoutées** : `reviews.overview/page/photos/reviewableLines/submitForLine/toggleHelpful/report`, `vendor.customerReviews/replyToReview`, `admin.reviewDetail/setReviewPhotoHidden/reviewReports/resolveReviewReport`. `reviews.submit` et `reviews.list` (site React) n'ont pas changé. |

### Les règles de confiance, et où elles sont garanties

| Règle | Garantie |
|---|---|
| Avis seulement sur une ligne livrée, par le client de la commande | Requête qui joint la ligne à SA commande (`orders.userId = compte connecté`) ; ligne d'un autre client = « introuvable » (on ne révèle pas qu'elle existe) |
| Une fois par ligne | Index UNIQUE `reviews_order_item_unique` (même deux envois simultanés : la base tranche) + ancienne contrainte (client, commande, produit) |
| Variante, nom et gouvernorat | Copiés par le SERVEUR depuis la ligne et la commande : le navigateur ne peut pas les inventer |
| Anonymat | Ni nom ni gouvernorat ENREGISTRÉS (NULL), pas seulement cachés à l'affichage |
| Photos | Même fonction `storeUpload` que les photos produits (vrai type du fichier, 8 Mo) ; une photo doit appartenir au client, ne pas être déjà utilisée, avoir moins de 24 h |
| Moyenne et répartition | Calculées en SQL sur les avis `published` : les avis en attente ou masqués sont exclus |
| Réponse du vendeur | Seulement sur un avis publié de SA boutique ; `UPDATE … WHERE vendorReply IS NULL` : impossible d'écrire deux fois, ni de toucher au texte de l'avis |
| Fichier `/media/<clé>` d'une photo | Public seulement si l'avis est publié et la photo non masquée ; sinon visible par son auteur et l'admin |

### Côté Angular

| Fichier | Rôle |
|---|---|
| `core/services/reviews.service.ts` | Appels tRPC + envoi des photos (`HttpClient`) ; types déduits du serveur |
| `features/public/product/product-reviews.component.*` | Section « Avis des clients » compacte : onglets « Ce produit » / « Tout l'atelier », résumé ≤ 280 px (note 36 px, barres 5→1, 3 critères), photos des clients (76 px), pastilles + tri, cartes serrées, « Utile », « Signaler », « Voir plus d'avis » |
| `features/public/product/product.page.*` | Note « ★ 4,3 (6 avis) » près du prix (défile jusqu'à la section et y met le focus) ; encadré de confiance |
| `shared/components/stars/*` | Étoiles d'affichage (remplissage partiel, lu « 4,3 sur 5 ») et saisie de note (vrais boutons radio) |
| `shared/components/photo-viewer/*` | Visionneuse plein écran : `<dialog>` natif, Échap, ← →, retour du focus |
| `features/client/account/review-form-dialog.component.*` | « Donner mon avis » : 4 notes, texte, 3 photos, « Votre avis sera publié avec : Sarra B. · Sousse », case « Publier anonymement » |
| `features/vendeur/vendor-reviews.page.ts` | Avis de la boutique + réponse unique (avertissement : publique et définitive) |
| `back-office/reviews/admin-reviews.page.ts` | Panneau « Photos et signalements » (masquer / réafficher une photo), vue « Signalements » |

### Notions utilisées

**Motif ARIA des onglets.** `role="tablist"`, `role="tab"` avec `aria-selected`, `aria-controls` vers le `role="tabpanel"`. Seul l'onglet actif est dans l'ordre de tabulation (`tabindex="0"`, l'autre `-1`) ; les flèches ← → changent d'onglet et déplacent le focus.

**`model()` (liaison dans les deux sens).** `app-star-input` expose `value = model(0)` ; le parent écrit `[(value)]="rating"` avec un signal. Le composant utilise de vrais `<input type="radio">` cachés visuellement : clavier et lecteur d'écran fonctionnent sans code.

**Sous-requêtes corrélées et Drizzle.** Dans une requête sur une seule table, Drizzle écrit `id` au lieu de `reviews.id`. Dans `(SELECT COUNT(*) FROM review_votes v WHERE v.reviewId = id)`, `id` désignait alors… la colonne de `review_votes`. Les tests l'ont montré (compteurs à 0) ; `reviews.id` est maintenant écrit en clair.

### Bugs trouvés pendant l'étape

1. **Nom affiché « Sarra A. » au lieu de « Sarra B. »** pour « Sarra Ben Ali » : je prenais l'initiale du dernier mot. Le nom commence au 2ᵉ mot. Trouvé par les tests.
2. **Compteurs « Utile » et « avec photos » à 0** : sous-requêtes non qualifiées (voir plus haut). Trouvé par les tests.
3. **Lien « (N avis) »** : la section passait sous l'en-tête collant (marge de défilement posée sur l'hôte et non sur la section `#avis`). Corrigé : arrêt à 96 px (téléphone) et 150 px (ordinateur).
4. Faux problème écarté : « Publier anonymement » semblait sans effet dans un script. En zoneless, Angular met l'écran à jour juste après l'événement ; le script lisait trop tôt. Vérifié en relisant après 400 ms, puis de bout en bout (avis anonyme enregistré avec nom et gouvernorat NULL).

### Ce qui a été vérifié

- **Base réelle** : mysqldump avant migration ; migration = exactement les 17 éléments approuvés ; ensuite, mêmes nombres de lignes et même empreinte pour toutes les tables existantes ; empreinte identique de la migration à la fin de l'étape (tests et builds compris).
- **Tests serveur (base de test)** : 13 tests A-10c :
  - avis refusé si la ligne n'est pas livrée, ou si un avis existe déjà (y compris l'ancien chemin React) ;
  - ligne d'un autre client refusée ;
  - photos : refus sans compte, refus d'un vendeur, refus d'un faux fichier (415), privées avant publication, photo d'un autre compte refusée, plus de 3 refusées ;
  - anonymat ;
  - moyenne 3,5, répartition et critères corrects ; avis masqué exclu ;
  - filtres et tris ;
  - photo masquée retirée du site ;
  - un vote « Utile » par compte ;
  - signalement unique et traité ;
  - le vendeur ne répond qu'à ses avis, une seule fois ;
  - suppression après 24 h (ligne et fichier).
- **Suite complète** : 28 fichiers, 209 tests ; build React ; build Angular (paquet initial inchangé : 498 Ko) ; `ng lint` sans erreur.
- **Navigateur (base de test, 1440 px et 390 px)** :
  - note 4,3 et répartition 3 / 2 / 1 / 0 / 0, avis en attente exclu ;
  - tailles de la maquette : titre 24 px, note 36 px, colonne 280 px, miniatures 76 px, photos 60 px, texte 14 px ;
  - aucune cible de moins de 44 px, aucun débordement ;
  - interactions : « Voir plus », filtres, tri, onglet atelier au clavier, visionneuse (← →, Échap, retour du focus), « Utile » sans compte → connexion ;
  - « Donner mon avis » complet avec photo et anonymat ;
  - réponse du vendeur ;
  - photo masquée et signalement traité dans l'admin.
- Données de démonstration supprimées (comptes @elegancedeco.test, fichiers compris).

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi une contrainte UNIQUE en base, alors que le serveur vérifie déjà « déjà évalué » ?**
   Parce que deux envois presque simultanés peuvent passer tous les deux la vérification avant que l'un écrive. L'index unique `reviews_order_item_unique` rend le doublon impossible au niveau de la base ; le serveur transforme l'erreur `ER_DUP_ENTRY` en message clair. Même principe pour la réponse du vendeur : `UPDATE … WHERE vendorReply IS NULL`.

2. **Pourquoi la variante achetée et le nom sont-ils COPIÉS dans l'avis plutôt que lus à l'affichage ?**
   Un avis doit rester exact dans le temps : si le client change de nom ou si la commande est modifiée, l'avis publié ne doit pas changer. Et le navigateur n'envoie que l'identifiant de la ligne et les notes : la variante et le nom viennent du serveur, impossible de les falsifier.

3. **Comment garantir qu'une photo d'avis non publiée ne soit pas visible ?**
   Les photos d'avis sont dans leur propre table. La route `/media/<clé>` demande à `getReviewPhotoAccess` si le fichier est public : seulement si l'avis est `published` et la photo non masquée. Sinon, seuls l'auteur et l'admin la voient ; les autres reçoivent 404, comme si elle n'existait pas.

4. **Pourquoi les moyennes sont-elles calculées par le serveur ?**
   Le navigateur ne reçoit qu'une page d'avis (5 à la fois) : il ne pourrait pas calculer une moyenne juste. Le serveur calcule en SQL (`AVG`, `GROUP BY rating`) sur tous les avis publiés, en excluant ceux qui sont en attente ou masqués. Les tests vérifient la valeur exacte (3,5) et que l'avis masqué disparaît du calcul.

5. **Qu'est-ce qui rend l'anonymat réel et pas seulement visuel ?**
   Avec « Publier anonymement », le serveur enregistre `authorDisplayName = NULL` et `authorGovernorate = NULL` : l'information n'est pas stockée dans l'avis, donc elle ne peut pas fuiter par une procédure publique. L'avis reste relié à la commande (badge « Achat vérifié ») ; seule la modération voit le compte d'origine, ce qui est nécessaire pour traiter un abus.

---

## Démo en ligne gratuite (hors numérotation des étapes)

**But** : montrer le site depuis un téléphone (4G) sans hébergeur ni domaine. Le site tourne sur le PC, sur la **base de test** avec des données de démonstration. Tout est dans `front/demo-en-ligne/` ; mode d'emploi dans `LISEZMOI.md`.

**Chaîne** : téléphone → `https://….trycloudflare.com` (Cloudflare, HTTPS) → `cloudflared` sur le PC → `proxy-demo.mjs` (127.0.0.1:4300 : mot de passe, noindex, build Angular de production) → back de démo (127.0.0.1:3101, `NODE_ENV=production`, base `elegance_deco_test`, secret de session propre à la démo).

**Choix** :
- **Proxy écrit avec les seuls modules de Node** (`http`, `fs`, `crypto`) : aucune bibliothèque ajoutée, aucun fichier de `back/server/` modifié.
- **Mot de passe** : authentification HTTP « Basic » (fenêtre du navigateur, sur ordinateur comme sur téléphone), à travers la liaison HTTPS du tunnel ; empreinte scrypt sur le disque, comparaison en temps constant, blocage après 10 essais.
- **Cookie de session** : le proxy transmet `X-Forwarded-Proto: https`, donc le serveur pose un cookie `Secure; SameSite=None; HttpOnly` (vérifié à travers le tunnel).
- **Sécurité de la base** : le script refuse toute base dont le nom ne finit pas par `_test` ; empreinte de la base réelle identique avant et après les essais.

**Vérifié à travers Internet** :
- sans mot de passe, mauvais mot de passe ou mauvais identifiant : 401 ;
- avec le bon : site et API, `X-Robots-Tag: noindex` ;
- connexion d'un compte de démo, espace client, fiche produit avec avis et photos ;
- arrêt : l'ancien lien ne répond plus (530) ;
- deux cycles complets lancement / arrêt.

**Limite découverte** : Cloudflare ajoute son propre texte au début de `robots.txt` sur un quick tunnel ; la protection repose donc sur l'en-tête `noindex` (le nôtre et celui de Cloudflare) et surtout sur le mot de passe.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi un proxy séparé plutôt qu'un mot de passe ajouté au serveur ?**
   Le serveur ne doit pas changer pendant la phase 2. Le proxy se place devant, sans toucher au code du site : on peut l'enlever sans rien casser, et le même serveur reste utilisable sans mot de passe en local.
2. **Pourquoi le mot de passe n'est-il pas enregistré en clair ?**
   Seule une empreinte scrypt (avec un sel aléatoire) est stockée. Si le fichier fuit, on ne retrouve pas le mot de passe ; scrypt est volontairement lent, ce qui rend les essais en masse coûteux.
3. **Que veut dire « comparaison en temps constant » ?**
   `timingSafeEqual` met le même temps quelle que soit la position de la première différence. Une comparaison ordinaire s'arrête au premier caractère faux : en mesurant les temps de réponse, on pourrait deviner le mot de passe petit à petit.
4. **Pourquoi `X-Forwarded-Proto` ?**
   Le proxy parle au serveur en HTTP sur le PC, alors que le visiteur est en HTTPS. Sans cette information, le serveur poserait un cookie non sécurisé (`SameSite=Lax`), et la connexion serait moins protégée ; avec elle, il pose le cookie `Secure`.
5. **Qu'est-ce qui est exposé sur Internet ?**
   Uniquement le port 4300 de ce PC, à travers le tunnel, et derrière le mot de passe. Le proxy n'écoute que sur 127.0.0.1 : les autres appareils du réseau, les autres ports et la base réelle ne sont pas accessibles.

---

## Vrai site local (base réelle) et séparation des bases (hors numérotation des étapes)

**But** : utiliser le vrai site sur ce PC et le téléphone (même Wi-Fi) pour remplir la base réelle avant la mise en ligne. Tout est dans `front/site-local/` ; mode d'emploi : `COMMENT-UTILISER.md`.

**Pièces** (modules Node uniquement, aucune bibliothèque ajoutée) :

| Fichier | Rôle |
|---|---|
| `superviseur.mjs` | Lance et surveille MySQL (`--bind-address=127.0.0.1`, `--mysqlx-bind-address=127.0.0.1`), le back (production, base réelle, port 3100) et le site (8080). Relance en cas d'arrêt (1, 2, 5, 10, 30, 60 s) ou de 3 vérifications de santé ratées. Sauvegarde quotidienne. Commandes sur 127.0.0.1:8099. Instance unique. |
| `serveur-site.mjs` | Copie figée du build Angular (`site/`) + relais `/api`, `/media` vers le back |
| `sauvegarde.mjs` | mysqldump compressé + `photos.zip` + manifeste (lignes, SHA256) ; dossier « en-cours » renommé seulement si tout est vérifié ; 14 jours gardés |
| `restaurer-sauvegarde.mjs` | Test dans une base temporaire (par défaut) ou vraie restauration protégée |
| `configurer-pare-feu.ps1`, `nouvelle-cle-session.mjs` | Lancés par l'utilisateur (droits administrateur / secret jamais affiché) |
| `back/scripts/dev-base-test.mjs` (racine) | `npm run dev` : base de test et fichiers de test imposés, refus si la base ne finit pas par `_test` |

**Ce que la vérification a trouvé** :
1. MySQL écoutait sur toutes les adresses, avec des règles de pare-feu « Public » et `root` sans mot de passe : base réelle exposée au Wi-Fi. Corrigé côté MySQL (écoute limitée au PC, y compris le port X 33060, découvert dans le journal) ; le pare-feu reste à configurer par l'utilisateur.
2. Un ancien serveur de développement tournait encore sur la base réelle : arrêté ; `npm run dev` ne peut plus l'utiliser.
3. Les fichiers `.bat` doivent avoir des fins de ligne Windows (CRLF), sinon `cmd` les coupe.

**Vérifié** : adresses localhost et Wi-Fi ; cookies de session sur `http://192.168.100.95` (`HttpOnly; SameSite=Lax`, session gardée, déconnexion) ; plantages simulés (back, site, MySQL tués de force : relancés en 1 s, récupération MySQL en 4 s) ; démarrage par le raccourci, sans fenêtre ; sauvegarde réelle puis « RESTAURATION VÉRIFIÉE » (25 tables, 77 lignes, 17 photos identiques) ; `npm run dev` refusé sur la base réelle et démarré sur la base de test ; 209 tests React ; empreinte de la base réelle identique avant et après tout.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi un superviseur maison plutôt que PM2 ?** PM2 est une bibliothèque de plus (à approuver) et son démarrage automatique sous Windows passe par un service (droits administrateur). Le superviseur fait le nécessaire avec les modules de Node : relance avec attente croissante, vérification de santé, journaux, sauvegarde. À la mise en ligne sur un VPS Linux, PM2 ou systemd prendront le relais.
2. **Pourquoi une copie figée du build ?** Le vrai site ne doit pas changer pendant le développement : `ng build` réécrit `dist/`. Le site sert `site-local/site/`, mis à jour seulement par `mettre-a-jour-site.bat`.
3. **Comment sait-on qu'une sauvegarde est bonne ?** On la restaure : le script recharge le dump dans une base temporaire, compare le nombre de lignes de chaque table et l'empreinte SHA256 de chaque photo au manifeste, puis supprime la base temporaire. Une sauvegarde jamais restaurée ne prouve rien.
4. **Pourquoi `--bind-address=127.0.0.1` ET le pare-feu ?** Défense en profondeur : MySQL refuse lui-même les connexions qui ne viennent pas du PC, et le pare-feu bloque les ports non prévus. Si l'un des deux est mal réglé un jour, l'autre protège encore.
5. **Pourquoi les serveurs de développement n'ont-ils plus le droit d'utiliser la base réelle ?** Le développement crée, modifie et supprime des données pour essayer. Sur de vraies données, une erreur serait définitive. Le lancement de `npm run dev` impose donc la base de test et refuse toute autre base.


---

## Étape A-11 — Performance

### Démarche

1. **Mesurer avant de toucher.** Outil `outils/mesure-lighthouse.mjs` (Lighthouse 12.8.2, licence Apache-2.0, approuvé, `devDependencies` de `front` seulement). Réglage « téléphone » par défaut de Lighthouse (écran mobile, processeur et réseau ralentis), **3 passages par page, passage médian gardé**. Toujours sur le **build de production** servi par le **serveur de test** (base de test, données de démonstration) — jamais le vrai site (l'outil refuse les ports 8080 / 3100).
2. **Comprendre avant de corriger.** `outils/diagnostic-lighthouse.mjs` affiche, pour une page, les éléments qui bougent (CLS), l'élément principal (LCP) et sa décomposition, les ressources bloquantes et les plus gros fichiers.
3. **Corriger, remesurer** dans les mêmes conditions.

**Condition honnête** : l'antivirus Kaspersky de ce PC injecte un script dans chaque page (≈ 2 s de blocage, 138 Ko). Un visiteur ne l'a pas : il est bloqué pendant les mesures, **avant comme après** ; rien d'autre n'est bloqué.

### Résultats (performance, téléphone, médiane de 3)

| Page | Avant | Après | LCP avant → après | CLS avant → après |
|---|---|---|---|---|
| Catalogue `/produits` | 42 | **90** | 9,2 s → 3,0 s | 0,817 → 0,001 |
| Connexion | 50 | **90** | 5,0 s → 3,1 s | 0,765 → 0,001 |
| Page atelier | 43 | **84** | 7,3 s → 3,9 s | 0,977 → 0,037 |
| Fiche produit | 36 | **71** | 15,8 s → 11,6 s | 0,808 → 0,024 |
| Accueil | 62 | **68** | 19,3 s → 17,1 s | 0 → 0 |

Objectif ≥ 90 atteint sur 2 pages, presque sur 1. **Fiche produit et accueil sont limités par le poids des photos** (1 à 2,3 Mo chacune, envoyées en taille réelle) : Lighthouse chiffre ce seul point à ~7,5 s + ~5,3 s. Angular ne peut pas réduire une image que le serveur n'a qu'en grand : la solution (versions réduites à l'envoi) est décrite dans BACK-A-FAIRE n° 19. Accessibilité inchangée (91 à 97). « Bonnes pratiques » 82 et SEO 45-50 viennent de l'absence de HTTPS en local et du `noindex` volontaire du site privé (sujet d'A-12).

### Ce que la mesure a trouvé, et ce qui a été fait

| Cause mesurée | Correction |
|---|---|
| **Le pied de page « sautait »** (CLS 0,8 sur toutes les pages) : pendant le chargement d'une page, `<main>` est vide, le pied s'affiche sous l'en-tête puis est repoussé | `main { min-height: 100dvh }` (`app.css`) : le pied démarre sous l'écran |
| **Pas de compression** (~2,5 à 4 s) : le serveur local envoyait JS et JSON tels quels | Brotli (ou gzip) dans `site-local/serveur-site.mjs` : fichiers compressés une fois et gardés en mémoire, réponses de l'API compressées au passage. `main.js` : 70 Ko → 16 Ko. C'est le rôle que tiendra Nginx en ligne ; le vrai site local en profite aussi |
| **Images principales chargées tard ou en différé** (`lcp-lazy-loaded`) | `NgOptimizedImage` : `priority` (= `fetchpriority="high"`, chargement immédiat) sur la grande photo de la fiche, la couverture de l'atelier et les 2 premières cartes du catalogue / des catégories ; mode `fill` (place réservée par le cadre) ou `width`/`height` partout ailleurs, chargement différé par défaut |
| **zod (272 Ko) téléchargé avec la fiche produit** (validation des avis) | Section des avis en `@defer (on viewport)` avec une place réservée ; le lien « (N avis) » fait défiler jusqu'à la zone (ce qui déclenche le chargement) puis met le focus sur le titre dès qu'il existe |
| Code des vidéos et de la bannière néon dans le paquet de l'accueil | `@defer (on viewport)` ; la grille des vidéos garde ses cases (vides) pendant le chargement : aucun décalage |
| **Régression trouvée en cours de route** : l'accueil à 45, CLS 0,41 — la section vidéo, découverte après l'affichage, s'insérait au-dessus des « Nouveautés » | Les vidéos sont recherchées **avant** le premier affichage ; si la recherche dépasse 1,5 s, la page s'affiche sans vidéos pour cette visite et la section n'est jamais insérée plus tard |
| Vidéo lue pendant le chargement (1,2 Mo en concurrence avec les photos) | La lecture automatique attend l'événement `load` de la page |

**Budget du paquet initial** : `NgOptimizedImage` fait partie du même fichier qu'`@angular/common`, déjà chargé au démarrage. Dès qu'une page l'utilise, il entre dans le paquet initial : 490 → 503 Ko (≈ +1 Ko compressé). Le budget d'avertissement passe de 500 à **510 Ko** (et non plus), en échange de la priorité donnée aux images principales et des contrôles de dimensions d'Angular. Build : aucun avertissement.

### Notions Angular utilisées

**`NgOptimizedImage`** (`ngSrc`). Il impose des dimensions (`width`/`height`) ou `fill` (image en position absolue dans un parent positionné) : la place est réservée, l'image ne pousse rien. Par défaut `loading="lazy"` ; `priority` pour l'image principale d'une page (`fetchpriority="high"`, chargement immédiat ; en rendu serveur, il ajoutera aussi un `<link rel="preload">`). Avec un « loader » (service d'images), il fabrique aussi `srcset` : ce sera possible quand le serveur saura produire des tailles réduites.

**`@defer`** : le contenu du bloc (et les composants qu'il utilise) est téléchargé seulement quand le déclencheur se produit. `on viewport` : quand la zone approche de l'écran. `on viewport(grilleVideos)` : un élément de référence (`#grilleVideos`) sert de déclencheur, ce qui permet un `@placeholder` de plusieurs éléments (les cases vides). Limite : seul le code des *composants* utilisés dans le bloc part dans un fichier à part ; le HTML de la page reste dans son fichier.

**Les trois mesures de Lighthouse qui comptent ici** : **LCP** (moment où l'élément principal est affiché), **CLS** (somme des déplacements visibles inattendus), **TBT** (temps pendant lequel le navigateur est trop occupé par le JavaScript pour répondre).

### Fichiers

| Fichier | Rôle |
|---|---|
| `outils/mesure-lighthouse.mjs`, `outils/diagnostic-lighthouse.mjs`, `outils/comparer-audits.mjs` | Mesure (médiane de 3), diagnostic d'une page, comparaison des audits en échec entre deux rapports |
| `app.css` | Hauteur minimale de `<main>` |
| `site-local/serveur-site.mjs` | Compression Brotli / gzip |
| `product-card`, `shop-logo`, `category-tile`, `neon-workshop-card`, accueil, fiche produit, atelier, boutiques | `NgOptimizedImage` (`fill`, dimensions, `priority`) |
| `product.page.*` | Avis en `@defer`, lien « (N avis) » adapté |
| `home.page.*`, `workshop-video.component.ts` | Vidéos et néon en `@defer`, vidéos avant le premier affichage, lecture après `load` |
| `catalog.page.html`, `category.page.html` | `[priority]` sur les 2 premières cartes |
| `angular.json` | Budget initial 510 Ko |

Rapports HTML de Lighthouse : `outils/rapports-lighthouse/avant|apres/` (générés, non commités).

### Ce qui a été vérifié

- Mesures avant / après ci-dessus (5 pages, 3 passages chacune).
- Build de production (base de test), ordinateur 1440 px et téléphone 390 px : aucune image cassée ; images prioritaires présentes ; section des avis **absente** au départ puis chargée par le lien « (N avis) », focus sur le titre ; 5 vidéos et bannière néon affichées ; les seules requêtes en échec sont le script Kaspersky (bloqué volontairement) et une vidéo interrompue par un changement de page.
- `ng lint` : 0 erreur ; build Angular sans avertissement ; tests React (28 fichiers, 209 tests) et build React ; base réelle identique avant / après les vérifications ; données de démonstration supprimées.
- `npm audit` : 1 alerte « élevée » en production, **déjà présente avant A-11** (`@trpc/server`, BACK-A-FAIRE n° 20) ; Lighthouse ajoute des alertes seulement dans les outils de développement (jamais livrés aux visiteurs).

### Restes connus (côté Angular, hors A-11)

- Accessibilité : contraste insuffisant de quelques petits textes (en-tête, pied) et nom accessible du logo (« Elegance Deco — accueil ») qui ne reprend pas tout le texte visible. Inchangés depuis avant A-11.
- Le vrai site local sert encore l'ancienne version (sans compression ni optimisations) jusqu'à `mettre-a-jour-site.bat` et un redémarrage du site.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi la médiane de 3 passages ?**
   Un score Lighthouse varie d'un passage à l'autre (réseau, processeur, minuteurs). Ici l'accueil a donné 44, 68 et 74 : une seule mesure aurait pu dire « 44 » ou « 74 ». La médiane écarte le passage le plus chanceux et le plus malchanceux, et les mêmes conditions sont gardées avant et après.

2. **Pourquoi le CLS était-il si mauvais, même sur la page de connexion ?**
   Pendant le téléchargement d'une page, la zone `<main>` est vide : le pied de page, haut sur téléphone, s'affiche juste sous l'en-tête. Quand la page arrive, il est poussé vers le bas : c'est un grand déplacement visible, compté par Lighthouse. Une hauteur minimale de l'écran sur `<main>` place le pied hors de l'écran dès le départ.

3. **Qu'apporte `priority` sur une image ?**
   Le navigateur reçoit d'abord le HTML, puis découvre les images au fil de l'affichage, et les télécharge avec une priorité normale (voire plus tard si `loading="lazy"`). Pour l'image principale, `priority` demande un chargement immédiat et une priorité haute : le temps « Load Delay » du LCP diminue. Il ne faut le mettre que sur 1 ou 2 images par page, sinon tout devient prioritaire et plus rien ne l'est.

4. **Pourquoi l'accueil et la fiche produit n'atteignent-ils pas 90 ?**
   Parce que leur élément principal est une photo de 1,5 à 2,3 Mo : sur un réseau de téléphone simulé, la télécharger prend plusieurs secondes, quelle que soit la façon dont Angular la demande. La seule vraie solution est que le serveur prépare des versions réduites (BACK-A-FAIRE n° 19) ; `NgOptimizedImage` est déjà en place pour les utiliser (`srcset`). Le rendu côté serveur (A-12) réduira aussi le délai avant que la page connaisse l'adresse de la photo.

5. **Bloquer le script de Kaspersky, ce n'est pas tricher ?**
   Ce serait tricher si on bloquait un fichier du site. Ce script est ajouté par l'antivirus de ce PC dans toutes les pages de tous les sites ; un visiteur sur son téléphone ne l'a pas. Il est bloqué **dans les deux mesures** (avant et après), et c'est écrit dans l'outil et dans ce rapport : la comparaison reste juste, et plus fidèle à ce que voit un vrai visiteur.

## Étape A-10d — Téléphone « façon application »

### Principe

Tout se passe **sous 768 px**. Sur ordinateur et tablette, rien ne change — prouvé par comparaison pixel à pixel des captures 1440 px avant / après (voir « Vérifié »). Pour cela, `ViewportService` (`core/services/viewport.service.ts`) expose deux signaux, `phone` (`(max-width: 767.98px)`) et `reducedMotion`, mis à jour quand l'écran change. Les mises en page téléphone de l'accueil et de la fiche sont créées avec `@if (viewport.phone())` : sur ordinateur, le DOM est exactement celui d'avant (rien de caché en CSS, aucune image en plus).

Couleurs et polices : celles du site (`--fond` #FAF8F4, `--texte` #2A2420, `--texte-secondaire` #6B625B, `--accent` #A8693F, `--beige` #F1E6DA, `--bordure` #E6DDD2 ; Playfair Display + DM Sans).

### Accueil (téléphone)

| Partie | Réalisation |
|---|---|
| 1. En-tête collant | Fond translucide + `backdrop-filter: blur` ; logo à gauche, favoris + panier (pastille du nombre) à droite ; recherche arrondie de 46 px avec ombre douce, dans l'en-tête collant. Le bouton « menu » disparaît sur téléphone : ses liens (Boutiques, Néon, Suivre ma commande, Vendre, Aide) sont dans le panneau « Catégories » de la barre du bas |
| 2. Ateliers en cercles | Toutes les boutiques de `catalog.home` : logo ou initiales (`app-shop-logo`) + nom → page de l'atelier |
| 3. Carte néon | **Seulement si un atelier propose le néon** (`catalog.neonOffers`). Mot « Néon » lumineux qui « respire » : seule l'**opacité** d'un halo superposé varie (aucun recalcul de mise en page). « Votre texte, en lumière », bouton « Créer » → `/neon` |
| 4. Puces de catégories | Catégories du site qui ont des créations. La puce choisie se remplit en foncé (transition douce) et filtre « Pour vous » ; `aria-pressed` |
| 5. En vidéo | Tuiles verticales 9:16 de 132 × 220 (nouveau format `verticale` de `app-workshop-video`) dans une rangée horizontale aimantée (`scroll-snap`), avec durée, atelier et prix. Mêmes règles qu'en A-10b (muette, lecture à l'écran, pause, rien en « réduire les animations »). Section absente sans vidéo |
| 6. Pour vous | 2 colonnes indépendantes (mosaïque), cartes à coins de 20 px, image 4/5 puis 1/1 en alternance (place réservée par `aspect-ratio`), cœur favori avec « pop », badges **seulement s'ils sont vrais** (Sur mesure = prix au m² / mètre ; Néon = catégorie néon ; −N % = vraie remise), note **seulement s'il existe de vrais avis**, apparition au défilement (`appReveal`) |
| 7. Barre du bas | Flottante, sombre, arrondie, 66 px, à 14 px des bords ; Accueil, Catégories, Favoris, Compte ; une pastille couleur accent glisse sous l'onglet actif (`transform: translateX`) ; `aria-current="page"`. Le bas des pages réserve 110 px + la zone sûre des téléphones à encoche (`env(safe-area-inset-bottom)`) |

**Filtre par catégorie : décidé par le serveur.** Première idée : filtrer dans le navigateur avec le texte `category` de chaque produit. La vérification l'a écartée : ce texte est souvent **vide** (la catégorie d'un produit vient de la catégorie de sa boutique, regroupée par `shared/categoryKey`). Une puce demande donc les créations de la catégorie à `catalog.categoryPage` — la procédure existante de la page `/categorie` — et les garde en mémoire. Pendant ce chargement, la puce est déjà remplie et l'ancienne grille reste affichée, atténuée (`aria-busy`) : rien ne saute. Les créations déjà connues par `catalog.list` gardent leur vraie note ; les autres n'en affichent aucune (jamais une note inventée).

### Fiche produit (téléphone)

| Partie | Réalisation |
|---|---|
| 8. Animation de page | API **View Transitions** du navigateur via `withViewTransitions` du routeur (`core/layout/route-transition.ts`) : en entrant sur une fiche, la page arrive par la droite ; en la quittant, elle revient par la gauche. **Sautée** sur ordinateur, avec « réduire les animations » et entre deux pages qui ne sont pas des fiches (`skipTransition()`) |
| 9. Photo | Pleine largeur, 4/5, une photo par écran (défilement aimanté) ; boutons ronds blancs : retour (page précédente du site, sinon l'accueil), partager (`navigator.share`, sinon copie du lien + « Lien copié »), favori (`aria-pressed`). Points de galerie : le point de la photo visible s'allonge |
| 10. Feuille de contenu | Monte sur la photo (coins de 26 px). Atelier (logo, nom, « Atelier vérifié »), note (si de vrais avis), nom, prix, disponibilité ; puces de variantes avec **pastille de couleur seulement pour une couleur connue** (Doré, Noir, Vert olive… ou un code #rrggbb ; « Cuivre clair » n'a pas de pastille plutôt qu'une fausse) ; encadré livraison / paiement à la livraison ; accordéons « Détails » et « Livraison et retours » ; avis A-10c (version compacte, `@defer`) |
| 11. Barre d'achat fixe | « Total » = **prix fourni par le serveur** × quantité ; bouton « Ajouter au panier » de 54 px. Produit sur mesure : « Confirmez vos mesures » tant que le **serveur** n'a pas confirmé le prix (bouton existant « Confirmer le prix avec le serveur »). Ni l'en-tête du site ni la barre du bas sur cette page. Aucune animation d'ajout |

**« Atelier vérifié » est vrai pour toute fiche affichée** : `getPublicProductData` ne renvoie un produit que si sa boutique est `active`, c'est-à-dire examinée et validée par l'équipe. **« Retours »** : aucune politique de retour n'existe dans les données ni dans les pages du site ; l'accordéon renvoie donc aux conditions de vente au lieu d'inventer une règle.

**Aucune logique en double.** La fiche téléphone est dans le même composant que la fiche ordinateur : mêmes signaux, même `addToCart()` (vérification du prix sur mesure par le serveur, choix obligatoires « Choisissez : couleurs »). Le formulaire des mesures est un `<ng-template #formulaireMesures>` affiché aux deux endroits avec `*ngTemplateOutlet` : un seul formulaire à maintenir, et le DOM de l'ordinateur reste identique.

### Accessibilité et mouvements

Cibles ≥ 44 px (boutons ronds, puces, onglets ; le bouton d'achat 54 px) — seule exception, le lien « conditions de vente » à l'intérieur d'une phrase (les liens dans un texte sont exemptés par WCAG 2.5.8). `aria-pressed` (puces, favoris), `aria-expanded` + `aria-controls` (accordéons, « Catégories »), `aria-current` (barre du bas), focus visible partout. Accordéon fermé = `inert` : son contenu ne reçoit ni le focus ni la lecture d'écran. Effet d'appui `scale(0.96)`. **« Réduire les animations »** supprime tout : règle globale `transition/animation: none`, appui sans effet, halo néon fixe, transitions de page sautées.

### Performance (ne pas perdre A-11)

- **Code téléphone à part** : l'accueil est chargé au démarrage ; y mettre la version téléphone ajoutait 18 Ko au paquet initial, **téléchargés aussi par les ordinateurs**. Elle est donc dans `AccueilTelephoneComponent`, chargé par `@defer (on immediate)` : sur téléphone, son fichier se télécharge **pendant** le chargement des données ; l'ordinateur ne le télécharge jamais. Le paquet initial reste à 503 Ko (+0,7 Ko pour `withViewTransitions`).
- **CLS de la fiche** (mesuré 0,181 au premier essai) : au démarrage, `router.url` vaut encore « / » ; l'en-tête s'affichait puis disparaissait sur une fiche ouverte directement. Le signal d'adresse part maintenant de `location.pathname`. Le chargement de la fiche téléphone a aussi son squelette aux mêmes places (photo 4/5) → **CLS 0**.
- **Vidéos au premier écran** : sur téléphone, la rangée « En vidéo » est visible dès l'ouverture ; 3 vidéos de 1,2 Mo démarraient en même temps que les photos. En format vertical, une vidéo attend maintenant que sa couverture soit affichée ; les 3 premières couvertures sont `priority` ; le code des vidéos est préchargé quand le navigateur est libre (`prefetch on idle`).

Mesures Lighthouse téléphone, **médiane de 5**, même machine, mêmes données, avant (build A-11) puis après :

| Page | Avant | Après | Exigé | LCP avant → après | CLS avant → après |
|---|---|---|---|---|---|
| Accueil | 72 | **71** | ≥ 68 | 6,8 s → 10,3 s | 0 → 0 |
| Fiche produit | 70 | **72** | ≥ 71 | 12,3 s → 11,2 s | 0,024 → 0 |

Le LCP de l'accueil est plus long : le premier écran du téléphone montre maintenant la photo d'une tuile vidéo (1,5 Mo dans les données de démonstration, envoyée en taille réelle). Le score reste au-dessus du seuil ; la vraie correction est la même qu'en A-11 (versions réduites des photos, BACK-A-FAIRE n° 19).

**Budgets** : avertissement du paquet initial 510 → **520 Ko** (dépassement de 0,7 Ko : `withViewTransitions`) ; avertissement par feuille de style de composant 8 → **10 Ko** (l'en-tête était déjà à 7,8 Ko ; +0,8 Ko pour le téléphone). Les seuils d'erreur ne changent pas (1 Mo, 16 Ko). La fiche a deux feuilles : `product.page.css` (inchangée) et `product.page.tel.css`.

### Fichiers

| Fichier | Rôle |
|---|---|
| `core/services/viewport.service.ts` (nouveau) | Signaux `phone` et `reducedMotion` |
| `core/layout/route-transition.ts` (nouveau), `app.config.ts`, `styles.css` | Glissement de page vers / depuis la fiche (téléphone) |
| `app.ts`, `app.html`, `app.css` | Fiche téléphone sans en-tête ni barre du bas ; place réservée en bas des pages |
| `core/layout/site-header.*` | En-tête collant translucide, recherche 46 px, sans bouton menu sur téléphone |
| `core/layout/mobile-nav.*` | Barre flottante, pastille qui glisse, liens « Aussi sur… » |
| `features/public/home/accueil-telephone.component.*` (nouveau) | Accueil téléphone |
| `features/public/home/carte-pour-vous.component.ts` (nouveau) | Carte « Pour vous » |
| `features/public/home/workshop-video.component.ts` | Format vertical 9:16, attente de la couverture |
| `features/public/home/home.page.*` | Choix téléphone / ordinateur |
| `features/public/product/product.page.*`, `product.page.tel.css` (nouveau) | Fiche téléphone, formulaire des mesures partagé |
| `shared/components/icon/icons.ts` | Icône `share-2` (Lucide, comme les autres) |
| `angular.json` | Budgets d'avertissement |

### Ce qui a été vérifié

- **Ordinateur inchangé** : captures pleine page 1440 px de l'accueil, du catalogue, de la fiche, d'une page atelier et de la connexion, build A-11 contre build A-10d, mêmes données, comparées pixel à pixel : 0 pixel différent (catalogue, atelier, connexion), 2 sur 7 millions (accueil), 270 sur la fiche = la barre de mise en mémoire de la vidéo (dépend du réseau).
- **Téléphone 390 px** (build de production, base de test) : cercles, néon, puces (« Miroirs démo » → les 2 miroirs ; « Tout » → toutes les créations), vidéos verticales, mosaïque, aucun défilement horizontal de la page ; fiche ouverte depuis l'accueil (sens « avant ») puis retour (sens « arrière », barre du bas revenue, panier à 1) ; galerie de 3 photos (point actif 1 → 3) ; « Lien copié » sans `navigator.share` ; « Choisissez : couleurs » sans choix ; pastilles des couleurs ; accordéons ; sur mesure : total affiché seulement après la confirmation du serveur (200,00 DT) ; aucune erreur dans la console.
- Lighthouse ci-dessus ; `ng lint` : 0 erreur ; build Angular sans avertissement ; tests React (28 fichiers, 209 tests) et build React ; empreinte de la base réelle identique avant / après ; données de démonstration (comptes @elegancedeco.test) supprimées.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi `@if (viewport.phone())` plutôt que des règles CSS qui cachent une version ?**
   Avec du CSS seul, les deux versions existeraient dans la page : deux fois plus d'éléments, des images téléchargées pour rien, des identifiants en double, et des lecteurs d'écran qui pourraient trouver des éléments cachés. Avec `@if`, seule la version utile est créée. Et c'est ce qui permet de prouver que l'ordinateur n'a pas changé : son DOM est exactement le même. Les deux restent liées au même état (signaux du composant), donc il n'y a pas de logique en double.

2. **Comment fonctionne l'animation de page, et pourquoi est-elle sans risque sur ordinateur ?**
   `withViewTransitions` demande au navigateur une « photo » de l'ancienne page, fait le changement de page, puis anime le passage de l'ancienne à la nouvelle avec des pseudo-éléments CSS (`::view-transition-old/new(root)`). Le sens (« avant » / « arrière ») est posé sur `<html>`, et le CSS choisit l'animation. Sur ordinateur, avec « réduire les animations » ou entre deux pages qui ne sont pas des fiches, `skipTransition()` est appelé : la page change d'un coup, comme avant. Un navigateur qui ne connaît pas l'API change simplement de page.

3. **Pourquoi l'accordéon anime-t-il `grid-template-rows` au lieu de `height` ?**
   On ne peut pas animer `height` de 0 à `auto` : il faudrait connaître la hauteur du contenu à l'avance, ou la mesurer en JavaScript. Dans une grille, une ligne `0fr` est fermée et une ligne `1fr` prend la hauteur de son contenu ; le navigateur sait animer de l'une à l'autre. L'enfant a `overflow: hidden` pour ne rien montrer quand la ligne est fermée, et `inert` empêche d'atteindre au clavier un contenu invisible.

4. **Pourquoi la puce de catégorie interroge-t-elle le serveur au lieu de filtrer la liste déjà chargée ?**
   Parce que la liste ne permet pas de savoir à quelle catégorie appartient un produit : le champ `category` est souvent vide, et l'appartenance passe par la catégorie de la boutique, avec un regroupement des noms proches (`shared/categoryKey`). La règle existe déjà sur le serveur (page `/categorie`) : on la réutilise au lieu de la recopier, ce qui garantit que le filtre de l'accueil et la page de la catégorie montrent la même chose.

5. **Le total de la barre d'achat est calculé dans le navigateur : n'est-ce pas contraire à « prix du serveur uniquement » ?**
   Le prix unitaire affiché vient toujours du serveur (`effectivePriceTnd` de la fiche, ou le prix confirmé par `catalog.quoteCart` pour le sur mesure) ; le navigateur ne fait que le multiplier par la quantité, pour l'affichage. Pour le sur mesure, aucun total n'est montré tant que le serveur n'a pas confirmé le prix des mesures : l'estimation locale n'apparaît jamais dans la barre. Et à la commande, le serveur recalcule tout de toute façon : le panier ne garde jamais un prix qui ferait foi.

## Étape A-10e — Fonctions « application » sur téléphone

Toutes les fonctions sont sur téléphone (< 768 px), sauf le mode sombre qui vaut partout. **Sur ordinateur en thème clair, rien n'a changé** : captures pleine page de 8 pages, build A-10d contre build A-10e, mêmes données, comparées pixel à pixel : identiques. Aucune donnée inventée : une section sans données est absente. Back figé : ce qui manque côté serveur est dans BACK-A-FAIRE (n° 21 à 24).

### 1. Stories des ateliers (accueil)

- Un cercle par atelier qui a des créations récentes : ses 3 créations publiées les plus récentes (`catalog.list` trié par date), chacune montrée par sa **vidéo** (déjà lue pour « En vidéo ») ou sa **photo**. Contour accent = pas encore vue, beige = vue ; « vue » est gardé dans `localStorage` (`elegance-stories-vues`) et redevient « nouvelle » si l'atelier publie une nouvelle création.
- Visionneuse plein écran (`stories-viewer.component.ts`, `<dialog>` modal, code téléchargé à la première story ouverte) : barres de progression (4 s par photo, durée réelle de la vidéo muette), moitié droite = suivant, gauche = précédent (deux vrais boutons nommés), flèches du clavier, glisser vers le bas / ✕ / Échap = fermer, atelier suivant automatiquement. En bas : nom, prix venant du serveur, « Voir le produit ».
- « Réduire les animations » : rien n'avance tout seul, la vidéo ne démarre pas d'elle-même, boutons « Précédent » / « Suivant » visibles.
- **Limites (BACK-A-FAIRE n° 21)** : pas de date de publication dans la liste (donc pas de fenêtre 24-72 h) et une seule photo par création.

### 2. WhatsApp sur la fiche produit

Encadré « Une question sur ce produit ? — Écrire à l'atelier sur WhatsApp » : lien `https://wa.me/216XXXXXXXX?text=…`, message pré-rempli encodé avec `encodeURIComponent` (« Bonjour, j'ai une question sur « [nom] » vu sur Elegance Deco : [lien] »). Le numéro vient de `vendor.publicShop`, qui ne le donne **que si le vendeur a coché « Afficher mon WhatsApp »** : sinon l'encadré est caché. `shared/whatsapp.ts` normalise le numéro (8 chiffres tunisiens → 216 ajouté ; numéro illisible → pas d'encadré plutôt qu'un lien faux). Aucune API : le lien ouvre simplement WhatsApp. Le champ existait déjà côté serveur : rien à noter dans BACK-A-FAIRE.

### 3. Filtres en panneau du bas

`shared/components/filter-sheet` : bouton « Filtrer » (nombre de filtres actifs) + panneau qui monte du bas, avec poignée et fond assombri (clic = fermer). `<dialog>` modal : Échap ferme, le reste de la page est inerte (le focus reste dans le panneau), le focus revient au bouton « Filtrer ». Sur le catalogue (et donc la recherche, `/produits?q=…`), les catégories, et « Pour vous » de l'accueil (qui ouvre le catalogue filtré). Sur ordinateur, la barre de filtres actuelle est inchangée.
- **Filtres proposés = ceux que le serveur sait appliquer** : prix min / max, sur mesure, promotions ; ateliers sur une catégorie (s'il y en a plus d'un). Couleur, néon, gouvernorat et atelier sur le catalogue général : BACK-A-FAIRE n° 22.
- « Voir N résultats » : N est **demandé au serveur** avec la même procédure que la page, 300 ms après le dernier changement (`debounceTime`), `switchMap` ignorant une réponse dépassée. « Réinitialiser » vide le brouillon. Les filtres appliqués vont dans l'URL (retour et partage fonctionnent).

### 4. Écran de recherche

La barre de recherche du téléphone devient un bouton qui ouvre un écran plein (`search-screen.component.ts`, `<dialog>` qui monte du bas). Son code n'est téléchargé qu'au premier toucher (`@defer (on interaction(barreRecherche); prefetch on idle)`), et seulement sur téléphone.
- Focus automatique sur le champ (donné en code : le navigateur ignore `autofocus` quand un bouton a déjà le focus — trouvé pendant les essais), bouton retour, Échap.
- « Recherches récentes » : 10 au plus, `localStorage`, « Effacer » et suppression une par une. « Catégories » : les catégories réelles du site en grille de 3.
- Suggestions pendant la frappe : 250 ms (`debounceTime`), `switchMap` annule la requête précédente (« mir » tapé vite = **une seule** requête), catégories dont le nom correspond (même normalisation que le serveur), « Voir tous les résultats ».
- « Tendances » : aucune donnée réelle (aucune recherche n'est enregistrée par le serveur) → section absente, BACK-A-FAIRE n° 23.

### 5. Vus récemment (accueil)

`RecentlyViewedService` garde les **10 dernières fiches ouvertes**, identifiants seulement (`id` + `slug`, parce que la fiche publique se lit par son slug ; l'id vérifie que c'est bien le même produit). Nom, photo et prix sont toujours relus sur le serveur : dans la liste déjà chargée, sinon par `vendor.publicProduct` ; un produit supprimé ou masqué est retiré de la liste. Rangée horizontale + « Effacer », absente si vide. Une lecture groupée par identifiants éviterait jusqu'à 10 requêtes : BACK-A-FAIRE n° 24.

### 6. Gestes

- Photo de la fiche : glisser à gauche / droite = photo suivante / précédente, grâce au **défilement aimanté CSS** (`scroll-snap`), sans bibliothèque ; les points suivent. Les points sont maintenant de vrais boutons de 44 × 44 px (« Photo 2 sur 3 », `aria-current`) : tout reste possible sans geste.
- **Glisser depuis le bord gauche = retour : volontairement pas fait.** Sur iPhone (Safari) et Android (navigation par gestes), ce bord appartient déjà au geste « retour » du système. L'intercepter créerait un conflit (deux retours, ou un geste qui ne marche qu'une fois sur deux). Le geste natif fait déjà le travail, car le site utilise le vrai historique du navigateur (et l'animation de page d'A-10d s'applique aussi à ce retour).

### 7. Mode sombre automatique

**Variables partout.** Un script de migration a remplacé les 1 145 couleurs écrites en dur (63 fichiers) par des variables : principales dans `styles.css` (`--fond` = bg, `--texte` = ink, `--texte-secondaire` = muted, `--accent`, `--bordure` = border, `--carte` = card…), secondaires sous la forme `var(--gris-3, #88796f)` dans chaque composant (la valeur claire, écrite en secours, est la couleur d'origine). Exclus volontairement : le néon (lumière sur fond noir dans les deux thèmes), les visionneuses et vidéos, les images dessinées (canvas), les pastilles de couleur des produits.

**Valeurs sombres** (`palette-sombre.css`) : une règle unique en OKLCH (teinte gardée, clarté inversée : fonds clairs → fonds très foncés chauds, encres → crème, gris de texte → gris clairs ; couleurs de texte éclaircies juste assez), puis retouches à la main : fond `#1c1714` (pas noir), texte `#f3eadf`, accent cuivre `#c98a5c`. Les blocs **déjà sombres en clair** (pied de page, bandeau, newsletter, néon, barre du bas du téléphone, barre de l'administration…) restent sombres grâce à la classe `toujours-sombre`.

**Contraste vérifié par un outil** (pas à l'œil) : pour chaque texte visible, la couleur et le vrai fond derrière lui (parents remontés, transparences mélangées) sont comparés à 4.5:1 (3:1 pour un grand texte). Résultat en sombre : **0 problème** sur 49 pages (≈ 5 300 textes) : site public sur téléphone et ordinateur, espace client, espace vendeur, console d'administration (connecté avec des comptes de test). Les premiers essais avaient trouvé 14 cas, tous corrigés (liens cuivre à 4.39, ardoises de l'administration, barre du bas…).

**Choix** dans « Compte » (et dans les paramètres vendeur et administration) : Automatique / Clair / Sombre (`ThemeService`, `localStorage`). **Pas de flash blanc** : un petit script dans `index.html` pose `data-theme` avant le premier affichage. Les couleurs sombres sont un fichier à part (`theme-sombre.css`), **téléchargé seulement en sombre** : il était dans la feuille de style de départ et faisait dépasser le budget de 2,6 Ko pour tout le monde ; maintenant, le thème clair ne télécharge rien de plus. Ce fichier n'a pas d'empreinte dans son nom : le serveur du vrai site local et celui de la démo le font revalider à chaque visite (`no-cache`), comme `index.html` — à reprendre pour Nginx lors de la mise en ligne.

### 8. PWA

Rien à faire maintenant (A-15). Vérifié que rien ne la bloque : `<meta name="theme-color">` existe déjà (mis à jour selon le thème), le script de `index.html` fonctionne aussi depuis un cache de service worker, `theme-sombre.css` est un fichier statique ordinaire (à mettre dans la liste des fichiers en cache de la PWA), et tout ce qui est gardé sur l'appareil passe par `localStorage` avec un repli si le stockage est bloqué.

### Performance et budgets

- Lighthouse téléphone (médiane de 5, mêmes données, A-10d → A-10e) : **accueil 70 → 70, fiche produit 72 → 72**, CLS 0 sur les deux.
- Paquet initial sous le seuil de 520 Ko **sans relever aucun seuil** : écran de recherche, visionneuse de stories, panneau de filtres et thème sombre sont chargés à part, seulement quand ils servent.

### Changements visibles en thème clair (volontaires)

- Section « Apparence » (choix du thème) dans l'espace client, les paramètres vendeur et les paramètres de l'administration.
- Espace vendeur : le texte des petits boutons foncés était gris sur foncé (la classe `.petit`, texte gris, l'emportait sur la couleur du bouton) — corrigé, le texte est blanc.
- Téléphone : la barre de recherche ouvre l'écran de recherche ; ses mots d'exemple sont en gris plus foncé (6:1 au lieu de 2.7:1).

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/palette-sombre.css` (nouveau), `src/styles.css`, `src/index.html`, `angular.json` | Thème sombre, publié à part (`theme-sombre.css`), script avant affichage |
| `core/services/theme.service.ts`, `shared/components/theme-choice/` (nouveaux) | Choix Automatique / Clair / Sombre |
| 63 fichiers `.css` / `.ts` | Couleurs → variables (valeurs claires identiques) |
| `shared/components/filter-sheet/` (nouveau) ; `catalog.page.*`, `category.page.*`, `accueil-telephone.*` | Panneau de filtres |
| `core/layout/search-screen.component.ts`, `core/services/search-screen.service.ts` (nouveaux), `site-header.*` | Écran de recherche |
| `features/public/home/stories-viewer.component.ts` (nouveau), `accueil-telephone.*` | Stories |
| `shared/whatsapp.ts` (nouveau), `product.page.*` | WhatsApp |
| `core/services/recently-viewed.service.ts` (nouveau), `accueil-telephone.*`, `product.page.ts` | Vus récemment |
| `product.page.*` | Points de la galerie cliquables |
| `site-local/serveur-site.mjs`, `demo-en-ligne/proxy-demo.mjs` | `theme-sombre.css` toujours revalidé |
| `BACK-A-FAIRE.md` | n° 21 à 24 |

### Ce qui a été vérifié

- Chaque fonction par un script de navigateur, sur le build de production et la base de test, en clair ET en sombre : stories (avance auto, toucher, atelier suivant, Échap, « vue », mode réduit), WhatsApp (caché, visible avec le bon lien, re-caché), filtres (N = nombre de cartes affichées : 12, 1, 4 ; URL ; focus ; Échap ; fond), recherche (focus, une requête, suggestions, récentes, Échap), vus récemment (ordre, produit supprimé retiré, prix du serveur, Effacer), galerie (glisser au doigt, points). Captures dans le dossier de travail.
- Thème : en clair, `theme-sombre.css` n'est pas demandé ; en sombre, fond `#1c1714` dès le premier affichage ; choix gardé et « Automatique » qui revient au réglage de l'appareil.
- Ordinateur clair identique au pixel (8 pages) ; contrastes (ci-dessus) ; Lighthouse ; `ng lint` sans erreur ; build Angular sans avertissement ; tests React (28 fichiers, 209 tests) et build React ; empreinte de la base réelle identique avant / après ; comptes de test supprimés (0 restant).

### Restes connus (thème clair, inchangés depuis avant A-10e)

Le contrôle des contrastes trouve en clair les mêmes problèmes qu'avant A-10e (79 sur téléphone, 82 sur ordinateur, sur 12 pages) : logo (« Deco » 2.9:1, « Marketplace décoration » 3.1:1), pied de page (4.49:1), quelques gris et pastilles des espaces vendeur et administration. Ils ne sont pas corrigés ici, car cela changerait l'ordinateur en clair. Le thème sombre, lui, n'en a aucun. À traiter dans une étape dédiée si vous le souhaitez.

### 5 questions qu'un professeur pourrait poser

1. **Comment garantir que le thème clair n'a pas changé après avoir remplacé 1 145 couleurs ?**
   En gardant la couleur d'origine comme valeur claire de chaque variable (`var(--gris-3, #88796f)` : sans thème sombre, la variable n'existe pas et la valeur écrite en secours est utilisée), puis en le **prouvant** : captures pleine page avant / après, comparées pixel à pixel. Résultat : identiques. Une migration à la main aurait sans doute « arrondi » des couleurs proches ; l'outil n'en fusionne aucune.

2. **Pourquoi un script dans `index.html` au lieu de laisser Angular choisir le thème ?**
   Angular démarre après le téléchargement de son JavaScript : la page serait d'abord affichée en clair, puis basculerait en sombre (flash blanc). Le script de `index.html` s'exécute pendant la lecture du `<head>`, avant tout affichage : il lit le choix, consulte `prefers-color-scheme`, pose `data-theme` et, en sombre seulement, ajoute la feuille des couleurs sombres de façon bloquante. `ThemeService` prend ensuite le relais pour les changements.

3. **À quoi sert `switchMap` dans les suggestions, en plus de `debounceTime` ?**
   `debounceTime(250)` attend une pause dans la frappe : « miroir » tapé vite ne lance pas 6 requêtes. Mais une requête lente peut encore répondre après une plus rapide : sans précaution, les suggestions de « mir » s'afficheraient alors qu'on a tapé « miroir doré ». `switchMap` se désabonne de la requête précédente dès qu'une nouvelle valeur arrive : seule la réponse correspondant au dernier texte est affichée.

4. **Pourquoi « Voir N résultats » demande-t-il N au serveur au lieu de compter dans le navigateur ?**
   Parce que le navigateur n'a pas tous les produits : seulement ceux de la page affichée. Les règles du filtre (prix payé promotion comprise, sur mesure, appartenance d'un produit à une catégorie ou un atelier) sont celles du serveur ; les recopier ferait deux règles qui finissent par diverger. On appelle la même procédure que la page avec les filtres du brouillon : le nombre annoncé est, par construction, le nombre de cartes affichées après avoir appuyé.

5. **Pourquoi ne pas avoir fait le « glisser depuis le bord gauche » demandé ?**
   Parce qu'il entre en conflit avec le système : sur iPhone, Safari utilise ce geste pour « page précédente » ; sur Android, la navigation par gestes l'utilise pour « retour ». Une page web ne peut pas réserver ce bord de façon fiable : on obtiendrait deux retours d'un coup ou un geste aléatoire. Comme le site utilise le vrai historique du navigateur, le geste natif fait déjà exactement ce qui était demandé.

## Étape A-10g — Intro à l'ouverture, accueil téléphone plus lisible, contrastes en mode clair

Trois parties. L'ordinateur ne change pas, sauf les couleurs corrigées pour les contrastes (partie 3, seule exception demandée) et l'intro (partie 1, téléphone et ordinateur). Le mode sombre est conservé et vérifié. Les maquettes de référence n'étaient pas disponibles ici : tout suit le texte de l'étape.

### Partie 1 — Intro à l'ouverture

**Où et pourquoi dans `index.html`** : l'intro est écrite en HTML + CSS + un petit script directement dans `index.html`, avant Angular. Elle s'affiche donc pendant que le JavaScript du site se télécharge, à la place de l'écran blanc, sans rien ajouter au code d'Angular.

**Déroulé (≈ 2,7 s)** : fond chaud `#F6F3EE` ; disque « en relief » (ombre claire en haut à gauche, beige en bas à droite) et cercle intérieur creusé (ombres intérieures) ; fin cercle cuivre dessiné en SVG (`stroke-dasharray` = périmètre, `stroke-dashoffset` animé jusqu'à 0, 1,1 s) ; « Elegance » (Playfair Display) qui passe du flou au net ; « Deco » (Pacifico, cuivre `#936940`) qui s'allume comme un néon (3 petits clignotements puis une lueur) ; « FAIT MAIN · EN TUNISIE » ; le disque grossit et s'efface, puis fondu vers le site.

**Règles** :
- Une fois par visite (`sessionStorage`), seulement en arrivant sur l'accueil (`/`) : jamais sur un lien direct (fiche, boutique), ni dans l'espace vendeur ou l'administration ; jamais avec « réduire les animations ».
- Retirée quand l'animation est finie ET que la page d'accueil est affichée ; au plus tard à 3,5 s (retrait forcé à 3,15 s + 0,35 s de fondu). Mesuré : retirée à 3,3 s.
- « Passer → » visible à 0,9 s (94 × 44 px), au clavier (Tab puis Entrée) ; Échap retire aussi l'intro. La scène est décorative (`aria-hidden`), mais le bouton est **hors** de la partie cachée : un bouton focalisable dans une zone `aria-hidden` serait une faute d'accessibilité. Aucun piège du focus.
- Mode sombre : le script du thème (déjà dans `<head>`) pose `data-theme` avant le premier affichage ; l'intro lit ce réglage et prend les couleurs sombres (fond `#1c1714`, cuivre `#d69a6c`) : aucun flash clair.
- Pacifico (nouvelle police, pas une bibliothèque) n'est téléchargée **que lorsque l'intro joue**, et seulement pour les 4 lettres de « Deco » (`text=Deco` : quelques centaines d'octets).
- A-15 : cette intro servira d'écran de démarrage de l'application installée (noté dans le plan).

### Partie 2 — Accueil téléphone plus lisible

- **Tailles** : texte courant 15-16 px ; rien sous 13 px sauf les petites étiquettes en capitales (11-12 px) — vérifié par un script sur toute la page ; titres de section 23 px Playfair avec barre cuivre de 4 px et « Tout voir › » ; prix 18 px gras.
- **Ordre** : stories, encadré, Par catégorie, carte néon, En vidéo, Ateliers à découvrir, Vus récemment, Pour vous (puces + Filtrer), Services, pied de page (vérifié par script).
- **Encadré** : texte demandé, « Créer mon néon » (seulement si un atelier propose le néon) et « Les ateliers ». Garanties, toutes vraies : « Paiement à la livraison » (seul mode de paiement du site), « Ateliers vérifiés » (le serveur ne publie que les boutiques validées), « Prix à vos mesures » (affichée seulement s'il existe des créations au m² ou au mètre : `totals.customProducts` du serveur).
- **Par catégorie** : 6 catégories réelles les plus fournies, photo carrée, nom sous la photo.
- **Cartes « Pour vous »** : carte blanche à bordure fine, photo carrée (toutes 171 × 171 px sur un téléphone de 390 px), atelier en pastille blanche, cœur, catégorie (seulement si la création en a une), nom (2 lignes), note seulement si de vrais avis, prix avec « Sur mesure, dès » au-dessus pour un prix au m², badges « Sur mesure » ou promotion. **« En stock » n'est pas affiché** : la liste du catalogue ne donne pas le stock (BACK-A-FAIRE n° 27).
- **Ateliers à découvrir** : cartes de 270 px (3 photos de leurs créations en mosaïque, logo, nom, ville, nombre de créations, 3 spécialités venant du serveur, note seulement si des avis existent, « Visiter › »).
- **Services** : « Créer mon néon » seulement. **« Demander un devis sur mesure » n'est pas affichée** : la seule demande de devis existante est celle du néon (envoi d'un logo) ; un devis sur mesure général n'existe pas (BACK-A-FAIRE n° 26).
- **Pas de bouton flottant** sur le côté (vérifié : aucun élément fixe en dehors de la barre du bas).

### Partie 3 — Contrastes en mode clair (téléphone et ordinateur)

**Méthode** : l'outil de contrôle d'A-10e (couleur de chaque texte visible contre le vrai fond derrière lui) lancé sur 74 pages : site public, espace client, espace vendeur et administration, sur téléphone et sur ordinateur. Avant : **603 problèmes**, mais seulement 26 paires de couleurs, soit 12 couleurs. Chaque couleur a été assombrie juste assez (même teinte, même saturation, seule la clarté baisse en OKLCH) pour atteindre 4.5:1 sur le fond le plus exigeant où elle sert de texte. Le gris du pied de page (sur fond foncé) a été éclairci. Deux usages sur fond foncé gardent leur couleur (e-mail dans la barre latérale de l'administration).

| Élément (exemples) | Avant | Après | Contraste avant → après |
|---|---|---|---|
| « Deco » du logo (choix B) | `#b78c62` | `#936940` | 2.85 → 4.57 |
| Petit texte gris (intros, compteurs, adresses) | `#88796f` | `#7c6d64` | 3.90 → 4.62 |
| Petits textes gris clair (aides, prix barrés) | `#9a8b81` | `#7e6f66` | 3.16 → 4.63 |
| « Marketplace décoration » (logo) | `#9f8977` | `#826d5c` | 3.13 → 4.61 |
| Liens et statuts cuivre (« Tout voir », « Livrée ») | `#a16f50` | `#8e5d3e` | 3.58 → 4.64 |
| Surtitres cuivre (« Inscription », « Messages privés ») | `#b07855` | `#9a6341` | 3.45 → 4.61 |
| Prix en promotion (`--promo`) | `#b15e55` | `#aa584f` | 4.24 → 4.63 |
| Disponibilité « Sur commande », badges orange | `#b4691e` | `#ad6214` | 4.22 → 4.63 |
| Compteurs de l'administration (ardoise) | `#94a3b8` | `#616f83` | 2.34 → 4.66 |
| Chiffres ambre de l'administration | `#d97706` | `#b95a00` | 3.19 → 4.64 |
| « Actif » (comptes, administration) | `#4caf50` | `#1d8728` | 2.78 → 4.62 |
| Pied de page (sur fond foncé) | `#97877d` | `#99897f` | 4.49 → 4.61 |

**Après : 0 problème en clair sur les 74 pages, et toujours 0 en sombre.** Comme chaque composant porte sa valeur claire en secours (`var(--gris-11, #7c6d64)`), la correction a touché 172 endroits sans modifier le thème sombre.

### Vérifications

- Intro : suite de captures en clair et en sombre (150 ms, 600 ms, 1 s, 1,4 s, 1,8 s, 2,4 s, puis le site) ; retrait à 3,3 s ; absente sur un lien direct, à la deuxième arrivée, avec « réduire les animations » et dans l'espace vendeur ; « Passer » au clavier et Échap.
- Accueil téléphone : captures pleine page en clair et en sombre ; ordre, tailles, photos carrées, garanties, ateliers et services vérifiés par script.
- Contrastes : 0 problème sur 74 pages en clair et en sombre ; captures ordinateur avant / après.
- **Lighthouse téléphone**, mesuré **en alternance** (une mesure A-10e, une mesure A-10g, 7 fois) : la machine était chargée par d'autres programmes et des mesures isolées variaient de 30 à 79 ; l'alternance soumet les deux versions à la même charge. Médianes : **accueil 70 → 72, fiche produit 72 → 72**, CLS 0. L'élément principal de l'accueil est le titre de l'encadré (pas l'intro).
- `ng lint` sans erreur ; build Angular sans avertissement (aucun seuil relevé) ; tests React (28 fichiers, 209 tests) et build React ; empreinte de la base réelle identique avant / après ; comptes de test supprimés.

### 5 questions qu'un professeur pourrait poser

1. **Pourquoi écrire l'intro dans `index.html` plutôt que dans un composant Angular ?**
   Un composant Angular ne peut s'afficher qu'après le téléchargement et le démarrage du JavaScript d'Angular : c'est justement ce temps-là, aujourd'hui un écran blanc, que l'intro doit occuper. Écrite en HTML et CSS dans `index.html`, elle s'affiche dès que la page arrive. Son petit script ne fait que décider de l'afficher et de la retirer ; il n'ajoute rien au paquet d'Angular.

2. **Comment dessine-t-on un cercle qui « se trace » sans bibliothèque ?**
   Avec le contour (`stroke`) d'un cercle SVG. `stroke-dasharray` égal au périmètre (2π × 48 ≈ 302) crée un seul trait de la longueur du cercle ; `stroke-dashoffset` du même montant le décale entièrement hors du cercle, donc invisible. Animer `stroke-dashoffset` jusqu'à 0 fait apparaître le trait progressivement. Une rotation de −90° le fait partir du haut.

3. **Comment savoir qu'une garantie affichée est vraie ?**
   On ne l'écrit que si une donnée du serveur la prouve. Le paiement à la livraison est le seul mode de paiement du site ; « Ateliers vérifiés » découle de la règle du serveur qui ne publie que les boutiques validées ; « Prix à vos mesures » n'apparaît que si le serveur compte au moins une création au m² ou au mètre. Pour la même raison, « En stock » et le devis sur mesure ne sont pas affichés : la donnée ou la fonction n'existe pas.

4. **Pourquoi assombrir les couleurs « juste assez » plutôt que de les remplacer par du noir ?**
   Pour garder l'identité du site. En OKLCH, on peut baisser seulement la clarté en gardant la teinte et la saturation : le cuivre reste cuivre, le gris chaud reste chaud. On calcule le plus petit assombrissement qui donne 4.5:1 sur le fond le plus exigeant où la couleur sert de texte. Le site change à peine à l'œil, mais chaque texte devient lisible pour une personne malvoyante ou au soleil.

5. **Le score Lighthouse de l'accueil monte : est-ce grâce à l'intro ?**
   Non, et on l'a vérifié au lieu de le supposer : le diagnostic montre que l'élément principal (LCP) est le titre de l'encadré (« Votre déco, fabriquée par des ateliers tunisiens. »), pas l'intro. Le premier écran montre maintenant un grand texte, affiché sans attendre de photo, au lieu d'une photo de 1,5 Mo. Le gain vient de la nouvelle mise en page, pas de la mesure.
