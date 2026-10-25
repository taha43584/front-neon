import { Routes } from '@angular/router';
import { VendorSpaceState } from './vendor-space.state';
import { shopStatusGuard } from './shop-status.guard';

/**
 * Routes de l'espace vendeur, chargées À LA DEMANDE (loadChildren dans app.routes.ts) :
 * un client ou un visiteur ne télécharge jamais le code de l'espace vendeur.
 * Mêmes adresses que le site React : /espace-vendeur, /espace-vendeur/produits, /espace-vendeur/ajouter,
 * /espace-vendeur/modifier/:id, /espace-vendeur/commandes, /espace-vendeur/neon, /espace-vendeur/boutique,
 * /espace-vendeur/categories, /espace-vendeur/statistiques, /espace-vendeur/messages, /espace-vendeur/avis, /espace-vendeur/parametres
 */
const approved = shopStatusGuard('active');

export const VENDOR_ROUTES: Routes = [
  {
    path: '',
    // Un seul VendorSpaceState pour tout l'espace vendeur (service limité à ces routes)
    providers: [VendorSpaceState],
    loadComponent: () => import('./vendor-layout.component').then((m) => m.VendorLayoutComponent),
    children: [
      // Tableau de bord, ou état de la boutique (en attente, refusée, suspendue) affiché par le cadre
      { path: '', loadComponent: () => import('./vendor-dashboard.page').then((m) => m.VendorDashboardPage), title: 'Espace vendeur — Elegance Deco' },
      // Fonctions de vente : boutique approuvée uniquement
      { path: 'produits', canActivate: [approved], loadComponent: () => import('./vendor-products.page').then((m) => m.VendorProductsPage), title: 'Mes produits — Elegance Deco' },
      { path: 'ajouter', canActivate: [approved], loadComponent: () => import('./product-editor/product-editor.page').then((m) => m.ProductEditorPage), title: 'Ajouter un produit — Elegance Deco' },
      { path: 'modifier/:id', canActivate: [approved], loadComponent: () => import('./product-editor/product-editor.page').then((m) => m.ProductEditorPage), title: 'Modifier un produit — Elegance Deco' },
      { path: 'commandes', canActivate: [approved], loadComponent: () => import('./vendor-orders.page').then((m) => m.VendorOrdersPage), title: 'Mes commandes — Elegance Deco' },
      { path: 'neon', canActivate: [approved], loadComponent: () => import('./vendor-neon.page').then((m) => m.VendorNeonPage), title: 'Néon personnalisé — Elegance Deco' },
      { path: 'boutique', canActivate: [approved], loadComponent: () => import('./vendor-shop.page').then((m) => m.VendorShopPage), title: 'Ma boutique — Elegance Deco' },
      { path: 'categories', canActivate: [approved], loadComponent: () => import('./vendor-categories.page').then((m) => m.VendorCategoriesPage), title: 'Mes catégories — Elegance Deco' },
      { path: 'statistiques', canActivate: [approved], loadComponent: () => import('./vendor-stats.page').then((m) => m.VendorStatsPage), title: 'Statistiques — Elegance Deco' },
      { path: 'messages', canActivate: [approved], loadComponent: () => import('./vendor-messages.page').then((m) => m.VendorMessagesPage), title: 'Messages — Elegance Deco' },
      { path: 'avis', canActivate: [approved], loadComponent: () => import('./vendor-reviews.page').then((m) => m.VendorReviewsPage), title: 'Avis clients — Elegance Deco' },
      { path: 'parametres', canActivate: [approved], loadComponent: () => import('./vendor-settings.page').then((m) => m.VendorSettingsPage), title: 'Paramètres — Elegance Deco' },
      // Adresse inconnue dans l'espace vendeur → tableau de bord (comme le site React)
      { path: '**', redirectTo: '' },
    ],
  },
];
