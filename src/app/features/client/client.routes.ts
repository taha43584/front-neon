import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guards';

/**
 * Espace CLIENT : pages réservées aux personnes connectées (authGuard → /connexion?retour=<page demandée>).
 * Chaque page est chargée à la demande.
 */
export const CLIENT_ROUTES: Routes = [
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./checkout/checkout.page').then((m) => m.CheckoutPage), title: 'Commande — Elegance Deco' },
  { path: 'commande/:id', canActivate: [authGuard], loadComponent: () => import('./order-confirmation/order-confirmation.page').then((m) => m.OrderConfirmationPage), title: 'Commande confirmée — Elegance Deco' },
  { path: 'espace-client', canActivate: [authGuard], loadComponent: () => import('./account/account.page').then((m) => m.AccountPage), title: 'Espace client — Elegance Deco' },
  { path: 'favoris', canActivate: [authGuard], loadComponent: () => import('./account/account.page').then((m) => m.AccountPage), data: { focus: 'favorites' }, title: 'Mes favoris — Elegance Deco' },
  { path: 'dashboard', redirectTo: 'espace-client' },
  { path: 'messages', canActivate: [authGuard], loadComponent: () => import('./messages/messages.page').then((m) => m.MessagesPage), title: 'Messagerie — Elegance Deco' },
  { path: 'messages/:shopSlug', canActivate: [authGuard], loadComponent: () => import('./messages/messages.page').then((m) => m.MessagesPage), title: 'Messagerie — Elegance Deco' },
];
