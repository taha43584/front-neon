import { Injectable, signal } from '@angular/core';

/** Même limite que le CSS du site : téléphone = moins de 768 px de large */
export const PHONE_QUERY = '(max-width: 767.98px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function suivre(requete: string) {
  const media = typeof matchMedia === 'function' ? matchMedia(requete) : null;
  const valeur = signal(media?.matches ?? false);
  media?.addEventListener('change', (e) => valeur.set(e.matches));
  return valeur.asReadonly();
}

/**
 * Taille d'écran et préférence « réduire les animations », sous forme de signaux (A-10d).
 * Les mises en page téléphone de l'accueil et de la fiche produit ne sont créées QUE sur téléphone (@if) :
 * sur ordinateur, le DOM reste exactement celui d'avant (aucun élément caché, aucune image téléchargée en plus).
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  readonly phone = suivre(PHONE_QUERY);
  readonly reducedMotion = suivre(REDUCED_MOTION_QUERY);
}
