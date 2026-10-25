import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';
import { ViewportService } from '../services/viewport.service';

/** Route de la fiche produit (features/public/public.routes.ts) */
const PRODUCT_PATH = 'produit/:slug';

function isProductPage(route: ActivatedRouteSnapshot | null | undefined) {
  let r = route;
  while (r?.firstChild) r = r.firstChild;
  return r?.routeConfig?.path === PRODUCT_PATH;
}

/**
 * Animation de changement de page (A-10d, API View Transitions du navigateur, via withViewTransitions) :
 * SEULEMENT sur téléphone, en entrant sur une fiche produit (la page arrive par la droite) ou en la quittant
 * (retour : la page revient par la gauche). Partout ailleurs — ordinateur, « réduire les animations »,
 * autres pages — la transition est sautée : la page change d'un coup, comme avant.
 * Le sens est posé sur <html data-sens-page="avant|arriere"> pour les règles ::view-transition de styles.css.
 */
export function onRouteTransition(info: ViewTransitionInfo) {
  const viewport = inject(ViewportService);
  const toProduct = isProductPage(info.to);
  const fromProduct = isProductPage(info.from);
  if (!viewport.phone() || viewport.reducedMotion() || (!toProduct && !fromProduct)) {
    info.transition.skipTransition();
    return;
  }
  const root = document.documentElement;
  root.dataset['sensPage'] = toProduct ? 'avant' : 'arriere';
  info.transition.finished.finally(() => delete root.dataset['sensPage']);
}
