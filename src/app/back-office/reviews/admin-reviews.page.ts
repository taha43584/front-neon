import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, ReviewList } from '../../core/services/admin.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AdminReviewDetail, AdminReviewReports, ReviewsService } from '../../core/services/reviews.service';
import { REVIEW_CRITERIA } from '@shared/reviewRules';
import { AdminState } from '../admin.state';
import { AdminPaginationComponent, ConfirmDialogComponent, ConfirmRequest, StatusBadgeComponent, orderRef, serverList } from '../admin-ui';

type ReviewStatus = 'all' | 'pending' | 'published' | 'rejected';
type Row = ReviewList['items'][number];

/**
 * /admin/avis : modération des avis clients, comme la console React.
 * Un avis « masqué » (refusé) n'apparaît plus sur le site ; « Supprimer » l'efface définitivement.
 */
@Component({
  selector: 'app-admin-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, StatusBadgeComponent, AdminPaginationComponent, ConfirmDialogComponent],
  template: `
    <div class="entete-page">
      <div><h1>Avis clients</h1><p>Les avis ne sont visibles sur le site qu'après publication par l'administration. Une photo ou un avis masqué disparaît du site.</p></div>
    </div>
    <div class="vues" role="group" aria-label="Affichage">
      <button type="button" class="b" [class.vue-active]="view() === 'reviews'" [attr.aria-pressed]="view() === 'reviews'" (click)="view.set('reviews')">Avis</button>
      <button type="button" class="b" [class.vue-active]="view() === 'reports'" [attr.aria-pressed]="view() === 'reports'" (click)="showReports()" data-testid="reports-view">
        Signalements@if (reports()?.openCount) { <span class="pastille-rouge">{{ reports()!.openCount }}</span> }
      </button>
    </div>
    @if (message()) { <p class="message" role="status" data-testid="admin-message">{{ message() }}</p> }
    @if (actionError()) { <p class="bandeau-rouge" role="alert">{{ actionError() }}</p> }

    @if (view() === 'reports') {
      <section class="panneau" aria-label="Signalements">
        <div class="filtres"><div class="onglets" role="tablist" aria-label="Filtrer les signalements">
          @for (t of reportTabs; track t.value) {
            <button type="button" role="tab" [attr.aria-selected]="reportStatus() === t.value" (click)="setReportStatus(t.value)">{{ t.label }}</button>
          }
        </div></div>
        @if (reports(); as rep) {
          @if (!rep.items.length) {
            <p class="vide">{{ reportStatus() === 'open' ? 'Aucun signalement à traiter' : 'Aucun signalement' }}</p>
          } @else {
            <ul class="liste-avis" data-testid="admin-reports">
              @for (x of rep.items; track x.id) {
                <li class="avis">
                  <div class="avis-texte">
                    <div class="avis-entete">
                      <app-status-badge [status]="x.status === 'open' ? 'pending' : 'published'" [label]="x.status === 'open' ? 'À traiter' : 'Traité'" />
                      <span class="sous">{{ x.createdAt | date: 'dd/MM/y HH:mm' }} · par {{ x.reporterEmail ?? '—' }}</span>
                    </div>
                    <p class="corps"><strong>Motif :</strong> {{ x.reason }}</p>
                    <p class="sous">Avis {{ x.rating }}/5 sur « {{ x.productName }} » ({{ x.shopSlug }}) · {{ x.reviewStatus === 'rejected' ? 'avis masqué' : x.reviewStatus === 'published' ? 'avis publié' : 'avis en attente' }}</p>
                    <p class="extrait">« {{ x.body }} »</p>
                  </div>
                  <div class="groupe-actions">
                    @if (x.reviewStatus === 'published') { <button type="button" class="b" [disabled]="busy()" (click)="hideReported(x.reviewId)">Masquer l'avis</button> }
                    @if (x.status === 'open') { <button type="button" class="b vert" [disabled]="busy()" (click)="resolve(x.id)">Marquer comme traité</button> }
                  </div>
                </li>
              }
            </ul>
          }
        } @else {
          <p class="info" role="status">Chargement…</p>
        }
      </section>
    } @else {
    <section class="panneau">
      <div class="filtres">
        <div class="ligne-haut">
          <div class="onglets" role="tablist" aria-label="Filtrer les avis">
            @for (t of tabs(); track t.value) {
              <button type="button" role="tab" [attr.aria-selected]="status() === t.value" (click)="setStatus(t.value)">{{ t.label }}@if (t.count !== undefined) { <span class="nombre">{{ t.count }}</span> }</button>
            }
          </div>
          <div class="recherche-admin">
            <input class="champ-admin" type="search" placeholder="Produit, contenu ou e-mail" aria-label="Produit, contenu ou e-mail" [value]="search()" (input)="setSearch($any($event.target).value)" data-testid="admin-search" />
          </div>
        </div>
      </div>
      @switch (list.status()) {
        @case ('loading') { <p class="info" role="status">Chargement…</p> }
        @case ('error') { <div class="erreur-etat" role="alert"><p>{{ list.error() }}</p><button type="button" class="b" (click)="list.reload()">Réessayer</button></div> }
        @default {
          @if (!rows().length) {
            <p class="vide">{{ status() === 'pending' ? 'Aucun avis à modérer' : 'Aucun avis' }}</p>
          } @else {
            <ul class="liste-avis" data-testid="admin-reviews">
              @for (r of rows(); track r.id) {
                <li class="avis">
                  <div class="avis-texte">
                    <div class="avis-entete">
                      <span class="etoiles" [attr.aria-label]="r.rating + ' sur 5'">
                        @for (i of five; track i) { <app-icon name="star" [size]="14" [filled]="i < r.rating" [class.allumee]="i < r.rating" /> }
                      </span>
                      <app-status-badge [status]="r.status" [label]="r.status === 'rejected' ? 'Masqué' : null" />
                      <span class="sous">{{ r.createdAt | date: 'dd/MM/y HH:mm' }}</span>
                    </div>
                    <p class="corps">{{ r.body }}</p>
                    <p class="sous">
                      Produit : @if (r.productPublished) { <a [href]="'/produit/' + r.productSlug" target="_blank" rel="noreferrer" class="lien-produit">{{ r.productName }}</a> } @else { <span>{{ r.productName }} (non publié)</span> }
                      · Vendeur : {{ r.shopName ?? r.shopSlug }}
                      · Auteur : {{ r.authorName ?? '—' }} ({{ r.authorEmail ?? '—' }}) · commande {{ ref(r.orderId) }}
                    </p>
                  </div>
                  <div class="groupe-actions">
                    @if (r.status !== 'published') { <button type="button" class="b vert" [disabled]="busy()" (click)="setReviewStatus(r, 'published')">Publier</button> }
                    @if (r.status !== 'rejected') { <button type="button" class="b" [disabled]="busy()" (click)="setReviewStatus(r, 'rejected')">Masquer</button> }
                    <button type="button" class="b" [attr.aria-expanded]="openId() === r.id" (click)="toggleDetail(r.id)" data-testid="review-detail-toggle">Photos et signalements</button>
                    <button type="button" class="b rouge-texte" aria-label="Supprimer l'avis" (click)="toDelete.set(r)"><app-icon name="trash-2" [size]="16" /></button>
                  </div>
                  @if (openId() === r.id) {
                    <div class="detail" data-testid="review-detail">
                      @switch (detailState()) {
                        @case ('loading') { <p class="info" role="status">Chargement…</p> }
                        @case ('error') { <p class="bandeau-rouge" role="alert">Détail indisponible.</p> }
                        @default {
                          @if (detail(); as d) {
                            <p class="sous">Publié sous le nom : <strong>{{ d.authorDisplayName ?? 'Client vérifié (anonyme)' }}</strong>{{ d.authorGovernorate ? ' · ' + d.authorGovernorate : '' }}@if (d.purchasedVariant) { · Acheté : {{ d.purchasedVariant }} }</p>
                            @if (d.qualityRating !== null) {
                              <p class="sous">
                                @for (c of criteria; track c.key; let last = $last) {
                                  <span>{{ c.label }} {{ d[c.key] }}/5</span>@if (!last) {<span aria-hidden="true"> · </span>}
                                }
                              </p>
                            }
                            @if (d.vendorReply) { <p class="sous">Réponse de l'atelier : « {{ d.vendorReply }} »</p> }
                            @if (d.photos.length) {
                              <ul class="photos-admin">
                                @for (ph of d.photos; track ph.id; let i = $index) {
                                  <li [class.masquee]="ph.hidden">
                                    <a [href]="ph.url" target="_blank" rel="noopener" [attr.aria-label]="'Ouvrir la photo ' + (i + 1)"><img [src]="ph.url" alt="" /></a>
                                    <button type="button" class="b" [disabled]="busy()" (click)="setPhotoHidden(ph.id, !ph.hidden)" data-testid="photo-hide-toggle">{{ ph.hidden ? 'Réafficher' : 'Masquer la photo' }}</button>
                                  </li>
                                }
                              </ul>
                            } @else { <p class="sous">Aucune photo.</p> }
                            @if (d.reports.length) {
                              <p class="sous"><strong>Signalements :</strong></p>
                              <ul class="signalements">
                                @for (x of d.reports; track x.id) { <li class="sous">{{ x.reason }} — {{ x.reporterEmail ?? '—' }} · {{ x.status === 'open' ? 'à traiter' : 'traité' }}</li> }
                              </ul>
                            }
                          }
                        }
                      }
                    </div>
                  }
                </li>
              }
            </ul>
            @let d = list.data()!;
            <app-admin-pagination [page]="d.page" [pageCount]="d.pageCount" [total]="d.total" (pageChange)="page.set($event)" />
          }
        }
      }
    </section>
    }
    <app-confirm-dialog [request]="deleteRequest()" [busy]="busy()" (confirmed)="confirmDelete()" (cancelled)="toDelete.set(null)" />
  `,
  styleUrls: ['../admin.css'],
  styles: `
    .nombre { margin-left: 6px; color: var(--bleu-3, #64748b); font-size: 11px; }
    .liste-avis { margin: 0; padding: 0; list-style: none; }
    .avis { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-bottom: 1px solid var(--surface-20, #f1f5f9); }
    .avis-texte { min-width: 0; }
    .avis-entete { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .etoiles { display: flex; color: var(--ardoise-ligne-2, #cbd5e1); }
    .allumee { color: var(--jaune-3, #fbbf24); }
    .corps { margin: 8px 0 0; color: var(--bleu-10, #1e293b); font-size: 14px; white-space: pre-line; }
    .avis .sous { margin: 8px 0 0; }
    .lien-produit { color: var(--cuivre-18, #b45309); }
    .vert { border-color: var(--vert-4, #059669); background: var(--vert-4, #059669); color: var(--carte); }
    .rouge-texte { color: var(--rouge-10, #e11d48); }
    .vues { display: flex; gap: 8px; margin-bottom: 12px; }
    .vue-active { border-color: var(--bleu-11, #0f172a); background: var(--bleu-11, #0f172a); color: var(--carte); }
    .pastille-rouge { margin-left: 6px; padding: 0 6px; border-radius: 999px; background: var(--rouge-10, #e11d48); color: var(--carte); font-size: 11px; }
    .detail { width: 100%; padding: 12px; border-radius: 10px; background: var(--surface-6, #f8fafc); }
    .detail .sous { margin: 4px 0; }
    .photos-admin { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0; padding: 0; list-style: none; }
    .photos-admin li { display: grid; gap: 6px; justify-items: start; }
    .photos-admin img { width: 96px; height: 96px; border-radius: 8px; object-fit: cover; }
    .photos-admin .masquee img { opacity: 0.35; }
    .signalements { margin: 0; padding-left: 18px; }
    .extrait { margin: 6px 0 0; color: var(--bleu-8, #475569); font-size: 13px; font-style: italic; }
    @media (min-width: 640px) { .avis { flex-direction: row; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; } .groupe-actions { flex-shrink: 0; } }
  `,
})
export class AdminReviewsPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);
  private readonly reviewsApi = inject(ReviewsService);
  readonly criteria = REVIEW_CRITERIA;

  // ----- A-10c : détail (photos, signalements) et vue « Signalements » -----
  readonly view = signal<'reviews' | 'reports'>('reviews');
  readonly openId = signal<number | null>(null);
  readonly detail = signal<AdminReviewDetail | null>(null);
  readonly detailState = signal<'loading' | 'ok' | 'error'>('loading');
  readonly reports = signal<AdminReviewReports | null>(null);
  readonly reportStatus = signal<'open' | 'resolved' | 'all'>('open');
  readonly reportTabs = [
    { value: 'open' as const, label: 'À traiter' },
    { value: 'resolved' as const, label: 'Traités' },
    { value: 'all' as const, label: 'Tous' },
  ];

  ngOnInit() {
    void this.loadReports(); // nombre de signalements ouverts sur le bouton « Signalements »
  }
  private async loadReports() {
    this.reports.set(await this.reviewsApi.reports(this.reportStatus()).catch(() => null));
  }
  showReports() {
    this.view.set('reports');
    void this.loadReports();
  }
  setReportStatus(v: 'open' | 'resolved' | 'all') {
    this.reportStatus.set(v);
    this.reports.set(null);
    void this.loadReports();
  }
  async toggleDetail(id: number) {
    if (this.openId() === id) return this.openId.set(null);
    this.openId.set(id);
    await this.loadDetail(id);
  }
  private async loadDetail(id: number) {
    this.detailState.set('loading');
    try {
      this.detail.set(await this.reviewsApi.adminDetail(id));
      this.detailState.set('ok');
    } catch {
      this.detailState.set('error');
    }
  }
  setPhotoHidden(photoId: number, hidden: boolean) {
    const id = this.openId();
    void this.run(async () => {
      await this.reviewsApi.setPhotoHidden(photoId, hidden);
      if (id) await this.loadDetail(id);
    }, hidden ? 'Photo masquée' : 'Photo réaffichée');
  }
  hideReported(reviewId: number) {
    void this.run(async () => {
      await this.admin.setReviewStatus(reviewId, 'rejected');
      await this.loadReports();
    }, 'Avis masqué');
  }
  resolve(reportId: number) {
    void this.run(async () => {
      await this.reviewsApi.resolveReport(reportId);
      await this.loadReports();
    }, 'Signalement traité');
  }
  readonly ref = orderRef;
  readonly five = [0, 1, 2, 3, 4];

  readonly status = signal<ReviewStatus>('pending');
  readonly search = signal('');
  readonly page = signal(1);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly actionError = signal('');
  readonly toDelete = signal<Row | null>(null);

  readonly list = serverList(
    computed(() => ({ status: this.status(), search: this.search().trim() || undefined, page: this.page() })),
    (f) => this.admin.reviews(f),
  );
  readonly rows = computed(() => this.list.data()?.items ?? []);
  readonly tabs = computed(() => {
    const c = this.list.data()?.counts;
    return [
      { value: 'pending' as const, label: 'À modérer', count: c?.['pending'] },
      { value: 'published' as const, label: 'Publiés', count: c?.['published'] },
      { value: 'rejected' as const, label: 'Masqués', count: c?.['rejected'] },
      { value: 'all' as const, label: 'Tous', count: c?.['all'] },
    ];
  });
  readonly deleteRequest = computed<ConfirmRequest | null>(() => {
    const r = this.toDelete();
    return r ? { title: 'Supprimer cet avis ?', description: `L'avis sur « ${r.productName} » sera définitivement supprimé. Pour simplement le retirer du site, utilisez plutôt « Masquer ».`, confirmLabel: 'Supprimer', danger: true } : null;
  });

  setStatus(v: ReviewStatus) { this.status.set(v); this.page.set(1); }
  setSearch(v: string) { this.search.set(v); this.page.set(1); }

  private async run(action: () => Promise<unknown>, text: string) {
    this.busy.set(true);
    this.actionError.set('');
    try {
      await action();
      this.list.reload();
      void this.state.reload(); // pastille « Avis » du menu
      this.message.set(text);
      return true;
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  setReviewStatus(r: Row, status: 'published' | 'rejected') {
    void this.run(() => this.admin.setReviewStatus(r.id, status), status === 'published' ? 'Avis publié' : 'Avis masqué');
  }

  async confirmDelete() {
    const r = this.toDelete();
    if (r && (await this.run(() => this.admin.deleteReview(r.id), 'Avis supprimé'))) this.toDelete.set(null);
  }
}
