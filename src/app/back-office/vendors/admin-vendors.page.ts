import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, VendorList } from '../../core/services/admin.service';
import { AdminState } from '../admin.state';
import {
  AdminPaginationComponent, ConfirmDialogComponent, StatusBadgeComponent, serverList,
} from '../admin-ui';
import { ShopAction, shopActionDone, shopActionRequest } from './shop-status-action';

type VendorStatus = 'all' | 'pending' | 'active' | 'rejected' | 'suspended';
type Row = VendorList['items'][number];
const STATUSES: VendorStatus[] = ['all', 'pending', 'active', 'rejected', 'suspended'];

/** Vendeurs : demandes d'ouverture de boutique ; approuver, refuser (motif obligatoire), suspendre (motif facultatif) */
@Component({
  selector: 'app-admin-vendors-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, StatusBadgeComponent, AdminPaginationComponent, ConfirmDialogComponent],
  templateUrl: './admin-vendors.page.html',
  styleUrl: '../admin.css',
})
export class AdminVendorsPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly state = inject(AdminState);

  /** ?statut=pending (lien depuis la vue générale), reçu comme entrée */
  readonly statut = input<string>();
  readonly status = signal<VendorStatus>('all');
  readonly search = signal('');
  readonly page = signal(1);

  readonly list = serverList(
    computed(() => ({ status: this.status(), search: this.search().trim() || undefined, page: this.page() })),
    (f) => this.admin.vendors(f),
  );
  readonly tabs = computed(() => {
    const c = this.list.data()?.counts;
    return [
      { value: 'all' as const, label: 'Toutes les demandes', count: c?.all },
      { value: 'pending' as const, label: 'En attente', count: c?.pending },
      { value: 'active' as const, label: 'Approuvés', count: c?.active },
      { value: 'rejected' as const, label: 'Refusés', count: c?.rejected },
      { value: 'suspended' as const, label: 'Suspendus', count: c?.suspended },
    ];
  });
  readonly rows = computed(() => this.list.data()?.items ?? []);

  // Action de statut
  readonly action = signal<ShopAction | null>(null);
  readonly request = computed(() => shopActionRequest(this.action()));
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly message = signal('');

  ngOnInit() {
    const s = this.statut() as VendorStatus | undefined;
    if (s && STATUSES.includes(s)) this.status.set(s);
  }

  owner(r: Row) {
    return [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerName || '—';
  }

  setStatus(value: VendorStatus) { this.status.set(value); this.page.set(1); }
  setSearch(value: string) { this.search.set(value); this.page.set(1); }

  ask(r: Row, status: ShopAction['status']) {
    this.actionError.set('');
    this.action.set({ shopId: r.id, shopName: r.name, status });
  }

  async apply(reason: string) {
    const a = this.action();
    if (!a) return;
    this.busy.set(true);
    try {
      await this.admin.updateShopStatus(a.shopId, a.status, reason || undefined);
      this.message.set(shopActionDone(a.status));
      this.action.set(null);
      this.list.reload();
      void this.state.reload(); // pastilles du menu
    } catch (e) {
      this.actionError.set(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      this.busy.set(false);
    }
  }
}
