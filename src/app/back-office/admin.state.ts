import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminOverview, AdminService } from '../core/services/admin.service';

/**
 * Indicateurs de la vue générale, partagés par le cadre (pastilles du menu) et la page d'accueil de la console.
 * Fourni au niveau de la route /admin : créé en entrant dans la console, détruit en la quittant.
 * Les pages appellent reload() après une action (approbation, refus…) : les pastilles restent justes.
 */
@Injectable()
export class AdminState {
  private readonly admin = inject(AdminService);
  readonly overview = signal<AdminOverview | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly stats = computed(() => this.overview()?.stats ?? null);

  async reload() {
    try {
      this.overview.set(await this.admin.overview());
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Données indisponibles');
      this.status.set('error');
    }
  }
}
