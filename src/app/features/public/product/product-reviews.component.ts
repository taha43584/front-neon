import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { REVIEW_CRITERIA, REVIEW_REPORT_MAX, type ReviewFilter, type ReviewSort } from '@shared/reviewRules';
import { CustomerPhoto, PublicReview, ReviewScope, ReviewsOverview, ReviewsService } from '../../../core/services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { PhotoViewerComponent, ViewerPhoto } from '../../../shared/components/photo-viewer/photo-viewer.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * « Avis des clients » de la fiche produit, version compacte (A-10c).
 * Tout vient du serveur : moyenne, répartition 5→1 et critères (avis publiés), cartes filtrées / triées / paginées,
 * photos visibles uniquement. Onglets « Ce produit » / « Tout l'atelier ».
 */
@Component({
  selector: 'app-product-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, StarsComponent, PhotoViewerComponent, IconComponent],
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.css',
})
export class ProductReviewsComponent implements OnInit {
  private readonly reviewsApi = inject(ReviewsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly viewer = viewChild.required(PhotoViewerComponent);

  readonly productSlug = input.required<string>();

  readonly criteria = REVIEW_CRITERIA;
  readonly reportMax = REVIEW_REPORT_MAX;
  readonly filters: { value: ReviewFilter; label: string }[] = [
    { value: 'photos', label: 'Avec photos' },
    { value: 'five', label: '5 étoiles' },
    { value: 'custom', label: 'Sur mesure' },
  ];
  readonly sorts: { value: ReviewSort; label: string }[] = [
    { value: 'recent', label: 'Les plus récents' },
    { value: 'helpful', label: 'Les plus utiles' },
    { value: 'rating_high', label: 'Note la plus haute' },
    { value: 'rating_low', label: 'Note la plus basse' },
  ];

  readonly overview = signal<ReviewsOverview | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly tab = signal<ReviewScope>('product');
  readonly filter = signal<ReviewFilter | null>(null);
  readonly sort = signal<ReviewSort>('recent');
  readonly items = signal<PublicReview[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly listLoading = signal(false);
  readonly photos = signal<CustomerPhoto[]>([]);
  readonly viewerPhotos = signal<ViewerPhoto[]>([]);
  /** Avis dont le formulaire « Signaler » est ouvert, et motif en cours */
  readonly reportingId = signal<number | null>(null);
  readonly reportReason = signal('');
  readonly reportError = signal('');

  readonly summary = computed(() => {
    const o = this.overview();
    return o ? (this.tab() === 'product' ? o.product : o.shop) : null;
  });
  readonly slug = computed(() => (this.tab() === 'product' ? this.productSlug() : this.overview()?.shopSlug ?? ''));
  readonly maxBar = computed(() => Math.max(1, ...(this.summary()?.distribution.map((d) => d.count) ?? [1])));

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      this.overview.set(await this.reviewsApi.overview(this.productSlug()));
      this.status.set('ok');
      await this.refresh();
    } catch {
      this.status.set('error');
    }
  }

  /** Nouvel onglet, filtre ou tri : on repart de la page 1 */
  async refresh() {
    this.page.set(1);
    const [page, photos] = await Promise.all([this.fetchPage(1), this.reviewsApi.photos(this.tab(), this.slug()).catch(() => [])]);
    this.items.set(page?.items ?? []);
    this.photos.set(photos);
  }

  private async fetchPage(page: number) {
    if (!this.slug()) return null;
    this.listLoading.set(true);
    try {
      const result = await this.reviewsApi.page(this.tab(), this.slug(), { filter: this.filter(), sort: this.sort(), page });
      this.total.set(result.total);
      this.hasMore.set(result.hasMore);
      return result;
    } catch {
      this.toast.show("Les avis n'ont pas pu être chargés", 'erreur');
      return null;
    } finally {
      this.listLoading.set(false);
    }
  }

  async more() {
    const next = this.page() + 1;
    const result = await this.fetchPage(next);
    if (!result) return;
    this.page.set(next);
    this.items.update((list) => [...list, ...result.items]);
  }

  selectTab(tab: ReviewScope) {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.filter.set(null);
    void this.refresh();
  }
  /** Flèches ← → entre les deux onglets (motif ARIA des onglets) */
  onTabKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next: ReviewScope = this.tab() === 'product' ? 'shop' : 'product';
    this.selectTab(next);
    (document.getElementById(`onglet-avis-${next}`) as HTMLElement | null)?.focus();
  }
  toggleFilter(value: ReviewFilter) {
    this.filter.update((f) => (f === value ? null : value));
    void this.refresh();
  }
  setSort(value: string) {
    this.sort.set(value as ReviewSort);
    void this.refresh();
  }

  // ----- Photos -----
  openGallery(index: number) {
    this.viewerPhotos.set(this.photos().map((p) => ({ url: p.url, caption: `Photo de ${p.author} · ${p.productName}` })));
    this.viewer().open(index);
  }
  openReviewPhotos(review: PublicReview, index: number) {
    this.viewerPhotos.set(review.photos.map((p, i) => ({ url: p.url, caption: `Photo ${i + 1} de ${review.author}` })));
    this.viewer().open(index);
  }

  // ----- « Utile » et « Signaler » (compte connecté) -----
  private requireLogin() {
    if (this.auth.user()) return true;
    this.toast.show('Connectez-vous pour voter ou signaler un avis');
    void this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url } });
    return false;
  }
  async toggleHelpful(review: PublicReview) {
    if (!this.requireLogin()) return;
    try {
      const result = await this.reviewsApi.toggleHelpful(review.id);
      this.items.update((list) => list.map((r) => (r.id === review.id ? { ...r, votedByMe: result.voted, helpfulCount: result.helpfulCount } : r)));
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : "Votre vote n'a pas pu être enregistré", 'erreur');
    }
  }
  openReport(review: PublicReview) {
    if (!this.requireLogin()) return;
    this.reportingId.set(this.reportingId() === review.id ? null : review.id);
    this.reportReason.set('');
    this.reportError.set('');
  }
  async sendReport(review: PublicReview) {
    const reason = this.reportReason().trim();
    if (reason.length < 5) return this.reportError.set('Précisez le motif (5 caractères au moins).');
    try {
      await this.reviewsApi.report(review.id, reason);
      this.items.update((list) => list.map((r) => (r.id === review.id ? { ...r, reportedByMe: true } : r)));
      this.reportingId.set(null);
      this.toast.show("Merci, l'avis a été signalé à notre équipe", 'succes');
    } catch (e) {
      this.reportError.set(e instanceof Error ? e.message : "Le signalement n'a pas pu être envoyé.");
    }
  }

  criterionValue(review: PublicReview, key: (typeof REVIEW_CRITERIA)[number]['key']) {
    return review[key];
  }
  initial(name: string) {
    return name.trim().charAt(0).toUpperCase() || '?';
  }
  plural(count: number, word: string) {
    return `${count} ${word}${count > 1 ? 's' : ''}`;
  }
  formatNote(value: number | null) {
    return value === null ? '–' : value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}
