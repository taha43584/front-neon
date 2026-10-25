import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AVAILABILITY_LABELS, parseVariants, toVideoEmbedUrl } from '@shared/productValidation';
import { AdminService, CategoryRow, ProductDetail } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminState } from '../admin.state';
import { ConfirmDialogComponent, StatusBadgeComponent } from '../admin-ui';
import {
  GlobalCategorySelectComponent, PendingProductAction, ProductActionButtonsComponent, globalCategoryOptions, productActionDone, productActionRequest,
} from './product-actions';

/** Fiche produit (administration) : médias, informations, description, modération et catégorie du site */
@Component({
  selector: 'app-admin-product-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, ConfirmDialogComponent, GlobalCategorySelectComponent, ProductActionButtonsComponent],
  templateUrl: './admin-product-detail.page.html',
  styleUrls: ['../admin.css', './admin-product-detail.page.css'],
})
export class AdminProductDetailPage {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly id = input.required<string>();
  readonly data = signal<ProductDetail | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly error = signal('');
  readonly message = signal('');
  readonly activeImage = signal(0);
  readonly categories = signal<CategoryRow[]>([]);
  readonly categoryOptions = computed(() => globalCategoryOptions(this.categories()));
  readonly availability = AVAILABILITY_LABELS as Record<string, string>;

  /** Boutique du produit : peut manquer (boutique supprimée), même si le type déduit ne le dit pas */
  readonly shop = computed(() => (this.data()?.shop ?? null) as ProductDetail['shop'] | null);
  readonly current = computed(() => {
    const images = this.data()?.images ?? [];
    return images[this.activeImage()] ?? images[0] ?? null;
  });
  readonly variants = computed(() => {
    const v = parseVariants(this.data()?.product.variants);
    return [v.dimensions.join(', '), v.colors.join(', '), v.materials.join(', '), v.models.join(', ')].filter(Boolean).join(' · ');
  });
  /** Vidéo YouTube / Vimeo : seule une adresse produite par la fonction partagée (hôtes autorisés, https) est affichée */
  readonly embed = computed(() => {
    const url = this.data()?.product.videoUrl;
    const safe = url ? toVideoEmbedUrl(url) : null;
    return safe ? this.sanitizer.bypassSecurityTrustResourceUrl(safe) : null;
  });

  readonly pending = signal<PendingProductAction | null>(null);
  readonly request = computed(() => productActionRequest(this.pending()));
  readonly busy = signal(false);
  readonly actionError = signal('');

  constructor() {
    effect(() => void this.load(Number(this.id())));
    this.admin.categoryList().then((l) => this.categories.set(l)).catch(() => undefined);
  }

  async load(productId: number) {
    try {
      this.data.set(await this.admin.product(productId));
      this.status.set('ok');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Produit introuvable');
      this.status.set('error');
    }
  }

  ask(a: PendingProductAction) {
    this.actionError.set('');
    this.pending.set(a);
  }

  async apply(reason: string) {
    const a = this.pending();
    if (!a) return;
    this.busy.set(true);
    try {
      if (a.kind === 'delete') {
        await this.admin.deleteProduct(a.productId);
        void this.state.reload();
        await this.router.navigate(['/admin/produits']);
        return;
      }
      const r = await this.admin.setProductStatus(a.productId, a.kind, reason || undefined);
      this.message.set(productActionDone(a.kind, r.status));
      this.pending.set(null);
      await this.load(a.productId);
      void this.state.reload();
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }
}
