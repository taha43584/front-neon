import { Injectable, computed, inject, signal } from '@angular/core';
import { VendorDashboard, VendorService } from '../../core/services/vendor.service';

/**
 * État partagé par toutes les pages de l'espace vendeur (tableau de bord, produits, formulaire).
 * Fourni AU NIVEAU DE LA ROUTE /espace-vendeur (providers dans vendor.routes.ts) : il est créé en entrant
 * dans l'espace vendeur et détruit en le quittant (pas de données vendeur qui traînent ailleurs).
 */
@Injectable()
export class VendorSpaceState {
  private readonly vendor = inject(VendorService);

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly dashboard = signal<VendorDashboard | null>(null);
  readonly shop = computed(() => this.dashboard()?.shop ?? null);
  /** La boutique doit être validée par l'administration pour gérer des produits */
  readonly shopActive = computed(() => this.shop()?.status === 'active');

  private firstLoad: Promise<void> | null = null;

  /** Premier chargement, partagé entre le guard et le cadre (une seule requête) */
  ensureLoaded() {
    this.firstLoad ??= this.reload();
    return this.firstLoad;
  }

  async reload() {
    if (!this.dashboard()) this.status.set('loading');
    try {
      this.dashboard.set(await this.vendor.dashboard());
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }
}
