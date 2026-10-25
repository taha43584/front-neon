import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TrpcService } from '../api/trpc-client';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface FavoriteTarget { id?: number; slug: string; name: string; image: string | null; priceTnd: number }

/**
 * Favoris de l'utilisateur connecté (cœurs des cartes produit), procédures existantes
 * account.favoriteSlugs et account.toggleFavorite. Le cœur change tout de suite (mise à jour optimiste),
 * puis la réponse du serveur fait foi ; en cas d'erreur, l'ancien état revient.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly trpc = inject(TrpcService).client;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly slugs = signal<string[]>([]);

  constructor() {
    // Connexion / déconnexion : la liste suit le compte
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (!user) return this.slugs.set([]);
        this.trpc.account.favoriteSlugs.query().then((list) => this.slugs.set(list)).catch(() => undefined);
      });
    });
  }

  isFavorite(slug: string) {
    return this.slugs().includes(slug);
  }

  /** false si rien n'a été fait (visiteur envoyé vers la connexion) */
  toggle(product: FavoriteTarget): boolean {
    if (!this.auth.user()) {
      this.toast.show('Connectez-vous pour sauvegarder vos favoris');
      void this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url } });
      return false;
    }
    const previous = this.slugs();
    this.slugs.set(previous.includes(product.slug) ? previous.filter((s) => s !== product.slug) : [...previous, product.slug]);
    this.trpc.account.toggleFavorite
      .mutate({ productId: product.id, productSlug: product.slug, productName: product.name, imageUrl: product.image ?? '', priceTnd: product.priceTnd.toFixed(2) })
      .then((result) => this.toast.show(result.active ? 'Ajouté à vos favoris' : 'Retiré de vos favoris', 'succes'))
      .catch(() => {
        this.slugs.set(previous);
        this.toast.show('Impossible de mettre à jour vos favoris pour le moment', 'erreur');
      })
      .finally(() => this.trpc.account.favoriteSlugs.query().then((list) => this.slugs.set(list)).catch(() => undefined));
    return true;
  }
}
