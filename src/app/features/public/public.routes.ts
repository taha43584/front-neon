import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guards';
import { HomePage } from './home/home.page';

/**
 * Espace PUBLIC (visiteurs) : accueil, catalogue, catégories, fiches produit, boutiques, pages d'information,
 * assistant, panier, inscription, connexion. Mêmes adresses que le site React.
 * L'accueil est chargé tout de suite (première page vue) ; toutes les autres pages à la demande (loadComponent).
 */
export const PUBLIC_ROUTES: Routes = [
  { path: '', component: HomePage, title: 'Elegance Deco' },
  { path: 'produits', loadComponent: () => import('./catalog/catalog.page').then((m) => m.CatalogPage), title: 'Catalogue — Elegance Deco' },
  { path: 'categorie/:slug', loadComponent: () => import('./category/category.page').then((m) => m.CategoryPage), title: 'Catégorie — Elegance Deco' },
  { path: 'produit/:slug', loadComponent: () => import('./product/product.page').then((m) => m.ProductPage), title: 'Création — Elegance Deco' },
  { path: 'boutiques', loadComponent: () => import('./shops/shops.page').then((m) => m.ShopsPage), title: 'Boutiques — Elegance Deco' },
  { path: 'boutique/:slug', loadComponent: () => import('./shops/shop.page').then((m) => m.ShopPage), title: 'Boutique — Elegance Deco' },
  // Pages d'information et documents (la donnée de route « page » / « kind » arrive dans l'input() du composant)
  { path: 'aide', loadComponent: () => import('./info/info.page').then((m) => m.InfoPage), data: { page: 'aide' }, title: 'Aide — Elegance Deco' },
  { path: 'suivre-commande', loadComponent: () => import('./info/info.page').then((m) => m.InfoPage), data: { page: 'suivi' }, title: 'Suivre ma commande — Elegance Deco' },
  { path: 'vendre', loadComponent: () => import('./info/info.page').then((m) => m.InfoPage), data: { page: 'vendre' }, title: 'Vendre avec nous — Elegance Deco' },
  { path: 'conditions-generales', loadComponent: () => import('./info/legal.page').then((m) => m.LegalPage), data: { kind: 'terms' }, title: 'Conditions générales — Elegance Deco' },
  { path: 'conditions-de-vente', loadComponent: () => import('./info/legal.page').then((m) => m.LegalPage), data: { kind: 'sales' }, title: 'Conditions de vente — Elegance Deco' },
  { path: 'conditions-vendeurs', loadComponent: () => import('./info/vendor-terms.page').then((m) => m.VendorTermsPage), title: 'Conditions vendeurs — Elegance Deco' },
  { path: 'assistant', loadComponent: () => import('./assistant/assistant.page').then((m) => m.AssistantPage), title: 'Assistant Déco IA — Elegance Deco' },
  { path: 'assistant-deco', loadComponent: () => import('./assistant/assistant.page').then((m) => m.AssistantPage), title: 'Assistant Déco IA — Elegance Deco' },
  { path: 'panier', loadComponent: () => import('./cart/cart.page').then((m) => m.CartPage), title: 'Panier — Elegance Deco' },
  // Inscription (comme React : choix, puis formulaire client ou vendeur ; un compte connecté voit un message)
  { path: 'inscription', loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage), data: { mode: 'choice' }, title: 'Inscription — Elegance Deco' },
  { path: 'inscription/client', loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage), data: { mode: 'client' }, title: 'Créer un compte Client — Elegance Deco' },
  { path: 'inscription/vendeur', loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage), data: { mode: 'vendor' }, title: 'Ouvrir votre boutique — Elegance Deco' },
  // Page réservée aux visiteurs non connectés : déjà connecté → page de retour
  { path: 'connexion', canActivate: [guestGuard], loadComponent: () => import('./login/login.page').then((m) => m.LoginPage), title: 'Connexion — Elegance Deco' },
];

/** Adresse inconnue : page 404 (l'adresse tapée reste dans la barre du navigateur). Toujours EN DERNIER. */
export const NOT_FOUND_ROUTES: Routes = [
  { path: '404', loadComponent: () => import('./info/not-found.page').then((m) => m.NotFoundPage), title: 'Page introuvable — Elegance Deco' },
  { path: '**', loadComponent: () => import('./info/not-found.page').then((m) => m.NotFoundPage), title: 'Page introuvable — Elegance Deco' },
];
