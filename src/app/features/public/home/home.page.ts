import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogProduct, CatalogService, HomeData, SiteCategory, WorkshopVideo } from '../../../core/services/catalog.service';
import { SiteService } from '../../../core/services/site.service';
import { ViewportService } from '../../../core/services/viewport.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LoadStateComponent } from '../../../shared/components/load-state/load-state.component';
import { ShopLogoComponent } from '../../../shared/components/shop-logo/shop-logo.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { IconName } from '../../../shared/components/icon/icons';
import { NeonBannerComponent } from '../../../shared/components/neon/neon-banner.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { WorkshopVideoComponent } from './workshop-video.component';
import { AccueilTelephoneComponent } from './accueil-telephone.component';

type LatestFilter = 'all' | 'custom' | 'promo';

/** Nombre de produits récents dont on lit la fiche pour trouver des vidéos (voir CatalogService.workshopVideos) */
const VIDEO_CANDIDATES = 12;
/** Attente maximale des vidéos après les autres données avant d'afficher la page (sans vidéos s'il le faut) */
const VIDEO_WAIT_MS = 1500;

/**
 * Accueil « marketplace » (A-10b). Toutes les données viennent de procédures EXISTANTES :
 * catalog.home (boutiques, totaux), catalog.siteCategories (cercles), catalog.list (nouveautés, photos des boutiques),
 * catalog.neonOffers (bannière néon), vendor.publicProduct (vidéos). Une section sans données n'est pas affichée.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, ProductCardComponent, LoadStateComponent, ShopLogoComponent, IconComponent, NeonBannerComponent, RevealDirective, WorkshopVideoComponent, AccueilTelephoneComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage implements OnInit {
  private readonly catalog = inject(CatalogService);
  readonly site = inject(SiteService);
  /** Téléphone (< 768 px) : accueil « façon application » (A-10d) ; l'ordinateur garde la mise en page ci-dessous */
  readonly viewport = inject(ViewportService);

  /** État de la page : 'loading' → 'ok' ou 'error' */
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly home = signal<HomeData | null>(null);
  readonly categories = signal<SiteCategory[]>([]);
  /** Produits publiés, du plus récent au plus ancien */
  readonly products = signal<CatalogProduct[]>([]);
  readonly videos = signal<WorkshopVideo[]>([]);
  readonly hasNeon = signal(false);
  readonly latestFilter = signal<LatestFilter>('all');

  readonly filters: { value: LatestFilter; label: string }[] = [
    { value: 'all', label: 'Tout' },
    { value: 'custom', label: 'Sur mesure' },
    { value: 'promo', label: 'Promotions' },
  ];

  /** « Des idées pour chaque espace » : chaque tuile lance une recherche du catalogue */
  readonly spaces: { label: string; query: string; icon: IconName }[] = [
    { label: 'Salon', query: 'salon', icon: 'sofa' },
    { label: 'Chambre', query: 'chambre', icon: 'bed-double' },
    { label: 'Café & restaurant', query: 'café', icon: 'coffee' },
    { label: 'Salon de coiffure', query: 'coiffure', icon: 'scissors' },
    { label: 'Hôtel', query: 'hôtel', icon: 'hotel' },
    { label: 'Bureau', query: 'bureau', icon: 'briefcase' },
  ];

  readonly pillars: { title: string; text: string; icon: IconName }[] = [
    { title: "Une communauté d'ateliers vérifiés", text: 'Chaque boutique est examinée et validée par notre équipe avant de pouvoir vendre. Vous achetez directement auprès des artisans.', icon: 'shield-check' },
    { title: 'Paiement à la livraison', text: 'Aucun paiement en ligne : vous réglez à la réception, partout en Tunisie. Les prix sont confirmés à la validation de la commande.', icon: 'truck' },
    { title: 'Sur mesure, néon et devis', text: 'Créations à vos dimensions avec un prix calculé aussitôt, néon personnalisé avec aperçu lumineux, et contact direct avec les ateliers.', icon: 'ruler' },
  ];

  /** Valeurs DÉRIVÉES (computed) : recalculées automatiquement quand leurs signaux changent */
  readonly circles = computed(() => this.categories().filter((c) => c.productCount > 0).slice(0, 6));
  private readonly latestByFilter = computed(() => {
    const all = this.products();
    return {
      all: all.slice(0, 10),
      custom: all.filter((p) => p.pricingMode !== 'fixed').slice(0, 10),
      promo: all.filter((p) => p.promoPriceTnd !== null).slice(0, 10),
    };
  });
  readonly latest = computed(() => this.latestByFilter()[this.latestFilter()]);
  readonly availableFilters = computed(() => this.filters.filter((f) => this.latestByFilter()[f.value].length > 0));
  /** Ateliers : les 4 premières boutiques de catalog.home, avec les 4 photos les plus récentes de leurs créations */
  readonly workshops = computed(() => {
    const photos = new Map<string, string[]>();
    for (const p of this.products()) {
      if (!p.image) continue;
      const list = photos.get(p.shopSlug) ?? [];
      if (list.length < 4) photos.set(p.shopSlug, [...list, p.image]);
    }
    return (this.home()?.shops ?? []).slice(0, 4).map((shop) => {
      const own = photos.get(shop.slug) ?? [];
      const fallback = shop.coverUrl || shop.image;
      return { ...shop, photos: own.length ? own : fallback ? [fallback] : [] };
    });
  });
  readonly whatIs = computed(() => {
    const name = this.site.name();
    return /^[aeiouyéèêàâîôûh]/i.test(name) ? `Qu'est-ce qu'${name} ?` : `Qu'est-ce que ${name} ?`;
  });

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      // Les appels partent en même temps ; la liste des produits et le néon sont facultatifs (section cachée si erreur)
      const [home, categories, products, neon] = await Promise.all([
        this.catalog.home(),
        this.catalog.siteCategories(),
        this.catalog.list({ sort: 'recent' }).catch(() => [] as CatalogProduct[]),
        this.catalog.neonOffers().catch(() => []),
      ]);
      // Vidéos AVANT le premier affichage : leur section est au-dessus des nouveautés ; si elle apparaissait après,
      // toute la page descendrait d'un coup (décalage CLS de 0,4 mesuré en A-11). Au-delà d'un court délai,
      // la page s'affiche sans vidéos pour cette visite, et la section n'est jamais insérée plus tard.
      const videos = await Promise.race([
        this.catalog.workshopVideos(products.slice(0, VIDEO_CANDIDATES), 5).catch(() => []),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), VIDEO_WAIT_MS)),
      ]);
      this.home.set(home);
      this.categories.set(categories);
      this.products.set(products);
      this.hasNeon.set(neon.length > 0);
      this.videos.set(videos ?? []);
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }

  plural(count: number, word: string) {
    return `${count} ${word}${count > 1 ? 's' : ''}`;
  }
}
