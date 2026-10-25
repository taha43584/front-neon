import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Location, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
// Fonction de calcul PARTAGÉE avec le serveur et le site React : importée, jamais recopiée
import { normalizeCategoryName } from '@shared/categoryKey';
import { computeCustomPrice, describeCustomLine, formatArea, unitLabel, type CustomPricingMode } from '@shared/customPricing';
import { CatalogService, ProductPageData } from '../../../core/services/catalog.service';
import { CartOptions, CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ViewportService } from '../../../core/services/viewport.service';
import { ShopService } from '../../../core/services/shop.service';
import { SiteService } from '../../../core/services/site.service';
import { whatsappLink } from '../../../shared/whatsapp';
import { RecentlyViewedService } from '../../../core/services/recently-viewed.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';
import { animatedNumber } from '../../../shared/animated-number';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { ProductReviewsComponent } from './product-reviews.component';

const AVAILABILITY_LABELS = { in_stock: 'En stock', made_to_order: 'Sur commande', out_of_stock: 'Rupture de stock' } as const;
const VARIANT_LABELS = { dimensions: 'Dimensions', colors: 'Couleurs', materials: 'Matériaux', models: 'Modèles' } as const;
/**
 * Pastille de couleur des puces « Couleurs » (téléphone, A-10d) : seulement pour un nom de couleur CONNU
 * (ou un code #rrggbb saisi par le vendeur) ; une couleur inconnue n'a pas de pastille plutôt qu'une fausse.
 */
const SWATCHES: Record<string, string> = {
  noir: '#1f1b18', blanc: '#ffffff', gris: '#9a958f', beige: '#e3d3bf', creme: '#f3e9d6', ivoire: '#f6f0e1', marron: '#7a4a2a',
  chocolat: '#4e2d1b', camel: '#b9844f', taupe: '#8b7d70', dore: '#c9a14a', or: '#c9a14a', argent: '#c0c0c0', argente: '#c0c0c0',
  bronze: '#8c6239', cuivre: '#b8733f', rouge: '#c0392b', bordeaux: '#6d1f2b', rose: '#e9a3b6', orange: '#e67e22', jaune: '#f1c40f',
  vert: '#3d8b4f', 'vert olive': '#708238', olive: '#708238', bleu: '#2e64b0', 'bleu marine': '#1f2f55', marine: '#1f2f55',
  turquoise: '#1abc9c', violet: '#7d4fa0', mauve: '#b392c4', naturel: '#d8b98f', bois: '#a0703f', chene: '#b08a5a', noyer: '#6b4a2f',
};

/** Prix vérifié par le serveur pour les mesures saisies */
type ServerCheck = { status: 'idle' | 'checking' | 'error' } | { status: 'ok'; priceTnd: number } | { status: 'refused'; message: string };

/**
 * Fiche produit (/produit/:slug). Le slug arrive par input() grâce à withComponentInputBinding().
 * Produit sur mesure : le prix est ESTIMÉ en direct avec computeCustomPrice (même fonction que le serveur),
 * puis CONFIRMÉ par le serveur (catalog.quoteCart), seule source du prix final.
 */
@Component({
  selector: 'app-product-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, ReactiveFormsModule, RouterLink, PrixDtPipe, ShopLogoComponent, IconComponent, StarsComponent, ProductReviewsComponent, NgTemplateOutlet],
  templateUrl: './product.page.html',
  styleUrls: ['./product.page.css', './product.page.tel.css'],
})
export class ProductPage {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly favorites = inject(FavoritesService);
  private readonly location = inject(Location);
  /** Téléphone (< 768 px) : fiche « façon application » (A-10d) ; l'ordinateur garde la mise en page A-10 */
  readonly viewport = inject(ViewportService);
  private readonly shops = inject(ShopService);
  private readonly site = inject(SiteService);
  private readonly recentlyViewed = inject(RecentlyViewedService);

  /** Favori : même service que les cartes produit ; le « pop » se rejoue à chaque clic */
  readonly favorite = computed(() => { const d = this.data(); return !!d && this.favorites.isFavorite(d.product.slug); });
  readonly heartPop = signal(0);
  toggleFavorite() {
    const d = this.data();
    if (!d) return;
    const p = d.product;
    if (this.favorites.toggle({ id: p.id, slug: p.slug, name: p.name, image: this.images()[0]?.url ?? p.imageUrl, priceTnd: p.effectivePriceTnd })) this.heartPop.update((n) => n + 1);
  }
  private readonly router = inject(Router);

  /** Paramètre de route :slug */
  readonly slug = input.required<string>();

  readonly status = signal<'loading' | 'ok' | 'notfound' | 'error'>('loading');
  readonly data = signal<ProductPageData | null>(null);
  readonly activeImage = signal(0);
  readonly availabilityLabels = AVAILABILITY_LABELS;
  readonly variantLabels = VARIANT_LABELS;

  // ----- Achat : choix obligatoires (couleur, dimensions…), personnalisation, quantité -----
  readonly choices = signal<Record<string, string>>({});
  readonly personalization = new FormControl('', { nonNullable: true });
  readonly quantity = signal(1);
  readonly adding = signal(false);
  readonly cartMessage = signal<{ ok: boolean; text: string } | null>(null);

  // ----- Sur mesure : formulaire réactif des mesures + options cochées -----
  readonly measureForm = new FormGroup({
    width: new FormControl('', { nonNullable: true }),
    height: new FormControl('', { nonNullable: true }),
  });
  readonly measures = toSignal(this.measureForm.valueChanges, { initialValue: this.measureForm.getRawValue() });
  readonly selectedOptionIds = signal<number[]>([]);
  readonly serverCheck = signal<ServerCheck>({ status: 'idle' });

  readonly product = computed(() => this.data()?.product ?? null);
  readonly images = computed(() => this.product()?.images ?? []);
  readonly currentImage = computed(() => this.images()[Math.min(this.activeImage(), this.images().length - 1)] ?? null);
  readonly hasPromo = computed(() => {
    const p = this.product();
    return !!p && p.effectivePriceTnd < p.regularPriceTnd;
  });
  readonly variantKeys = computed(() => {
    const p = this.product();
    return p ? (Object.keys(VARIANT_LABELS) as (keyof typeof VARIANT_LABELS)[]).filter((k) => p.variants[k].length > 0) : [];
  });

  /** Mode sur mesure (m² ou mètre linéaire) ; null pour un produit à prix fixe */
  readonly customMode = computed<CustomPricingMode | null>(() => {
    const mode = this.product()?.pricingMode;
    return mode === 'per_m2' || mode === 'per_linear_m' ? mode : null;
  });
  readonly unit = computed(() => (this.customMode() ? unitLabel(this.customMode()!) : ''));

  /** ESTIMATION en direct : recalculée à chaque frappe (computed dépend de measures() et des options) */
  readonly estimate = computed(() => {
    const p = this.product();
    const mode = this.customMode();
    if (!p || !mode) return null;
    const { width, height } = this.measures();
    const toNumber = (value: string | undefined) => (!value || value.trim() === '' ? '' : Number(value.replace(',', '.')));
    return computeCustomPrice(
      {
        mode, unitPriceTnd: p.unitPriceTnd, minWidthCm: p.minWidthCm, maxWidthCm: p.maxWidthCm, minHeightCm: p.minHeightCm,
        maxHeightCm: p.maxHeightCm, minBillableArea: p.minBillableArea, minPriceTnd: p.minPriceTnd, promoPercent: p.promoPercent,
      },
      { widthCm: toNumber(width), heightCm: toNumber(height) },
      p.options.filter((o) => this.selectedOptionIds().includes(o.id)),
    );
  });
  /** Total affiché : défile vers la valeur calculée (animation purement visuelle, comme React) */
  readonly animatedTotal = animatedNumber(computed(() => { const e = this.estimate(); return e?.ok ? e.priceTnd : null; }));
  /** Stock maximum (produit en stock) ; 99 pour un produit sur commande */
  readonly maxQuantity = computed(() => {
    const p = this.product();
    return p?.availability === 'in_stock' ? Math.max(1, p.stock ?? 1) : 99;
  });
  /** Premier choix obligatoire non fait (ex. « Couleurs »), ou null */
  readonly missingChoice = computed(() => this.variantKeys().find((key) => !this.choices()[key]) ?? null);

  readonly touched = computed(() => (this.measures().width ?? '').trim() !== '' || (this.measures().height ?? '').trim() !== '');

  constructor() {
    // Nouveau slug (arrivée sur la page ou clic sur « autre création ») → chargement
    effect(() => {
      void this.load(this.slug());
    });
    // Mesures ou options modifiées : l'ancien prix confirmé par le serveur n'est plus valable
    effect(() => {
      this.estimate();
      this.serverCheck.set({ status: 'idle' });
    });
  }

  async load(slug: string) {
    this.status.set('loading');
    this.activeImage.set(0);
    this.measureForm.reset();
    this.selectedOptionIds.set([]);
    this.choices.set({});
    this.personalization.reset();
    this.quantity.set(1);
    this.cartMessage.set(null);
    this.detailsOpen.set(false);
    this.deliveryOpen.set(false);
    try {
      const data = await this.catalog.product(slug);
      if (slug !== this.slug()) return; // l'utilisateur a déjà changé de produit
      this.data.set(data);
      this.status.set(data ? 'ok' : 'notfound');
      this.shopWhatsapp.set(null);
      // A-10e : « Vus récemment » (identifiants seulement)
      if (data) this.recentlyViewed.add(data.product.id, data.product.slug);
      if (data && this.viewport.phone()) {
        // Après l'affichage de la fiche : le numéro n'est pas nécessaire au premier écran
        const shopSlug = data.product.shopSlug;
        void this.shops.get(shopSlug).then((shop) => { if (slug === this.slug()) this.shopWhatsapp.set(shop?.shop.whatsapp ?? null); }).catch(() => undefined);
      }
    } catch {
      if (slug === this.slug()) this.status.set('error');
    }
  }

  choose(key: string, value: string) {
    this.choices.update((c) => ({ ...c, [key]: value }));
  }

  changeQuantity(step: number) {
    this.quantity.update((q) => Math.min(this.maxQuantity(), Math.max(1, q + step)));
  }

  /**
   * Ajout au panier. Produit sur mesure : le SERVEUR calcule d'abord le prix de ces mesures
   * (catalog.quoteCart) ; le panier ne garde que les mesures et options (jamais un prix qui ferait foi).
   */
  async addToCart(): Promise<boolean> {
    const product = this.product();
    if (!product || product.availability === 'out_of_stock') return false;
    const missing = this.missingChoice();
    if (missing) {
      this.cartMessage.set({ ok: false, text: `Choisissez : ${VARIANT_LABELS[missing].toLowerCase()}` });
      return false;
    }
    let price = product.effectivePriceTnd;
    let custom: CartOptions = {};
    if (this.customMode()) {
      const estimate = this.estimate();
      if (!estimate?.ok) {
        this.cartMessage.set({ ok: false, text: estimate?.error ?? 'Indiquez vos mesures' });
        return false;
      }
      this.adding.set(true);
      try {
        const line = await this.catalog.confirmCustomPrice(product.slug, estimate.widthCm, estimate.heightCm, this.selectedOptionIds());
        if (!line?.available || !line.custom) {
          this.cartMessage.set({ ok: false, text: line?.problem ?? 'Ce produit ne peut pas être ajouté au panier.' });
          return false;
        }
        price = line.unitPriceTnd;
        custom = {
          widthCm: estimate.widthCm,
          heightCm: line.custom.heightCm ?? undefined,
          optionIds: this.selectedOptionIds(),
          customSummary: describeCustomLine({ pricingMode: product.pricingMode, widthCm: line.custom.widthCm, heightCm: line.custom.heightCm, areaM2: line.custom.areaM2, options: line.custom.options }) ?? undefined,
        };
      } catch {
        this.cartMessage.set({ ok: false, text: "Le prix n'a pas pu être vérifié. Réessayez." });
        return false;
      } finally {
        this.adding.set(false);
      }
    }
    // Couleur à part ; les autres choix (dimensions, matériaux…) rejoignent la personnalisation, comme sur le site React
    const details = this.variantKeys().filter((k) => k !== 'colors').map((k) => `${VARIANT_LABELS[k]} : ${this.choices()[k]}`);
    this.cart.add(
      { slug: product.slug, name: product.name, shopSlug: product.shopSlug, shopName: product.shopName, price: `${price.toFixed(2)} TND`, image: this.images()[0]?.url ?? product.imageUrl },
      this.quantity(),
      { selectedColor: this.choices()['colors'], personalization: [...details, this.personalization.value.trim()].filter(Boolean).join(' · ') || undefined, ...custom },
    );
    this.cartMessage.set({ ok: true, text: `${product.name} ajouté au panier` });
    return true;
  }

  /* ---------- Téléphone (A-10d) ---------- */
  readonly detailsOpen = signal(false);
  readonly deliveryOpen = signal(false);
  readonly shareMessage = signal<string | null>(null);
  /** Numéro WhatsApp PUBLIC de l'atelier (vendor.publicShop ne le donne que si le vendeur l'affiche), téléphone seulement */
  private readonly shopWhatsapp = signal<string | null>(null);
  readonly whatsapp = computed(() => {
    const p = this.product();
    if (!p) return null;
    const url = `${location.origin}/produit/${p.slug}`;
    return whatsappLink(this.shopWhatsapp(), `Bonjour, j'ai une question sur « ${p.name} » vu sur ${this.site.name()} : ${url}`);
  });

  /** Total de la barre du bas : prix FOURNI PAR LE SERVEUR × quantité ; sur mesure : seulement après confirmation du serveur */
  readonly phoneTotal = computed(() => {
    const p = this.product();
    if (!p) return null;
    if (!this.customMode()) return p.effectivePriceTnd * this.quantity();
    const check = this.serverCheck();
    return check.status === 'ok' ? check.priceTnd * this.quantity() : null;
  });

  swatch(key: string, value: string) {
    if (key !== 'colors') return null;
    const v = value.trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : SWATCHES[normalizeCategoryName(v)] ?? null;
  }

  /** Point cliqué : la galerie défile jusqu'à cette photo (le point suit via onGalleryScroll) */
  private readonly gallery = viewChild<ElementRef<HTMLElement>>('defil');
  goToImage(index: number) {
    const el = this.gallery()?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: this.viewport.reducedMotion() ? 'auto' : 'smooth' });
  }

  /** Défilement de la galerie (aimanté, une photo par écran) : point actif = photo visible */
  onGalleryScroll(el: HTMLElement) {
    const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (index !== this.activeImage()) this.activeImage.set(index);
  }

  /** Retour : page précédente du site s'il y en a une, sinon l'accueil (lien ouvert directement) */
  back() {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  /** Partage natif du téléphone (navigator.share) ; sinon le lien est copié */
  async share() {
    const p = this.product();
    if (!p) return;
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title: p.name, url }); } catch { /* partage annulé par l'utilisateur */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.shareMessage.set('Lien copié');
    } catch {
      this.shareMessage.set("Le lien n'a pas pu être copié");
    }
    setTimeout(() => this.shareMessage.set(null), 2500);
  }

  async buyNow() {
    if (await this.addToCart()) await this.router.navigateByUrl('/checkout');
  }

  toggleOption(id: number) {
    this.selectedOptionIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  showImage(step: number) {
    const count = this.images().length;
    this.activeImage.update((i) => (i + step + count) % count);
  }

  /** Le SERVEUR recalcule le prix avec les mêmes mesures : c'est ce prix qui fait foi */
  async confirmPrice() {
    const estimate = this.estimate();
    const product = this.product();
    if (!estimate?.ok || !product) return;
    this.serverCheck.set({ status: 'checking' });
    try {
      const line = await this.catalog.confirmCustomPrice(product.slug, estimate.widthCm, estimate.heightCm, this.selectedOptionIds());
      this.serverCheck.set(line?.available ? { status: 'ok', priceTnd: line.unitPriceTnd } : { status: 'refused', message: line?.problem ?? 'Ces mesures ne sont pas acceptées.' });
    } catch {
      this.serverCheck.set({ status: 'error' });
    }
  }

  area(value: number) {
    return formatArea(value, this.customMode()!);
  }

  limits(min: number | null, max: number | null) {
    if (min != null && max != null) return `Entre ${min} et ${max} cm`;
    if (min != null) return `Au moins ${min} cm`;
    if (max != null) return `Au plus ${max} cm`;
    return 'En centimètres';
  }

  fieldError(field: 'width' | 'height') {
    const e = this.estimate();
    return this.touched() && e && !e.ok && e.field === field ? e.error : null;
  }

  /** Prix payé d'une autre création de la boutique (promotion comprise), tel que fourni par le serveur */
  paidPrice(item: { priceTnd: number; promoPriceTnd: number | null }) {
    return item.promoPriceTnd !== null && item.promoPriceTnd < item.priceTnd ? item.promoPriceTnd : item.priceTnd;
  }

  /** « ★ 4,5 (12 avis) » près du prix : défilement jusqu'à la section, puis focus sur son titre (lecteur d'écran) */
  scrollToReviews() {
    // La section est chargée à l'approche (@defer) : on vise sa zone, ce qui déclenche le chargement si besoin
    const section = document.getElementById('avis') ?? document.getElementById('zone-avis');
    if (!section) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Focus sur le titre (lecteur d'écran) dès qu'il existe : tout de suite, ou après le chargement différé
    let essais = 0;
    const focaliser = () => {
      const title = document.getElementById('titre-avis');
      if (title) {
        title.setAttribute('tabindex', '-1');
        title.focus({ preventScroll: true });
      } else if (++essais < 40) setTimeout(focaliser, 100);
    };
    focaliser();
  }
}
