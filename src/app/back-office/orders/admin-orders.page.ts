import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, NeonQuoteRow, ORDER_STATUS_OPTIONS, OrderStatus, QUOTE_STATUS, ShopOption } from '../../core/services/admin.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { AdminPaginationComponent, StatusBadgeComponent, serverList } from '../admin-ui';


/** Commandes : filtres (statut, vendeur, dates), recherche, tri, pagination ; demandes de devis néon en dessous */
@Component({
  selector: 'app-admin-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, PrixDtPipe, StatusBadgeComponent, AdminPaginationComponent],
  templateUrl: './admin-orders.page.html',
  styleUrl: '../admin.css',
})
export class AdminOrdersPage implements OnInit {
  private readonly admin = inject(AdminService);

  /** ?boutique=12 (lien depuis une fiche vendeur) */
  readonly boutique = input<string>();
  readonly status = signal<OrderStatus | 'all'>('all');
  readonly search = signal('');
  readonly shopId = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly page = signal(1);
  readonly quoteStatus = QUOTE_STATUS;

  readonly shops = signal<ShopOption[]>([]);
  readonly quotes = signal<NeonQuoteRow[]>([]);

  readonly list = serverList(
    computed(() => ({
      status: this.status(), page: this.page(), search: this.search().trim() || undefined,
      shopId: this.shopId() ? Number(this.shopId()) : undefined, from: this.from() || undefined, to: this.to() || undefined,
    })),
    (f) => this.admin.orders(f),
  );
  readonly tabs = computed(() => {
    const c = this.list.data()?.counts as Record<string, number> | undefined;
    return [{ value: 'all' as const, label: 'Toutes', count: c?.['all'] }, ...ORDER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: c?.[o.value] }))];
  });
  readonly rows = computed(() => this.list.data()?.items ?? []);
  readonly filtered = computed(() => !!(this.shopId() || this.from() || this.to() || this.search()));

  ngOnInit() {
    if (this.boutique() && /^\d+$/.test(this.boutique()!)) this.shopId.set(this.boutique()!);
    this.admin.shopOptions().then((l) => this.shops.set(l)).catch(() => undefined);
    this.admin.neonQuotes().then((l) => this.quotes.set(l)).catch(() => undefined);
  }

  setFilter(target: { set(value: string): void }, value: string) { target.set(value); this.page.set(1); }
  setStatus(value: OrderStatus | 'all') { this.status.set(value); this.page.set(1); }
  reset() { this.shopId.set(''); this.from.set(''); this.to.set(''); this.search.set(''); this.page.set(1); }

  quoteDetails(q: NeonQuoteRow) {
    return [q.sizeCode && `Taille ${q.sizeCode}`, q.outdoor ? 'Extérieur' : null].filter(Boolean).join(' · ');
  }
}
