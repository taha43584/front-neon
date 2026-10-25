import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { VendorSpaceState } from './vendor-space.state';

export type ShopStatus = 'active' | 'pending' | 'suspended' | 'rejected';

/**
 * Guard vendeur « approuvé / en attente » : la page n'est ouverte que si la boutique du vendeur connecté
 * a l'un des statuts autorisés. Sinon → /espace-vendeur, qui affiche l'état de la boutique
 * (demande en attente, refusée avec le motif, boutique suspendue).
 *
 *   { path: 'produits', canActivate: [shopStatusGuard('active')], … }
 *
 * VendorSpaceState est fourni par la route parente (/espace-vendeur) : le guard le reçoit avec inject().
 * Ce n'est qu'un confort d'affichage : le serveur refuse de toute façon les actions d'une boutique non validée.
 */
export function shopStatusGuard(...allowed: ShopStatus[]): CanActivateFn {
  return async () => {
    const state = inject(VendorSpaceState);
    const router = inject(Router);
    await state.ensureLoaded();
    const status = state.shop()?.status as ShopStatus | undefined;
    // Erreur de chargement : on laisse passer, le cadre affiche « Réessayer »
    if (state.status() === 'error') return true;
    return status && allowed.includes(status) ? true : router.createUrlTree(['/espace-vendeur']);
  };
}
