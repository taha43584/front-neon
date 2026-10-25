import { Injectable, computed, signal } from '@angular/core';

/**
 * Nombre de requêtes en cours vers le back (mis à jour par l'intercepteur).
 * Tant qu'il est > 0, une fine barre de chargement s'affiche en haut de l'écran.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  readonly isLoading = computed(() => this.pending() > 0);

  start() {
    this.pending.update((n) => n + 1);
  }

  stop() {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
