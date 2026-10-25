import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VendorSpaceState } from './vendor-space.state';
import { PRODUCT_STATUS, VendorProductRow, VendorService } from '../../core/services/vendor.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';

type StatusFilter = 'all' | 'published' | 'draft' | 'pending' | 'rejected';
const PAGE_SIZE = 12;

/**
 * « Mes produits » : recherche, filtres (statut, catégorie), pagination, publication et suppression.
 * Les produits viennent de vendor.dashboard (uniquement ceux de la boutique du vendeur connecté).
 */
@Component({
  selector: 'app-vendor-products-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe],
  templateUrl: './vendor-products.page.html',
  styleUrls: ['./vendor-pages.css', './vendor-products.page.css'],
})
export class VendorProductsPage implements OnInit {
  readonly state = inject(VendorSpaceState);
  private readonly vendor = inject(VendorService);

  readonly productStatus = PRODUCT_STATUS;
  readonly statusFilters: StatusFilter[] = ['all', 'published', 'draft', 'pending', 'rejected'];
  readonly search = signal('');
  readonly status = signal<StatusFilter>('all');
  readonly category = signal('all');
  readonly page = signal(0);
  readonly categories = signal<{ id: number; name: string }[]>([]);
  readonly busyId = signal<number | null>(null);
  readonly message = signal<{ ok: boolean; text: string } | null>(null);

  // Boîte de confirmation de suppression (élément <dialog> natif : clavier, Échap, focus gérés par le navigateur)
  readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteBox');
  readonly toDelete = signal<VendorProductRow | null>(null);

  readonly products = computed(() => this.state.dashboard()?.products ?? []);
  readonly categoryNames = computed(() => new Map(this.categories().map((c) => [c.id, c.name])));
  readonly counts = computed(() => {
    const list = this.products();
    const count = (s: string) => list.filter((p) => (p.status ?? 'draft') === s).length;
    return { all: list.length, published: count('published'), draft: count('draft'), pending: count('pending'), rejected: count('rejected') } as Record<StatusFilter, number>;
  });
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.products().filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || this.categoryOf(p).toLowerCase().includes(q)) &&
      (this.status() === 'all' || (p.status ?? 'draft') === this.status()) &&
      (this.category() === 'all' || (this.category() === 'none' ? !p.shopCategoryId : String(p.shopCategoryId) === this.category())));
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount() - 1));
  readonly visible = computed(() => this.filtered().slice(this.currentPage() * PAGE_SIZE, (this.currentPage() + 1) * PAGE_SIZE));

  ngOnInit() {
    // Message transmis par le formulaire après l'enregistrement (« Produit publié… »)
    const saved = (history.state as { message?: string } | null)?.message;
    if (saved) this.message.set({ ok: true, text: saved });
    this.vendor.shopCategories().then((r) => this.categories.set(r.categories)).catch(() => this.categories.set([]));
  }

  categoryOf(p: VendorProductRow) {
    return (p.shopCategoryId ? this.categoryNames().get(p.shopCategoryId) : undefined) ?? 'Sans catégorie';
  }

  countIn(id: number | null) {
    return this.products().filter((p) => (id === null ? !p.shopCategoryId : p.shopCategoryId === id)).length;
  }

  stockLabel(p: VendorProductRow) {
    if (p.availability === 'made_to_order') return 'Sur commande';
    if (p.availability === 'out_of_stock' || p.stock === 0) return 'Rupture de stock';
    return `${p.stock ?? 0} en stock`;
  }

  /** Prix payé (promotion comprise) ; le prix barré est affiché à côté */
  price(p: VendorProductRow) {
    const regular = Number(p.priceTnd);
    const promo = p.promoPriceTnd != null ? Number(p.promoPriceTnd) : null;
    return { paid: promo !== null && promo < regular ? promo : regular, regular };
  }

  setFilter(update: () => void) {
    update();
    this.page.set(0);
  }

  async toggle(p: VendorProductRow) {
    const next = p.status === 'published' || p.status === 'pending' ? 'draft' : 'published';
    this.busyId.set(p.id);
    try {
      const result = await this.vendor.setProductStatus(p.id, next);
      this.message.set({
        ok: true,
        text: result.status === 'published' ? 'Produit publié dans le catalogue'
          : result.status === 'pending' ? "Produit envoyé en validation : il sera visible après approbation de l'administration"
          : 'Produit retiré du catalogue (brouillon)',
      });
      await this.state.reload();
    } catch (error) {
      this.message.set({ ok: false, text: error instanceof Error ? error.message : 'Action impossible' });
    } finally {
      this.busyId.set(null);
    }
  }

  askDelete(p: VendorProductRow) {
    this.toDelete.set(p);
    this.deleteDialog().nativeElement.showModal();
  }

  closeDelete() {
    this.deleteDialog().nativeElement.close();
    this.toDelete.set(null);
  }

  async confirmDelete() {
    const p = this.toDelete();
    if (!p) return;
    this.busyId.set(p.id);
    try {
      await this.vendor.removeProduct(p.id);
      this.message.set({ ok: true, text: `« ${p.name} » supprimé` });
      this.closeDelete();
      await this.state.reload();
    } catch (error) {
      this.message.set({ ok: false, text: error instanceof Error ? error.message : 'Suppression impossible' });
      this.closeDelete();
    } finally {
      this.busyId.set(null);
    }
  }
}
