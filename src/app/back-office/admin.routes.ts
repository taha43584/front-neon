import { Routes } from '@angular/router';
import { AdminState } from './admin.state';

/**
 * Console d'administration, chargée À LA DEMANDE (loadChildren dans app.routes.ts, protégée par adminGuard).
 * Mêmes adresses que le site React : /admin, /admin/clients(/:id), /admin/vendeurs(/:id), /admin/produits(/:id),
 * /admin/categories, /admin/commandes(/:id), /admin/parametres
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [AdminState],
    loadComponent: () => import('./admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./admin-overview.page').then((m) => m.AdminOverviewPage), title: 'Administration — Elegance Deco' },
      { path: 'clients', loadComponent: () => import('./clients/admin-clients.page').then((m) => m.AdminClientsPage), title: 'Clients — Administration' },
      { path: 'clients/:id', loadComponent: () => import('./clients/admin-client-detail.page').then((m) => m.AdminClientDetailPage), title: 'Client — Administration' },
      { path: 'vendeurs', loadComponent: () => import('./vendors/admin-vendors.page').then((m) => m.AdminVendorsPage), title: 'Vendeurs — Administration' },
      { path: 'vendeurs/:id', loadComponent: () => import('./vendors/admin-vendor-detail.page').then((m) => m.AdminVendorDetailPage), title: 'Vendeur — Administration' },
      { path: 'produits', loadComponent: () => import('./products/admin-products.page').then((m) => m.AdminProductsPage), title: 'Produits — Administration' },
      { path: 'produits/:id', loadComponent: () => import('./products/admin-product-detail.page').then((m) => m.AdminProductDetailPage), title: 'Produit — Administration' },
      { path: 'categories', loadComponent: () => import('./categories/admin-categories.page').then((m) => m.AdminCategoriesPage), title: 'Catégories — Administration' },
      { path: 'commandes', loadComponent: () => import('./orders/admin-orders.page').then((m) => m.AdminOrdersPage), title: 'Commandes — Administration' },
      { path: 'commandes/:id', loadComponent: () => import('./orders/admin-order-detail.page').then((m) => m.AdminOrderDetailPage), title: 'Commande — Administration' },
      { path: 'avis', loadComponent: () => import('./reviews/admin-reviews.page').then((m) => m.AdminReviewsPage), title: 'Avis — Administration' },
      { path: 'statistiques', loadComponent: () => import('./admin-stats.page').then((m) => m.AdminStatsPage), title: 'Statistiques — Administration' },
      { path: 'comptes', loadComponent: () => import('./accounts/admin-accounts.page').then((m) => m.AdminAccountsPage), title: 'Comptes — Administration' },
      { path: 'parametres', loadComponent: () => import('./admin-settings.page').then((m) => m.AdminSettingsPage), title: 'Paramètres — Administration' },
      { path: '**', redirectTo: '' },
    ],
  },
];
