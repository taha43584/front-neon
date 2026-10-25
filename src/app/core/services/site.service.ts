import { Injectable, computed, inject, signal } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';
import { SiteCategory } from './catalog.service';

export type PublicSettings = Awaited<ReturnType<TrpcClient['catalog']['settings']['query']>>;

/**
 * Données communes à tout le site public (en-tête, menu, pied de page, pages légales) : chargées UNE fois.
 * Paramètres du marketplace (nom, coordonnées, conditions) et catégories du site viennent de la base.
 */
@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly trpc = inject(TrpcService).client;
  private started = false;

  readonly settings = signal<PublicSettings | null>(null);
  readonly settingsLoaded = signal(false);
  readonly categories = signal<SiteCategory[]>([]);
  /** Lien « Sur mesure » affiché seulement s'il existe des créations sur mesure publiées (comme React) */
  readonly hasCustom = signal(false);
  readonly name = computed(() => this.settings()?.marketplaceName || 'Elegance Deco');

  load() {
    if (this.started) return;
    this.started = true;
    // En cas d'erreur, les blocs concernés sont simplement cachés (aucune donnée inventée)
    this.trpc.catalog.settings.query()
      .then((s) => this.settings.set(s))
      .catch(() => undefined)
      .finally(() => this.settingsLoaded.set(true));
    this.trpc.catalog.siteCategories.query().then((list) => this.categories.set(list)).catch(() => undefined);
    this.trpc.catalog.home.query().then((h) => this.hasCustom.set(h.totals.customProducts > 0)).catch(() => undefined);
  }
}
