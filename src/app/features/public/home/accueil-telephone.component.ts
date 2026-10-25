import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogProduct, CatalogService, HomeData, SiteCategory, WorkshopVideo } from '../../../core/services/catalog.service';
import { RecentlyViewedService } from '../../../core/services/recently-viewed.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadStateComponent } from '../../../shared/components/load-state/load-state.component';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { WorkshopVideoComponent } from './workshop-video.component';
import { StoriesViewerComponent, StoryGroup } from './stories-viewer.component';
import { CartePourVousComponent, CarteProduit } from './carte-pour-vous.component';
import { EMPTY_FILTERS, FilterSheetComponent, SheetFilters, SheetOptions } from '../../../shared/components/filter-sheet/filter-sheet.component';

/** Nombre de créations dans « Pour vous » */
const FOR_YOU_COUNT = 20;
/** Stories : éléments par atelier au plus, et clé des stories déjà vues (sur CET appareil) */
const STORY_ITEMS = 3;
const SEEN_KEY = 'elegance-stories-vues';

/** Carte « Vus récemment » : uniquement des informations relues sur le serveur */
interface RecentCard { slug: string; name: string; image: string | null; priceTnd: number; unit: string | null }
const unitOf = (mode: string) => (mode === 'per_m2' ? 'm²' : mode === 'per_linear_m' ? 'm' : null);

function readSeen(): Record<string, string[]> {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/**
 * Accueil du TÉLÉPHONE (< 768 px), « façon application » (A-10d). home.page charge les données (mêmes procédures,
 * mêmes règles qu'en A-10b) et les transmet ici ; l'ordinateur garde la mise en page A-10b.
 * Une section sans données n'est pas affichée (pas de néon sans offre néon, pas de vidéos sans vidéo…).
 */
@Component({
  selector: 'app-accueil-telephone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, PrixDtPipe, RouterLink, IconComponent, LoadStateComponent, ShopLogoComponent, RevealDirective, WorkshopVideoComponent, CartePourVousComponent, FilterSheetComponent, StoriesViewerComponent],
  templateUrl: './accueil-telephone.component.html',
  styleUrl: './accueil-telephone.component.css',
})
export class AccueilTelephoneComponent {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  readonly recentlyViewed = inject(RecentlyViewedService);

  readonly siteName = input.required<string>();
  readonly tagline = input.required<string>();
  readonly status = input.required<'loading' | 'ok' | 'error'>();
  readonly home = input.required<HomeData | null>();
  readonly categories = input.required<SiteCategory[]>();
  readonly products = input.required<CatalogProduct[]>();
  readonly videos = input.required<WorkshopVideo[]>();
  readonly hasNeon = input.required<boolean>();
  readonly retry = output();

  /**
   * Stories (A-10e) : pour chaque atelier, ses créations publiées les plus récentes (catalog.list, triées par date),
   * 3 au plus, montrées par leur vidéo si elles en ont une (vendor.publicProduct, déjà lu pour « En vidéo »), sinon leur photo.
   * Limites sans changement du serveur (BACK-A-FAIRE.md) : pas de date de publication (donc pas de fenêtre 24-72 h)
   * et une seule photo par création dans la liste.
   */
  readonly stories = computed<StoryGroup[]>(() => {
    const videos = new Map(this.videos().map((v) => [v.product.slug, { url: v.url, mimeType: v.mimeType }]));
    const groups = new Map<string, StoryGroup>();
    for (const p of this.products()) {
      const video = videos.get(p.slug) ?? null;
      if (!p.image && !video) continue;
      const g = groups.get(p.shopSlug) ?? { shop: { slug: p.shopSlug, name: p.shopName, logoUrl: p.shopLogoUrl }, items: [] };
      if (g.items.length < STORY_ITEMS) g.items.push({ product: p, video });
      groups.set(p.shopSlug, g);
    }
    return [...groups.values()];
  });
  readonly openStory = signal<number | null>(null);

  /* ---------- Vus récemment (A-10e) ---------- */
  /** Fiches relues sur le serveur pour les produits absents de la liste déjà chargée (catalog.list) */
  private readonly fetched = signal<Map<number, RecentCard>>(new Map());
  readonly recent = computed<RecentCard[]>(() => {
    const byId = new Map(this.products().map((p) => [p.id, p]));
    return this.recentlyViewed.items().flatMap((ref): RecentCard[] => {
      const p = byId.get(ref.id);
      if (p) return [{ slug: p.slug, name: p.name, image: p.image, priceTnd: p.priceTnd, unit: unitOf(p.pricingMode) }];
      const f = this.fetched().get(ref.id);
      return f ? [f] : [];
    });
  });
  private readonly seen = signal<Record<string, string[]>>(readSeen());
  /** « Vue » quand toutes ses créations actuelles ont été vues (une nouvelle création la rend « nouvelle » à nouveau) */
  isSeen(g: StoryGroup) {
    const s = this.seen()[g.shop.slug] ?? [];
    return g.items.every((i) => s.includes(i.product.slug));
  }
  markSeen({ shop, product }: { shop: string; product: string }) {
    const s = this.seen()[shop] ?? [];
    if (s.includes(product)) return;
    const next = { ...this.seen(), [shop]: [...s, product].slice(-20) };
    this.seen.set(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* stockage bloqué : vaut pour cette visite */ }
  }
  /** Puces : les catégories du site qui ont des créations (même liste que les cercles de l'ordinateur, 10 au plus) */
  readonly chips = computed(() => this.categories().filter((c) => c.productCount > 0).slice(0, 10));
  /** Puce sélectionnée (slug de catégorie) ; null = « Tout » */
  readonly chip = signal<string | null>(null);
  /**
   * Créations de chaque catégorie déjà demandées. L'appartenance à une catégorie est décidée PAR LE SERVEUR
   * (catalog.categoryPage, la même procédure que la page /categorie) : le texte « category » d'un produit
   * ne suffit pas (il est souvent vide ; la catégorie vient de la boutique).
   */
  private readonly byCategory = signal<Record<string, CarteProduit[]>>({});
  /** Catégorie dont la grille est affichée : pendant le chargement d'une puce, la grille précédente reste (aucun saut) */
  private readonly shown = signal<string | null>(null);
  readonly chipLoading = signal(false);
  readonly chipError = signal(false);

  /** « Pour vous » : créations récentes (ou de la puce choisie), réparties en 2 colonnes aux hauteurs alternées */
  /** A-10g : grille régulière de 2 colonnes, photos carrées toutes de la même taille */
  readonly forYou = computed<CarteProduit[]>(() => {
    const shown = this.shown();
    return (shown === null ? this.products() : this.byCategory()[shown] ?? []).slice(0, FOR_YOU_COUNT);
  });

  /* ---------- A-10g : accueil plus lisible ---------- */
  /** « Par catégorie » : les 6 catégories réelles les plus fournies (déjà triées par le serveur) */
  readonly categoryGrid = computed(() => this.categories().filter((c) => c.productCount > 0).slice(0, 6));
  /**
   * Garanties de l'encadré : SEULEMENT si elles sont vraies.
   * - Paiement à la livraison : seul mode de paiement du site (aucun paiement en ligne) ;
   * - Ateliers vérifiés : le serveur ne publie que les produits des boutiques validées par l'équipe (statut « active ») ;
   * - Prix à vos mesures : seulement s'il existe des créations au m² ou au mètre (totals.customProducts du serveur).
   */
  readonly guarantees = computed(() => {
    const g: { icon: 'truck' | 'shield-check' | 'ruler'; label: string }[] = [
      { icon: 'truck', label: 'Paiement à la livraison' },
      { icon: 'shield-check', label: 'Ateliers vérifiés' },
    ];
    if ((this.home()?.totals.customProducts ?? 0) > 0) g.push({ icon: 'ruler', label: 'Prix à vos mesures' });
    return g;
  });
  /** « Ateliers à découvrir » : boutiques de catalog.home avec 3 photos de leurs créations, spécialités et note réelle */
  readonly workshopCards = computed(() => {
    const photos = new Map<string, string[]>();
    for (const p of this.products()) {
      if (!p.image) continue;
      const list = photos.get(p.shopSlug) ?? [];
      if (list.length < 3) photos.set(p.shopSlug, [...list, p.image]);
    }
    return (this.home()?.shops ?? []).filter((s) => s.productCount > 0).map((s) => {
      const own = photos.get(s.slug) ?? [];
      const fallback = s.coverUrl || s.image;
      return { ...s, photos: own.length ? own : fallback ? [fallback] : [] };
    });
  });
  /** Panneau « Filtrer » de « Pour vous » : filtres que catalog.list sait appliquer (voir BACK-A-FAIRE pour les autres) */
  readonly sheetOptions: SheetOptions = { custom: true, promo: true, shops: [] };
  readonly emptyFilters = EMPTY_FILTERS;
  readonly countFor = async (f: SheetFilters) => {
    const n = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);
    return (await this.catalog.list({ minPrice: n(f.min), maxPrice: n(f.max), custom: f.custom || undefined, discount: f.promo || undefined })).length;
  };
  openCatalog(f: SheetFilters) {
    const q: Record<string, string> = {};
    if (f.min.trim()) q['min'] = f.min.trim();
    if (f.max.trim()) q['max'] = f.max.trim();
    if (f.custom) q['sur_mesure'] = '1';
    if (f.promo) q['promo'] = '1';
    void this.router.navigate(['/produits'], { queryParams: q });
  }

  /** Produits vus absents de catalog.list : leur fiche publique dit s'ils existent encore (null = supprimé ou masqué → retiré) */
  private async loadMissingViewed(products: CatalogProduct[]) {
    const known = new Set(products.map((p) => p.id));
    const missing = this.recentlyViewed.items().filter((r) => !known.has(r.id) && !this.fetched().has(r.id));
    const gone: number[] = [];
    const found = new Map(this.fetched());
    await Promise.all(missing.map(async (ref) => {
      try {
        const page = await this.catalog.product(ref.slug);
        if (!page || page.product.id !== ref.id) return void gone.push(ref.id);
        const p = page.product;
        const unit = unitOf(p.pricingMode);
        found.set(ref.id, { slug: p.slug, name: p.name, image: p.images[0]?.url ?? p.imageUrl, priceTnd: unit && p.unitPriceTnd != null ? Number(p.unitPriceTnd) : p.effectivePriceTnd, unit });
      } catch {
        /* réseau : on réessaiera à la prochaine visite, sans rien afficher d'incertain */
      }
    }));
    this.fetched.set(found);
    this.recentlyViewed.remove(gone);
  }

  /** La puce se remplit tout de suite ; la grille change quand les créations de la catégorie sont arrivées */
  constructor() {
    // Une fois la liste des produits chargée, on complète « Vus récemment » (et on retire ce qui n'existe plus)
    effect(() => {
      const products = this.products();
      if (this.home()) untracked(() => void this.loadMissingViewed(products));
    });
  }

  async selectChip(slug: string | null) {
    this.chip.set(slug);
    this.chipError.set(false);
    this.chipLoading.set(false);
    if (slug === null || this.byCategory()[slug]) return this.shown.set(slug);
    this.chipLoading.set(true);
    try {
      const page = await this.catalog.categoryPage({ slug, sort: 'recent' });
      // Les créations déjà connues par catalog.list gardent leur vraie note ; les autres n'en affichent aucune
      const known = new Map(this.products().map((p) => [p.slug, p]));
      const cards = page.products.map((p): CarteProduit => known.get(p.slug) ?? { ...p, category: page.category.name, rating: null, reviewCount: 0 });
      this.byCategory.update((m) => ({ ...m, [slug]: cards }));
      if (this.chip() === slug) this.shown.set(slug);
    } catch {
      if (this.chip() === slug) this.chipError.set(true);
    } finally {
      if (this.chip() === slug) this.chipLoading.set(false);
    }
  }
}
