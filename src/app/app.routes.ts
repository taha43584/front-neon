import { Routes } from '@angular/router';
import { adminGuard, vendorGuard } from './core/guards/auth.guards';
import { CLIENT_ROUTES } from './features/client/client.routes';
import { NEON_ROUTES } from './features/neon/neon.routes';
import { NOT_FOUND_ROUTES, PUBLIC_ROUTES } from './features/public/public.routes';

/**
 * Adresse → page affichée. Mêmes adresses que le site React. Un fichier de routes par ESPACE
 * (features/ pour le site, back-office/ pour l'administration) :
 * - public, client, néon : listes d'adresses légères importées ici ; chaque PAGE reste chargée à la demande ;
 * - vendeur et back office (admin) : l'espace entier (routes, pages, état partagé) est chargé à la demande
 *   (loadChildren), et seulement par un compte autorisé (vendorGuard / adminGuard).
 * L'ordre compte : la page 404 (« ** ») est toujours en dernier.
 */
export const routes: Routes = [
  ...PUBLIC_ROUTES,
  ...NEON_ROUTES,
  ...CLIENT_ROUTES,
  { path: 'espace-vendeur', canActivate: [vendorGuard], loadChildren: () => import('./features/vendeur/vendor.routes').then((m) => m.VENDOR_ROUTES) },
  { path: 'admin', canActivate: [adminGuard], loadChildren: () => import('./back-office/admin.routes').then((m) => m.ADMIN_ROUTES) },
  ...NOT_FOUND_ROUTES,
];
