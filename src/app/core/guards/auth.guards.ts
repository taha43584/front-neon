import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Adresse de retour acceptée seulement si elle reste sur le site (/…, jamais //autre-site.com). */
export function safeReturnUrl(value: string | null | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/**
 * authGuard : page réservée aux personnes connectées (espace client, commande).
 * Sinon → /connexion?retour=<page demandée>, et la connexion ramène ensuite sur cette page.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.loadCurrentUser(); // attend de savoir si quelqu'un est connecté
  return auth.isLoggedIn() ? true : router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

/**
 * guestGuard : page réservée aux visiteurs NON connectés (connexion).
 * Déjà connecté → on va directement à la page de retour (ou à l'accueil).
 */
export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.loadCurrentUser();
  return auth.isLoggedIn() ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('retour'))) : true;
};

/**
 * vendorGuard : espace vendeur réservé aux comptes Vendeur.
 * Non connecté → connexion (puis retour) ; client → son espace client ; admin → accueil.
 * (Le statut de la boutique — validée, en attente… — est affiché dans l'espace vendeur ; le serveur refuse
 * de toute façon toute action d'un vendeur non autorisé.)
 */
export const vendorGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.loadCurrentUser();
  const user = auth.user();
  if (!user) return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
  if (user.role === 'vendor') return true;
  return router.createUrlTree([user.role === 'user' ? '/espace-client' : '/']);
};

/**
 * adminGuard : console d'administration réservée aux comptes Administrateur.
 * Non connecté → connexion (puis retour) ; client → son espace client ; vendeur → son espace vendeur.
 * Confort d'affichage seulement : chaque procédure admin.* revérifie le rôle côté serveur.
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.loadCurrentUser();
  const user = auth.user();
  if (!user) return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
  if (user.role === 'admin') return true;
  return router.createUrlTree([user.role === 'vendor' ? '/espace-vendeur' : '/espace-client']);
};
