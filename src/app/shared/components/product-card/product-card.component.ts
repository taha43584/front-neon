import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../core/services/favorites.service';
import { PrixDtPipe } from '../../pipes/prix-dt.pipe';
import { IconComponent } from '../icon/icon.component';
import { ShopLogoComponent } from '../shop-logo/shop-logo.component';

/** Données nécessaires à une carte produit (accueil, catalogue, catégorie : mêmes champs côté serveur). */
export interface ProductCardData {
  /** Identifiant du produit (favoris) */
  id?: number;
  slug: string;
  name: string;
  image: string | null;
  shopName: string;
  shopLogoUrl: string | null;
  priceTnd: number;
  regularPriceTnd: number;
  promoPriceTnd: number | null;
  availability: 'in_stock' | 'made_to_order' | 'out_of_stock';
  pricingMode: 'fixed' | 'per_m2' | 'per_linear_m';
  rating?: number | null;
  reviewCount?: number;
}

/**
 * Carte produit RÉUTILISABLE : la même pour l'accueil, le catalogue et les catégories.
 * Elle reçoit le produit par input() ; elle ne charge rien elle-même.
 * Animations (comme React) : soulèvement + ombre + zoom de la photo au survol / focus clavier,
 * bouton « Voir le produit » (souris seulement), apparition en fondu décalée selon `index`, « pop » du cœur.
 */
@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, PrixDtPipe, ShopLogoComponent, IconComponent],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  private readonly favorites = inject(FavoritesService);

  readonly product = input.required<ProductCardData>();
  /** Première(s) carte(s) visible(s) d'une liste : photo demandée tout de suite, en priorité (élément principal, A-11) */
  readonly priority = input(false);
  /** Rang dans la liste : apparition en fondu décalée de 0,12 s (plafonné à 6). null = pas de fondu */
  readonly index = input<number | null>(null);

  readonly rank = computed(() => Math.min(this.index() ?? 0, 6));
  readonly hasPromo = computed(() => this.product().promoPriceTnd !== null && this.product().priceTnd < this.product().regularPriceTnd);
  readonly discountPercent = computed(() => Math.round((1 - this.product().priceTnd / this.product().regularPriceTnd) * 100));
  /** Sur mesure : prix « à partir de … / m² » ou « / m » */
  readonly unit = computed(() => {
    const mode = this.product().pricingMode;
    return mode === 'per_m2' ? 'm²' : mode === 'per_linear_m' ? 'm' : null;
  });
  readonly favorite = computed(() => this.favorites.isFavorite(this.product().slug));
  /** Chaque clic change la clé : l'icône est recréée et l'animation « pop » se rejoue */
  readonly pop = signal(0);

  toggleFavorite() {
    const p = this.product();
    if (this.favorites.toggle({ id: p.id, slug: p.slug, name: p.name, image: p.image, priceTnd: p.priceTnd })) this.pop.update((n) => n + 1);
  }
}
