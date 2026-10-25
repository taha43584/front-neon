import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { effectivePrice } from '@shared/productValidation';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { NeonService } from '../../../core/services/neon.service';
import { PublicShopData, ShopService } from '../../../core/services/shop.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ProductCardComponent, ProductCardData } from '../../../shared/components/product-card/product-card.component';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';
import { ShopSocialLinksComponent } from '../../../shared/components/shop-social-links/shop-social-links.component';

/**
 * /boutique/:slug : page publique d'une boutique validée, comme le site React.
 * Couverture, logo, accroche, liens sociaux, suivre, « Créer mon néon avec … » (si l'atelier est visible sur /neon),
 * contacter, présentation, coordonnées, catégories (onglets) et produits publiés.
 */
@Component({
  selector: 'app-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, DatePipe, IconComponent, ProductCardComponent, ShopLogoComponent, ShopSocialLinksComponent],
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.css',
})
export class ShopPage {
  private readonly shopService = inject(ShopService);
  private readonly neon = inject(NeonService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  /** Paramètre de route /boutique/:slug */
  readonly slug = input.required<string>();

  readonly status = signal<'loading' | 'ok' | 'notfound' | 'error'>('loading');
  readonly data = signal<PublicShopData | null>(null);
  readonly hasNeon = signal(false);
  readonly following = signal(false);
  readonly followBusy = signal(false);
  /** Onglet actif : identifiant d'une catégorie de la boutique, null = « Tous » */
  readonly category = signal<number | null>(null);

  readonly categories = computed(() => this.data()?.categories ?? []);
  readonly cards = computed<(ProductCardData & { categoryId: number | null })[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.products.map((p) => {
      const regular = Number(p.priceTnd);
      const promo = p.promoPriceTnd == null ? null : Number(p.promoPriceTnd);
      return {
        id: p.id, slug: p.slug, name: p.name, image: p.imageUrl, shopName: d.shop.name, shopLogoUrl: d.shop.logoUrl,
        priceTnd: effectivePrice(regular, promo), regularPriceTnd: regular, promoPriceTnd: promo,
        availability: p.availability === 'in_stock' && p.stock === 0 ? 'out_of_stock' : p.availability,
        pricingMode: p.pricingMode, categoryId: p.shopCategoryId,
      };
    });
  });
  readonly visible = computed(() => {
    const c = this.category();
    return c === null ? this.cards() : this.cards().filter((p) => p.categoryId === c);
  });
  readonly whatsappLink = computed(() => {
    const w = this.data()?.shop.whatsapp;
    return w ? `https://wa.me/${w.replace(/[^0-9]/g, '')}` : null;
  });
  readonly hasContact = computed(() => {
    const s = this.data()?.shop;
    return !!(s && (s.city || s.deliveryInfo || s.openingHours || s.phone || s.whatsapp));
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.load(slug));
    });
  }

  async load(slug = this.slug()) {
    this.status.set('loading');
    this.category.set(null);
    this.hasNeon.set(false);
    try {
      const data = await this.shopService.get(slug);
      this.data.set(data);
      this.status.set(data ? 'ok' : 'notfound');
      if (!data) return;
      // Bouton néon seulement si l'atelier est visible sur /neon
      this.neon.workshop(slug).then((w) => this.hasNeon.set(!!w)).catch(() => undefined);
      // Déjà suivie ? (lu dans le tableau de bord du compte client)
      if (this.auth.isCustomer()) {
        this.account.dashboard().then((d) => this.following.set(d.followedShops.some((s) => s.shopSlug === slug))).catch(() => undefined);
      }
    } catch {
      this.status.set('error');
    }
  }

  async toggleFollow() {
    const d = this.data();
    if (!d) return;
    if (!this.auth.user()) {
      this.toast.show('Connectez-vous pour suivre cette boutique');
      void this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url } });
      return;
    }
    this.followBusy.set(true);
    try {
      const r = await this.shopService.toggleFollow({ id: d.shop.id, slug: d.shop.slug, name: d.shop.name });
      this.following.set(r.active);
      this.toast.show(r.active ? 'Boutique ajoutée à vos suivis' : 'Boutique retirée de vos suivis', 'succes');
    } catch {
      this.toast.show('Impossible de mettre à jour vos boutiques suivies', 'erreur');
    } finally {
      this.followBusy.set(false);
    }
  }
}
