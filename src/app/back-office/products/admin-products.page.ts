import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AVAILABILITY_LABELS } from '@shared/productValidation';
import { AdminService, CategoryRow, ShopOption } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminState } from '../admin.state';
import {
  AdminPaginationComponent, ConfirmDialogComponent, StatusBadgeComponent, serverList,
} from '../admin-ui';
import {
  GlobalCategorySelectComponent, PendingProductAction, ProductActionButtonsComponent, globalCategoryOptions, productActionDone, productActionRequest,
} from './product-actions';

type ProductStatus = 'all' | 'draft' | 'pending' | 'published' | 'rejected';
const STATUSES: ProductStatus[] = ['all', 'draft', 'pending', 'published', 'rejected'];
/** Champ de prix → nombre ≥ 0, ou undefined (champ vide ou invalide : filtre ignoré) */
const price = (v: string) => (v.trim() !== '' && Number(v.replace(',', '.')) >= 0 ? Number(v.replace(',', '.')) : undefined);

/** Produits : tous les statuts, filtres (statut, vendeur, catégorie, prix), recherche, tri, pagination, modération */
@Component({
  selector: 'app-admin-products-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, AdminPaginationComponent, ConfirmDialogComponent,
    GlobalCategorySelectComponent, ProductActionButtonsComponent,
  ],
  templateUrl: './admin-products.page.html',
  styleUrl: '../admin.css',
})
export class AdminProductsPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  // Paramètres de l'adresse (?statut=pending, ?boutique=12)
  readonly statut = input<string>();
  readonly boutique = input<string>();

  readonly status = signal<ProductStatus>('all');
  readonly search = signal('');
  readonly shopId = signal('');
  readonly categoryId = signal('');
  readonly minPrice = signal('');
  readonly maxPrice = signal('');
  readonly page = signal(1);
  readonly availability = AVAILABILITY_LABELS as Record<string, string>;

  readonly shops = signal<ShopOption[]>([]);
  readonly categories = signal<CategoryRow[]>([]);
  readonly mainCategories = computed(() => this.categories().filter((c) => !c.parentId && c.status === 'approved'));
  readonly categoryOptions = computed(() => globalCategoryOptions(this.categories()));

  readonly list = serverList(
    computed(() => ({
      status: this.status(), page: this.page(), search: this.search().trim() || undefined,
      shopId: this.shopId() ? Number(this.shopId()) : undefined,
      categoryId: this.categoryId() ? Number(this.categoryId()) : undefined,
      minPrice: price(this.minPrice()), maxPrice: price(this.maxPrice()),
    })),
    (f) => this.admin.products(f),
  );
  readonly tabs = computed(() => {
    const c = this.list.data()?.counts;
    return [
      { value: 'all' as const, label: 'Tous', count: c?.all },
      { value: 'pending' as const, label: 'En attente', count: c?.pending },
      { value: 'published' as const, label: 'Publiés', count: c?.published },
      { value: 'draft' as const, label: 'Brouillons', count: c?.draft },
      { value: 'rejected' as const, label: 'Refusés', count: c?.rejected },
    ];
  });
  readonly rows = computed(() => this.list.data()?.items ?? []);
  readonly filtered = computed(() => !!(this.shopId() || this.categoryId() || this.minPrice() || this.maxPrice() || this.search()));

  readonly pending = signal<PendingProductAction | null>(null);
  readonly request = computed(() => productActionRequest(this.pending()));
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly message = signal('');

  ngOnInit() {
    const s = this.statut() as ProductStatus | undefined;
    if (s && STATUSES.includes(s)) this.status.set(s);
    if (this.boutique() && /^\d+$/.test(this.boutique()!)) this.shopId.set(this.boutique()!);
    this.admin.shopOptions().then((l) => this.shops.set(l)).catch(() => undefined);
    this.admin.categoryList().then((l) => this.categories.set(l)).catch(() => undefined);
  }

  /** Tout changement de filtre ramène à la page 1 */
  setFilter(target: { set(value: string): void }, value: string) {
    target.set(value);
    this.page.set(1);
  }
  setStatus(value: ProductStatus) { this.status.set(value); this.page.set(1); }

  reset() {
    this.shopId.set(''); this.categoryId.set(''); this.minPrice.set(''); this.maxPrice.set(''); this.search.set(''); this.page.set(1);
  }

  shopState(status: string | null) {
    return status === 'pending' ? 'en attente' : status === 'suspended' ? 'suspendue' : 'refusée';
  }

  async apply(reason: string) {
    const a = this.pending();
    if (!a) return;
    this.busy.set(true);
    try {
      if (a.kind === 'delete') {
        await this.admin.deleteProduct(a.productId);
        this.message.set(productActionDone('delete'));
      } else {
        const r = await this.admin.setProductStatus(a.productId, a.kind, reason || undefined);
        this.message.set(productActionDone(a.kind, r.status));
      }
      this.pending.set(null);
      this.list.reload();
      void this.state.reload();
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }

  ask(a: PendingProductAction) {
    this.actionError.set('');
    this.pending.set(a);
  }
}
